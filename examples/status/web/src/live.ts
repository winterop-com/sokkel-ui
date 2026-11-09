/**
 * The simulated world the board watches: every service and site takes a reading each tick, and now
 * and then something goes wrong (an error spike, a slow drift, a region falling behind) and comes
 * back. When a service goes wrong the board opens an incident, and the on-call person's updates
 * move it along until it is resolved, unless a person takes it over by posting. Running deploys
 * finish here too. Everything that lasts goes through the fake backend.
 */

import { createStore, useStore } from '@winterop-com/sokkel-ui/hooks/use-store'

import {
    dateOfMoment,
    type Deploy,
    deploys,
    incidents,
    type Incident,
    type IncidentState,
    maintenance,
    type Maintenance,
    nextCode,
    onCall,
    type Person,
    SERVICE_BY_ID,
    SERVICE_IDS,
    type ServiceId,
    SERVICES,
    SITE_BY_ID,
    SITES,
    updateId,
} from './data'
import { DEFAULT_SETTINGS, type Settings, settings } from './settings'
import { type Health, worse } from './status'

/** One reading of a service. */
export interface Reading {
    at: number
    /** Median latency, in milliseconds. */
    p50: number
    /** 95th percentile latency, in milliseconds. */
    p95: number
    /** Failed requests, in percent. */
    errors: number
    /** Requests per second. */
    load: number
}

/** Something going wrong for a while: rising, holding and falling back. */
export interface Scenario {
    id: string
    kind: 'spike' | 'drift' | 'region'
    service?: ServiceId
    site?: string
    started: number
    /** How long it lasts, in milliseconds. */
    length: number
    /** How hard it hits at its height. */
    peak: number
}

export interface LiveState {
    /** When the last reading was taken; 0 before the first. */
    at: number
    /** Each service's latest readings, oldest first. */
    readings: Record<ServiceId, Reading[]>
    /** Each site's latest round trips, in milliseconds, oldest first. */
    sites: Record<string, number[]>
    health: Record<ServiceId, Health>
    siteHealth: Record<string, Health>
    scenarios: Scenario[]
}

/** How many readings each chart keeps. */
export const KEEP = 60

const SECOND = 1000

/** How long, on average, between two things going wrong, in each weather. */
const EVERY: Record<Settings['weather'], number> = { calm: 120 * SECOND, normal: 45 * SECOND, stormy: 15 * SECOND }
const AT_ONCE: Record<Settings['weather'], number> = { calm: 1, normal: 2, stormy: 3 }

/** Where each reading's calm noise has wandered to, by what it is of. */
const wandered: Record<string, number> = {}

/** A factor near one that wanders from reading to reading rather than jumping, so a calm line drifts gently. */
function wander(key: string, spread: number): number {
    const next = (wandered[key] ?? 0) * 0.8 + (Math.random() * 2 - 1) * spread
    wandered[key] = next
    return 1 + next
}
const between = (low: number, high: number) => low + Math.random() * (high - low)
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)] as T

/** How hard a scenario hits at a share of its length: rising fast, holding, then falling back. */
export function envelope(progress: number): number {
    if (progress <= 0 || progress >= 1) return 0
    if (progress < 0.15) return progress / 0.15
    if (progress < 0.7) return 1
    return (1 - progress) / 0.3
}

/** The reading a service takes with nothing wrong. */
function calm(id: ServiceId, at: number): Reading {
    const service = SERVICE_BY_ID[id]
    const p95 = service.latency * wander(`${id}:p95`, 0.03)
    return {
        at,
        p95,
        p50: p95 * 0.42 * wander(`${id}:p50`, 0.015),
        errors: Math.max(0, service.errors * wander(`${id}:errors`, 0.18)),
        load: service.load * (1 + 0.12 * Math.sin(at / 40_000 + service.latency)) * wander(`${id}:load`, 0.015),
    }
}

/** A history of calm readings ending now, so the charts start full. */
function history(id: ServiceId, now: number, interval: number): Reading[] {
    return Array.from({ length: KEEP }, (_, index) => calm(id, now - (KEEP - 1 - index) * interval))
}

function initial(): LiveState {
    const now = Date.now()
    const interval = settings.get().interval
    return {
        at: now,
        readings: Object.fromEntries(SERVICE_IDS.map((id) => [id, history(id, now, interval)])) as Record<ServiceId, Reading[]>,
        sites: Object.fromEntries(SITES.map((site) => [site.id, Array.from({ length: KEEP }, () => site.latency * wander(site.id, 0.04))])),
        health: Object.fromEntries(SERVICE_IDS.map((id) => [id, 'operational'])) as Record<ServiceId, Health>,
        siteHealth: Object.fromEntries(SITES.map((site) => [site.id, 'operational'])),
        scenarios: [],
    }
}

