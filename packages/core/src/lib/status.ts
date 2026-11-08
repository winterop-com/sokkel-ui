/** The states of a run, the ones every part knows without being told, each drawn in its own status color. */
export type RunStatus =
    | 'succeeded'
    | 'failed'
    | 'running'
    | 'queued'
    | 'pending'
    | 'waiting'
    | 'cancelled'
    | 'skipped'
    | 'completed_with_errors'

/**
 * The color a state is drawn in: one of the kind colors (good, critical, warning, info, neutral), or
 * a run state's own status color, such as `cancelled` for something set aside.
 */
export type StatusColor = 'good' | 'critical' | 'warning' | 'info' | 'neutral' | RunStatus

/** One state an app names: the words it is said in and the color it is drawn in. */
export interface StatusDefinition {
    /** The words, in lower case as a chip says them. Without it the state's own name is said, underscores as spaces. */
    label?: string
    color: StatusColor
}

/** The states an app knows, by the value its data holds. */
export type StatusMap = Readonly<Record<string, StatusDefinition>>

/** A state looked up: its words and its color. */
export interface ResolvedStatus {
    label: string
    color: StatusColor
}

export const RUN_STATUSES: readonly RunStatus[] = [
    'succeeded',
    'failed',
    'running',
    'queued',
    'pending',
    'waiting',
    'cancelled',
    'skipped',
    'completed_with_errors',
]

/** The run states, each in its own color and said by its name. */
export const RUN_STATUS_MAP: StatusMap = Object.fromEntries(RUN_STATUSES.map((status) => [status, { color: status }]))

/**
 * Each color as a CSS color, for a part that draws it (`Dot`, `Timeline`) or takes one (`Stat`'s and
 * `Segmented`'s `dot`, a chart series). It is the raw token, not Tailwind's `--color-*` name, which
 * exists only once a class uses it.
 */
export const STATUS_CSS: Readonly<Record<StatusColor, string>> = {
    good: 'var(--good)',
    critical: 'var(--critical)',
    warning: 'var(--warning)',
    info: 'var(--info)',
    neutral: 'var(--faint)',
    succeeded: 'var(--status-succeeded)',
    failed: 'var(--status-failed)',
    running: 'var(--status-running)',
    queued: 'var(--status-queued)',
    pending: 'var(--status-pending)',
    waiting: 'var(--status-waiting)',
    cancelled: 'var(--status-cancelled)',
    skipped: 'var(--status-skipped)',
    completed_with_errors: 'var(--status-completed-with-errors)',
}

/** Whether a value names a color a state can be drawn in. */
export function isStatusColor(value: string): value is StatusColor {
    return Object.hasOwn(STATUS_CSS, value)
}

/**
 * A state looked up in the app's map, then among the run states. A state neither knows is said by
 * its own name, underscores as spaces, and drawn neutral, so a value the app has not mapped yet still
 * reads.
 */
export function resolveStatus(status: string, map: StatusMap = RUN_STATUS_MAP): ResolvedStatus {
    const found = entry(map, status) ?? entry(RUN_STATUS_MAP, status)
    return { label: found?.label ?? status.replaceAll('_', ' '), color: found?.color ?? 'neutral' }
}

/** A map's own entry for a state, never one its prototype lends, such as `constructor`. */
function entry(map: StatusMap, status: string): StatusDefinition | undefined {
    return Object.hasOwn(map, status) ? map[status] : undefined
}
