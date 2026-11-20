/**
 * The watch itself: it reads the source (the simulated machine every second, or this machine's own
 * connections through the Electron shell), gathers the records with the tracking package's flow
 * tracker, keeps a snapshot of every reading for the last fifteen minutes so the pages can look
 * back, and hands each new snapshot to the alerts. The simulated machine starts with those fifteen
 * minutes already behind it, so the charts and the timeline open full.
 */

import { createStore, useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import {
    addressScope,
    createFlowTracker,
    type ConnectionFlow,
    type ConnectionRecord,
    type FlowGroup,
    type FlowTracker,
    type RemoteFlow,
} from '@winterop-com/sokkel-ui-tracking/network'

import { forgetKnown, startAlerts, watchAlerts, type AlertWatch } from './alerts'
import { known } from './collections'
import { findGeo, networkBridge, type Geo } from './geo'
import type { Prefs, SourceKind } from './model'
import { builtinHosts, type Place } from './places'
import { createSimulation, type Simulation } from './sim'

/** What the pages read at one moment. */
export interface Snapshot {
    at: number
    connections: ConnectionFlow[]
    remotes: RemoteFlow[]
    processes: FlowGroup[]
    /** Bytes a second received and sent by the whole machine. */
    rateIn: number
    rateOut: number
}

export interface WatchState {
    /** Until the lookup is found and the first readings are in. */
    ready: boolean
    /** The source the readings come from now. */
    source: SourceKind
    /** Whether the readings count bytes; this machine's own connections read through lsof or netstat do not. */
    metered: boolean
    geo?: Geo
    /** What read this machine's connections, while it is the source. */
    tool?: 'lsof' | 'netstat'
    /** Why the source could not be read. */
    problem?: string
    /** Every snapshot kept, oldest first; the array grows in place, so read `at` to follow it. */
    history: Snapshot[]
    /** The time of the latest snapshot. */
    at: number
    /** Where each remote host is, by its address. */
    places: ReadonlyMap<string, Place>
}

/** How far back the snapshots reach, in milliseconds. */
export const KEEP = 15 * 60_000
const SECOND = 1000
/** How many simulated seconds the page opens with behind it. */
const BACKFILL = KEEP / SECOND
/** When the simulated newcomer first runs: a minute after the page opens. */
const NEWCOMER_AT = BACKFILL + 60

export const watch = createStore<WatchState>({
    ready: false,
    source: 'simulated',
    metered: true,
    history: [],
    at: 0,
    places: new Map(),
})

export function useWatch(): WatchState {
    return useStore(watch)
}

/** The snapshot at `time`: the last taken at or before it, or the latest when `time` is null. */
export function snapshotAt(state: WatchState, time: number | null): Snapshot | undefined {
    const { history } = state
    if (history.length === 0) return undefined
    if (time === null) return history[history.length - 1]
    let low = 0
    let high = history.length - 1
    if (history[0].at > time) return history[0]
    while (low < high) {
        const middle = Math.ceil((low + high) / 2)
        if (history[middle].at <= time) low = middle
        else high = middle - 1
    }
    return history[low]
}

/** A deterministic random source for the addresses drawn when GeoLite2 places them. */
function seeded(seed: number): () => number {
    let state = seed
    return () => {
        state = (state + 0x6d2b79f5) | 0
        let t = Math.imul(state ^ (state >>> 15), 1 | state)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const DOCUMENTATION = /^(192\.0\.2|198\.51\.100|203\.0\.113)\./

/** Public IPv4 addresses drawn from a seed, for GeoLite2 to place. */
function drawnAddresses(count: number): string[] {
    const random = seeded(7340)
    const found = new Set<string>()
    while (found.size < count) {
        const parts = [
            1 + Math.floor(random() * 222),
            Math.floor(random() * 256),
            Math.floor(random() * 256),
            1 + Math.floor(random() * 253),
        ]
        const address = parts.join('.')
        if (
            addressScope(address) === 'public' &&
            !DOCUMENTATION.test(address) &&
            !(parts[0] === 198 && (parts[1] === 18 || parts[1] === 19))
        )
            found.add(address)
    }
    return [...found]
}

/**
 * The hosts the simulated machine reaches, and where each is: seeded public addresses placed by
 * GeoLite2 when it is there (the rare ones in countries none of the common ones is in), or the
 * documentation addresses and the built-in lookup.
 */
async function simulatedHosts(geo: Geo): Promise<{ common: string[]; rare: string[]; places: Map<string, Place> }> {
    if (geo.kind === 'geolite') {
        try {
            const placed = await geo.locate(drawnAddresses(600))
            const located = Object.keys(placed)
            if (located.length >= 40) {
                const common = located.slice(0, 100)
                const countries = new Set(common.map((address) => placed[address].country))
                const far = located.slice(100).filter((address) => !countries.has(placed[address].country))
                const rare: string[] = []
                for (const address of far) {
                    if (rare.some((other) => placed[other].country === placed[address].country)) continue
                    rare.push(address)
                    if (rare.length === 4) break
                }
                return { common, rare: rare.length > 0 ? rare : located.slice(-4), places: new Map(Object.entries(placed)) }
            }
        } catch {
            // The lookup failed after it was found: the built-in hosts stand in.
        }
    }
    const { common, rare } = builtinHosts()
    const placed = await geo.locate([...common, ...rare])
    return { common, rare, places: new Map(Object.entries(placed)) }
}

/** Takes the tracker's view at `at` as a snapshot. */
function snapshot(tracker: FlowTracker, at: number): Snapshot {
    const processes = tracker.byProcess(at)
    let rateIn = 0
    let rateOut = 0
    for (const group of processes) {
        rateIn += group.rateIn
        rateOut += group.rateOut
    }
    return { at, connections: tracker.byConnection(at), remotes: tracker.byRemote(at), processes, rateIn, rateOut }
}

/** What runs now: the source's timer or listener, stopped by `stop`. */
interface Running {
    source: SourceKind
    interval: number
    live: boolean
    stop: () => void
}

let geoFound: Promise<Geo> | undefined
let simulation: { sim: Simulation; tracker: FlowTracker; places: Map<string, Place>; history: Snapshot[]; last: number } | undefined
let running: Running | undefined
let alertWatch: AlertWatch | undefined

const keep = (history: Snapshot[], snapshotTaken: Snapshot) => {
    history.push(snapshotTaken)
    const oldest = snapshotTaken.at - KEEP
    let drop = 0
    while (drop < history.length && history[drop].at < oldest) drop += 1
    if (drop > 0) history.splice(0, drop)
}

/** The simulated machine, made once: its hosts placed, and fifteen minutes run before the page opens. */
async function simulated(geo: Geo) {
    if (simulation !== undefined) return simulation
    const hosts = await simulatedHosts(geo)
    const tracker = createFlowTracker({ window: 10 * SECOND, locate: (address) => hosts.places.get(address) })
    const sim = createSimulation(hosts, NEWCOMER_AT)
    const history: Snapshot[] = []
    const now = Math.floor(Date.now() / SECOND) * SECOND
    alertWatch ??= await startAlerts()
    for (let at = now - (BACKFILL - 1) * SECOND; at <= now; at += SECOND) {
        tracker.add(sim.tick(at))
        const taken = snapshot(tracker, at)
        keep(history, taken)
        alertWatch.learn(taken, hosts.places)
    }
    await alertWatch.settle()
    simulation = { sim, tracker, places: hosts.places, history, last: now }
    return simulation
}

function startSimulated(geo: Geo, live: boolean): () => void {
    let stopped = false
    let timer: ReturnType<typeof setInterval> | undefined
    void simulated(geo).then((machine) => {
        if (stopped) return
        const show = () =>
            watch.set({
                ready: true,
                source: 'simulated',
                metered: true,
                geo,
                history: machine.history,
                at: machine.last,
                places: machine.places,
            })
        show()
        if (!live) return
        // Each beat catches the machine up to the clock, so a hidden tab's slowed timer leaves no gap.
        const beat = () => {
            const now = Math.floor(Date.now() / SECOND) * SECOND
            let moved = false
            for (let at = Math.max(machine.last + SECOND, now - KEEP); at <= now; at += SECOND) {
                machine.tracker.add(machine.sim.tick(at))
                const taken = snapshot(machine.tracker, at)
                keep(machine.history, taken)
                if (alertWatch !== undefined) watchAlerts(alertWatch, taken, machine.places)
                machine.last = at
                moved = true
            }
            if (moved) show()
        }
        beat()
        timer = setInterval(beat, SECOND)
    })
    return () => {
        stopped = true
        if (timer !== undefined) clearInterval(timer)
    }
}

/** This machine's own connections, read by the Electron shell's main process every `interval`. */
function startMachine(geo: Geo, interval: number, live: boolean): () => void {
    const bridge = networkBridge()
    if (bridge === undefined) return startSimulated(geo, live)
    const places = new Map<string, Place>()
    // Each connection is read again on every reading, so the window need only outlast one interval.
    const located = createFlowTracker({ window: Math.max(10 * SECOND, interval * 1.5), locate: (address) => places.get(address) })
    const history: Snapshot[] = []
    watch.set({ ready: true, source: 'machine', metered: false, geo, history, at: 0, places })
    if (!live) return () => undefined
    let learned = false
    const unhear = bridge.onReading((reading) => {
        for (const [address, place] of Object.entries(reading.places)) places.set(address, place)
        const records: ConnectionRecord[] = reading.records.map((record) => ({ ...record, at: reading.at }))
        located.add(records)
        const taken = snapshot(located, reading.at)
        keep(history, taken)
        // What the machine already runs when the watch starts is learned, not raised; only what comes after is new.
        if (alertWatch !== undefined && !learned && reading.problem === undefined) {
            alertWatch.learn(taken, places)
            void alertWatch.settle()
            learned = true
        } else if (alertWatch !== undefined && learned) watchAlerts(alertWatch, taken, places)
        watch.set({
            ready: true,
            source: 'machine',
            metered: false,
            geo,
            tool: reading.tool,
            problem: reading.problem,
            history,
            at: reading.at,
            places,
        })
    })
    bridge.start(interval)
    return () => {
        unhear()
        bridge.stop()
    }
}

/**
 * Runs the source the preferences name, reading it while `live`; a change of source, interval or
 * live stops the one running and starts the next. The machine's own connections are offered only
 * in the Electron shell, and the simulation stands in for them anywhere else.
 */
export function runWatch(prefs: Pick<Prefs, 'source' | 'interval' | 'live'>): void {
    const source: SourceKind = prefs.source === 'machine' && networkBridge() !== undefined ? 'machine' : 'simulated'
    if (running !== undefined && running.source === source && running.interval === prefs.interval && running.live === prefs.live) return
    running?.stop()
    geoFound ??= findGeo()
    let stop: (() => void) | undefined
    let stopped = false
    void geoFound.then(async (geo) => {
        alertWatch ??= await startAlerts()
        if (stopped) return
        stop = source === 'machine' ? startMachine(geo, prefs.interval, prefs.live) : startSimulated(geo, prefs.live)
    })
    running = {
        source,
        interval: prefs.interval,
        live: prefs.live,
        stop: () => {
            stopped = true
            stop?.()
        },
    }
}

/** Whether this page can read the machine's own connections: only inside the Electron shell. */
export const canReadMachine = (): boolean => networkBridge() !== undefined

/** Forgets every process and country known, so each raises an alert again the next time it is seen. */
export async function forgetKnownAll(): Promise<void> {
    forgetKnown(alertWatch)
    const rows = await known.list()
    await Promise.all(rows.map((row) => known.remove(row.id)))
}
