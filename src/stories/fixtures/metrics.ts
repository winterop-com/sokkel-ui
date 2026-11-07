/**
 * Tidevann's live metrics, as its monitoring dashboards read them: requests, durations, load and
 * queues of four workers serving three projects, latency at sites around the world, and the runs
 * expected in the days ahead. Time runs in five-minute steps on both sides of a fixed moment, and
 * every value is worked out from its step alone, so a story draws the same numbers every time, a
 * range narrows them, and a refresh moves the end on by a step.
 */
import type { RangePreset, TimeRangeValue } from '../../components/dashboard/TimeRange'

const STEP_MS = 5 * 60_000

/** Steps in an hour and in a day. */
export const HOUR = 12
export const DAY = 24 * HOUR

/** The moment the dashboards open on, Wednesday 4 November 2026 at 12:00 UTC, as a step. */
export const NOW = Date.UTC(2026, 10, 4, 12, 0) / STEP_MS

/** The ranges the dashboards offer, newest data last. */
export const RANGES: RangePreset[] = [
    { id: '1h', label: 'Last hour' },
    { id: '6h', label: 'Last 6 hours' },
    { id: '24h', label: 'Last 24 hours' },
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
]

const RANGE_STEPS: Record<string, number> = { '1h': HOUR, '6h': 6 * HOUR, '24h': DAY, '7d': 7 * DAY, '30d': 30 * DAY }

/** A stretch of time, from its first step up to the step it ends before. */
export interface Span {
    start: number
    end: number
}

/** The steps a range covers when it ends at `now`; a custom range takes whole days, and nothing past `now`. */
export function spanOf(range: TimeRangeValue, now: number): Span {
    if ('preset' in range) return { start: now - (RANGE_STEPS[range.preset] ?? 6 * HOUR), end: now }
    const day = (date: Date, add = 0) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + add) / STEP_MS
    return { start: day(range.from), end: Math.min(now, day(range.to, 1)) }
}

/** The span a day earlier, for a change against yesterday. */
export const dayBefore = (span: Span): Span => ({ start: span.start - DAY, end: span.end - DAY })

