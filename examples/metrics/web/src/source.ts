/**
 * The simulated metrics source: Tidevann's services, hosts, projects and jobs, and every metric as a
 * pure function of time, so any range can be read at once and the newest second moves on as the
 * clock does. A scrape lands every second; incidents come and go every few minutes, lifting the
 * api's latency and errors and the workers' queue, so alert rules have something to fire on.
 */

export const SERVICES = ['api', 'worker', 'scheduler'] as const
export type Service = (typeof SERVICES)[number]

export const PROJECTS = ['harbor', 'juniper', 'larkspur'] as const
export type Project = (typeof PROJECTS)[number]

export const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'import-orders', 'send-digest'] as const
export type Job = (typeof JOBS)[number]

export const JOB_PROJECT: Record<Job, Project> = {
    'nightly-export': 'harbor',
    'sync-inventory': 'harbor',
    'rebuild-index': 'juniper',
    'import-orders': 'juniper',
    'send-digest': 'larkspur',
}

export interface Host {
    id: string
    service: Service
    region: string
}

export const HOSTS: readonly Host[] = [
    { id: 'api-1', service: 'api', region: 'Northern Europe' },
    { id: 'api-2', service: 'api', region: 'Western Europe' },
    { id: 'api-3', service: 'api', region: 'North America' },
    { id: 'worker-1', service: 'worker', region: 'Northern Europe' },
    { id: 'worker-2', service: 'worker', region: 'Northern Europe' },
    { id: 'worker-3', service: 'worker', region: 'North America' },
    { id: 'scheduler-1', service: 'scheduler', region: 'Northern Europe' },
]

/** A host's full name. */
export const hostName = (id: string) => `${id}.example.org`

/** The labels a series can carry, which the variables and a panel's filter match. */
export type Label = 'service' | 'host' | 'project' | 'job'
export const LABELS: readonly Label[] = ['service', 'host', 'project', 'job']

/** One series of a metric: its labels. */
export type SeriesLabels = Partial<Record<Label, string>>

export type MetricId =
    | 'requests'
    | 'errors'
    | 'latency_p50'
    | 'latency_p95'
    | 'latency_p99'
    | 'cpu'
    | 'memory'
    | 'queue_depth'
    | 'job_duration'

/** How the series of a group are combined into one value. */
export type Aggregation = 'sum' | 'avg' | 'max' | 'min'

export interface Metric {
    id: MetricId
    label: string
    description: string
    unit: string
    decimals: number
    /** The ways its series combine; the first is the natural one. */
    aggregations: readonly Aggregation[]
    /** Whether a rise is good news, bad news, or neither. */
    rising?: 'good' | 'bad'
    series: readonly SeriesLabels[]
    value: (labels: SeriesLabels, second: number) => number
}

/** A number from 0 to 1 that is always the same for the same inputs. */
function hash(...parts: number[]): number {
    let h = 2166136261
    for (const part of parts) {
        h ^= Math.floor(part) | 0
        h = Math.imul(h, 16777619)
        h ^= h >>> 13
        h = Math.imul(h, 0x5bd1e995)
        h ^= h >>> 15
    }
    return (h >>> 0) / 4294967295
}

/** Smooth noise from -1 to 1 along `x`, eased between a fixed value at each whole step. */
function noise(seed: number, x: number): number {
    const at = Math.floor(x)
    const fraction = x - at
    const ease = (1 - Math.cos(fraction * Math.PI)) / 2
    const from = hash(seed, at) * 2 - 1
    const to = hash(seed, at + 1) * 2 - 1
    return from + (to - from) * ease
}

/** The day's swell, from -1 at night to 1 in the afternoon. */
function daily(second: number): number {
    return Math.sin(((second % 86_400) / 86_400 - 0.3) * Math.PI * 2)
}

/** Every ten minutes an incident may come, a minute or two long, rising and falling over ten seconds. */
const INCIDENT_EVERY = 600

