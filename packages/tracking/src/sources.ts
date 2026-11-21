/**
 * Sources as plugins, and the one engine that runs them. A source is a plain object: what it is
 * called, how often it is read, the checks its answers must pass, how to read it live and what
 * stands in for it when it cannot be read. The engine reads each source when it is due, judges what
 * came back with the source's checks, holds a steady status for it with a status monitor, and raises
 * an alert when that status changes. A source whose live read fails shows its simulation, and says so.
 *
 * The engine asks nothing of a server itself: the app's `read` does, and hands over what came back.
 * It holds no timer either: the app calls `poll` as often as it likes, and only what is due is read.
 * What it holds is plain data, so one window can run it and hand its snapshot to others, which
 * `adopt` it and can run on from it. Times are milliseconds: instants since the epoch, the rest spans.
 */
import {
    combineResults,
    createStatusMonitor,
    evaluateCheck,
    type Check,
    type CheckResponse,
    type CheckResult,
    type CheckStatus,
    type StatusChange,
    type StatusMonitor,
    type StatusMonitorOptions,
    type StatusState,
    type StatusSummary,
} from './checks'

/** What one read of a source gave. */
export interface SourceReading<T = unknown> {
    /** What each of the source's checks got back, by the check's id; a check with none counts as unanswered. */
    responses: Readonly<Record<string, CheckResponse>>
    /** What was read. Left out, what was read before is kept. */
    data?: T
}

/** What a read is handed. */
export interface SourceContext {
    /** The moment of the read, in milliseconds since the epoch. */
    at: number
}

/** One source: a feed, a stream or a server, with the checks it carries. */
export interface Source<T = unknown> {
    /** Unique among the engine's sources. */
    id: string
    /** What a list writes for it. */
    label: string
    /** What kind of thing it gives, in the app's own words: `incidents`, `tracks`, `server`. */
    kind: string
    /** How long to wait between two reads, in milliseconds: never shorter than the source's own limit allows. */
    interval: number
    /** What a read's answers must pass. */
    checks: readonly Check[]
    /** Reads it live. Without one, the source is its simulation alone. */
    read?: (context: SourceContext) => SourceReading<T> | Promise<SourceReading<T>>
    /** What stands in for it: read when there is no live read, when live is switched off, and when a live read comes back down. */
    simulate?: (context: SourceContext) => SourceReading<T>
    /** Leaves it unread while the page is hidden, for a source with a budget of requests. */
    pauseHidden?: boolean
}

/** Where what a source shows comes from: its live read, its simulation, or nowhere while it is off. */
export type SourceMode = 'live' | 'simulated' | 'off'

/** How one source stands, as plain data. */
export interface SourceState {
    id: string
    label: string
    kind: string
    interval: number
    /** Whether it is read at all. */
    enabled: boolean
    /** Whether its live read is wanted; false reads its simulation alone. */
    live: boolean
    mode: SourceMode
    /** Whether the simulation stands in for a live read that failed. */
    fallback: boolean
    status: CheckStatus
    /** When the status was taken. */
    since?: number
    /** What each check found in the last read. */
    results: CheckResult[]
    /** The slowest answer of each of the last reads, oldest first; a read with no answer leaves a gap as null. */
    latency: (number | null)[]
    /** When it was last read, and when it is due again. */
    readAt?: number
    nextAt?: number
    /** Whether a read is under way. */
    reading: boolean
    /** Why the last read failed outright, when it threw. */
    error?: string
    /** Its changes of status, oldest first. */
    transitions: StatusChange[]
    /** Its uptime and latency over the monitor's window. */
    summary: StatusSummary
    /** What its monitor holds, to start one from again. */
    monitor: StatusState
    /** Counts the changes of what it read, so a reader knows when to take its data again. */
    version: number
}

/** A change of a source's status, raised once. */
export interface SourceAlert {
    /** Unique among the engine's alerts. */
    id: string
    /** The source's id and label. */
    source: string
    label: string
    from: CheckStatus
    to: CheckStatus
    at: number
    /** Why the source is not up, from the check that failed, when one did. */
    reason?: string
}

/** Everything the engine holds but the data itself. */
export interface EngineState {
    sources: SourceState[]
    /** Newest first. */
    alerts: SourceAlert[]
}

/** The engine's state with what every source read, to hand to another window. */
export interface EngineSnapshot {
    state: EngineState
    data: Record<string, unknown>
}

export interface SourceEngineOptions extends Pick<StatusMonitorOptions, 'failures' | 'recoveries' | 'window'> {
    sources: readonly Source[]
    /** How many reads of latency each source keeps. 40 by default. */
    history?: number
    /** How many alerts are kept. 100 by default. */
    alerts?: number
    /** The sources that start switched off, by id. */
    disabled?: readonly string[]
    /** The sources that start on their simulation alone, by id. */
    simulated?: readonly string[]
}

export interface PollOptions {
    /** Whether the page is hidden, which leaves the sources that ask for it unread. */
    hidden?: boolean
}