const pad = (value: number) => String(value).padStart(2, '0')
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The time a step starts, written for a reader: `09:40`. */
export function clock(step: number): string {
    const date = new Date(step * STEP_MS)
    return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

/** A bucket's time: the clock within a day, the weekday too within a week, the date beyond, and the clock again while a bucket is shorter than a day. */
function stamp(step: number, length: number, size: number): string {
    const date = new Date(step * STEP_MS)
    if (length <= DAY) return clock(step)
    if (length <= 7 * DAY) return `${WEEKDAYS[date.getUTCDay()]} ${clock(step)}`
    const day = `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`
    return size < DAY ? `${day} ${clock(step)}` : day
}

/** A span cut into buckets of whole steps, each one point of a chart, with each bucket's time written out. */
export interface Frame {
    span: Span
    /** Steps in a bucket. */
    size: number
    starts: number[]
    labels: string[]
}

const SIZES = [1, 2, 3, 6, 12, 24, 36, 72, 144, DAY, 2 * DAY]

/** The span in at most `most` buckets of a round size, lined up on the clock. */
export function frameOf(span: Span, most: number): Frame {
    const length = Math.max(0, span.end - span.start)
    const size = SIZES.find((candidate) => length / candidate <= most) ?? SIZES[SIZES.length - 1]
    const starts: number[] = []
    for (let at = Math.floor(span.start / size) * size; at < span.end; at += size) starts.push(at)
    return { span, size, starts, labels: starts.map((start) => stamp(Math.max(start, span.start), length, size)) }
}

/** A value per bucket: the mean, the total or the peak of `value` across the bucket's steps. */
export function sample(frame: Frame, value: (step: number) => number, how: 'avg' | 'sum' | 'max' = 'avg'): number[] {
    return frame.starts.map((start) => {
        const from = Math.max(start, frame.span.start)
        const to = Math.min(start + frame.size, frame.span.end)
        const count = to - from
        if (count <= 0) return 0
        const reads = Math.min(count, 6)
        let total = 0
        let peak = -Infinity
        for (let read = 0; read < reads; read++) {
            const figure = value(from + Math.floor((read * count) / reads))
            total += figure
            peak = Math.max(peak, figure)
        }
        const figure = how === 'max' ? peak : how === 'sum' ? (total / reads) * count : total / reads
        return Math.round(figure * 100) / 100
    })
}

/** The mean, the total or the peak of `value` across a whole span. */
export const across = (span: Span, value: (step: number) => number, how: 'avg' | 'sum' | 'max' = 'avg'): number => {
    const frame = frameOf(span, 48)
    const buckets = sample(frame, value, how === 'sum' ? 'sum' : how)
    if (buckets.length === 0) return 0
    if (how === 'sum') return buckets.reduce((sum, figure) => sum + figure, 0)
    if (how === 'max') return Math.max(...buckets)
    return buckets.reduce((sum, figure) => sum + figure, 0) / buckets.length
}

/** A number from 0 to 1 that is always the same for the same key and step. */
function hash(key: string, step: number): number {
    let state = 2166136261
    for (let index = 0; index < key.length; index++) state = Math.imul(state ^ key.charCodeAt(index), 16777619)
    state = Math.imul(state ^ step, 2246822519)
    state ^= state >>> 13
    state = Math.imul(state, 3266489917)
    state ^= state >>> 16
    return (state >>> 0) / 2 ** 32
}

/** Noise from 0 to 1 that drifts smoothly from one value to the next every `period` steps. */
function drift(key: string, step: number, period = HOUR): number {
    const knot = Math.floor(step / period)
    const along = (step - knot * period) / period
    const eased = along * along * (3 - 2 * along)
    return hash(key, knot) * (1 - eased) + hash(key, knot + 1) * eased
}

const hourOf = (step: number) => (((step % DAY) + DAY) % DAY) / HOUR
const weekdayOf = (step: number) => (((Math.floor(step / DAY) + 4) % 7) + 7) % 7

/** How busy a step is, about 0.3 to 1.2: quiet at night, a midday peak, an evening batch, and calmer weekends. */
export function load(step: number): number {
    const hour = hourOf(step)
    const weekday = weekdayOf(step)
    const day =
        0.32 +
        0.6 * Math.exp(-((hour - 11.5) ** 2) / 14) +
        0.3 * Math.exp(-((hour - 20) ** 2) / 3) +
        0.22 * Math.exp(-((hour - 2) ** 2) / 1.5)
    return day * (weekday === 0 || weekday === 6 ? 0.68 : 1)
}

/** How hard an incident hits at a step, 0 to 1: one this morning from 09:40 to 10:20, and a smaller one two days before. */
function incident(step: number): number {
    if (step >= NOW - 28 && step < NOW - 20) return 1
    if (step >= NOW - 2 * DAY + 36 && step < NOW - 2 * DAY + 46) return 0.5
    return 0
}

export const PROJECTS = ['harbor', 'juniper', 'larkspur'] as const
export const WORKERS = ['worker-1', 'worker-2', 'worker-3', 'worker-4'] as const
export const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders'] as const

export type Project = (typeof PROJECTS)[number]
export type Worker = (typeof WORKERS)[number]
export type Job = (typeof JOBS)[number]

/** The project each job belongs to. */
export const JOB_PROJECT: Record<Job, Project> = {
    'nightly-export': 'harbor',
    'send-digest': 'harbor',
    'sync-inventory': 'juniper',
    'import-orders': 'juniper',
    'rebuild-index': 'larkspur',
}

const SHARE: Record<Project, number> = { harbor: 0.45, juniper: 0.35, larkspur: 0.2 }
const WEIGHT: Record<Worker, number> = { 'worker-1': 0.9, 'worker-2': 1.1, 'worker-3': 1.25, 'worker-4': 0.75 }
const AT: Record<Worker, number> = { 'worker-1': 0, 'worker-2': 1, 'worker-3': 2, 'worker-4': 3 }
/** Runs a job starts in five minutes on a busy weekday, every worker together. */
const JOB_RATE: Record<Job, number> = {
    'nightly-export': 2.2,
    'sync-inventory': 4.8,
    'rebuild-index': 1.6,
    'send-digest': 3.1,
    'import-orders': 5.4,
}
const JOB_FAILS: Record<Job, number> = {
    'nightly-export': 0.02,
    'sync-inventory': 0.01,
    'rebuild-index': 0.03,
    'send-digest': 0.006,
    'import-orders': 0.015,
}

/** Requests a second one worker serves for one project. */
export function requests(project: Project, worker: Worker, step: number): number {
    return 52 * SHARE[project] * WEIGHT[worker] * load(step) * (0.85 + 0.3 * drift(`requests:${project}:${worker}`, step))
}

/** The share of one worker's requests for one project that fail, in percent. */
export function errorRate(project: Project, worker: Worker, step: number): number {
    const own = 0.2 + 0.6 * drift(`errors:${project}:${worker}`, step, 2 * HOUR) * load(step)
    return own + incident(step) * (worker === 'worker-3' ? 9 : 2.5)
}

/** How long a client waits for an answer from one worker for one project, at a percentile, in milliseconds. */
export function clientDuration(project: Project, worker: Worker, step: number, percentile: 50 | 90 | 95 | 99): number {
    const base = 34 + 44 * load(step) + 24 * drift(`duration:${project}:${worker}`, step) + 5 * hash(`duration:${worker}`, step)
    const spread = { 50: 1, 90: 2.2, 95: 2.9, 99: 4.8 }[percentile]
    return base * spread * (1 + incident(step) * (worker === 'worker-3' ? 2.4 : 0.7))
}

/** Runs of a job one worker starts in a step. */
export function runs(job: Job, worker: Worker, step: number): number {
    return (JOB_RATE[job] * load(step) * WEIGHT[worker] * (0.8 + 0.4 * drift(`runs:${job}:${worker}`, step))) / 4
}

/** Runs of a job one worker starts in a step that fail. */
export function failures(job: Job, worker: Worker, step: number): number {
    const rate =
        JOB_FAILS[job] * (0.6 + 0.8 * drift(`fails:${job}`, step, 3 * HOUR)) + incident(step) * (worker === 'worker-3' ? 0.25 : 0.08)
    return runs(job, worker, step) * rate
}

/** How long a run takes at the median, in seconds. */
export function runSeconds(step: number): number {
    return 2.6 + 3.4 * load(step) + 1.6 * drift('run-seconds', step) + incident(step) * 9
}

/** The run duration buckets, shortest first. */
export const DURATION_BUCKETS = ['<1s', '1-2s', '2-5s', '5-10s', '10-30s', '30-60s', '1-2m', '>2m'] as const
const BUCKET_MIDDLES = [0.6, 1.4, 3.2, 7, 17, 42, 85, 170]

/** Runs per bucket of time and duration, as `[time, bucket, runs]`, from the runs started and their median duration in each. */
export function durationCells(frame: Frame, started: readonly number[], median: readonly number[]): [number, number, number][] {
    return frame.starts.flatMap((_, column) => {
        const weights = BUCKET_MIDDLES.map((middle) => Math.exp(-((Math.log(middle) - Math.log(median[column] * 1.15)) ** 2) / 0.9))
        const total = weights.reduce((sum, weight) => sum + weight, 0)
        return weights.map((weight, bucket): [number, number, number] => [column, bucket, Math.round((started[column] * weight) / total)])
    })
}

/** How much of one worker's processor is in use, in percent. */
export function cpu(worker: Worker, step: number): number {
    const used = 16 + 56 * load(step) * (WEIGHT[worker] / 1.25) + 12 * drift(`cpu:${worker}`, step, HOUR / 2)
    return Math.min(100, used + incident(step) * (worker === 'worker-3' ? 30 : 8))
}

/** How much of one worker's memory is in use, in percent. */
export function memory(worker: Worker, step: number): number {
    return 44 + 9 * AT[worker] + 16 * drift(`memory:${worker}`, step, 6 * HOUR) + 6 * load(step)
}

/** How full one worker's disk is, in percent, rising slowly over the month. */
export function disk(worker: Worker, step: number): number {
    return [41, 63, 79, 52][AT[worker]] + (5 * (step - NOW)) / (30 * DAY) + 1.5 * drift(`disk:${worker}`, step, DAY)
}

/** Runs waiting for a slot on one worker. */
export function queue(worker: Worker, step: number): number {
    const waiting = load(step) * (5 + AT[worker] * 3) + 7 * drift(`queue:${worker}`, step, HOUR / 2) - 2
    return Math.max(0, Math.round(waiting + incident(step) * (worker === 'worker-3' ? 30 : 6)))
}

/** How long a run waits for a slot on one worker at the 90th percentile, in seconds. */
export function wait(worker: Worker, step: number): number {
    return 2 + queue(worker, step) * 2.4 + 4 * drift(`wait:${worker}`, step)
}

/** The share of fetches answered from the cache, in percent. */
export function cacheHits(step: number): number {
    return 97.6 + 1.8 * drift('cache', step, 2 * HOUR) - incident(step) * 7
}

/** One site Tidevann runs from: where it is, its usual p95 latency, and its hours from UTC. */
export interface Site {
    id: string
    name: string
    country: string
    continent: Continent
    lon: number
    lat: number
    /** Its usual p95 latency, in milliseconds. */
    base: number
    offset: number
}

export const CONTINENTS = ['Europe', 'North America', 'South America', 'Africa', 'Asia', 'Oceania'] as const
export type Continent = (typeof CONTINENTS)[number]

export const SITES: Site[] = [
    { id: 'oslo', name: 'Oslo', country: 'Norway', continent: 'Europe', lon: 10.75, lat: 59.91, base: 64, offset: 1 },
    { id: 'frankfurt', name: 'Frankfurt', country: 'Germany', continent: 'Europe', lon: 8.68, lat: 50.11, base: 52, offset: 1 },
    { id: 'madrid', name: 'Madrid', country: 'Spain', continent: 'Europe', lon: -3.7, lat: 40.42, base: 88, offset: 1 },
    { id: 'toronto', name: 'Toronto', country: 'Canada', continent: 'North America', lon: -79.38, lat: 43.65, base: 112, offset: -5 },
    { id: 'virginia', name: 'Virginia', country: 'United States', continent: 'North America', lon: -77.4, lat: 38.9, base: 96, offset: -5 },
    {
        id: 'mexico-city',
        name: 'Mexico City',
        country: 'Mexico',
        continent: 'North America',
        lon: -99.13,
        lat: 19.43,
        base: 158,
        offset: -6,
    },
    { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', continent: 'South America', lon: -46.63, lat: -23.55, base: 176, offset: -3 },
    { id: 'santiago', name: 'Santiago', country: 'Chile', continent: 'South America', lon: -70.67, lat: -33.45, base: 214, offset: -3 },
    { id: 'bogota', name: 'Bogotá', country: 'Colombia', continent: 'South America', lon: -74.07, lat: 4.71, base: 168, offset: -5 },
    { id: 'lagos', name: 'Lagos', country: 'Nigeria', continent: 'Africa', lon: 3.38, lat: 6.52, base: 236, offset: 1 },
    { id: 'nairobi', name: 'Nairobi', country: 'Kenya', continent: 'Africa', lon: 36.82, lat: -1.29, base: 204, offset: 3 },
    {
        id: 'johannesburg',
        name: 'Johannesburg',
        country: 'South Africa',
        continent: 'Africa',
        lon: 28.05,
        lat: -26.2,
        base: 262,
        offset: 2,
    },
    { id: 'mumbai', name: 'Mumbai', country: 'India', continent: 'Asia', lon: 72.88, lat: 19.08, base: 188, offset: 5.5 },
    { id: 'singapore', name: 'Singapore', country: 'Singapore', continent: 'Asia', lon: 103.82, lat: 1.35, base: 142, offset: 8 },
    { id: 'tokyo', name: 'Tokyo', country: 'Japan', continent: 'Asia', lon: 139.69, lat: 35.69, base: 226, offset: 9 },
    { id: 'sydney', name: 'Sydney', country: 'Australia', continent: 'Oceania', lon: 151.21, lat: -33.87, base: 248, offset: 11 },
    { id: 'perth', name: 'Perth', country: 'Australia', continent: 'Oceania', lon: 115.86, lat: -31.95, base: 232, offset: 8 },
    { id: 'auckland', name: 'Auckland', country: 'New Zealand', continent: 'Oceania', lon: 174.76, lat: -36.85, base: 284, offset: 13 },
]

const PROJECT_LATENCY: Record<Project, number> = { harbor: 1, juniper: 1.08, larkspur: 0.93 }

/** A site's run latency at a percentile, in milliseconds, for one project or all of them; Lagos slows down from 10:40 to 11:40. */
export function siteLatency(site: Site, step: number, percentile: 50 | 95 | 99, project?: Project): number {
    const local = step + Math.round(site.offset * HOUR)
    const usual = site.base * (0.78 + 0.3 * load(local)) * (0.88 + 0.24 * drift(`site:${site.id}`, step, 2 * HOUR))
    const spread = { 50: 0.46, 95: 1, 99: 1.65 }[percentile]
    const slowed = site.id === 'lagos' && step >= NOW - 16 && step < NOW - 4 ? 1.7 : 1
    return (usual + 8 * hash(`site:${site.id}`, step)) * spread * slowed * (project === undefined ? 1 : PROJECT_LATENCY[project])
}

/** Runs a second a site serves. */
export function siteRequests(site: Site, step: number): number {
    return (
        (420 / Math.sqrt(site.base)) * load(step + Math.round(site.offset * HOUR)) * (0.9 + 0.2 * drift(`site-requests:${site.id}`, step))
    )
}

/** A day counted from today, written for a reader: `Thu 5`. */
export function dayLabel(day: number): string {
    const date = new Date((NOW + day * DAY) * STEP_MS)
    return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()}`
}

const DAILY_RUNS: Record<Project, number> = { harbor: 1460, juniper: 1180, larkspur: 640 }

/**
 * Runs a project has on a day counted from today: the days ahead are a forecast, which `run`
 * draws again; today and the days before are what happened.
 */
export function dailyRuns(project: Project, day: number, run = 0): number {
    const weekday = weekdayOf(NOW + day * DAY)
    const week = weekday === 0 || weekday === 6 ? 0.62 : weekday === 1 ? 1.12 : 1
    const noise = 0.9 + 0.2 * hash(`daily:${project}:${day > 0 ? run : 0}`, day)
    return Math.round(DAILY_RUNS[project] * week * (1 + 0.004 * day) * noise)
}

/** The share of a day's runs that start in each hour, from the day's load. */
export const HOURLY_SHARE: number[] = (() => {
    const loads = Array.from({ length: 24 }, (_, hour) => load(NOW - 12 * HOUR + hour * HOUR))
    const total = loads.reduce((sum, value) => sum + value, 0)
    return loads.map((value) => value / total)
})()

/** The peak share of one worker's slots a day's runs take, in percent, from the runs of the projects given. */
export function slotUse(worker: Worker, runsThatDay: number, day: number, run = 0): number {
    return (runsThatDay / 3280) * 72 * WEIGHT[worker] * (0.94 + 0.12 * hash(`slots:${worker}:${run}`, day))
}

/** The share of runs that fail on a day ahead, in percent. */
export function failureRate(day: number, run = 0): number {
    return 1.1 + 0.9 * hash(`failure-rate:${run}`, day)
}
