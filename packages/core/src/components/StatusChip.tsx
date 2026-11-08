import { cn } from '../lib/cn'

/** The states a status chip knows, each drawn in its own status color. */
export type Status =
    | 'succeeded'
    | 'failed'
    | 'running'
    | 'queued'
    | 'pending'
    | 'waiting'
    | 'cancelled'
    | 'skipped'
    | 'completed_with_errors'

const TONE: Record<Status, string> = {
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

/**
 * A state as a small chip: the status's own color on a faint wash of it, the word lowercase.
 * Status colors are the only color voice a chip has; `label` overrides the word, for an app
 * that says it in another language.
 */
export function StatusChip({ status, label, className }: { status: Status; label?: string; className?: string }) {
    return (
        <span className={cn('inline-flex items-center rounded-chip px-1.5 py-0.5 text-badge whitespace-nowrap', TONE[status], className)}>
            {label ?? status.replaceAll('_', ' ')}
        </span>
    )
}