/** The board's live world, a new value every tick. */
export const live = createStore<LiveState>(initial())

/** The live world in a component, drawn again every tick. */
export function useLive(): LiveState {
    return useStore(live)
}

/** What the tick reads from the backend, kept current as it changes. */
const known: { incidents: Incident[]; maintenance: Maintenance[]; deploys: Deploy[]; onCall: Person } = {
    incidents: [],
    maintenance: [],
    deploys: [],
    onCall: 'grace',
}

/** Whether a window is open at a moment. */
export function inWindow(window: Maintenance, now: number): boolean {
    return !window.cancelled && dateOfMoment(window.starts).getTime() <= now && now < dateOfMoment(window.ends).getTime()
}

/** The mean of the last few values, so one stray reading does not flip a state. */
function recent(values: readonly number[], count = 3): number {
    const tail = values.slice(-count)
    return tail.reduce((sum, value) => sum + value, 0) / Math.max(1, tail.length)
}

/** How a service is doing by its latest readings and its maintenance. */
export function healthOf(id: ServiceId, readings: readonly Reading[], windows: readonly Maintenance[], now: number): Health {
    if (windows.some((window) => window.service === id && inWindow(window, now))) return 'maintenance'
    const service = SERVICE_BY_ID[id]
    const errors = recent(readings.map((reading) => reading.errors))
    const p95 = recent(readings.map((reading) => reading.p95))
    if (errors >= 5 || p95 >= service.latency * 3.5) return 'outage'
    if (errors >= 1.5 || p95 >= service.latency * 1.8) return 'degraded'
    return 'operational'
}

/** How a site is doing by its latest round trips. */
export function siteHealthOf(id: string, latencies: readonly number[]): Health {
    const base = SITE_BY_ID[id]?.latency ?? 1
    const factor = recent(latencies) / base
    if (factor >= 3.2) return 'outage'
    if (factor >= 1.7) return 'degraded'
    return 'operational'
}

/** The worst state among some services. */
export function worstOf(states: readonly Health[]): Health {
    return states.reduce<Health>((worst, state) => worse(worst, state), 'operational')
}

/** How hard each scenario hits each service now: its own, and part of what hits what it calls on. */
function pressure(scenarios: readonly Scenario[], now: number) {
    const own = Object.fromEntries(SERVICE_IDS.map((id) => [id, { errors: 0, latency: 0 }])) as Record<
        ServiceId,
        { errors: number; latency: number }
    >
    const sites: Record<string, number> = {}
    for (const scenario of scenarios) {
        const strength = envelope((now - scenario.started) / scenario.length)
        if (scenario.kind === 'region' && scenario.site !== undefined) {
            sites[scenario.site] = (sites[scenario.site] ?? 0) + scenario.peak * strength
        } else if (scenario.service !== undefined) {
            const hit = own[scenario.service]
            if (scenario.kind === 'spike') {
                hit.errors += scenario.peak * strength
                hit.latency += 0.5 * strength
            } else hit.latency += scenario.peak * strength
        }
    }
    for (const deploy of known.deploys) {
        if (deploy.state === 'running') own[deploy.service].latency += 0.3
    }
    // A service slows with what it calls on, at part of the strength.
    const felt = Object.fromEntries(
        SERVICES.map((service) => {
            const self = own[service.id]
            const from = service.dependsOn.map((id) => own[id])
            return [
                service.id,
                {
                    errors: self.errors + 0.35 * Math.max(0, ...from.map((one) => one.errors)),
                    latency: self.latency + 0.4 * Math.max(0, ...from.map((one) => one.latency)),
                },
            ]
        }),
    ) as Record<ServiceId, { errors: number; latency: number }>
    return { services: felt, sites }
}

let scenarioCount = 0

/** Starts something going wrong now: on a service, or on a site for a region. */
export function trigger(kind: Scenario['kind'], target?: string): Scenario {
    scenarioCount += 1
    const now = Date.now()
    const busy = new Set(live.get().scenarios.map((one) => one.service ?? one.site))
    const services = SERVICE_IDS.filter((id) => !busy.has(id) && id !== 'queue')
    const sites = SITES.map((site) => site.id).filter((id) => !busy.has(id))
    const scenario: Scenario =
        kind === 'region'
            ? {
                  id: `scenario-${String(scenarioCount)}`,
                  kind,
                  site: target ?? pick(sites.length > 0 ? sites : SITES.map((site) => site.id)),
                  started: now,
                  length: between(30, 50) * SECOND,
                  peak: between(2.5, 4.5),
              }
            : {
                  id: `scenario-${String(scenarioCount)}`,
                  kind,
                  service: (target as ServiceId | undefined) ?? pick(services.length > 0 ? services : SERVICE_IDS),
                  started: now,
                  length: (kind === 'spike' ? between(25, 40) : between(35, 55)) * SECOND,
                  peak: kind === 'spike' ? between(6, 10) : between(2, 3.5),
              }
    live.update((state) => ({ ...state, scenarios: [...state.scenarios, scenario] }))
    return scenario
}