export interface SourceEngine {
    /** Reads every source that is due at `now`. A read that answers at once is taken before this returns. */
    poll(now: number, options?: PollOptions): void
    /** Reads one source now, due or not, unless a read of it is under way. */
    refresh(id: string, now: number): void
    /** Switches a source on or off; off forgets what it read and its status. */
    setEnabled(id: string, enabled: boolean): void
    /** Whether a source's live read is wanted; false reads its simulation alone. */
    setLive(id: string, live: boolean): void
    /** What the engine holds; the same object until something changes. */
    state(): EngineState
    /** What a source last read. */
    data<T = unknown>(id: string): T | undefined
    /** Calls `listener` after each change, and returns the call that stops it. */
    subscribe(listener: () => void): () => void
    /**
     * The state and the sources' data, as plain data. With `known`, each source's version a reader
     * holds already, the data of a source at that version is left out, so only what changed is sent.
     */
    snapshot(known?: Readonly<Record<string, number>>): EngineSnapshot
    /**
     * Takes another engine's snapshot as its own, monitors included, so it can run on from it. A
     * source the snapshot gives no data for keeps the data it holds when its version is the same.
     */
    adopt(snapshot: EngineSnapshot): void
}

const EMPTY: StatusSummary = { status: 'unknown', count: 0 }

/** What a failed check says of itself, for an alert. */
function reasonOf(results: readonly CheckResult[]): string | undefined {
    const failed = results.find((result) => result.status === 'down') ?? results.find((result) => result.status !== 'up')
    if (failed?.failure === undefined) return undefined
    const { reason, actual, expected } = failed.failure
    return [reason, actual ?? expected].filter((part) => part !== undefined).join(': ')
}

/**
 * An engine over a list of sources. `poll` reads what is due; each read's answers go through the
 * source's checks, the worst of them is one observation for the source's monitor, and a change of
 * its status is kept in the source's transitions and raised as an alert. The first status a source
 * takes is no alert when it is up. A live read that comes back down, or throws, leaves the source
 * showing its simulation until a later read is better.
 */
