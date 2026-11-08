/** Tidevann's jobs with the settings an editable table changes in place: schedule, retries, owner, timeout and a note. */

export interface JobSetting {
    id: string
    job: string
    project: 'harbor' | 'juniper' | 'larkspur'
    schedule: string
    retries: number
    owner: 'ada' | 'grace' | 'linus' | 'margaret'
    /** Minutes before a run is stopped; none when unset. */
    timeout: number | null
    note: string
    last: 'succeeded' | 'failed' | 'running' | 'queued' | 'cancelled' | 'skipped'
    /** The day it runs again from, `YYYY-MM-DD`, while it is paused. */
    pausedUntil?: string | null
    /** Its schedule is the project's, set elsewhere. */
    locked?: boolean
}

export const JOB_SETTINGS: JobSetting[] = [
    {
        id: 'harbor/nightly-export',
        job: 'nightly-export',
        project: 'harbor',
        schedule: '0 2 * * *',
        retries: 3,
        owner: 'grace',
        timeout: 45,
        note: "Exports the day's orders to the archive.",
        last: 'succeeded',
    },
    {
        id: 'harbor/sync-inventory',
        job: 'sync-inventory',
        project: 'harbor',
        schedule: '*/15 * * * *',
        retries: 5,
        owner: 'ada',
        timeout: 10,
        note: 'Pulls stock levels from the worker every quarter hour.',
        last: 'running',
    },
    {
        id: 'harbor/send-digest',
        job: 'send-digest',
        project: 'harbor',
        schedule: '0 7 * * 1-5',
        retries: 1,
        owner: 'margaret',
        timeout: null,
        note: 'Weekday mornings only.',
        last: 'succeeded',
        locked: true,
    },
    {
        id: 'juniper/rebuild-index',
        job: 'rebuild-index',
        project: 'juniper',
        schedule: '30 3 * * 0',
        retries: 2,
        owner: 'linus',
        timeout: 120,
        note: 'Sundays, after the weekly import.',
        pausedUntil: '2026-11-20',
        last: 'failed',
    },
    {
        id: 'juniper/import-orders',
        job: 'import-orders',
        project: 'juniper',
        schedule: '0 * * * *',
        retries: 4,
        owner: 'ada',
        timeout: 20,
        note: '',
        last: 'succeeded',
    },
    {
        id: 'juniper/nightly-export',
        job: 'nightly-export',
        project: 'juniper',
        schedule: '15 2 * * *',
        retries: 3,
        owner: 'grace',
        timeout: 45,
        note: "Runs a quarter hour after harbor's, so the two never share the archive.",
        last: 'queued',
    },
    {
        id: 'larkspur/sync-inventory',
        job: 'sync-inventory',
        project: 'larkspur',
        schedule: '*/30 * * * *',
        retries: 5,
        owner: 'linus',
        timeout: 10,
        note: '',
        last: 'cancelled',
    },
    {
        id: 'larkspur/send-digest',
        job: 'send-digest',
        project: 'larkspur',
        schedule: '0 8 * * 1',
        retries: 0,
        owner: 'margaret',
        timeout: null,
        note: 'Mondays, to the whole team.',
        pausedUntil: '2026-12-01',
        last: 'skipped',
        locked: true,
    },
    {
        id: 'larkspur/import-orders',
        job: 'import-orders',
        project: 'larkspur',
        schedule: '45 * * * *',
        retries: 4,
        owner: 'ada',
        timeout: 20,
        note: '',
        last: 'succeeded',
    },
    {
        id: 'larkspur/rebuild-index',
        job: 'rebuild-index',
        project: 'larkspur',
        schedule: '0 4 * * 6',
        retries: 2,
        owner: 'linus',
        timeout: 90,
        note: 'Saturdays.',
        last: 'succeeded',
    },
]

export const JOB_OWNERS = ['ada', 'grace', 'linus', 'margaret'] as const

/** What Tidevann's scheduler answers a schedule it cannot read with. */
export const SCHEDULE_REFUSAL = 'The scheduler reads five fields: minute, hour, day, month and weekday.'

/** A save that takes as long as a request to Tidevann's api would, refusing a schedule the scheduler cannot read. */
export async function saveJobSetting(field: keyof JobSetting, value: unknown): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 700))
    if (field === 'schedule' && String(value).trim().split(/\s+/).length !== 5) throw new Error(SCHEDULE_REFUSAL)
}
