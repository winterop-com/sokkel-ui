/**
 * The simulated source the widgets read: every tick it takes a reading of the figures, starts and
 * finishes runs of Tidevann's jobs, writes the services' logs, says what happened, and now and then
 * a site slows down and comes back. It keeps its history from the start of the page, the last
 * ninety days of uptime made up from a fixed seed so they read the same every time.
 */

import { createStore, useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import type { RunStatus } from '@winterop-com/sokkel-ui/lib/status'
import type { LogLine } from '@winterop-com/sokkel-ui/LogView'
import type { UptimeDay } from '@winterop-com/sokkel-ui/UptimeBar'

import { JOBS, PEOPLE, PROJECTS, SERVICES, STEPS, type Job, type Metric, type Person, type Project, type Service } from './model'

/** A deterministic random source, so the page opens the same way every time. */
function seeded(seed: number): () => number {
    let state = seed
    return () => {
        state = (state + 0x6d2b79f5) | 0
        let t = Math.imul(state ^ (state >>> 15), 1 | state)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const random = seeded(20261113)
const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T
const between = (low: number, high: number) => low + random() * (high - low)
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

export interface Run {
    id: string
    job: Job
    project: Project
    by: Person
    state: Extract<RunStatus, 'succeeded' | 'failed' | 'running' | 'queued' | 'cancelled'>
    step: (typeof STEPS)[number]
    started: number
    ended?: number
}

export interface Happening {
    id: string
    at: number
    text: string
    tone: 'critical' | 'warning' | 'info' | 'good' | 'quiet'
    kind: 'run' | 'deploy' | 'site' | 'comment'
}

export interface Site {
    id: string
    city: string
    country: string
    at: [number, number]
    state: 'operational' | 'degraded' | 'outage'
    /** Round trip now, in milliseconds. */
    latency: number
}

export interface Reading {
    at: number
    values: Record<Metric, number>
}

export interface LiveState {
    at: number
    readings: Reading[]
    runs: Run[]
    happenings: Happening[]
    logs: Record<Service, LogLine[]>
    sites: Site[]
    uptime: Record<Service, UptimeDay[]>
    /** Runs started per job, per project and per person since the page opened, with what the history held. */
    counts: { job: Record<Job, number>; project: Record<Project, number>; person: Record<Person, number> }
}

/** How many readings the charts keep. */
export const KEEP = 60

/** Where Tidevann's sites are. */
export const SITES: Omit<Site, 'state' | 'latency'>[] = [
    { id: 'oslo', city: 'Oslo', country: 'Norway', at: [10.75, 59.91] },
    { id: 'dublin', city: 'Dublin', country: 'Ireland', at: [-6.26, 53.35] },
    { id: 'frankfurt', city: 'Frankfurt', country: 'Germany', at: [8.68, 50.11] },
    { id: 'virginia', city: 'Ashburn', country: 'United States', at: [-77.49, 39.04] },
    { id: 'oregon', city: 'Portland', country: 'United States', at: [-122.68, 45.52] },
    { id: 'saopaulo', city: 'Sao Paulo', country: 'Brazil', at: [-46.63, -23.55] },
    { id: 'mumbai', city: 'Mumbai', country: 'India', at: [72.88, 19.08] },
    { id: 'singapore', city: 'Singapore', country: 'Singapore', at: [103.82, 1.35] },
    { id: 'tokyo', city: 'Tokyo', country: 'Japan', at: [139.69, 35.69] },
    { id: 'sydney', city: 'Sydney', country: 'Australia', at: [151.21, -33.87] },
    { id: 'capetown', city: 'Cape Town', country: 'South Africa', at: [18.42, -33.92] },
]

const BASE_LATENCY: Record<string, number> = {
    oslo: 18,
    dublin: 24,
    frankfurt: 16,
    virginia: 92,
    oregon: 140,
    saopaulo: 190,
    mumbai: 150,
    singapore: 170,
    tokyo: 210,
    sydney: 260,
    capetown: 180,
}

const LOG_TEXTS: Record<Service, readonly string[]> = {
    api: ['GET /v1/runs 200', 'POST /v1/runs 201', 'GET /v1/jobs 200', 'GET /v1/projects/harbor 200', 'PATCH /v1/schedules 204'],
    worker: ['picked up run', 'step finished', 'wrote 1,204 rows', 'uploaded the archive', 'heartbeat'],
    scheduler: ['tick', 'queued run', 'next fire computed', 'lease renewed', 'schedule loaded'],
}

let runNumber = 4200
let happeningNumber = 0

function newRun(at: number, state: Run['state'] = 'queued'): Run {
    runNumber += 1
    return {
        id: `run-${String(runNumber)}`,
        job: pick(JOBS),
        project: pick(PROJECTS),
        by: pick(PEOPLE),
        state,
        step: 'fetch',
        started: at,
    }
}

function happening(at: number, text: string, tone: Happening['tone'], kind: Happening['kind']): Happening {
    happeningNumber += 1
    return { id: `h-${String(happeningNumber)}`, at, text, tone, kind }
}

const clock = (at: number) => {
    const date = new Date(at)
    const two = (value: number) => String(value).padStart(2, '0')
    return `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`
}

function logLine(service: Service, at: number): LogLine {
    const roll = random()
    const level = roll < 0.04 ? 'error' : roll < 0.12 ? 'warning' : roll < 0.3 ? 'debug' : 'info'
    const text =
        level === 'error'
            ? `${pick(JOBS)} failed at ${pick(STEPS)}: connection reset`
            : level === 'warning'
              ? `slow ${pick(STEPS)} for ${pick(JOBS)}, ${String(Math.round(between(2, 9)))}s`
              : pick(LOG_TEXTS[service])
    return {
        at: clock(at),
        level,
        source: service,
        text,
        fields: { project: pick(PROJECTS), ms: Math.round(between(4, 180)) },
    }
}

/** The last ninety days of a service, a few bad days among them. */
function uptimeOf(now: number): UptimeDay[] {
    const days: UptimeDay[] = []
    for (let back = 89; back >= 0; back -= 1) {
        const date = new Date(now - back * 86_400_000)
        const roll = random()
        const uptime = roll < 0.03 ? between(0.9, 0.97) : roll < 0.1 ? between(0.985, 0.999) : 1
        days.push({ date: date.toISOString().slice(0, 10), uptime })
    }
    return days
}

function next(values: Record<Metric, number> | undefined, degraded: number): Record<Metric, number> {
    const before = values ?? { runs: 42, failures: 1, success: 98, queue: 12, latency: 140, cpu: 48, memory: 61 }
    const runs = clamp(before.runs + between(-4, 4), 18, 80)
    const failures = clamp(before.failures + between(-0.8, 0.7) + degraded * 0.6, 0, 9)
    return {
        runs: Math.round(runs),
        failures: Math.round(failures),
        success: clamp(100 - (failures / Math.max(runs, 1)) * 100, 80, 100),
        queue: Math.round(clamp(before.queue + between(-3, 3) + degraded, 0, 60)),
        latency: Math.round(clamp(before.latency + between(-12, 12) + degraded * 15, 70, 420)),
        cpu: Math.round(clamp(before.cpu + between(-5, 5) + degraded * 2, 12, 98)),
        memory: Math.round(clamp(before.memory + between(-2, 2), 40, 92)),
    }
}

const zero = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>

function begin(): LiveState {
    const now = Date.now()
    const every = 3000
    const readings: Reading[] = []
    let values: Record<Metric, number> | undefined
    for (let index = KEEP - 1; index >= 0; index -= 1) {
        values = next(values, 0)
        readings.push({ at: now - index * every, values })
    }
    const counts = {
        job: zero(JOBS),
        project: zero(PROJECTS),
        person: zero(PEOPLE),
    }
    for (let index = 0; index < 240; index += 1) {
        counts.job[pick(JOBS)] += 1
        counts.project[pick(PROJECTS)] += 1
        counts.person[pick(PEOPLE)] += 1
    }
    const runs: Run[] = []
    const happenings: Happening[] = []
    for (let index = 14; index >= 1; index -= 1) {
        const at = now - index * 95_000
        const run = newRun(at)
        const failed = random() < 0.15
        const done: Run = { ...run, state: failed ? 'failed' : 'succeeded', step: failed ? pick(STEPS) : 'notify', ended: at + 60_000 }
        runs.unshift(done)
        happenings.unshift(
            happening(
                done.ended ?? at,
                failed ? `${done.job} failed at ${done.step} in ${done.project}` : `${done.job} succeeded in ${done.project}`,
                failed ? 'critical' : 'good',
                'run',
            ),
        )
    }
    runs.unshift({ ...newRun(now - 40_000, 'running'), step: 'transform' })
    runs.unshift(newRun(now - 5000))
    happenings.unshift(happening(now - 600_000, 'grace deployed worker 2.14.0', 'info', 'deploy'))
    happenings.sort((left, right) => right.at - left.at)
    const logs = Object.fromEntries(
        SERVICES.map((service) => [service, Array.from({ length: 40 }, (_, index) => logLine(service, now - (40 - index) * 1500))]),
    ) as Record<Service, LogLine[]>
    return {
        at: now,
        readings,
        runs,
        happenings,
        logs,
        sites: SITES.map((site) => ({ ...site, state: 'operational', latency: BASE_LATENCY[site.id] ?? 100 })),
        uptime: Object.fromEntries(SERVICES.map((service) => [service, uptimeOf(now)])) as Record<Service, UptimeDay[]>,
        counts,
    }
}

export const live = createStore<LiveState>(begin())

/** One tick of the world. */
function tick(): void {
    const state = live.get()
    const at = Date.now()
    const troubled = state.sites.filter((site) => site.state !== 'operational').length
    const values = next(state.readings[state.readings.length - 1]?.values, troubled)
    const readings = [...state.readings.slice(-(KEEP - 1)), { at, values }]
    const happenings = [...state.happenings]
    const counts = {
        job: { ...state.counts.job },
        project: { ...state.counts.project },
        person: { ...state.counts.person },
    }

    // Runs move on: the queued start, the running pass a step or finish, and new ones are queued.
    const runs = state.runs.map((run): Run => {
        if (run.state === 'queued' && random() < 0.6) return { ...run, state: 'running' }
        if (run.state !== 'running') return run
        const index = STEPS.indexOf(run.step)
        if (random() < 0.08 + troubled * 0.05) {
            happenings.unshift(happening(at, `${run.job} failed at ${run.step} in ${run.project}`, 'critical', 'run'))
            return { ...run, state: 'failed', ended: at }
        }
        if (index === STEPS.length - 1) {
            happenings.unshift(happening(at, `${run.job} succeeded in ${run.project}`, 'good', 'run'))
            return { ...run, state: 'succeeded', ended: at }
        }
        return random() < 0.55 ? { ...run, step: STEPS[index + 1] ?? run.step } : run
    })
    const started = random() < 0.5 ? 1 : random() < 0.2 ? 2 : 0
    for (let index = 0; index < started; index += 1) {
        const run = newRun(at)
        runs.unshift(run)
        counts.job[run.job] += 1
        counts.project[run.project] += 1
        counts.person[run.by] += 1
    }
    if (random() < 0.03) {
        const person = pick(PEOPLE)
        happenings.unshift(
            happening(
                at,
                `${person} deployed ${pick(SERVICES)} 2.${String(14 + Math.floor(random() * 4))}.${String(Math.floor(random() * 9))}`,
                'info',
                'deploy',
            ),
        )
    }
    if (random() < 0.02)
        happenings.unshift(happening(at, `${pick(PEOPLE)} commented on ${pick(JOBS)} in ${pick(PROJECTS)}`, 'quiet', 'comment'))

    // Now and then a site slows down or goes down for a while, and comes back.
    const sites = state.sites.map((site): Site => {
        const base = BASE_LATENCY[site.id] ?? 100
        if (site.state === 'operational' && random() < 0.006) {
            const state = random() < 0.25 ? 'outage' : 'degraded'
            happenings.unshift(
                happening(
                    at,
                    `${site.city} is ${state === 'outage' ? 'down' : 'slow'}`,
                    state === 'outage' ? 'critical' : 'warning',
                    'site',
                ),
            )
            return { ...site, state, latency: base * 3 }
        }
        if (site.state !== 'operational' && random() < 0.06) {
            happenings.unshift(happening(at, `${site.city} is operational again`, 'good', 'site'))
            return { ...site, state: 'operational', latency: base }
        }
        const factor = site.state === 'operational' ? 1 : 3
        return { ...site, latency: Math.round(base * factor * between(0.9, 1.15)) }
    })

    // Today's uptime of each service falls a little while a site is in trouble.
    const uptime =
        troubled === 0
            ? state.uptime
            : (Object.fromEntries(
                  SERVICES.map((service) => {
                      const days = state.uptime[service]
                      const today = days[days.length - 1]
                      if (today === undefined) return [service, days]
                      const was = today.uptime ?? 1
                      return [service, [...days.slice(0, -1), { ...today, uptime: Math.max(0.9, was - 0.0004 * troubled) }]]
                  }),
              ) as Record<Service, UptimeDay[]>)

    const logs = Object.fromEntries(
        SERVICES.map((service) => {
            const lines = [...state.logs[service]]
            const count = Math.floor(between(0, 3))
            for (let index = 0; index < count; index += 1) lines.push(logLine(service, at))
            return [service, lines.slice(-200)]
        }),
    ) as Record<Service, LogLine[]>

    live.set({
        at,
        readings,
        runs: runs.slice(0, 40),
        happenings: happenings.slice(0, 60),
        logs,
        sites,
        uptime,
        counts,
    })
}

/** Ticks every `every` milliseconds while the page is shown; returns the call that stops it. */
export function startLive(every: number): () => void {
    let timer: ReturnType<typeof setInterval> | undefined
    const run = () => {
        if (timer !== undefined) clearInterval(timer)
        timer = document.hidden ? undefined : setInterval(tick, every)
    }
    run()
    document.addEventListener('visibilitychange', run)
    return () => {
        if (timer !== undefined) clearInterval(timer)
        document.removeEventListener('visibilitychange', run)
    }
}

/** The live world, drawn again on every tick. */
export function useLive(): LiveState {
    return useStore(live)
}

/** A metric's latest reading and its readings so far. */
export function metricOf(state: LiveState, metric: Metric): { now: number; values: number[] } {
    const values = state.readings.map((reading) => reading.values[metric])
    return { now: values[values.length - 1] ?? 0, values }
}

/** The next fires of the jobs' schedules after `at`, soonest first. */
export function upcoming(at: number, count: number): { id: string; job: Job; project: Project; at: number; what: string }[] {
    const SCHEDULES: { job: Job; project: Project; every: number; offset: number; what: string }[] = [
        { job: 'sync-inventory', project: 'harbor', every: 15 * 60_000, offset: 2 * 60_000, what: 'every 15 minutes' },
        { job: 'import-orders', project: 'juniper', every: 60 * 60_000, offset: 10 * 60_000, what: 'hourly' },
        { job: 'send-digest', project: 'larkspur', every: 6 * 60 * 60_000, offset: 30 * 60_000, what: 'every 6 hours' },
        { job: 'rebuild-index', project: 'harbor', every: 12 * 60 * 60_000, offset: 3 * 60 * 60_000, what: 'twice a day' },
        { job: 'nightly-export', project: 'juniper', every: 24 * 60 * 60_000, offset: 2 * 60 * 60_000, what: 'nightly at 02:00' },
    ]
    const fires = SCHEDULES.flatMap((schedule) => {
        const first = Math.ceil((at - schedule.offset) / schedule.every) * schedule.every + schedule.offset
        return [0, 1, 2].map((step) => ({
            id: `${schedule.job}-${String(first + step * schedule.every)}`,
            job: schedule.job,
            project: schedule.project,
            at: first + step * schedule.every,
            what: schedule.what,
        }))
    })
    // Each schedule's next fire first, then the ones after, so a frequent job does not fill the list.
    const firsts = fires.filter((_, index) => index % 3 === 0)
    const later = fires.filter((_, index) => index % 3 !== 0).sort((left, right) => left.at - right.at)
    return [...firsts.sort((left, right) => left.at - right.at), ...later].slice(0, count).sort((left, right) => left.at - right.at)
}

/** Who is on call now and next: the rotation hands over every day at 09:00, through the people in order. */
export function onCall(at: number): { now: Person; next: Person; since: number; until: number } {
    const day = 86_400_000
    const date = new Date(at)
    const handover = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9).getTime()
    const since = at >= handover ? handover : handover - day
    const index = Math.floor(since / day) % PEOPLE.length
    return {
        now: PEOPLE[index] as Person,
        next: PEOPLE[(index + 1) % PEOPLE.length] as Person,
        since,
        until: since + day,
    }
}