/** How strong the incident is at a second, from 0 to 1, for a seed that picks its timetable. */
export function incident(second: number, seed = 1): number {
    const window = Math.floor(second / INCIDENT_EVERY)
    let strongest = 0
    for (const one of [window - 1, window]) {
        if (hash(seed, one, 7) > 0.6) continue
        const start = one * INCIDENT_EVERY + hash(seed, one, 11) * 420
        const length = 60 + hash(seed, one, 13) * 90
        const into = second - start
        if (into < 0 || into > length) continue
        strongest = Math.max(strongest, Math.min(1, into / 10, (length - into) / 10))
    }
    return strongest
}

const seedOf = (labels: SeriesLabels) =>
    Object.values(labels).reduce((sum, text) => sum + [...(text ?? '')].reduce((one, char) => one * 31 + char.charCodeAt(0), 7), 0)

/** A level that swells with the day and wanders, with a quick flicker on top. */
function level(base: number, labels: SeriesLabels, second: number, { swell = 0.25, wander = 0.12, flicker = 0.04 } = {}): number {
    const seed = seedOf(labels)
    return base * (1 + swell * daily(second) + wander * noise(seed, second / 300) + flicker * noise(seed + 1, second / 4))
}

const hostOf = (id: string | undefined) => HOSTS.find((host) => host.id === id)
const PROJECT_SHARE: Record<Project, number> = { harbor: 0.5, juniper: 0.3, larkspur: 0.2 }
const HOST_RATE: Record<string, number> = { 'api-1': 120, 'api-2': 100, 'api-3': 80 }

const SERVICE_HOST_PROJECT: SeriesLabels[] = HOSTS.flatMap((host) =>
    PROJECTS.map((project) => ({ service: host.service, host: host.id, project })),
)
const SERVICE_HOST: SeriesLabels[] = HOSTS.map((host) => ({ service: host.service, host: host.id }))
const WORKERS = HOSTS.filter((host) => host.service === 'worker')
const WORKER_PROJECT: SeriesLabels[] = WORKERS.flatMap((host) => PROJECTS.map((project) => ({ service: 'worker', host: host.id, project })))
const WORKER_JOB: SeriesLabels[] = WORKERS.flatMap((host) =>
    JOBS.map((job) => ({ service: 'worker', host: host.id, project: JOB_PROJECT[job], job })),
)

function requests(labels: SeriesLabels, second: number): number {
    const host = hostOf(labels.host)
    const share = PROJECT_SHARE[labels.project as Project] ?? 0.3
    const rate = host?.service === 'api' ? (HOST_RATE[host.id] ?? 90) : host?.service === 'worker' ? 15 : 4
    return Math.max(0, level(rate * share, labels, second))
}

function latency(spread: number) {
    return (labels: SeriesLabels, second: number) => {
        const host = hostOf(labels.host)
        const base = host?.service === 'api' ? 45 : host?.service === 'worker' ? 20 : 10
        const lift = host?.service === 'api' ? 1 + 1.7 * incident(second) : 1
        return level(base * spread, labels, second, { swell: 0.15, wander: 0.1, flicker: 0.06 }) * lift
    }
}

const JOB_SECONDS: Record<Job, number> = {
    'nightly-export': 42,
    'sync-inventory': 18,
    'rebuild-index': 95,
    'import-orders': 27,
    'send-digest': 6,
}

