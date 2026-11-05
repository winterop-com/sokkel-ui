import { useId } from 'react'

import { cn } from '../lib/cn'
import { describeCron, nextRuns } from '../lib/cron'
import { ISSUE_EDGE, IssueMark } from './IssueMark'
import { Input } from './ui/input'

export interface CronFieldWords {
    label: string
    invalid: string
    invalidDetail: string
    next: (count: number) => string
    /** Names the zone the expression and its runs are read in. */
    zone: string
    /** Said when the expression never fires. */
    never: string
}

const WORDS: CronFieldWords = {
    label: 'Schedule',
    invalid: 'Not a cron expression',
    invalidDetail: 'Five fields: minute, hour, day of the month, month, weekday. As in 0 2 * * 1-5.',
    next: (count) => `Next ${String(count)} runs`,
    zone: 'UTC',
    never: 'Never runs',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad = (number: number) => String(number).padStart(2, '0')

/** A run's time as `Fri 2026-11-06 02:00`, in UTC. */
function formatRun(date: Date): string {
    return `${DAYS[date.getUTCDay()]} ${String(date.getUTCFullYear())}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

/**
 * A cron expression typed in, read back in words under it, with the next runs it makes listed
 * after a given time. Presets fill the expression in one press. An expression that does not read
 * gets the issue mark, and the list keeps its rows, so the field never changes height.
 */
export function CronField({
    id: given,
    value,
    onChange,
    from,
    count = 5,
    presets,
    describe = describeCron,
    format = formatRun,
    issueOpen,
    onIssueOpenChange,
    className,
    words: said,
}: {
    id?: string
    value: string
    onChange: (value: string) => void
    /** The time the next runs are counted from: now, in an app. */
    from: Date
    count?: number
    presets?: readonly { label: string; value: string }[]
    /** Reads an expression back in words; English by default. */
    describe?: (expression: string) => string | null
    /** Draws a run's time. */
    format?: (date: Date) => string
    /** Whether the issue mark's message is open, for a form's count to open it. */
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    className?: string
    words?: Partial<CronFieldWords>
}) {
    const words = { ...WORDS, ...said }
    const own = useId()
    const id = given ?? own
    const reading = describe(value)
    const runs = reading === null ? [] : nextRuns(value, from, count)
    const issues = reading === null ? [{ tone: 'critical' as const, text: words.invalid, detail: words.invalidDetail }] : []
    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                    <label htmlFor={id} className="text-sm leading-5 font-medium">
                        {words.label}
                    </label>
                    <span className="font-mono text-xs text-muted-foreground">{words.zone}</span>
                </div>
                <div className="relative">
                    <Input
                        id={id}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        aria-invalid={reading === null || undefined}
                        className={cn('font-mono', reading === null && cn('pr-9', ISSUE_EDGE.critical))}
                    />
                    <IssueMark issues={issues} open={issueOpen} onOpenChange={onIssueOpenChange} />
                </div>
                {presets !== undefined && presets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {presets.map((preset) => (
                            <button
                                key={preset.value}
                                type="button"
                                onClick={() => onChange(preset.value)}
                                aria-pressed={preset.value === value}
                                className="rounded-chip border border-border px-2 py-0.5 text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-primary/50 aria-pressed:bg-primary/10 aria-pressed:text-foreground"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <p className={cn('min-h-5 text-sm leading-5', reading === null ? 'text-faint' : 'text-foreground')} aria-live="polite">
                {reading === null ? '—' : runs.length === 0 ? words.never : `${reading} (${words.zone})`}
            </p>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">{words.next(count)}</span>
                <ol className="flex flex-col divide-y divide-border rounded-control border border-border">
                    {Array.from({ length: count }, (_, index) => (
                        <li key={index} className="flex h-8 items-center gap-3 px-3 font-mono text-xs tabular-nums">
                            <span className="w-4 text-right text-faint">{index + 1}</span>
                            <span className={runs[index] === undefined ? 'text-faint' : undefined}>
                                {runs[index] === undefined ? '—' : format(runs[index])}
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    )
}
