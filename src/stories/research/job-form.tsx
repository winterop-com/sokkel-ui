import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { normalizeCode } from '../../components/CodeField'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { cn } from '../../lib/cn'

/** The fields of the "New job" form, in the order they are drawn and checked. */
export type Key = 'code' | 'name' | 'endpoint' | 'schedule' | 'timeout'
export const ORDER: Key[] = ['code', 'name', 'endpoint', 'schedule', 'timeout']

export const SPEC: Record<Key, { label: string; hint?: string; mono?: boolean }> = {
    code: { label: 'Code', mono: true },
    name: { label: 'Name' },
    endpoint: { label: 'Endpoint', hint: 'called with POST', mono: true },
    schedule: { label: 'Schedule', hint: 'cron, UTC', mono: true },
    timeout: { label: 'Timeout', hint: 'as 15m or 2h' },
}

export type Values = Record<Key, string>

/** What the form holds when it opens: a code that starts with a digit, no name, and a host that will not answer. */
export const START: Values = {
    code: '24h-export',
    name: '',
    endpoint: 'https://hooks.example.org/larkspur/export',
    schedule: '0 * * * *',
    timeout: '2h',
}

export const UNREACHABLE = 'hooks.example.org'

export type Tone = 'critical' | 'warning' | 'good' | 'quiet'

/** One thing the form says about a field. */
export interface Note {
    key: Key
    tone: Tone
    /** The message, in full. */
    text: string
    /** The message in a few words, for a label row. */
    short: string
    /** What to do, when the message alone does not say it. */
    detail?: string
    /** A value that puts it right, when one is known. */
    fix?: string
    /** The server said it, not the browser. */
    server?: boolean
}

export const ICON: Record<Tone, LucideIcon> = { critical: CircleAlert, warning: TriangleAlert, good: CircleCheck, quiet: Info }
export const INK: Record<Tone, string> = {
    critical: 'text-critical-ink',
    warning: 'text-warning-ink',
    good: 'text-good-ink',
    quiet: 'text-muted-foreground',
}

