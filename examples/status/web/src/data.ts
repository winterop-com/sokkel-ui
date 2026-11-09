import { collection } from 'tidevann-shared/backend'

export const PEOPLE = ['ada', 'grace', 'linus', 'margaret'] as const
export type Person = (typeof PEOPLE)[number]

export const SERVICE_IDS = ['web', 'api', 'worker', 'scheduler', 'queue', 'storage', 'search', 'mail'] as const
export type ServiceId = (typeof SERVICE_IDS)[number]

/** One of Tidevann's services, as the board knows it: what it is, where it answers and what it needs. */
export interface Service {
    id: ServiceId
    description: string
    host: string
    group: 'Product' | 'Processing' | 'Data'
    /** Whether it holds data rather than answers requests, drawn with another shape in the graph. */
    store: boolean
    /** What it calls on to answer. */
    dependsOn: readonly ServiceId[]
    /** Its 95th percentile latency on a good day, in milliseconds. */
    latency: number
    /** Its share of failed requests on a good day, in percent. */
    errors: number
    /** The requests it answers on a good day, per second. */
    load: number
    /** The version running before any deploy from the board. */
    version: string
}

export const SERVICES: readonly Service[] = [
    {
        id: 'web',
        description: 'The app people sign in to',
        host: 'tidevann.example.org',
        group: 'Product',
        store: false,
        dependsOn: ['api'],
        latency: 140,
        errors: 0.08,
        load: 820,
        version: 'v4.12.2',
    },
    {
        id: 'api',
        description: 'The public API and the app behind it',
        host: 'api.example.org',
        group: 'Product',
        store: false,
        dependsOn: ['queue', 'storage', 'search'],
        latency: 180,
        errors: 0.12,
        load: 1240,
        version: 'v2.41.2',
    },
    {
        id: 'worker',
        description: 'Runs the jobs: nightly-export, sync-inventory, rebuild-index',
        host: 'worker.example.org',
        group: 'Processing',
        store: false,
        dependsOn: ['queue', 'storage'],
        latency: 420,
        errors: 0.2,
        load: 160,
        version: 'v1.18.3',
    },
    {
        id: 'scheduler',
        description: 'Starts the jobs on their schedules',
        host: 'scheduler.example.org',
        group: 'Processing',
        store: false,
        dependsOn: ['queue'],
        latency: 60,
        errors: 0.02,
        load: 40,
        version: 'v0.9.7',
    },
    {
        id: 'mail',
        description: 'Sends send-digest and every notice',
        host: 'mail.example.org',
        group: 'Processing',
        store: false,
        dependsOn: ['queue'],
        latency: 310,
        errors: 0.15,
        load: 55,
        version: 'v1.4.2',
    },
    {
        id: 'queue',
        description: 'Carries work between the services',
        host: 'queue.example.org',
        group: 'Data',
        store: true,
        dependsOn: [],
        latency: 12,
        errors: 0.01,
        load: 2600,
        version: 'v3.2.4',
    },
    {
        id: 'storage',
        description: 'Keeps the files, the exports and the backups',
        host: 'storage.example.org',
        group: 'Data',
        store: true,
        dependsOn: [],
        latency: 45,
        errors: 0.03,
        load: 1900,
        version: 'v5.0.4',
    },
    {
        id: 'search',
        description: 'Answers searches from the index rebuild-index writes',
        host: 'search.example.org',
        group: 'Data',
        store: true,
        dependsOn: ['storage'],
        latency: 95,
        errors: 0.05,
        load: 430,
        version: 'v2.7.3',
    },
]

export const SERVICE_BY_ID = Object.fromEntries(SERVICES.map((service) => [service.id, service])) as Record<ServiceId, Service>

/** The services that call on this one. */
export function dependents(id: ServiceId): Service[] {
    return SERVICES.filter((service) => service.dependsOn.includes(id))
}

/** A site Tidevann answers from, in a city, by plain geography. */
export interface Site {
    id: string
    city: string
    country: string
    region: 'Europe' | 'North America' | 'South America' | 'Asia' | 'Oceania' | 'Africa'
    /** Longitude and latitude. */
    at: [number, number]
    /** Its round trip from the nearest people on a good day, in milliseconds. */
    latency: number
}

