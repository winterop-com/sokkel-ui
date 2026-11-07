import type { FilterOption } from '../../components/FilterChip'
import { PersonAvatar } from '../../components/PersonAvatar'
import { StatusChip, type Status } from '../../components/StatusChip'

/** The values the toolbars' filter chips offer, from Tidevann's workspace. */

const STATUSES: Status[] = ['succeeded', 'failed', 'running', 'queued', 'cancelled', 'skipped']

/** Run states, each drawn as its status chip. */
export const STATUS_OPTIONS: FilterOption[] = STATUSES.map((status) => ({ value: status, row: <StatusChip status={status} /> }))

export const JOB_OPTIONS: FilterOption[] = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders'].map(
    (job) => ({ value: job }),
)

/** People, each with their avatar. */
export const PEOPLE_OPTIONS: FilterOption[] = ['ada', 'grace', 'linus', 'margaret'].map((name) => ({
    value: name,
    icon: <PersonAvatar name={name} size="xs" />,
}))

export const PROJECT_OPTIONS: FilterOption[] = ['harbor', 'juniper', 'larkspur'].map((project) => ({ value: project }))

/** Spans of time back from now. */
export const PERIOD_OPTIONS: FilterOption[] = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
]