export const METRICS: readonly Metric[] = [
    {
        id: 'requests',
        label: 'Requests',
        description: 'Requests each service answers per second.',
        unit: ' req/s',
        decimals: 1,
        aggregations: ['sum', 'avg', 'max', 'min'],
        series: SERVICE_HOST_PROJECT,
        value: requests,
    },
    {
        id: 'errors',
        label: 'Error rate',
        description: 'Requests that ended in an error, of every request answered.',
        unit: '%',
        decimals: 2,
        aggregations: ['avg', 'max', 'min'],
        rising: 'bad',
        series: SERVICE_HOST_PROJECT,
        value: (labels, second) => {
            const host = hostOf(labels.host)
            const base = host?.service === 'api' ? 0.4 : 0.15
            const lift = host?.service === 'api' ? 5.5 * incident(second) : 0.3 * incident(second, 2)
            return Math.max(0, level(base, labels, second, { swell: 0.1, wander: 0.4, flicker: 0.3 }) + lift)
        },
    },
    {
        id: 'latency_p50',
        label: 'Latency p50',
        description: 'The median time to answer a request.',
        unit: ' ms',
        decimals: 0,
        aggregations: ['avg', 'max', 'min'],
        rising: 'bad',
        series: SERVICE_HOST,
        value: latency(1),
    },
    {
        id: 'latency_p95',
        label: 'Latency p95',
        description: 'The time 95 requests in 100 are answered within.',
        unit: ' ms',
        decimals: 0,
        aggregations: ['avg', 'max', 'min'],
        rising: 'bad',
        series: SERVICE_HOST,
        value: latency(3.1),
    },
    {
        id: 'latency_p99',
        label: 'Latency p99',
        description: 'The time 99 requests in 100 are answered within.',
        unit: ' ms',
        decimals: 0,
        aggregations: ['avg', 'max', 'min'],
        rising: 'bad',
        series: SERVICE_HOST,
        value: latency(5.6),
    },
    {
        id: 'cpu',
        label: 'CPU',
        description: 'The share of each host’s processors in use.',
        unit: '%',
        decimals: 0,
        aggregations: ['avg', 'max', 'min'],
        rising: 'bad',
        series: SERVICE_HOST,
        value: (labels, second) => {
            const host = hostOf(labels.host)
            const base = host?.service === 'api' ? 38 : host?.service === 'worker' ? 62 : 16
            const lift = host?.service === 'api' ? 24 * incident(second) : host?.service === 'worker' ? 22 * incident(second, 2) : 0
            return Math.min(100, Math.max(1, level(base, labels, second, { swell: 0.2, wander: 0.18, flicker: 0.08 }) + lift))
        },
    },
    {
        id: 'memory',
        label: 'Memory',
        description: 'Memory each host’s processes hold.',
        unit: ' GB',
        decimals: 2,
        aggregations: ['sum', 'avg', 'max', 'min'],
        rising: 'bad',
        series: SERVICE_HOST,
        value: (labels, second) => {
            const host = hostOf(labels.host)
            const base = host?.service === 'api' ? 1.4 : host?.service === 'worker' ? 2.6 : 0.6
            // Climbs until the collector frees it, every quarter of an hour.
            const climb = ((second + seedOf(labels) * 37) % 900) / 900
            return base * (1 + 0.28 * climb + 0.04 * noise(seedOf(labels), second / 60))
        },
    },
    {
        id: 'queue_depth',
        label: 'Queue depth',
        description: 'Runs waiting for a worker slot.',
        unit: '',
        decimals: 0,
        aggregations: ['sum', 'avg', 'max', 'min'],
        rising: 'bad',
        series: WORKER_PROJECT,
        value: (labels, second) => {
            const seed = seedOf(labels)
            const batch = Math.max(0, Math.sin((((second + seed * 13) % 900) / 900) * Math.PI * 2)) ** 6
            const share = PROJECT_SHARE[labels.project as Project] ?? 0.3
            return Math.round(Math.max(0, share * (14 + 10 * noise(seed, second / 90) + 40 * batch + 30 * incident(second, 2))))
        },
    },
    {
        id: 'job_duration',
        label: 'Job duration',
        description: 'How long each job’s runs take, from start to finish.',
        unit: ' s',
        decimals: 1,
        aggregations: ['avg', 'max', 'min'],
        rising: 'bad',
        series: WORKER_JOB,
        value: (labels, second) => {
            const base = JOB_SECONDS[labels.job as Job] ?? 20
            return level(base, labels, second, { swell: 0.12, wander: 0.2, flicker: 0.05 }) * (1 + 0.6 * incident(second, 2))
        },
    },
]

export const metricOf = (id: MetricId): Metric => METRICS.find((metric) => metric.id === id) ?? METRICS[0]

/** The labels a metric's series carry. */
export function labelsOf(metric: Metric): Label[] {
    return LABELS.filter((label) => metric.series.some((series) => series[label] !== undefined))
}

/** The variables a dashboard filters by: a value, or `all`. */
export interface Variables {
    service: string
    host: string
    project: string
}

export const ALL = 'all'
export const NO_VARIABLES: Variables = { service: ALL, host: ALL, project: ALL }

/** Whether a series is kept by a filter: each label the series carries must match a filter that names a value. */
export function matches(series: SeriesLabels, filter: Partial<Record<Label, string>>): boolean {
    return LABELS.every((label) => {
        const wanted = filter[label]
        if (wanted === undefined || wanted === ALL || wanted === '') return true
        const has = series[label]
        return has === undefined || has === wanted
    })
}

