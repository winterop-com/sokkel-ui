import { cn } from '../lib/cn'
import type { RunStatus, StatusColor, StatusMap } from '../lib/status'
import { Dot } from './Dot'
import { useStatus } from './StatusProvider'

export type { RunStatus, StatusColor, StatusDefinition, StatusMap } from '../lib/status'

/** The states a status chip knows without being told: a run's, each drawn in its own status color. */
export type Status = RunStatus

/** Each color as a chip: a faint wash of it with its ink, a skip as a dashed edge. */
const CHIP: Record<StatusColor, string> = {
    good: 'bg-good/15 text-good-ink',
    critical: 'bg-critical/15 text-critical-ink',
    warning: 'bg-warning/15 text-warning-ink',
    info: 'bg-info/15 text-info-ink',
    neutral: 'bg-faint/15 text-muted-foreground',
    succeeded: 'bg-status-succeeded/15 text-status-succeeded-ink',
    failed: 'bg-status-failed/15 text-status-failed-ink',
    running: 'bg-status-running/15 text-status-running-ink',
    queued: 'bg-status-queued/15 text-status-queued-ink',
    pending: 'bg-status-pending/15 text-status-pending-ink',
    waiting: 'bg-status-waiting/15 text-status-waiting-ink',
    cancelled: 'bg-status-cancelled/15 text-status-cancelled-ink',
    skipped: 'border border-dashed border-status-skipped/50 text-status-skipped-ink',
    completed_with_errors: 'bg-status-completed-with-errors/15 text-status-completed-with-errors-ink',
}

/** A running state's dot pulses, as a running node does; motion.css stills it with the motion setting. */
const LIVE = 'animate-pulse'

export interface StatusChipProps {
    /** A run state, or any state the app names in `statuses` or a `StatusProvider`. */
    status: Status | (string & {})
    /** The words, over the map's. */
    label?: string
    /** States for this chip alone, over the provider's. */
    statuses?: StatusMap
    /** A status dot before the word, the 8px `Dot` a status dot beside it draws; a running state's pulses. */
    dot?: boolean
    className?: string
}

/**
 * A state as a small chip: the state's own color on a faint wash of it, the word lowercase. The
 * run states are known as they are; an app's own states (`draft`, `review`, `published`) take
 * their words and a color (good, critical, warning, info, neutral, or a run state's) from
 * `statuses` or a `StatusProvider` around the app. `label` overrides the word, for one chip that
 * says more, such as a count.
 */
export function StatusChip({ status, label, statuses, dot = false, className }: StatusChipProps) {
    const look = useStatus(status, statuses)
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-chip px-1.5 py-0.5 text-badge whitespace-nowrap',
                CHIP[look.color],
                className,
            )}
        >
            {dot && <Dot color={look.css} size="md" className={cn(look.color === 'running' && LIVE)} />}
            {label ?? look.label}
        </span>
    )
}
