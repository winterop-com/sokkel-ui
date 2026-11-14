import { useId, useState, type HTMLAttributes } from 'react'

import { cn } from '../lib/cn'
import { describeCron, nextRuns, parseCron, zonedTime, zoneOffset } from '../lib/cron'
import { FIELD_WORDS, type FieldWords, type RequiredMark } from './Field'
import { ISSUE_EDGE, IssueMark } from './IssueMark'
import { Input } from './ui/input'

export interface CronFieldWords extends FieldWords {
    label: string
    invalid: string
    invalidDetail: string
    next: (count: number) => string
    /** Names the zone the expression and its runs are read in; the `timeZone` itself by default, and none when empty. */
    zone: string
    /** Said when the expression never fires. */
    never: string
    /** Said beside the runs while the app reads them back. */
    checking: string
    /** Said in place of the runs while the schedule is paused; empty says nothing. */
    paused: string
    /** Said of a required field left empty, once it has been left. */
    missing: string
}

const WORDS: CronFieldWords = {
    label: 'Schedule',
    invalid: 'Not a cron expression',
    invalidDetail: 'Five fields: minute, hour, day of the month, month, weekday. As in 0 2 * * 1-5.',
    next: (count) => `Next ${String(count)} runs`,
    zone: 'UTC',
    never: 'Never runs',
    checking: 'Checking',
    paused: 'Paused, so no runs are coming',
    missing: 'Enter a schedule',
    ...FIELD_WORDS,
}

const defaultDescribe = (expression: string) => describeCron(expression)

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad = (number: number) => String(number).padStart(2, '0')

function offsetOf(date: Date, timeZone: string): string {
    const minutes = zoneOffset(date, timeZone) / 60_000
    const size = Math.abs(minutes)
    return `${minutes < 0 ? '-' : '+'}${pad(Math.floor(size / 60))}:${pad(size % 60)}`
}

/**
 * A run's time as `Fri 2026-11-06 02:00`, on the wall clock of `timeZone`. Outside UTC it ends in
 * the zone's offset at that time, `+02:00`, so a change of clocks shows.
 */
function formatRun(date: Date, timeZone: string): string {
    const at = zonedTime(date, timeZone)
    const time = `${DAYS[at.weekday]} ${String(at.year)}-${pad(at.month)}-${pad(at.day)} ${pad(at.hour)}:${pad(at.minute)}`
    return timeZone === 'UTC' ? time : `${time} ${offsetOf(date, timeZone)}`
}

export interface CronFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'id' | 'onChange' | 'className' | 'children'> {
    id?: string
    value: string
    onChange: (value: string) => void
    /** The time the next runs are counted from: now, in an app. */
    from: Date
    count?: number
    /**
     * The IANA zone the expression is read in, such as Europe/Oslo; UTC by default. The runs are
     * counted and drawn on its wall clock, changes of clocks included.
     */
    timeZone?: string
    /**
     * The next runs as the app's server reads them back, in place of the field's own reading. Null
     * or left out, the field counts them itself.
     */
    runs?: readonly Date[] | null
    /**
     * The app is reading the runs back: the field's own runs show muted, the words say it is
     * checking, and the field marks no issue of its own while it waits for the app's verdict.
     */
    runsPending?: boolean
    /**
     * The app's server refused the expression: its words, shown as the field's issue. Once the app
     * passes `runs` or `invalid`, its verdict is the field's: an expression its server takes, in a
     * syntax the field's own reading does not know (an offset from the month's end, `L-3`), is valid. A
     * refused expression is not read back in words.
     */
    invalid?: string
    /**
     * Marked by a star after the label, as a required `Field` is; the input says so with
     * `aria-required`, and once it is left empty it says `words.missing` with its issue mark.
     */
    required?: boolean
    /** How `required` is marked: a star in the label, or the word after it and outside it. */
    requiredMark?: RequiredMark
    /** An example expression shown in the empty input, such as `0 2 * * *`. */
    placeholder?: string
    /** Draws the expression, its reading and its next runs, with no input and no presets. */
    readOnly?: boolean
    /** The schedule is paused: the expression is still read in words, and the runs give way to `words.paused`. */
    paused?: boolean
    presets?: readonly { label: string; value: string }[]
    /**
     * Reads an expression back in words, its hours on the wall clock of the zone; `describeCron` in
     * English by default, which takes words for another language. Null leaves the line empty. For
     * an expression `describeCron` cannot read (`L-3`), return the server's reading:
     * `(expression) => describeCron(expression) ?? serverReading`.
     */
    describe?: (expression: string, timeZone: string) => string | null
    /** Draws a run's time, given the zone it is read in. */
    format?: (date: Date, timeZone: string) => string
    /** Whether the issue mark's message is open, for a form's count to open it. */
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    className?: string
    words?: Partial<CronFieldWords>
}

/**
 * A cron expression typed in, read back in words under it, with the next runs it makes listed
 * after a given time, in a time zone. Presets fill the expression in one press. An expression that
 * does not read, or that the app's server refuses, gets the issue mark, and the list keeps its rows,
 * so the field never changes height. An app whose server reads the runs back passes them in, and
 * says when it is still asking; from then on the server's verdict is the field's, and the field's
 * own reading only puts the expression in words. An empty field says nothing yet. `readOnly` draws
 * a saved schedule with no input, `paused` one that will not run, and `count={0}` lists no runs.
 * `required` marks the label as a required `Field` does, and a required field left empty says so once it is left.
 * Other attributes go on the root.
 */