export const SITES: readonly Site[] = [
    { id: 'oslo', city: 'Oslo', country: 'Norway', region: 'Europe', at: [10.75, 59.91], latency: 18 },
    { id: 'frankfurt', city: 'Frankfurt', country: 'Germany', region: 'Europe', at: [8.68, 50.11], latency: 14 },
    { id: 'dublin', city: 'Dublin', country: 'Ireland', region: 'Europe', at: [-6.26, 53.35], latency: 21 },
    { id: 'new-york', city: 'New York', country: 'United States', region: 'North America', at: [-74.01, 40.71], latency: 24 },
    { id: 'toronto', city: 'Toronto', country: 'Canada', region: 'North America', at: [-79.38, 43.65], latency: 27 },
    { id: 'sao-paulo', city: 'São Paulo', country: 'Brazil', region: 'South America', at: [-46.63, -23.55], latency: 38 },
    { id: 'johannesburg', city: 'Johannesburg', country: 'South Africa', region: 'Africa', at: [28.05, -26.2], latency: 44 },
    { id: 'mumbai', city: 'Mumbai', country: 'India', region: 'Asia', at: [72.88, 19.08], latency: 35 },
    { id: 'singapore', city: 'Singapore', country: 'Singapore', region: 'Asia', at: [103.82, 1.35], latency: 29 },
    { id: 'tokyo', city: 'Tokyo', country: 'Japan', region: 'Asia', at: [139.69, 35.69], latency: 26 },
    { id: 'sydney', city: 'Sydney', country: 'Australia', region: 'Oceania', at: [151.21, -33.87], latency: 33 },
]

export const SITE_BY_ID: Record<string, Site> = Object.fromEntries(SITES.map((site) => [site.id, site]))

export type IncidentState = 'investigating' | 'identified' | 'monitoring' | 'resolved'
export const INCIDENT_STATES: readonly IncidentState[] = ['investigating', 'identified', 'monitoring', 'resolved']

export type Severity = 'minor' | 'major' | 'critical'
export const SEVERITIES: readonly Severity[] = ['minor', 'major', 'critical']

/** One update to an incident, as its timeline and the status page show it. */
export interface IncidentUpdate {
    id: string
    /** When it was posted, an ISO instant. */
    at: string
    state: IncidentState
    message: string
    by: Person
}

export interface Incident {
    id: string
    /** The incident's code, such as `INC-41`. */
    code: string
    title: string
    severity: Severity
    state: IncidentState
    services: ServiceId[]
    sites: string[]
    assignee: Person
    /** When it opened, an ISO instant. */
    opened: string
    /** When it was resolved, an ISO instant, or null while it is open. */
    resolved: string | null
    /** Newest first. */
    updates: IncidentUpdate[]
    /** Whether the status page shows it. */
    public: boolean
    /** What opened it when the board did on its own; the responder moves it along until a person posts. */
    cause: 'spike' | 'drift' | 'region' | null
}

/** A window a service is taken down for work, its times on the wall clock as `YYYY-MM-DDTHH:mm`. */
export interface Maintenance {
    id: string
    service: ServiceId
    title: string
    starts: string
    ends: string
    by: Person
    cancelled: boolean
}

export type DeployState = 'running' | 'succeeded' | 'failed'

export interface Deploy {
    id: string
    service: ServiceId
    version: string
    /** When it started, an ISO instant. */
    at: string
    by: Person
    state: DeployState
    note: string
}

/** One week of the on-call rotation, from Monday to Monday, as `YYYY-MM-DD`. */
export interface Shift {
    id: string
    starts: string
    ends: string
    person: Person
}

/** Who is on call now, since when, and what they were told. */
export interface OnCall {
    id: string
    person: Person
    since: string
    note: string
}

export interface Handover {
    id: string
    at: string
    from: Person
    to: Person
    note: string
}

