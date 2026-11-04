import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronRight, Clock, Loader2, RotateCw, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '../../components/ui/popover'
import { cn } from '../../lib/cn'
import {
    Created,
    Fields,
    ICON,
    INK,
    INPUT_TONE,
    JobDialog,
    LabelRow,
    OptionPage,
    SPEC,
    describedBy,
    host,
    readSchedule,
    sayDuration,
    seconds,
    useJobForm,
    type JobForm,
    type Key,
    type Note,
    type Tone,
} from './job-form'

/** The words a screen reader hears before a message, so it is not taken for a hint. */
const PREFIX: Record<Tone, string> = { critical: 'Error: ', warning: 'Warning: ', good: '', quiet: '' }

/** A note said in full for a screen reader, the field's description while the eye reads something shorter. */
function Spoken({ id, note }: { id: string; note: Note }) {
    return (
        <span id={id} className="sr-only">
            {PREFIX[note.tone]}
            {note.text}. {note.detail}
        </span>
    )
}

/* ------------------------------------------------------------------------------------------------
 * A. The error summary at the head, after GOV.UK.
 * --------------------------------------------------------------------------------------------- */

function FieldA({ form, k }: { form: JobForm; k: Key }) {
    const error = form.error(k)
    const warn = form.warn(k)
    const id = form.id(k)
    return (
        <div className={cn('flex min-w-0 flex-col gap-1.5', error !== null && '-ml-3 border-l-4 border-critical pl-2')}>
            <LabelRow form={form} k={k} />
            {error !== null && (
                <p id={`${id}-error`} className="text-sm leading-5 font-medium text-critical-ink">
                    <span className="sr-only">Error: </span>
                    {error.text}
                    {error.server === true && error.detail !== undefined && (
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{error.detail}</span>
                    )}
                </p>
            )}
            <Input
                {...form.field(k)}
                aria-invalid={error !== null || undefined}
                aria-describedby={describedBy(error !== null && `${id}-error`, warn !== null && `${id}-warning`)}
                className={cn(
                    SPEC[k].mono === true && 'font-mono',
                    error !== null && [INPUT_TONE.critical, 'shadow-[inset_0_0_0_1px_var(--color-critical)]'],
                )}
            />
            {warn !== null && (
                <p id={`${id}-warning`} className="flex items-start gap-2 text-sm leading-5 font-medium">
                    <span
                        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] leading-none font-bold text-background"
                        aria-hidden
                    >
                        !
                    </span>
                    <span>
                        <span className="sr-only">Warning: </span>
                        {warn.text}
                    </span>
                </p>
            )}
        </div>
    )
}