export function CronField({
    id: given,
    value,
    onChange,
    from,
    count = 5,
    timeZone = 'UTC',
    runs: told,
    runsPending = false,
    invalid,
    required = false,
    requiredMark = 'star',
    placeholder,
    readOnly = false,
    paused = false,
    presets,
    describe = defaultDescribe,
    format = formatRun,
    issueOpen,
    onIssueOpenChange,
    className,
    words: said,
    ...rest
}: CronFieldProps) {
    const words = { ...WORDS, zone: timeZone, ...said }
    const own = useId()
    const id = given ?? own
    const empty = value.trim() === ''
    // Whether the input has been left once, so an empty required field is said only after it.
    const [left, setLeft] = useState(false)
    const missing = required && empty && left && !readOnly
    const reading = empty ? null : describe(value, timeZone)
    // Runs, a refusal or a pending answer from the app: the app decides, and the field's own parse only reads the expression in words.
    const appVerdict = told != null || invalid !== undefined || runsPending
    const refused = !empty && invalid !== undefined && !runsPending
    const unread = !empty && !appVerdict && parseCron(value) === null
    const bad = refused || unread || missing
    const runs = empty || refused || unread ? [] : told != null && !runsPending ? told : nextRuns(value, from, count, timeZone)
    const issues = unread
        ? [{ tone: 'critical' as const, text: words.invalid, detail: words.invalidDetail }]
        : refused
          ? [{ tone: 'critical' as const, text: invalid }]
          : missing
            ? [{ tone: 'critical' as const, text: words.missing }]
            : []
    const line = empty || refused ? '' : !paused && !bad && !runsPending && runs.length === 0 ? words.never : (reading ?? '')
    const star = required && requiredMark === 'star' && (
        <>
            <span className="ml-1 text-critical-ink" aria-hidden>
                *
            </span>
            <span className="sr-only">{words.required}</span>
        </>
    )
    return (
        <div {...rest} className={cn('flex flex-col gap-3', className)}>
            <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                    {readOnly ? (
                        <span id={`${id}-label`} className="text-sm leading-5 font-medium">
                            {words.label}
                            {star}
                        </span>
                    ) : (
                        <label htmlFor={id} className="text-sm leading-5 font-medium">
                            {words.label}
                            {star}
                        </label>
                    )}
                    {required && requiredMark === 'word' && <span className="text-xs text-muted-foreground">{words.required}</span>}
                    {words.zone !== '' && <span className="font-mono text-xs text-muted-foreground">{words.zone}</span>}
                </div>
                {readOnly ? (
                    <p id={id} aria-labelledby={`${id}-label`} className="min-h-5 font-mono text-sm leading-5 break-all">
                        {empty ? <span className="text-faint">—</span> : value}
                    </p>
                ) : (
                    <div className="relative">
                        <Input
                            id={id}
                            value={value}
                            onChange={(event) => onChange(event.target.value)}
                            onBlur={() => setLeft(true)}
                            placeholder={placeholder}
                            spellCheck={false}
                            autoCapitalize="off"
                            autoComplete="off"
                            aria-invalid={bad || undefined}
                            aria-required={required || undefined}
                            className={cn('font-mono', bad && cn('pr-9', ISSUE_EDGE.critical))}
                        />
                        <IssueMark issues={issues} open={issueOpen} onOpenChange={onIssueOpenChange} words={words} />
                    </div>
                )}
                {!readOnly && presets !== undefined && presets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {presets.map((preset) => (
                            <button
                                key={preset.value}
                                type="button"
                                onClick={() => onChange(preset.value)}
                                aria-pressed={preset.value === value}
                                className="rounded-chip border border-border px-2 py-0.5 text-xs text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-focus focus-visible:ring-ring/50 aria-pressed:border-primary/50 aria-pressed:bg-primary/10 aria-pressed:text-foreground"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <p className="min-h-5 text-sm leading-5 text-foreground" aria-live="polite">
                {line}
            </p>
            {paused
                ? words.paused !== '' && <p className="text-xs leading-5 text-muted-foreground">{words.paused}</p>
                : count > 0 && (
                      <div className="flex flex-col gap-1.5">
                          <div className="flex items-baseline gap-2 text-xs">
                              <span className="font-medium text-muted-foreground">{words.next(count)}</span>
                              {runsPending && <span className="animate-pulse text-faint">{words.checking}</span>}
                          </div>
                          <ol
                              aria-busy={runsPending || undefined}
                              className={cn(
                                  'flex flex-col divide-y divide-border rounded-control border border-border',
                                  runsPending && 'text-muted-foreground',
                              )}
                          >
                              {Array.from({ length: count }, (_, index) => (
                                  <li key={index} className="flex h-8 items-center gap-3 px-3 font-mono text-xs tabular-nums">
                                      <span className="w-4 text-right text-faint">{index + 1}</span>
                                      <span className={runs[index] === undefined ? 'text-faint' : undefined}>
                                          {runs[index] === undefined ? '—' : format(runs[index], timeZone)}
                                      </span>
                                  </li>
                              ))}
                          </ol>
                      </div>
                  )}
        </div>
    )
}