/** An input's edge in a tone, overriding the primitive's own invalid ring. */
export const INPUT_TONE: Record<Exclude<Tone, 'quiet'>, string> = {
    critical:
        'border-critical/80 focus-visible:border-critical aria-invalid:border-critical/80 aria-invalid:ring-0 aria-invalid:ring-critical/25 aria-invalid:focus-visible:ring-3 dark:aria-invalid:border-critical/80 dark:aria-invalid:ring-critical/30',
    warning: 'border-warning/80 focus-visible:border-warning focus-visible:ring-warning/25',
    good: 'border-good/60 focus-visible:border-good focus-visible:ring-good/25',
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** A cron expression read back in words, with the time between runs when it is regular. */
export function readSchedule(cron: string): { reading: string; every: number | null } | null {
    const parts = cron.trim().split(/\s+/)
    if (parts.length !== 5 || !parts.every((part) => /^[\d*/,-]+$/.test(part))) return null
    const [minute, hour, day, month, weekday] = parts
    const num = (part: string) => (/^\d+$/.test(part) ? Number(part) : null)
    const step = (part: string) => {
        const found = /^\*\/(\d+)$/.exec(part)
        return found === null ? null : Number(found[1])
    }
    const pad = (n: number) => String(n).padStart(2, '0')
    const m = num(minute)
    const h = num(hour)
    const d = num(weekday)
    const everyMinutes = step(minute)
    const everyHours = step(hour)
    const plain = day === '*' && month === '*'
    if (plain && weekday === '*' && hour === '*' && everyMinutes !== null)
        return { reading: `Every ${everyMinutes} minutes`, every: everyMinutes * 60 }
    if (plain && weekday === '*' && hour === '*' && m !== null)
        return { reading: m === 0 ? 'Every hour, on the hour' : `Every hour, at minute ${m}`, every: 3600 }
    if (plain && weekday === '*' && everyHours !== null && m !== null)
        return { reading: `Every ${everyHours} hours, at minute ${m}`, every: everyHours * 3600 }
    if (plain && weekday === '*' && h !== null && m !== null) return { reading: `Every day at ${pad(h)}:${pad(m)} UTC`, every: 86400 }
    if (plain && d !== null && h !== null && m !== null)
        return { reading: `Every ${DAYS[d % 7]} at ${pad(h)}:${pad(m)} UTC`, every: 7 * 86400 }
    return { reading: 'A custom schedule', every: null }
}

/** A duration such as 2h, 15m or 1h30m in seconds, or null when it is not one. */
export function seconds(text: string): number | null {
    const found = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(text.trim())
    if (found === null) return null
    const total = Number(found[1] ?? 0) * 3600 + Number(found[2] ?? 0) * 60 + Number(found[3] ?? 0)
    return total > 0 ? total : null
}

/** A number of seconds as a person says it: 2 hours, 1 hour 30 minutes. */
export function sayDuration(total: number): string {
    const unit = (n: number, word: string) => (n === 0 ? null : `${n} ${word}${n === 1 ? '' : 's'}`)
    const said = [unit(Math.floor(total / 3600), 'hour'), unit(Math.floor((total % 3600) / 60), 'minute'), unit(total % 60, 'second')]
    return said.filter((part) => part !== null).join(' ')
}

/** The time between runs as the gap is named: the hour, the day, the 15 minutes. */
function sayGap(every: number): string {
    if (every === 3600) return 'hour'
    if (every === 86400) return 'day'
    if (every === 7 * 86400) return 'week'
    return sayDuration(every)
}

export function host(address: string): string | null {
    if (!/^https?:\/\/[^/]/.test(address.trim())) return null
    try {
        return new URL(address.trim()).host
    } catch {
        return null
    }
}

/** The code made to start with a letter: the leading part moves to the end, as 24h-export becomes export-24h. */
export function suggestCode(code: string): string {
    const found = /^([0-9][a-z0-9]*)-([a-z][a-z0-9-]*)$/.exec(code)
    if (found !== null) return `${found[2]}-${found[1]}`
    const letters = code.replace(/^[^a-z]+/, '')
    return letters === '' ? 'job' : letters
}

function nameFrom(code: string): string | null {
    const usable = /^[a-z][a-z0-9-]*$/.test(code) ? code : suggestCode(code)
    const words = usable.split('-').filter((word) => word !== '')
    if (words.length === 0) return null
    const said = words.join(' ')
    return said.charAt(0).toUpperCase() + said.slice(1)
}

/** What is wrong with a field's value by the form's own rules, or null. The server holds the same rules. */
export function problem(key: Key, values: Values): Note | null {
    const value = values[key].trim()
    const say = (text: string, short: string, more: Partial<Note> = {}): Note => ({ key, tone: 'critical', text, short, ...more })
    switch (key) {
        case 'code': {
            if (value === '') return say('Enter a code', 'Enter a code')
            if (!/^[a-z]/.test(value)) {
                const better = suggestCode(value)
                return say('Code must start with a letter', 'Start with a letter', {
                    detail: `As in ${better}.`,
                    fix: better,
                })
            }
            if (!/^[a-z][a-z0-9-]*$/.test(value)) return say('Code can use only letters, digits and hyphens', 'Letters, digits, hyphens')
            return null
        }
        case 'name': {
            if (value !== '') return null
            const named = nameFrom(values.code.trim())
            return say('Enter a name', 'Enter a name', { fix: named ?? undefined })
        }
        case 'endpoint':
            if (value === '') return say('Enter an endpoint', 'Enter an endpoint')
            if (host(value) === null) return say('Enter the endpoint as a full address, starting with https://', 'Starts with https://')
            return null
        case 'schedule':
            if (value === '') return say('Enter a schedule', 'Enter a schedule')
            if (readSchedule(value) === null)
                return say('Enter the schedule as five cron fields', 'Five cron fields', { detail: 'As in 0 2 * * *, every day at 02:00.' })
            return null
        case 'timeout':
            if (value === '') return say('Enter a timeout', 'Enter a timeout')
            if (seconds(value) === null) return say('Enter the timeout as a duration', 'A duration, as 15m', { detail: 'As in 15m or 2h.' })
            return null
    }
}

/** What is allowed but unusual about a field's value: it never stops the job being created. */
export function warning(key: Key, values: Values): Note | null {
    if (key !== 'timeout') return null
    const timeout = seconds(values.timeout)
    const every = readSchedule(values.schedule)?.every ?? null
    if (timeout === null || every === null || timeout <= every) return null
    const shorter = every >= 600 ? `${Math.floor(every / 60) - 5}m` : null
    return {
        key,
        tone: 'warning',
        text: `Longer than the ${sayGap(every)} between runs, so two runs can overlap`,
        short: 'Can overlap the next run',
        detail: 'The job is created either way.',
        fix: shorter ?? undefined,
    }
}

/** What the server answers about the endpoint: a refusal when its host does not answer. */
export function refusal(values: Values): Note | null {
    const at = host(values.endpoint)
    if (at !== UNREACHABLE) return null
    return {
        key: 'endpoint',
        tone: 'critical',
        server: true,
        text: `Couldn’t reach ${at}`,
        short: 'Host did not answer',
        detail: 'It did not answer within 10 seconds. Check the address, or that it accepts connections from this server.',
    }
}

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

/**
 * The form's state and its timing. A field's problem is said once it is revealed: on leaving the
 * field (`blur`) or on Create (`submit`). A revealed problem is checked again on every keystroke,
 * and once it is fixed the field goes back to waiting, so a fix is said at once and a new mistake
 * only when the field is left again. Create always asks the server, whose answer holds every
 * problem keyed by its field.
 */
export function useJobForm({
    prefix,
    timing,
    after = false,
    checkOnBlur = false,
}: {
    prefix: string
    timing: 'submit' | 'blur'
    /** Open the form as it stands after one Create: every problem shown, the server's refusal in. */
    after?: boolean
    /** Ask the server about the endpoint as soon as its field is left. */
    checkOnBlur?: boolean
}) {
    const [values, setValues] = useState<Values>(START)
    const [revealed, setRevealed] = useState<Set<Key>>(() => new Set(after ? ORDER : []))
    const [warned, setWarned] = useState<Set<Key>>(() => new Set(after ? ORDER : []))
    const [fixed, setFixed] = useState<Set<Key>>(() => new Set())
    const [refused, setRefused] = useState<Note | null>(() => (after ? refusal(START) : null))
    const [answered, setAnswered] = useState<string | null>(null)
    const [checking, setChecking] = useState(false)
    const [busy, setBusy] = useState(false)
    const [created, setCreated] = useState(false)
    const [submits, setSubmits] = useState(after ? 1 : 0)
    const [focused, setFocused] = useState<Key | null>(null)
    const inputs = useRef<Partial<Record<Key, HTMLInputElement | null>>>({})
    const current = useRef(values)
    useEffect(() => {
        current.current = values
    }, [values])

    const id = (key: Key) => `${prefix}-${key}`

    const error = (key: Key): Note | null => {
        const found = problem(key, values)
        if (found !== null) return revealed.has(key) ? found : null
        return key === 'endpoint' ? refused : null
    }

    const warn = (key: Key): Note | null => (error(key) === null && warned.has(key) ? warning(key, values) : null)

    const set = (key: Key, raw: string) => {
        const value = key === 'code' ? normalizeCode(raw) : raw
        const next = { ...values, [key]: value }
        setValues(next)
        if (key === 'endpoint') {
            setRefused(null)
            setAnswered(null)
        }
        if (revealed.has(key) && problem(key, next) === null) {
            setRevealed((was) => new Set([...was].filter((one) => one !== key)))
            setFixed((was) => new Set([...was, key]))
        } else if (problem(key, next) !== null) {
            setFixed((was) => new Set([...was].filter((one) => one !== key)))
        }
    }

    const ask = useCallback(async (address: string) => {
        setChecking(true)
        await wait(800)
        setChecking(false)
        if (current.current.endpoint !== address) return null
        const answer = refusal(current.current)
        setRefused(answer)
        setAnswered(answer === null ? host(address) : null)
        return answer
    }, [])

    const blur = (key: Key) => {
        setFocused((was) => (was === key ? null : was))
        if (timing !== 'blur') return
        if (values[key].trim() !== '') {
            setRevealed((was) => new Set([...was, key]))
            setWarned((was) => new Set([...was, key]))
        }
        if (checkOnBlur && key === 'endpoint' && problem('endpoint', values) === null && refused === null && answered === null) {
            void ask(values.endpoint)
        }
    }

    /** Create: the server checks the endpoint and answers with every problem; the keys that failed come back in order. */
    const submit = async (): Promise<Key[]> => {
        if (busy) return []
        setBusy(true)
        const sent = current.current
        let answer = refused
        if (problem('endpoint', sent) === null && answered === null) answer = await ask(sent.endpoint)
        else await wait(500)
        setBusy(false)
        setRevealed(new Set(ORDER))
        setWarned(new Set(ORDER))
        setSubmits((n) => n + 1)
        const failing = ORDER.filter((key) => problem(key, sent) !== null || (key === 'endpoint' && answer !== null))
        if (failing.length === 0) setCreated(true)
        return failing
    }

    const focus = (key: Key) => {
        const input = inputs.current[key]
        if (input === null || input === undefined) return
        input.focus({ preventScroll: true })
        input.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }

    const recheck = () => {
        setRefused(null)
        void ask(values.endpoint)
    }

    const reset = () => {
        setValues(START)
        setRevealed(new Set())
        setWarned(new Set())
        setFixed(new Set())
        setRefused(null)
        setAnswered(null)
        setCreated(false)
        setSubmits(0)
    }

    /** The props an input takes to be this field. */
    const field = (key: Key) => ({
        id: id(key),
        name: key,
        ref: (node: HTMLInputElement | null) => {
            inputs.current[key] = node
        },
        value: values[key],
        spellCheck: false,
        autoComplete: 'off',
        autoCapitalize: 'off',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => set(key, event.target.value),
        onFocus: () => setFocused(key),
        onBlur: () => blur(key),
    })

    return {
        prefix,
        values,
        id,
        field,
        set,
        error,
        warn,
        errors: () => ORDER.map(error).filter((note) => note !== null),
        warnings: () => ORDER.map(warn).filter((note) => note !== null),
        fixed: (key: Key) => fixed.has(key) && error(key) === null,
        answered,
        checking,
        busy,
        created,
        submits,
        submitted: submits > 0,
        focused,
        submit,
        focus,
        recheck,
        reset,
    }
}

export type JobForm = ReturnType<typeof useJobForm>

/** The ids an input names as its description: its hint and what the form says about it. */
export function describedBy(...ids: (string | false | null | undefined)[]): string | undefined {
    const said = ids.filter((one) => typeof one === 'string' && one !== '').join(' ')
    return said === '' ? undefined : said
}

/** A field's label, the star of a required one, and its hint, or what replaces the hint. */
export function LabelRow({ form, k, aside }: { form: JobForm; k: Key; aside?: ReactNode }) {
    const spec = SPEC[k]
    return (
        <div className="flex min-w-0 items-baseline gap-2">
            <Label htmlFor={form.id(k)} className="shrink-0 leading-5">
                {spec.label}
                <span className="-ml-1 text-critical-ink" aria-hidden>
                    *
                </span>
                <span className="sr-only">required</span>
            </Label>
            {aside ?? (spec.hint !== undefined && <span className="min-w-0 truncate text-xs text-faint">{spec.hint}</span>)}
        </div>
    )
}

/** The fields laid out as the dialog draws them: code and name, the endpoint across, then schedule and timeout. */
export function Fields({ render }: { render: (key: Key) => ReactNode }) {
    return (
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {render('code')}
            {render('name')}
            <div className="min-w-0 sm:col-span-2">{render('endpoint')}</div>
            {render('schedule')}
            {render('timeout')}
        </div>
    )
}

/**
 * The "New job" dialog's frame, drawn in place rather than over the page so that options can be
 * set side by side: the title, the fields, and a footer with Cancel and Create. Create is never
 * shut; pressing it is how a person learns what is missing.
 */
export function JobDialog({
    form,
    onSubmit,
    status,
    top,
    children,
    live,
}: {
    form: JobForm
    onSubmit: () => void
    /** What the footer says beside the verbs. */
    status?: ReactNode
    /** Something between the title and the fields. */
    top?: ReactNode
    children: ReactNode
    /** A polite live region's words, for what arrives after focus has moved on. */
    live?: string
}) {
    return (
        <section
            role="dialog"
            aria-labelledby={`${form.prefix}-title`}
            aria-describedby={`${form.prefix}-lede`}
            className="w-full bg-popover text-sm text-popover-foreground ring-foreground/10 max-sm:border-y sm:max-w-lg sm:rounded-xl sm:shadow-pop sm:ring-1"
        >
            <form
                noValidate
                className="flex flex-col gap-4 p-4"
                onSubmit={(event) => {
                    event.preventDefault()
                    onSubmit()
                }}
            >
                <header className="flex flex-col gap-1">
                    <h2 id={`${form.prefix}-title`} className="text-base leading-6 font-medium">
                        New job
                    </h2>
                    <p id={`${form.prefix}-lede`} className="text-muted-foreground">
                        Calls the endpoint on its schedule, in the larkspur project.
                    </p>
                </header>
                {top}
                {children}
                <footer className="-mx-4 -mb-4 flex min-h-15 items-center justify-end gap-2 border-t bg-muted/50 px-4 py-3 sm:rounded-b-xl">
                    {status !== undefined && status !== null && <div className="mr-auto flex min-w-0 items-center overflow-hidden sm:mr-0">{status}</div>}
                    <Button type="button" variant="ghost" onClick={form.reset}>
                        Cancel
                    </Button>
                    <Button type="submit" aria-disabled={form.busy || undefined} className={cn(form.busy && 'cursor-progress')}>
                        {form.busy ? 'Creating…' : 'Create'}
                    </Button>
                </footer>
                <p aria-live="polite" className="sr-only">
                    {live}
                </p>
            </form>
        </section>
    )
}

/** What the dialog leaves behind once the job is created, with a way to open it again. */
export function Created({ form }: { form: JobForm }) {
    return (
        <section className="flex w-full flex-col items-start gap-3 bg-popover p-4 text-sm text-popover-foreground ring-foreground/10 max-sm:border-y sm:max-w-lg sm:rounded-xl sm:shadow-pop sm:ring-1">
            <p className="flex items-center gap-2 font-medium">
                <CircleCheck className="size-4 text-good-ink" aria-hidden />
                <span>
                    <span className="font-mono">{form.values.code}</span> created
                </span>
            </p>
            <p className="text-muted-foreground">
                The dialog closed and the job runs on its schedule. Open it again to see the problems once more.
            </p>
            <Button variant="outline" size="sm" onClick={form.reset}>
                Open the form again
            </Button>
        </section>
    )
}

/** One option's page: its letter, name, source and argument beside the dialog it draws. */
export function OptionPage({
    letter,
    title,
    source,
    notes,
    children,
}: {
    letter: string
    title: string
    source: string
    notes: [string, ReactNode][]
    children: ReactNode
}) {
    return (
        <div className="min-h-svh bg-background text-foreground">
            <div className="mx-auto grid max-w-6xl gap-6 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_32rem] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-5 lg:py-10">
                <header className="flex min-w-0 items-start gap-3 px-4 sm:px-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-base font-medium text-primary-foreground">
                        {letter}
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-page leading-8 font-medium">{title}</h1>
                        <p className="text-sm text-muted-foreground">{source}</p>
                    </div>
                </header>
                <div className="flex min-w-0 justify-center lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:justify-end">{children}</div>
                <dl className="grid min-w-0 content-start gap-x-4 gap-y-2.5 px-4 text-sm sm:grid-cols-[8rem_minmax(0,1fr)] sm:px-0 lg:col-start-1 lg:row-start-2">
                    {notes.map(([term, said]) => (
                        <div key={term} className="contents">
                            <dt className="text-xs leading-5 font-medium tracking-wide text-faint uppercase">{term}</dt>
                            <dd className="-mt-2 text-pretty sm:mt-0">{said}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </div>
    )
}