/** Ends everything going wrong now, so the world calms down. */
export function calmDown(): void {
    live.update((state) => ({ ...state, scenarios: [] }))
}

/** Takes one reading of everything and moves what goes on along. */
export function tick(): void {
    const now = Date.now()
    const options = { ...DEFAULT_SETTINGS, ...settings.get() }
    const state = live.get()
    const scenarios = state.scenarios.filter((scenario) => now < scenario.started + scenario.length)
    const chance = options.interval / EVERY[options.weather]
    if (scenarios.length < AT_ONCE[options.weather] && Math.random() < chance) {
        live.set({ ...state, scenarios })
        trigger(pick(['spike', 'spike', 'drift', 'drift', 'region'] as const))
    }
    const current = live.get().scenarios.filter((scenario) => now < scenario.started + scenario.length)
    const felt = pressure(current, now)

    const readings = { ...state.readings }
    const health = { ...state.health }
    for (const id of SERVICE_IDS) {
        const base = calm(id, now)
        const hit = felt.services[id]
        const reading: Reading = {
            at: now,
            p95: base.p95 * (1 + hit.latency),
            p50: base.p50 * (1 + hit.latency * 0.6),
            errors: base.errors + hit.errors,
            load: base.load * (1 - Math.min(0.5, hit.errors / 20)),
        }
        readings[id] = [...state.readings[id].slice(-(KEEP - 1)), reading]
        health[id] = healthOf(id, readings[id], known.maintenance, now)
    }
    const sites = { ...state.sites }
    const siteHealth = { ...state.siteHealth }
    for (const site of SITES) {
        const latency = site.latency * wander(site.id, 0.04) * (1 + (felt.sites[site.id] ?? 0))
        sites[site.id] = [...state.sites[site.id].slice(-(KEEP - 1)), latency]
        siteHealth[site.id] = siteHealthOf(site.id, sites[site.id])
    }
    live.set({ at: now, readings, sites, health, siteHealth, scenarios: current })

    finishDeploys(now)
    if (options.autoIncidents) openIncidents(current, health, siteHealth)
    if (options.responder) respond(health, siteHealth, now)
}

/** How long a deploy runs before it is done. */
const DEPLOY_TIME = 8 * SECOND

/** Deploys a finish is on its way for. */
const finishing = new Set<string>()

function finishDeploys(now: number): void {
    for (const deploy of known.deploys) {
        if (deploy.state !== 'running' || finishing.has(deploy.id) || now - new Date(deploy.at).getTime() < DEPLOY_TIME) continue
        finishing.add(deploy.id)
        void deploys.update(deploy.id, { state: 'succeeded' }).finally(() => finishing.delete(deploy.id))
    }
}

/** Scenarios an incident is being opened for, so a slow answer does not open a second. */
const opening = new Set<string>()
/** Incidents an update is on its way for. */
const moving = new Set<string>()

const TITLES: Record<Scenario['kind'], (name: string) => string> = {
    spike: (name) => `Elevated error rates on ${name}`,
    drift: (name) => `Slow responses from ${name}`,
    region: (name) => `Degraded performance in ${name}`,
}

const FIRST: Record<Scenario['kind'], (name: string) => string> = {
    spike: (name) => `${name} is answering more requests with an error than usual. We are looking into it.`,
    drift: (name) => `${name} is answering slowly. We are looking into it.`,
    region: (name) => `Requests through ${name} are slow or failing. We are looking into it.`,
}

function openIncidents(scenarios: readonly Scenario[], health: Record<ServiceId, Health>, siteHealth: Record<string, Health>): void {
    const open = known.incidents.filter((incident) => incident.state !== 'resolved')
    for (const scenario of scenarios) {
        if (opening.has(scenario.id)) continue
        const service = scenario.service
        const site = scenario.site
        const state = service !== undefined ? health[service] : site !== undefined ? siteHealth[site] : 'operational'
        if (state !== 'degraded' && state !== 'outage') continue
        const covered = open.some((incident) =>
            service !== undefined ? incident.services.includes(service) : site !== undefined && incident.sites.includes(site),
        )
        if (covered) continue
        opening.add(scenario.id)
        const name = service ?? SITE_BY_ID[site ?? '']?.city ?? 'a site'
        const at = new Date().toISOString()
        void incidents.create({
            code: nextCode(known.incidents),
            title: TITLES[scenario.kind](name),
            severity: state === 'outage' ? 'major' : 'minor',
            state: 'investigating',
            services: service === undefined ? [] : [service],
            sites: site === undefined ? [] : [site],
            assignee: known.onCall,
            opened: at,
            resolved: null,
            updates: [{ id: updateId(), at, state: 'investigating', message: FIRST[scenario.kind](name), by: known.onCall }],
            public: true,
            cause: scenario.kind,
        })
    }
}