export function createSourceEngine(options: SourceEngineOptions): SourceEngine {
    const history = Math.max(1, options.history ?? 40)
    const most = Math.max(1, options.alerts ?? 100)
    const monitorOptions = { failures: options.failures, recoveries: options.recoveries, window: options.window }
    const sources = new Map(options.sources.map((source) => [source.id, source]))
    const monitors = new Map<string, StatusMonitor>()
    const states = new Map<string, SourceState>()
    const data = new Map<string, unknown>()
    const listeners = new Set<() => void>()
    /** Counts the reads started of each source, so an answer that comes after a newer read, or after the source was switched, is dropped. */
    const rounds = new Map<string, number>()
    let alerts: SourceAlert[] = []
    let cached: EngineState | undefined
    let serial = 0

    for (const source of options.sources) {
        const enabled = !(options.disabled ?? []).includes(source.id)
        const live = source.read !== undefined && !(options.simulated ?? []).includes(source.id)
        monitors.set(source.id, createStatusMonitor(monitorOptions))
        states.set(source.id, {
            id: source.id,
            label: source.label,
            kind: source.kind,
            interval: source.interval,
            enabled,
            live,
            mode: enabled ? (live ? 'live' : 'simulated') : 'off',
            fallback: false,
            status: 'unknown',
            results: [],
            latency: [],
            reading: false,
            transitions: [],
            summary: EMPTY,
            monitor: { status: 'unknown', observations: [] },
            version: 0,
        })
    }

    const changed = () => {
        cached = undefined
        for (const listener of listeners) listener()
    }
    const patch = (id: string, change: Partial<SourceState>) => {
        const state = states.get(id)
        if (state !== undefined) states.set(id, { ...state, ...change })
    }

    /** Takes what a read gave: judges it, moves the monitor, and falls back to the simulation when it came back down. */
    const take = (source: Source, at: number, reading: SourceReading | undefined, error?: string) => {
        const state = states.get(source.id)
        const monitor = monitors.get(source.id)
        if (state === undefined || monitor === undefined) return
        const results = source.checks.map((check) =>
            evaluateCheck(check, reading?.responses[check.id] ?? { at, error: error ?? 'No answer came.' }),
        )
        const observation = combineResults(results) ?? { status: reading === undefined ? ('down' as const) : ('up' as const), at }
        const change = monitor.push(observation)
        const wasLive = state.live && source.read !== undefined
        // A live read that came back down gives way to the simulation, which is read for its data alone.
        const failed = wasLive && observation.status === 'down'
        const stand = failed && source.simulate !== undefined ? source.simulate({ at }) : undefined
        const read = failed ? stand?.data : reading?.data
        if (read !== undefined) data.set(source.id, read)
        const next: Partial<SourceState> = {
            mode: wasLive && !failed ? 'live' : 'simulated',
            fallback: failed,
            status: monitor.status(),
            since: monitor.state().since,
            results,
            latency: [...state.latency, observation.latency ?? null].slice(-history),
            readAt: at,
            nextAt: at + source.interval,
            reading: false,
            error,
            summary: monitor.summary(),
            monitor: monitor.state(),
            version: read === undefined ? state.version : state.version + 1,
        }
        if (change !== undefined) {
            next.transitions = [...state.transitions, change].slice(-50)
            if (!(change.from === 'unknown' && change.to === 'up')) {
                serial += 1
                const alert: SourceAlert = {
                    id: `${source.id}-${String(change.at)}-${String(serial)}`,
                    source: source.id,
                    label: source.label,
                    from: change.from,
                    to: change.to,
                    at: change.at,
                }
                const reason = change.to === 'up' ? undefined : reasonOf(results)
                if (reason !== undefined) alert.reason = reason
                alerts = [alert, ...alerts].slice(0, most)
            }
        }
        patch(source.id, next)
        changed()
    }

    const read = (source: Source, at: number) => {
        const state = states.get(source.id)
        if (state === undefined || !state.enabled || state.reading) return
        const round = (rounds.get(source.id) ?? 0) + 1
        rounds.set(source.id, round)
        const current = () => rounds.get(source.id) === round
        const reader = state.live && source.read !== undefined ? source.read : source.simulate
        if (reader === undefined) {
            take(source, at, undefined, 'The source has nothing to read.')
            return
        }
        let answer: SourceReading | Promise<SourceReading>
        try {
            answer = reader({ at })
        } catch (error) {
            take(source, at, undefined, error instanceof Error ? error.message : String(error))
            return
        }
        if (!(answer instanceof Promise)) {
            take(source, at, answer)
            return
        }
        patch(source.id, { reading: true })
        changed()
        answer.then(
            (reading) => {
                if (current()) take(source, at, reading)
            },
            (error: unknown) => {
                if (current()) take(source, at, undefined, error instanceof Error ? error.message : String(error))
            },
        )
    }

    /** Forgets what a source read and how it stood, as when it is switched. */
    const forget = (id: string, change: Partial<SourceState>) => {
        rounds.set(id, (rounds.get(id) ?? 0) + 1)
        monitors.get(id)?.clear()
        data.delete(id)
        const state = states.get(id)
        patch(id, {
            fallback: false,
            status: 'unknown',
            since: undefined,
            results: [],
            latency: [],
            readAt: undefined,
            nextAt: undefined,
            reading: false,
            error: undefined,
            summary: EMPTY,
            monitor: { status: 'unknown', observations: [] },
            version: (state?.version ?? 0) + 1,
            ...change,
        })
        changed()
    }

    return {
        poll(now, { hidden = false } = {}) {
            for (const source of sources.values()) {
                const state = states.get(source.id)
                if (state === undefined || !state.enabled || state.reading) continue
                // By whether the live read is wanted, not by what is shown: a source fallen back to its simulation still reads live.
                if (hidden && source.pauseHidden === true && state.live && source.read !== undefined) continue
                if (state.nextAt === undefined || now >= state.nextAt) read(source, now)
            }
        },
        refresh(id, now) {
            const source = sources.get(id)
            if (source !== undefined) read(source, now)
        },
        setEnabled(id, enabled) {
            const state = states.get(id)
            if (state === undefined || state.enabled === enabled) return
            forget(id, { enabled, mode: enabled ? (state.live ? 'live' : 'simulated') : 'off' })
        },
        setLive(id, live) {
            const state = states.get(id)
            const wanted = live && sources.get(id)?.read !== undefined
            if (state === undefined || state.live === wanted) return
            forget(id, { live: wanted, mode: state.enabled ? (wanted ? 'live' : 'simulated') : 'off' })
        },
        state() {
            cached ??= { sources: [...states.values()], alerts }
            return cached
        },
        data<T = unknown>(id: string) {
            return data.get(id) as T | undefined
        },
        subscribe(listener) {
            listeners.add(listener)
            return () => {
                listeners.delete(listener)
            }
        },
        snapshot(known = {}) {
            const changed = [...data].filter(([id]) => known[id] === undefined || known[id] !== states.get(id)?.version)
            return { state: { sources: [...states.values()], alerts }, data: Object.fromEntries(changed) }
        },
        adopt(snapshot) {
            alerts = snapshot.state.alerts.slice(0, most)
            for (const given of snapshot.state.sources) {
                if (!sources.has(given.id)) continue
                rounds.set(given.id, (rounds.get(given.id) ?? 0) + 1)
                monitors.set(given.id, createStatusMonitor({ ...monitorOptions, initial: given.monitor }))
                if (Object.hasOwn(snapshot.data, given.id)) data.set(given.id, snapshot.data[given.id])
                else if (states.get(given.id)?.version !== given.version) data.delete(given.id)
                states.set(given.id, { ...given, reading: false })
            }
            changed()
        },
    }
}
