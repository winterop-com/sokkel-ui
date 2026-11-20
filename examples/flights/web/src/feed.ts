/**
 * The watch's feed: the aircraft now, each with the trail the watch has kept of it, read every few
 * seconds from the simulation or, when chosen and offered, every half minute or so from adsb.lol
 * for the area the map shows. A live read that fails leaves the simulation running and says why.
 */
import { createStore, useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import type { MapViewport } from '@winterop-com/sokkel-ui-maps/MapView'
import type { ReadsbResponse } from '@winterop-com/sokkel-ui-tracking/adsb'
import { distance } from '@winterop-com/sokkel-ui-tracking/geo'
import type { LonLat } from '@winterop-com/sokkel-ui-tracking/track'

import { readFlights, type Flight } from './flights'
import { fetchPoint, LIVE_UNAVAILABLE, liveAvailable, MAX_RADIUS } from './live'
import { DEFAULT_SETTINGS, settings, type Settings } from './settings'
import { simulate } from './sim'

const SECOND = 1000
const MINUTE = 60 * SECOND

/** How often the simulation is read. */
const SIMULATED_EVERY = 2 * SECOND
/** How far apart two points of a trail are, at most one per step. */
const TRAIL_STEP = 15 * SECOND
/** The longest trail kept, the most the settings offer. */
const TRAIL_KEPT = 10 * MINUTE
/** How long an aircraft the live feed stops naming is kept, as it may come back in the next answer. */
const LIVE_GRACE = 2 * MINUTE

/** Southern Norway and the North Sea: where the watch looks until the map says otherwise. */
export const REGION: MapViewport = { center: [6.8, 59.4], zoom: 5.2, bounds: [0.5, 56.6, 13.1, 62.1] }

export interface FeedState {
    /** When the aircraft were read. */
    at: number
    flights: readonly Flight[]
    /** Where they came from: the simulation, or the live feed. */
    source: 'simulated' | 'live'
    /** Live was chosen but cannot be read: why, while the simulation stands in. */
    fallback?: string
    /** How many requests the live feed's limit has left today, as its last answer said. */
    remaining?: number
    /** Whether a live read is on its way. */
    loading: boolean
}

export const feed = createStore<FeedState>({ at: Date.now(), flights: [], source: 'simulated', loading: false })

export const useFeed = (): FeedState => useStore(feed)

/** What the map shows, which the live feed reads around. */
const view = createStore<MapViewport>(REGION)

/** The area the map shows, told by the map page as it comes to rest. */
export function setView(next: MapViewport): void {
    view.set(next)
    // Only a view that moved well away from what was read last asks for a read sooner than the interval.
    const read = lastRead
    if (read !== undefined && distance(read.center, next.center) < radiusOf(read) * 1852 * 0.25 && Math.abs(read.zoom - next.zoom) < 1)
        return
    scheduleLive()
}

/** The trails kept so far: each aircraft's points with the time each was taken, oldest first. */
const trails = new Map<string, { points: LonLat[]; times: number[]; seen: number }>()

/** Adds the aircraft read at `at` to their trails, and hands them back carrying the trails. */
function keep(flights: readonly Flight[], at: number, grace: number): Flight[] {
    for (const flight of flights) {
        const kept = trails.get(flight.id) ?? { points: [], times: [], seen: at }
        kept.seen = at
        const last = kept.times.at(-1)
        if (last === undefined || at - last >= TRAIL_STEP) {
            kept.points.push([flight.lon, flight.lat])
            kept.times.push(at)
        }
        while (kept.times.length > 0 && at - (kept.times[0] ?? at) > TRAIL_KEPT) {
            kept.points.shift()
            kept.times.shift()
        }
        trails.set(flight.id, kept)
    }
    for (const [id, kept] of trails) if (at - kept.seen > grace) trails.delete(id)
    return flights.map((flight) => ({ ...flight, trail: trails.get(flight.id)?.points.slice(0, -1) }))
}

/** Trails cut to the minutes the settings keep. */
export function trailFor(flight: Flight, at: number, minutes: number): LonLat[] | undefined {
    if (minutes === 0) return undefined
    const kept = trails.get(flight.id)
    if (kept === undefined) return flight.trail
    return kept.points.filter((_, index) => at - (kept.times[index] ?? at) <= minutes * MINUTE).slice(0, -1)
}

/** The simulated aircraft at a moment, read through the readsb parser as a live answer is. */
export const simulatedAt = (at: number): Flight[] => readFlights(simulate(at), 'simulated')

/**
 * The simulated aircraft at a moment with their trails, worked out from the moments before it: what
 * the history page plays back.
 */
export function replayAt(at: number, minutes: number): Flight[] {
    const now = simulatedAt(at)
    if (minutes === 0) return now
    const steps = Math.round((minutes * MINUTE) / TRAIL_STEP)
    const past = Array.from({ length: steps }, (_, index) => {
        const then = simulatedAt(at - (steps - index) * TRAIL_STEP)
        return new Map(then.map((flight) => [flight.id, [flight.lon, flight.lat] as LonLat]))
    })
    return now.map((flight) => ({
        ...flight,
        trail: past.map((moment) => moment.get(flight.id)).filter((point): point is LonLat => point !== undefined),
    }))
}

function readSimulation(fallback?: string): void {
    const at = Date.now()
    feed.set({ ...feed.get(), at, flights: keep(simulatedAt(at), at, 0), source: 'simulated', fallback, loading: false })
}

/** Fills the trails with the simulation's last minutes, so the map opens with trails behind every aircraft. */
function primeSimulation(): void {
    trails.clear()
    const at = Date.now()
    for (let then = at - TRAIL_KEPT; then < at; then += TRAIL_STEP) keep(simulatedAt(then), then, 0)
}

let lastLive = 0
let lastRead: MapViewport | undefined
let liveTimer: ReturnType<typeof setTimeout> | undefined
let reading = false

const options = (): Settings => ({ ...DEFAULT_SETTINGS, ...settings.get() })

/** The circle round the view's middle that holds what it shows, in nautical miles, at most the API's widest. */
function radiusOf({ center, bounds: [west, south, east, north] }: MapViewport): number {
    const corner = Math.max(distance(center, [west, north]), distance(center, [east, south]))
    return Math.min(MAX_RADIUS, Math.ceil(corner / 1852))
}

async function readLive(): Promise<void> {
    if (reading) return
    reading = true
    lastLive = Date.now()
    feed.set({ ...feed.get(), loading: true })
    const shown = view.get()
    lastRead = shown
    const answer = await fetchPoint(shown.center[1], shown.center[0], radiusOf(shown))
    reading = false
    // The settings may have turned live off while the answer was on its way.
    if (options().source !== 'live') return
    if (!answer.ok) {
        readSimulation(answer.error)
        return
    }
    const at = Date.now()
    const body = answer.body as ReadsbResponse
    if (typeof body !== 'object' || body === null || !('ac' in body)) {
        readSimulation('adsb.lol answered with something other than a list of aircraft.')
        return
    }
    if (feed.get().source !== 'live') trails.clear()
    feed.set({
        at,
        flights: keep(readFlights(body, 'adsb.lol'), at, LIVE_GRACE),
        source: 'live',
        remaining: answer.remaining,
        loading: false,
    })
}

/** Reads live again once the interval has passed since the last read, and never sooner than ten seconds after it. */
function scheduleLive(soon = true): void {
    if (liveTimer !== undefined) clearTimeout(liveTimer)
    liveTimer = undefined
    const chosen = options()
    if (chosen.source !== 'live' || !chosen.running) return
    const every = Math.max(10, chosen.interval) * SECOND
    const wait = Math.max(0, lastLive + (soon ? 10 * SECOND : every) - Date.now())
    liveTimer = setTimeout(() => {
        void readLive().then(() => scheduleLive(false))
    }, wait)
}

/** Reads the live feed again now, as a retry after it failed; still never sooner than ten seconds after the last read. */
export function retryLive(): void {
    scheduleLive(true)
}

/**
 * Starts the feed and follows the settings: the simulation every two seconds, or live at the
 * interval chosen, the simulation standing in until the first answer and whenever a read fails.
 */
export function startFeed(): () => void {
    let simTimer: ReturnType<typeof setInterval> | undefined
    let chosen: Settings | undefined
    const apply = () => {
        const next = options()
        const before = chosen
        chosen = next
        if (before !== undefined && before.source === next.source && before.running === next.running && before.interval === next.interval)
            return
        if (simTimer !== undefined) clearInterval(simTimer)
        simTimer = undefined
        if (liveTimer !== undefined) clearTimeout(liveTimer)
        liveTimer = undefined
        const wantsLive = next.source === 'live'
        if (wantsLive && !liveAvailable()) {
            // Live cannot be read here: the simulation runs, and the settings say why.
            if (before === undefined || before.source !== next.source) primeSimulation()
            if (next.running) {
                readSimulation(LIVE_UNAVAILABLE)
                simTimer = setInterval(() => readSimulation(LIVE_UNAVAILABLE), SIMULATED_EVERY)
            }
            return
        }
        if (!wantsLive) {
            if (before === undefined || before.source !== 'simulated' || feed.get().source !== 'simulated') primeSimulation()
            readSimulation()
            if (next.running) simTimer = setInterval(() => readSimulation(), SIMULATED_EVERY)
            return
        }
        // Live: the simulation keeps the map full until the first answer, and stands in again if a read fails.
        if (feed.get().flights.length === 0) {
            primeSimulation()
            readSimulation()
        }
        if (next.running) {
            simTimer = setInterval(() => {
                if (feed.get().source === 'simulated') readSimulation(feed.get().fallback)
            }, SIMULATED_EVERY)
            scheduleLive(true)
        }
    }
    apply()
    const stop = settings.subscribe(apply)
    return () => {
        stop()
        if (simTimer !== undefined) clearInterval(simTimer)
        if (liveTimer !== undefined) clearTimeout(liveTimer)
    }
}