/** What the on-call person posts as an incident the board opened moves along. */
const NEXT: Record<NonNullable<Incident['cause']>, Partial<Record<IncidentState, (name: string) => string>>> = {
    spike: {
        identified: (name) => `The errors follow the last deploy of ${name}. We are rolling it back.`,
        monitoring: (name) => `The rollback is out and ${name} answers normally again. We are watching it.`,
        resolved: (name) => `${name} has answered normally for a while. This incident is resolved.`,
    },
    drift: {
        identified: (name) => `A slow query holds ${name} up. We are adding capacity.`,
        monitoring: (name) => `The capacity is in and ${name} is fast again. We are watching it.`,
        resolved: (name) => `${name} has stayed fast. This incident is resolved.`,
    },
    region: {
        identified: (name) => `A network path into ${name} is dropping packets. Traffic is moving to a neighbor.`,
        monitoring: (name) => `Traffic for ${name} is flowing again. We are watching it.`,
        resolved: (name) => `${name} has answered normally for a while. This incident is resolved.`,
    },
}

/** How long the responder takes to find the cause, and how long it watches a recovery, in milliseconds. */
const TO_IDENTIFY = 12 * SECOND
const TO_RESOLVE = 20 * SECOND

function respond(health: Record<ServiceId, Health>, siteHealth: Record<string, Health>, now: number): void {
    for (const incident of known.incidents) {
        if (incident.cause === null || incident.state === 'resolved' || moving.has(incident.id)) continue
        const last = incident.updates[0]
        const since = now - new Date(last?.at ?? incident.opened).getTime()
        const healthy =
            incident.services.every((id) => health[id] === 'operational' || health[id] === 'maintenance') &&
            incident.sites.every((id) => siteHealth[id] === 'operational')
        const next: IncidentState | undefined =
            incident.state === 'investigating' && since >= TO_IDENTIFY
                ? 'identified'
                : incident.state === 'identified' && healthy
                  ? 'monitoring'
                  : incident.state === 'monitoring' && healthy && since >= TO_RESOLVE
                    ? 'resolved'
                    : undefined
        if (next === undefined) continue
        const name = incident.services[0] ?? SITE_BY_ID[incident.sites[0] ?? '']?.city ?? 'the service'
        const message = NEXT[incident.cause][next]?.(name) ?? ''
        moving.add(incident.id)
        void postUpdate(incident, next, message, incident.assignee, true).finally(() => moving.delete(incident.id))
    }
}

/**
 * Posts an update to an incident, moving it to `state`; resolving it stamps when. A person's post
 * takes the incident over from the responder; the responder's own posts pass `responder`.
 */
export function postUpdate(incident: Incident, state: IncidentState, message: string, by: Person, responder = false): Promise<Incident> {
    const at = new Date().toISOString()
    return incidents.update(incident.id, {
        state,
        updates: [{ id: updateId(), at, state, message, by }, ...incident.updates],
        resolved: state === 'resolved' ? at : null,
        cause: responder ? incident.cause : null,
    })
}

let started = 0
let timer: ReturnType<typeof setTimeout> | undefined
const stops: (() => void)[] = []

function follow(): void {
    void incidents.list().then((rows) => (known.incidents = rows))
    void maintenance.list().then((rows) => (known.maintenance = rows))
    void deploys.list().then((rows) => (known.deploys = rows))
    void onCall.list().then((rows) => (known.onCall = rows[0]?.person ?? known.onCall))
    stops.push(
        incidents.subscribe((rows) => (known.incidents = rows)),
        maintenance.subscribe((rows) => (known.maintenance = rows)),
        deploys.subscribe((rows) => (known.deploys = rows)),
        onCall.subscribe((rows) => (known.onCall = rows[0]?.person ?? known.onCall)),
    )
}

/** Starts the readings, at the interval the settings name, while they say live; returns the call that stops them. */
export function startLive(): () => void {
    started += 1
    if (started === 1) {
        follow()
        const loop = () => {
            const options = { ...DEFAULT_SETTINGS, ...settings.get() }
            if (options.live) tick()
            timer = setTimeout(loop, options.interval)
        }
        timer = setTimeout(loop, 300)
    }
    return () => {
        started -= 1
        if (started > 0) return
        clearTimeout(timer)
        for (const stop of stops.splice(0)) stop()
    }
}