/** Combines the values of a group. */
export function combine(values: readonly number[], aggregation: Aggregation): number | null {
    if (values.length === 0) return null
    if (aggregation === 'sum') return values.reduce((sum, value) => sum + value, 0)
    if (aggregation === 'max') return Math.max(...values)
    if (aggregation === 'min') return Math.min(...values)
    return values.reduce((sum, value) => sum + value, 0) / values.length
}

export type LogLevel = 'debug' | 'info' | 'warning' | 'error'

/** One line a host wrote: when, how loud, where from and what. */
export interface LogEntry {
    second: number
    level: LogLevel
    service: Service
    host: string
    project: string
    text: string
}

const ROUTES = ['/api/jobs', '/api/runs', '/api/projects', '/api/schedules', '/api/health']

/** What a host wrote in a second, if anything: a request answered, a run's step, a tick of the scheduler. */
function linesAt(host: Host, second: number): LogEntry[] {
    const roll = hash(second, host.id.length * 977 + host.id.charCodeAt(host.id.length - 1))
    const trouble = host.service === 'api' ? incident(second) : incident(second, 2)
    const chance = host.service === 'api' ? 0.45 : host.service === 'worker' ? 0.3 : 0.12
    if (roll > chance + trouble * 0.3) return []
    const pick = <T>(list: readonly T[], salt: number) => list[Math.floor(hash(second, salt, roll * 1000) * list.length)] as T
    const project = pick(PROJECTS, 3)
    const base = { second, service: host.service, host: host.id, project }
    if (host.service === 'api') {
        const route = pick(ROUTES, 5)
        const failing = hash(second, 17, roll * 99) < 0.01 + trouble * 0.25
        const took = Math.round(latency(failing ? 9 : 1.2)({ service: 'api', host: host.id }, second))
        if (failing)
            return [{ ...base, level: 'error', text: `GET ${route}?project=${project} 503 in ${String(took)}ms: upstream timed out` }]
        if (trouble > 0.5 && hash(second, 23) < 0.3)
            return [{ ...base, level: 'warning', text: `GET ${route}?project=${project} 200 in ${String(took)}ms, slower than 250ms` }]
        return [{ ...base, level: 'info', text: `GET ${route}?project=${project} 200 in ${String(took)}ms` }]
    }
    if (host.service === 'worker') {
        const job = pick(JOBS, 7)
        const step = pick(['fetch', 'transform', 'validate', 'upload', 'notify'], 9)
        const run = Math.floor(hash(second, 31) * 0xffff)
            .toString(16)
            .padStart(4, '0')
        if (hash(second, 37, roll * 31) < 0.02 + trouble * 0.2)
            return [{ ...base, project: JOB_PROJECT[job], level: 'error', text: `run ${run} of ${job}: ${step} failed, retrying in 30s` }]
        if (hash(second, 41) < 0.15)
            return [
                {
                    ...base,
                    project: JOB_PROJECT[job],
                    level: 'debug',
                    text: `run ${run} of ${job}: ${step} took ${(hash(second, 43) * 9 + 0.4).toFixed(1)}s`,
                },
            ]
        return [{ ...base, project: JOB_PROJECT[job], level: 'info', text: `run ${run} of ${job}: ${step} finished` }]
    }
    const job = pick(JOBS, 47)
    return [{ ...base, project: JOB_PROJECT[job], level: 'info', text: `queued ${job} for ${JOB_PROJECT[job]}` }]
}

/** The newest lines up to `end`, newest last, as many as `limit`, from the hosts the filter keeps. */
export function logsUntil(end: number, start: number, filter: Partial<Record<Label, string>>, limit = 200): LogEntry[] {
    const hosts = HOSTS.filter((host) => matches({ service: host.service, host: host.id }, filter))
    const found: LogEntry[] = []
    for (let second = end; second >= start && found.length < limit; second -= 1) {
        for (const host of hosts) {
            for (const line of linesAt(host, second)) if (matches(line, filter)) found.push(line)
        }
        if (end - second > 6 * 3600) break
    }
    return found.slice(0, limit).reverse()
}