export interface Subscriber {
    id: string
    email: string
    /** The services they hear about; every one when empty. */
    services: ServiceId[]
    at: string
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** An ISO instant `ms` milliseconds before now. */
export function ago(ms: number): string {
    return new Date(Date.now() - ms).toISOString()
}

const pad = (value: number) => String(value).padStart(2, '0')

/** A date as the local day it falls on, `YYYY-MM-DD`. */
export function dayOf(date: Date): string {
    return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A date as the local wall-clock moment, `YYYY-MM-DDTHH:mm`. */
export function momentOf(date: Date): string {
    return `${dayOf(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** A `YYYY-MM-DDTHH:mm` wall-clock moment as a date in the local zone. */
export function dateOfMoment(moment: string): Date {
    const [day = '', time = '00:00'] = moment.split('T')
    const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
    const [hours = 0, minutes = 0] = time.split(':').map(Number)
    return new Date(year, month - 1, date, hours, minutes)
}

/** The Monday of the week a date falls in, at local midnight. */
export function mondayOf(date: Date): Date {
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    return monday
}

let updateCount = 0

/** A new update's id. */
export function updateId(): string {
    updateCount += 1
    return `update-${Date.now().toString(36)}-${String(updateCount)}`
}

interface PastIncident {
    title: string
    severity: Severity
    services: ServiceId[]
    sites?: string[]
    daysAgo: number
    /** How long it lasted, in minutes. */
    minutes: number
    assignee: Person
    steps: [IncidentState, string][]
}

/** What went wrong over the last ninety days, which the uptime bars are drawn from. */
const PAST: PastIncident[] = [
    {
        title: 'Elevated error rates on the api',
        severity: 'major',
        services: ['api', 'web'],
        daysAgo: 3,
        minutes: 42,
        assignee: 'grace',
        steps: [
            ['investigating', 'The api is answering one request in twelve with an error. We are looking into it.'],
            ['identified', 'The errors follow the deploy of api v2.41.1. We are rolling it back.'],
            ['monitoring', 'The rollback is out and the errors have stopped. We are watching the api.'],
            ['resolved', 'The api has answered normally for half an hour. This incident is resolved.'],
        ],
    },
    {
        title: 'Slow searches in Asia',
        severity: 'minor',
        services: ['search'],
        sites: ['singapore', 'tokyo'],
        daysAgo: 9,
        minutes: 95,
        assignee: 'linus',
        steps: [
            ['investigating', 'Searches from Singapore and Tokyo take several seconds.'],
            ['identified', 'rebuild-index ran long and left the index half written in Asia.'],
            ['resolved', 'The index is whole again and searches are fast.'],
        ],
    },
    {
        title: 'Jobs queued behind a stuck worker',
        severity: 'major',
        services: ['worker', 'scheduler'],
        daysAgo: 17,
        minutes: 130,
        assignee: 'ada',
        steps: [
            ['investigating', 'nightly-export and sync-inventory have not started. We are looking into the worker.'],
            ['identified', 'One worker held the queue after a failed upload step.'],
            ['monitoring', 'The worker is restarted and the queued runs are going through.'],
            ['resolved', 'Every queued run has finished. This incident is resolved.'],
        ],
    },
    {
        title: 'Digests sent late',
        severity: 'minor',
        services: ['mail'],
        daysAgo: 26,
        minutes: 210,
        assignee: 'margaret',
        steps: [
            ['investigating', 'send-digest is running two hours late.'],
            ['resolved', 'The digests are out and the next run is on time.'],
        ],
    },
    {
        title: 'Storage unreachable from São Paulo',
        severity: 'critical',
        services: ['storage', 'api', 'worker'],
        sites: ['sao-paulo'],
        daysAgo: 38,
        minutes: 64,
        assignee: 'grace',
        steps: [
            ['investigating', 'Uploads and exports fail from São Paulo.'],
            ['identified', 'A network path into São Paulo is down. Traffic is moving to New York.'],
            ['monitoring', 'Traffic goes through New York and uploads work again.'],
            ['resolved', 'The path is back and São Paulo answers on its own. This incident is resolved.'],
        ],
    },
    {
        title: 'The app slow to sign in',
        severity: 'minor',
        services: ['web'],
        daysAgo: 51,
        minutes: 35,
        assignee: 'linus',
        steps: [
            ['investigating', 'Signing in takes ten seconds or more.'],
            ['resolved', 'A slow session store is replaced. Signing in is quick again.'],
        ],
    },
    {
        title: 'Queue refusing new work',
        severity: 'critical',
        services: ['queue', 'worker', 'scheduler', 'mail'],
        daysAgo: 66,
        minutes: 48,
        assignee: 'ada',
        steps: [
            ['investigating', 'The queue refuses new work, so no job starts and no mail goes out.'],
            ['identified', 'The queue ran out of disk after a burst of import-orders runs.'],
            ['monitoring', 'The disk is grown and the queue takes work again.'],
            ['resolved', 'Every service is caught up. This incident is resolved.'],
        ],
    },
    {
        title: 'Search results out of date',
        severity: 'minor',
        services: ['search'],
        daysAgo: 80,
        minutes: 300,
        assignee: 'margaret',
        steps: [
            ['investigating', 'Searches miss what was added today.'],
            ['resolved', 'rebuild-index has caught up and results are current.'],
        ],
    },
]

function seedIncidents(): Incident[] {
    const now = Date.now()
    const past: Incident[] = PAST.map((one, index) => {
        const opened = now - one.daysAgo * DAY - 3 * HOUR
        const resolved = opened + one.minutes * MINUTE
        const span = (resolved - opened) / Math.max(1, one.steps.length - 1)
        const updates = one.steps
            .map(([state, message], step) => ({
                id: `update-seed-${String(index)}-${String(step)}`,
                at: new Date(opened + span * step).toISOString(),
                state,
                message,
                by: one.assignee,
            }))
            .reverse()
        return {
            id: `incident-${String(40 - index)}`,
            code: `INC-${String(40 - index)}`,
            title: one.title,
            severity: one.severity,
            state: 'resolved',
            services: one.services,
            sites: one.sites ?? [],
            assignee: one.assignee,
            opened: new Date(opened).toISOString(),
            resolved: new Date(resolved).toISOString(),
            updates,
            public: true,
            cause: null,
        }
    })
    const open: Incident = {
        id: 'incident-41',
        code: 'INC-41',
        title: 'Slow exports from storage',
        severity: 'minor',
        state: 'monitoring',
        services: ['storage', 'worker'],
        sites: ['frankfurt'],
        assignee: 'grace',
        opened: ago(48 * MINUTE),
        resolved: null,
        updates: [
            {
                id: 'update-seed-open-2',
                at: ago(9 * MINUTE),
                state: 'monitoring',
                message: 'Exports are back to their usual speed. We are watching nightly-export finish.',
                by: 'grace',
            },
            {
                id: 'update-seed-open-1',
                at: ago(31 * MINUTE),
                state: 'identified',
                message: 'A full disk in Frankfurt slows writes to storage. We are moving exports to Oslo.',
                by: 'grace',
            },
            {
                id: 'update-seed-open-0',
                at: ago(48 * MINUTE),
                state: 'investigating',
                message: 'nightly-export is writing to storage at a third of its usual speed.',
                by: 'grace',
            },
        ],
        public: true,
        cause: null,
    }
    return [open, ...past]
}

export const incidents = collection<Incident>('incidents', seedIncidents)

function seedMaintenance(): Maintenance[] {
    const at = (days: number, hour: number) => {
        const date = new Date()
        date.setDate(date.getDate() + days)
        date.setHours(hour, 0, 0, 0)
        return momentOf(date)
    }
    return [
        {
            id: 'maintenance-1',
            service: 'search',
            title: 'Moving the search index to larger disks',
            starts: at(2, 2),
            ends: at(2, 4),
            by: 'linus',
            cancelled: false,
        },
        {
            id: 'maintenance-2',
            service: 'queue',
            title: 'Upgrading the queue',
            starts: at(6, 1),
            ends: at(6, 2),
            by: 'ada',
            cancelled: false,
        },
        {
            id: 'maintenance-3',
            service: 'mail',
            title: 'A new sending address for send-digest',
            starts: at(-12, 3),
            ends: at(-12, 4),
            by: 'margaret',
            cancelled: false,
        },
    ]
}

export const maintenance = collection<Maintenance>('maintenance', seedMaintenance)

/** A version one patch after another: `v2.41.0` gives `v2.41.1`. */
export function nextVersion(version: string): string {
    const [major = '0', minor = '0', patch = '0'] = version.replace(/^v/, '').split('.')
    return `v${major}.${minor}.${String(Number(patch) + 1)}`
}

/** A version one patch before another, never below zero. */
export function previousVersion(version: string): string {
    const [major = '0', minor = '0', patch = '0'] = version.replace(/^v/, '').split('.')
    return `v${major}.${minor}.${String(Math.max(0, Number(patch) - 1))}`
}

const DEPLOY_NOTES = [
    'Faster pages of results',
    'Retries on a failed upload step',
    'A fix for a slow validate step',
    'Smaller exports',
    'Logs in the new format',
]

function seedDeploys(): Deploy[] {
    return SERVICES.flatMap((service, serviceIndex) =>
        [0, 1, 2].map((back) => {
            let version = service.version
            for (let step = 0; step < back; step += 1) version = previousVersion(version)
            return {
                id: `deploy-${service.id}-${String(back)}`,
                service: service.id,
                version,
                at: ago((back * 3 + serviceIndex * 0.4 + 0.5) * DAY),
                by: PEOPLE[(serviceIndex + back) % PEOPLE.length] ?? 'ada',
                state: (back === 1 && serviceIndex % 3 === 0 ? 'failed' : 'succeeded') as DeployState,
                note: DEPLOY_NOTES[(serviceIndex + back) % DEPLOY_NOTES.length] ?? '',
            }
        }),
    )
}

export const deploys = collection<Deploy>('deploys', seedDeploys)

/** Eight weeks of the rotation: the two before this one, this one and five after. */
function seedShifts(): Shift[] {
    const monday = mondayOf(new Date())
    return Array.from({ length: 8 }, (_, index) => {
        const starts = new Date(monday)
        starts.setDate(starts.getDate() + (index - 2) * 7)
        const ends = new Date(starts)
        ends.setDate(ends.getDate() + 7)
        return {
            id: `shift-${String(index + 1)}`,
            starts: dayOf(starts),
            ends: dayOf(ends),
            person: PEOPLE[(index + 3) % PEOPLE.length] ?? 'ada',
        }
    })
}

export const shifts = collection<Shift>('shifts', seedShifts)

/** This week's person in the seeded rotation. */
const SEEDED_ON_CALL: Person = PEOPLE[(2 + 3) % PEOPLE.length] ?? 'grace'

/** When the pager changed hands `weeks` weeks before this one: Monday at nine, or at midnight early on a Monday before nine has come. */
function mondayMorning(weeks: number): Date {
    const monday = mondayOf(new Date())
    monday.setDate(monday.getDate() - weeks * 7)
    const nine = new Date(monday)
    nine.setHours(9)
    return nine.getTime() <= Date.now() ? nine : monday
}

export const onCall = collection<OnCall>('on-call', () => [
    {
        id: 'now',
        person: SEEDED_ON_CALL,
        since: momentOf(mondayMorning(0)),
        note: 'INC-41 is in monitoring; nightly-export should finish by morning.',
    },
])

export const handovers = collection<Handover>('handovers', () => [
    {
        id: 'handover-1',
        at: mondayMorning(0).toISOString(),
        from: 'ada',
        to: SEEDED_ON_CALL,
        note: 'Quiet week. The search index move is planned for the weekend.',
    },
    {
        id: 'handover-2',
        at: mondayMorning(1).toISOString(),
        from: 'margaret',
        to: 'ada',
        note: 'Watch the worker after the upload fix.',
    },
])

export const subscribers = collection<Subscriber>('subscribers', () => [
    { id: 'subscriber-1', email: 'ops@example.org', services: [], at: ago(30 * DAY) },
    { id: 'subscriber-2', email: 'harbor-team@example.org', services: ['api', 'web'], at: ago(11 * DAY) },
])

/** The next incident code after the highest one there is. */
export function nextCode(rows: readonly Incident[]): string {
    const highest = rows.reduce((top, row) => Math.max(top, Number(row.code.replace(/\D/g, '')) || 0), 0)
    return `INC-${String(highest + 1)}`
}