function OptionA({ after = false }: { after?: boolean }) {
    const form = useJobForm({ prefix: after ? 'a-after' : 'a', timing: 'submit', after })
    const summary = useRef<HTMLDivElement>(null)
    const errors = form.errors()
    const submits = form.submits
    useEffect(() => {
        if (submits > 0 && !after) summary.current?.focus()
    }, [submits, after])
    if (form.created) return <Created form={form} />
    return (
        <JobDialog
            form={form}
            onSubmit={() => void form.submit()}
            top={
                form.submitted && errors.length > 0 ? (
                    <div
                        ref={summary}
                        tabIndex={-1}
                        className="rounded-lg border-2 border-critical/80 bg-critical/8 px-3.5 py-3 outline-none focus-visible:ring-3 focus-visible:ring-critical/30"
                    >
                        <div role="alert">
                            <h3 className="text-base leading-6 font-semibold">There is a problem</h3>
                            <ul className="mt-1.5 flex flex-col gap-1">
                                {errors.map((note) => (
                                    <li key={note.key}>
                                        <a
                                            href={`#${form.id(note.key)}`}
                                            onClick={(event) => {
                                                event.preventDefault()
                                                form.focus(note.key)
                                            }}
                                            className="font-medium text-critical-ink underline decoration-critical/50 underline-offset-3 hover:decoration-2 focus-visible:rounded-sm focus-visible:bg-warning/40 focus-visible:text-foreground focus-visible:no-underline focus-visible:outline-none"
                                        >
                                            {note.text}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : undefined
            }
        >
            <Fields render={(k) => <FieldA key={k} form={form} k={k} />} />
        </JobDialog>
    )
}

const NOTES_A: [string, ReactNode][] = [
    [
        'Where',
        'A box at the head of the dialog lists every problem as a link to its field. Each field says its own message again, above the input, with a bar down its side.',
    ],
    ['When', 'On Create only; nothing is said while typing or on leaving a field. A message goes as soon as its field is put right.'],
    ['Server', 'The refusal lands in the summary and at the endpoint like any other problem, in the same words.'],
    ['Warning', 'Said at its field and never in the summary, which holds only what stops Create.'],
    [
        'Screen reader',
        'Focus moves to the summary, which is an alert. Each message starts with a hidden “Error:”, and its input names it with aria-describedby.',
    ],
    ['For', 'Nothing is missed: one list, read first, with a way to each field. The most tested pattern there is.'],
    ['Against', 'Every message is said twice, and the box pushes a short form down.'],
]

/* ------------------------------------------------------------------------------------------------
 * B. The status beside the verb, after SAP Fiori's message popover.
 * --------------------------------------------------------------------------------------------- */

const VALUE_STATE: Record<'critical' | 'warning', string> = {
    critical: cn(INPUT_TONE.critical, 'shadow-[inset_0_-2px_0_var(--color-critical)]'),
    warning: cn(INPUT_TONE.warning, 'shadow-[inset_0_-2px_0_var(--color-warning)]'),
}

function FieldB({ form, k }: { form: JobForm; k: Key }) {
    const error = form.error(k)
    const note = error ?? form.warn(k)
    const id = form.id(k)
    const Icon = note === null ? null : ICON[note.tone]
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <LabelRow
                form={form}
                k={k}
                aside={
                    note !== null && Icon !== null ? (
                        <span className={cn('flex min-w-0 items-center gap-1 text-xs font-medium', INK[note.tone])} aria-hidden>
                            <Icon className="size-3.5 shrink-0" />
                            <span className="truncate">{note.short}</span>
                        </span>
                    ) : undefined
                }
            />
            <Input
                {...form.field(k)}
                aria-invalid={error !== null || undefined}
                aria-describedby={note === null ? undefined : `${id}-note`}
                className={cn(
                    SPEC[k].mono === true && 'font-mono',
                    note !== null && VALUE_STATE[note.tone === 'warning' ? 'warning' : 'critical'],
                )}
            />
            {note !== null && <Spoken id={`${id}-note`} note={note} />}
        </div>
    )
}

function MessageList({
    notes,
    onPick,
    heading,
}: {
    notes: Note[]
    onPick: (key: Key) => void
    heading: React.RefObject<HTMLDivElement | null>
}) {
    const errors = notes.filter((note) => note.tone === 'critical')
    const warnings = notes.filter((note) => note.tone === 'warning')
    const row = (note: Note) => {
        const Icon = ICON[note.tone]
        return (
            <li key={`${note.key}-${note.tone}`}>
                <button
                    type="button"
                    onClick={() => onPick(note.key)}
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                    <Icon className={cn('mt-0.5 size-4', INK[note.tone])} aria-hidden />
                    <span className="text-sm leading-5">{note.text}</span>
                    <span className="flex items-center gap-1 text-xs leading-5 text-muted-foreground">
                        {SPEC[note.key].label}
                        {note.server === true && <span className="rounded-sm bg-muted px-1 text-[11px] leading-4">server</span>}
                        <ChevronRight className="size-3.5 text-faint" aria-hidden />
                    </span>
                </button>
            </li>
        )
    }
    return (
        <>
            <div ref={heading} tabIndex={-1} className="flex items-baseline justify-between gap-3 border-b px-3 py-2 outline-none">
                <PopoverTitle>{errors.length > 0 ? 'Before the job can be created' : 'Worth a look'}</PopoverTitle>
                <PopoverDescription className="text-xs">Pick one to go to it</PopoverDescription>
            </div>
            <ul className="flex flex-col p-1">{errors.map(row)}</ul>
            {warnings.length > 0 && (
                <>
                    <p className="border-t px-3 pt-2 text-xs font-medium text-muted-foreground">Does not stop Create</p>
                    <ul className="flex flex-col p-1">{warnings.map(row)}</ul>
                </>
            )}
        </>
    )
}

function OptionB({ after = false }: { after?: boolean }) {
    const form = useJobForm({ prefix: after ? 'b-after' : 'b', timing: 'submit', after })
    const [open, setOpen] = useState(after)
    const heading = useRef<HTMLDivElement>(null)
    const errors = form.errors()
    const warnings = form.warnings()
    const notes = [...errors, ...warnings]
    const submits = form.submits
    useEffect(() => {
        if (submits > 0 && !after) setOpen(true)
    }, [submits, after])
    if (form.created) return <Created form={form} />
    const blocking = errors.length > 0
    const Icon = ICON[blocking ? 'critical' : 'warning']
    const status = form.busy ? (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Checking {host(form.values.endpoint) ?? 'the endpoint'}…
        </span>
    ) : form.submitted && notes.length > 0 ? (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        className={cn(
                            'gap-1.5',
                            blocking
                                ? 'border-critical/45 bg-critical/10 text-critical-ink hover:bg-critical/15 hover:text-critical-ink dark:border-critical/45 dark:bg-critical/15 dark:hover:bg-critical/20'
                                : 'border-warning/45 bg-warning/10 text-warning-ink hover:bg-warning/15 hover:text-warning-ink dark:border-warning/45 dark:bg-warning/15 dark:hover:bg-warning/20',
                        )}
                    />
                }
            >
                <Icon aria-hidden />
                <span>
                    {blocking ? `${errors.length} to fix` : `${warnings.length} to look at`}
                    {blocking && warnings.length > 0 && <span className="font-normal opacity-75">, {warnings.length} warning</span>}
                </span>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                align="end"
                sideOffset={8}
                initialFocus={heading}
                finalFocus={false}
                className="w-[min(25rem,calc(100vw-2rem))] gap-0 p-0"
            >
                <MessageList
                    heading={heading}
                    notes={notes}
                    onPick={(key) => {
                        setOpen(false)
                        window.setTimeout(() => form.focus(key), 0)
                    }}
                />
            </PopoverContent>
        </Popover>
    ) : null
    return (
        <JobDialog form={form} onSubmit={() => void form.submit()} status={status}>
            <Fields render={(k) => <FieldB key={k} form={form} k={k} />} />
        </JobDialog>
    )
}

const NOTES_B: [string, ReactNode][] = [
    [
        'Where',
        'The footer says how many things stop Create, right beside it. Pressing that opens the list, and each entry goes to its field. The fields carry a colored edge and a few words beside their label.',
    ],
    ['When', 'On Create, which opens the list by itself. A field’s mark goes as soon as it is put right.'],
    ['Server', 'The refusal joins the list, marked as coming from the server, and marks the endpoint.'],
    ['Warning', 'In the list under the errors, in its own color. Create still goes.'],
    ['Screen reader', 'The list takes focus when it opens. Each input names its full message with aria-describedby.'],
    ['For', 'The reason is where the eye already is, at the verb just pressed, and the form never moves.'],
    ['Against', 'The cause is told away from its field, and on a phone the list covers the form.'],
]

/* ------------------------------------------------------------------------------------------------
 * C. An icon in the input and the message in a bubble, after Atlassian's inline message and
 * Material's trailing error icon.
 * --------------------------------------------------------------------------------------------- */

function Bubble({ anchor, note, open }: { anchor: React.RefObject<HTMLDivElement | null>; note: Note | null; open: boolean }) {
    if (note === null) return null
    const Icon = ICON[note.tone]
    return (
        <TooltipPrimitive.Root open={open}>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Positioner anchor={anchor} side="bottom" align="start" sideOffset={8} className="isolate z-50">
                    <TooltipPrimitive.Popup
                        aria-hidden
                        className="pointer-events-none relative flex w-max max-w-[min(20rem,calc(100vw-2rem))] items-start gap-2 rounded-lg bg-popover py-2 pr-3 pl-3.5 text-sm text-popover-foreground shadow-pop ring-1 ring-foreground/10 transition-[opacity,transform] duration-100 data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:opacity-0"
                    >
                        <TooltipPrimitive.Arrow className="size-2.5 rotate-45 border-foreground/10 bg-popover data-[side=bottom]:-top-[5px] data-[side=bottom]:border-t data-[side=bottom]:border-l data-[side=top]:-bottom-[5px] data-[side=top]:border-r data-[side=top]:border-b" />
                        <span
                            className={cn(
                                'absolute inset-y-0 left-0 w-1 rounded-l-lg',
                                note.tone === 'warning' ? 'bg-warning' : 'bg-critical',
                            )}
                            aria-hidden
                        />
                        <Icon className={cn('mt-0.5 size-4 shrink-0', INK[note.tone])} aria-hidden />
                        <div className="min-w-0">
                            <p className="leading-5 font-medium">{note.text}</p>
                            {note.detail !== undefined && <p className="mt-0.5 text-xs text-muted-foreground">{note.detail}</p>}
                        </div>
                    </TooltipPrimitive.Popup>
                </TooltipPrimitive.Positioner>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    )
}

/** The icon a field shows at its end: a spinner while the server is asked, else its tone's mark. */
function StatusMark({ tone, spin }: { tone: Tone | null; spin: boolean }) {
    if (!spin && tone === null) return null
    const Icon: LucideIcon = spin ? Loader2 : ICON[tone ?? 'quiet']
    return (
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center" aria-hidden>
            <Icon className={cn('size-4', spin ? 'animate-spin text-muted-foreground' : INK[tone ?? 'quiet'])} />
        </span>
    )
}

function FieldC({ form, k, open = false }: { form: JobForm; k: Key; open?: boolean }) {
    const anchor = useRef<HTMLDivElement>(null)
    const [hover, setHover] = useState(false)
    const error = form.error(k)
    const note = error ?? form.warn(k)
    const id = form.id(k)
    const good = note === null && (form.fixed(k) || (k === 'endpoint' && form.answered !== null))
    const spin = k === 'endpoint' && form.checking
    const tone: Tone | null = note?.tone ?? (good ? 'good' : null)
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <LabelRow form={form} k={k} />
            <div ref={anchor} className="relative" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
                <Input
                    {...form.field(k)}
                    aria-invalid={error !== null || undefined}
                    aria-describedby={note === null ? undefined : `${id}-note`}
                    className={cn(
                        SPEC[k].mono === true && 'font-mono',
                        (tone !== null || spin) && 'pr-8',
                        note !== null && INPUT_TONE[note.tone === 'warning' ? 'warning' : 'critical'],
                    )}
                />
                <StatusMark tone={tone} spin={spin} />
            </div>
            {note !== null && <Spoken id={`${id}-note`} note={note} />}
            <Bubble anchor={anchor} note={note} open={note !== null && (open || hover || form.focused === k)} />
        </div>
    )
}

function OptionC({ after = false }: { after?: boolean }) {
    const form = useJobForm({ prefix: after ? 'c-after' : 'c', timing: 'blur', after })
    if (form.created) return <Created form={form} />
    const first = after ? (form.errors()[0]?.key ?? null) : null
    return (
        <JobDialog
            form={form}
            onSubmit={async () => {
                const failing = await form.submit()
                if (failing[0] !== undefined) form.focus(failing[0])
            }}
        >
            <Fields render={(k) => <FieldC key={k} form={form} k={k} open={k === first && form.focused === null} />} />
        </JobDialog>
    )
}

const NOTES_C: [string, ReactNode][] = [
    ['Where', 'An icon inside the input marks it. The message opens in a bubble under the field while it has focus or the pointer.'],
    [
        'When',
        'On leaving a field that has a value, and on Create. The keystroke that puts it right clears it and leaves a check in its place.',
    ],
    ['Server', 'The refusal marks the endpoint like any other problem; its bubble says what happened and what to try.'],
    ['Warning', 'A warning icon, and a bubble in the warning color.'],
    [
        'Screen reader',
        'Create moves focus to the first field with a problem. The bubble is drawn for the eye; the input names the same words with aria-describedby.',
    ],
    ['For', 'The form never changes size, and the message sits where the typing is.'],
    ['Against', 'One message shows at a time, the bubble covers the field below, and a glance at the form does not say why.'],
]

/* ------------------------------------------------------------------------------------------------
 * D. The message joined to its field, offering the fix, after GitHub Primer's validation message
 * and GitHub's repository-name check.
 * --------------------------------------------------------------------------------------------- */

const FRAME: Record<Tone, string> = {
    quiet: 'border-input has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50',
    critical: 'border-critical/70 has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-critical/25',
    warning: 'border-warning/70 has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-warning/25',
    good: 'border-good/55 has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-good/25',
}

const STRIP: Record<Tone, string> = {
    quiet: 'border-border bg-muted/50 text-muted-foreground',
    critical: 'border-critical/30 bg-critical/10 text-critical-ink',
    warning: 'border-warning/30 bg-warning/10 text-warning-ink',
    good: 'border-good/25 bg-good/10 text-good-ink',
}

function FieldD({ form, k }: { form: JobForm; k: Key }) {
    const error = form.error(k)
    const warn = form.warn(k)
    const id = form.id(k)
    const spin = k === 'endpoint' && form.checking
    const answered = k === 'endpoint' && error === null && form.answered !== null
    const note: Note | null =
        error ?? warn ?? (answered ? { key: k, tone: 'good', text: `${form.answered} answered in 84 ms`, short: 'Answered' } : null)
    const tone: Tone = note?.tone ?? 'quiet'
    const Icon = ICON[tone]
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <LabelRow form={form} k={k} />
            <div className={cn('overflow-hidden rounded-lg border bg-field transition-[border-color,box-shadow]', FRAME[tone])}>
                <div className="relative">
                    <Input
                        {...form.field(k)}
                        aria-invalid={error !== null || undefined}
                        aria-describedby={note === null ? undefined : `${id}-note`}
                        className={cn(
                            'rounded-none border-0 bg-transparent focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
                            SPEC[k].mono === true && 'font-mono',
                            spin && 'pr-8',
                        )}
                    />
                    <StatusMark tone={null} spin={spin} />
                </div>
                {note !== null && (
                    <div id={`${id}-note`} className={cn('flex items-start gap-2 border-t px-2.5 py-2 text-xs', STRIP[tone])}>
                        <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                            <div>
                                <p className="leading-5 font-medium">
                                    <span className="sr-only">{PREFIX[tone]}</span>
                                    {note.text}
                                </p>
                                {note.detail !== undefined && note.fix === undefined && (
                                    <p className="text-muted-foreground">{note.detail}</p>
                                )}
                            </div>
                            {note.fix !== undefined && (
                                <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    onClick={() => {
                                        if (note.fix === undefined) return
                                        form.set(k, note.fix)
                                        form.focus(k)
                                    }}
                                >
                                    Use{' '}
                                    {SPEC[k].mono === true ? (
                                        <span className="font-mono">{note.fix}</span>
                                    ) : k === 'name' ? (
                                        <span>“{note.fix}”</span>
                                    ) : (
                                        <span>{note.fix}</span>
                                    )}
                                </Button>
                            )}
                            {note.server === true && (
                                <Button type="button" size="xs" variant="outline" onClick={form.recheck}>
                                    <RotateCw aria-hidden />
                                    Check again
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function OptionD({ after = false }: { after?: boolean }) {
    const form = useJobForm({ prefix: after ? 'd-after' : 'd', timing: 'blur', after })
    if (form.created) return <Created form={form} />
    return (
        <JobDialog
            form={form}
            onSubmit={async () => {
                const failing = await form.submit()
                if (failing[0] !== undefined) form.focus(failing[0])
            }}
            live={form.checking ? `Checking ${host(form.values.endpoint) ?? 'the endpoint'}` : undefined}
        >
            <Fields render={(k) => <FieldD key={k} form={form} k={k} />} />
        </JobDialog>
    )
}

const NOTES_D: [string, ReactNode][] = [
    [
        'Where',
        'The message joins its input as one block, under it, with a button that applies the fix whenever one is known. A passing server check says so in green.',
    ],
    [
        'When',
        'Reward early, punish late: a field is judged on leaving it, then on every keystroke until it is right, then left alone until it is left again.',
    ],
    ['Server', 'The refusal lands on the endpoint with Check again beside it, so the person need not press Create to retry.'],
    ['Warning', 'The same block in the warning color, with the value that avoids it.'],
    [
        'Screen reader',
        'Create moves focus to the first field with a problem. The block is the input’s description, with a hidden “Error:”.',
    ],
    ['For', 'Every message is a way out, as WCAG 3.3.3 asks: one press fixes the code, the name and the timeout.'],
    ['Against', 'Each rule needs its fix written, and the form grows as blocks arrive.'],
]

/* ------------------------------------------------------------------------------------------------
 * E. Checked as you go, after Stripe Checkout and Vercel's interface guidelines.
 * --------------------------------------------------------------------------------------------- */

/** What the line under a field says: a problem when there is one, else the value read back. */
function lineE(form: JobForm, k: Key): { tone: Tone; text: string; icon?: LucideIcon } {
    const error = form.error(k)
    if (error !== null) {
        const more = error.detail ?? ''
        const text = more === '' ? error.text : more.startsWith('As in') ? `${error.text}, a${more.slice(1, -1)}` : `${error.text}. ${more}`
        return { tone: 'critical', text }
    }
    const warn = form.warn(k)
    const value = form.values[k].trim()
    if (warn !== null) return { tone: 'warning', text: `${sayDuration(seconds(value) ?? 0)}: ${warn.text.toLowerCase()}` }
    switch (k) {
        case 'code':
            return { tone: 'quiet', text: value === '' ? 'Lowercase, as in nightly-export' : `In addresses as larkspur/jobs/${value}` }
        case 'name':
            return { tone: 'quiet', text: 'Shown in lists and alerts' }
        case 'endpoint': {
            const at = host(value)
            if (form.checking) return { tone: 'quiet', text: `Checking ${at ?? 'the endpoint'}…` }
            if (form.answered !== null) return { tone: 'good', text: `${form.answered} answered in 84 ms` }
            return {
                tone: 'quiet',
                text: at === null ? 'A full address, starting with https://' : `${at} is asked when you leave the field`,
            }
        }
        case 'schedule':
            return { tone: 'quiet', text: readSchedule(value)?.reading ?? 'Minute, hour, day, month, weekday', icon: Clock }
        case 'timeout': {
            const total = seconds(value)
            return { tone: 'quiet', text: total === null ? 'As 15m, 2h or 1h30m' : sayDuration(total) }
        }
    }
}

function FieldE({ form, k }: { form: JobForm; k: Key }) {
    const error = form.error(k)
    const warn = form.warn(k)
    const id = form.id(k)
    const line = lineE(form, k)
    const spin = k === 'endpoint' && form.checking
    const good = error === null && warn === null && (form.fixed(k) || (k === 'endpoint' && form.answered !== null))
    const tone: Tone | null = error !== null ? 'critical' : warn !== null ? 'warning' : good ? 'good' : null
    const Icon = line.icon ?? (line.tone === 'quiet' ? null : ICON[line.tone])
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <LabelRow form={form} k={k} />
            <div className="relative">
                <Input
                    {...form.field(k)}
                    aria-invalid={error !== null || undefined}
                    aria-describedby={`${id}-line`}
                    className={cn(
                        SPEC[k].mono === true && 'font-mono',
                        (tone !== null || spin) && 'pr-8',
                        error !== null && INPUT_TONE.critical,
                        warn !== null && INPUT_TONE.warning,
                    )}
                />
                <StatusMark tone={tone} spin={spin} />
            </div>
            <p id={`${id}-line`} className={cn('flex min-h-4.5 items-start gap-1.5 text-xs leading-4.5', INK[line.tone])}>
                {Icon !== null && <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />}
                <span className={cn('min-w-0', line.tone === 'critical' && 'font-medium')}>
                    <span className="sr-only">{PREFIX[line.tone]}</span>
                    {line.text}
                </span>
            </p>
        </div>
    )
}

function OptionE({ after = false }: { after?: boolean }) {
    const form = useJobForm({ prefix: after ? 'e-after' : 'e', timing: 'blur', after, checkOnBlur: true })
    if (form.created) return <Created form={form} />
    const refused = form.error('endpoint')
    const live = form.checking
        ? `Checking ${host(form.values.endpoint) ?? 'the endpoint'}`
        : refused?.server === true
          ? `${refused.text}. ${refused.detail ?? ''}`
          : form.answered !== null
            ? `${form.answered} answered.`
            : undefined
    return (
        <JobDialog
            form={form}
            onSubmit={async () => {
                const failing = await form.submit()
                if (failing[0] !== undefined) form.focus(failing[0])
            }}
            live={live}
        >
            <Fields render={(k) => <FieldE key={k} form={form} k={k} />} />
        </JobDialog>
    )
}

const NOTES_E: [string, ReactNode][] = [
    [
        'Where',
        'Every field keeps one line under it that reads the value back: every hour, 2 hours. A problem takes that line over, and a mark sits at the input’s end.',
    ],
    ['When', 'On leaving a field, the endpoint included: the server is asked as soon as the address is complete, before Create.'],
    ['Server', 'The refusal arrives while the rest is still being filled in, with a spinner in the input during the check.'],
    ['Warning', 'The reading turns to the warning color and says what the value means.'],
    [
        'Screen reader',
        'The line is the input’s description. A polite live region says what the server answered, since it arrives after focus has moved on.',
    ],
    [
        'For',
        'The reading catches what no rule can (a schedule that says every hour when every day was meant), and the refusal does not wait for Create.',
    ],
    ['Against', 'A line under every field costs height, and leaving the endpoint costs a request each time.'],
]

/* ------------------------------------------------------------------------------------------------ */

interface Option {
    letter: string
    title: string
    source: string
    notes: [string, ReactNode][]
    Form: (props: { after?: boolean }) => ReactNode
}

const OPTIONS: Option[] = [
    {
        letter: 'A',
        title: 'Error summary at the head',
        source: 'After GOV.UK’s error summary and error message',
        notes: NOTES_A,
        Form: OptionA,
    },
    {
        letter: 'B',
        title: 'Status beside the verb',
        source: 'After SAP Fiori’s message popover, carried in the dialog footer',
        notes: NOTES_B,
        Form: OptionB,
    },
    {
        letter: 'C',
        title: 'Icon in the input, message on focus',
        source: 'After Atlassian’s inline message and Material’s trailing error icon',
        notes: NOTES_C,
        Form: OptionC,
    },
    {
        letter: 'D',
        title: 'The message offers the fix',
        source: 'After GitHub Primer’s validation message and GitHub’s repository-name check',
        notes: NOTES_D,
        Form: OptionD,
    },
    {
        letter: 'E',
        title: 'Checked as you go',
        source: 'After Stripe Checkout and Vercel’s interface guidelines',
        notes: NOTES_E,
        Form: OptionE,
    },
]

function Page({ letter, after = false }: { letter: string; after?: boolean }) {
    const option = OPTIONS.find((one) => one.letter === letter)
    if (option === undefined) return null
    const { Form } = option
    return (
        <OptionPage letter={option.letter} title={option.title} source={option.source} notes={option.notes}>
            <Form after={after} />
        </OptionPage>
    )
}

/** Every option as it stands after one Create, two to a row. */
function Compare() {
    return (
        <div className="min-h-svh bg-background py-6 text-foreground sm:px-6 lg:py-10">
            <div className="mx-auto grid max-w-[68rem] gap-x-10 gap-y-12 lg:grid-cols-2">
                {OPTIONS.map(({ letter, title, source, Form }) => (
                    <figure key={letter} className="flex min-w-0 flex-col gap-3">
                        <figcaption className="flex items-start gap-2.5 px-4 sm:px-0">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-xs font-medium text-primary-foreground">
                                {letter}
                            </span>
                            <span className="min-w-0 text-sm">
                                <span className="font-medium">{title}</span>
                                <span className="block text-xs text-muted-foreground">{source}</span>
                            </span>
                        </figcaption>
                        <Form after />
                    </figure>
                ))}
            </div>
        </div>
    )
}

/**
 * Five ways a form can say a value is wrong, each drawn on the same "New job" dialog with the same
 * three problems: a required name left empty, a code that starts with a digit, and an endpoint the
 * server could not reach. A timeout longer than the time between runs is the warning in each.
 * Every interactive story opens with those values typed in; press Create to see what happens.
 */
const meta: Meta = { title: 'Research/Validation' }
export default meta

type Story = StoryObj

export const AErrorSummary: Story = { name: 'A. Error summary', render: () => <Page letter="A" /> }
export const AErrorSummaryAfterSubmit: Story = { name: 'A. Error summary, after Create', render: () => <Page letter="A" after /> }
export const BStatusBesideVerb: Story = { name: 'B. Status beside the verb', render: () => <Page letter="B" /> }
export const BStatusBesideVerbAfterSubmit: Story = {
    name: 'B. Status beside the verb, after Create',
    render: () => <Page letter="B" after />,
}
export const CIconAndBubble: Story = { name: 'C. Icon and bubble', render: () => <Page letter="C" /> }
export const CIconAndBubbleAfterSubmit: Story = { name: 'C. Icon and bubble, after Create', render: () => <Page letter="C" after /> }
export const DMessageWithFix: Story = { name: 'D. Message with the fix', render: () => <Page letter="D" /> }
export const DMessageWithFixAfterSubmit: Story = { name: 'D. Message with the fix, after Create', render: () => <Page letter="D" after /> }
export const ECheckedAsYouGo: Story = { name: 'E. Checked as you go', render: () => <Page letter="E" /> }
export const ECheckedAsYouGoAfterSubmit: Story = { name: 'E. Checked as you go, after Create', render: () => <Page letter="E" after /> }
export const CompareAfterSubmit: Story = { name: 'All options, after Create', render: () => <Compare /> }
