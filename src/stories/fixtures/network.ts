/**
 * A machine's connections as the network watch's stories read them: the tracking add-on's simulated
 * machine (browser, mail, sync, updater, backup and shell, and a nightly-export it has not run
 * before) talking to hosts on the documentation networks, each placed in a plain city, read every
 * second with running byte totals and gathered by the add-on's flow tracker. The machine has run
 * for a little over six minutes when the watch opens, so the first frame holds five minutes of
 * readings with an update downloaded, a backup sent and the newcomer just started. Everything
 * follows from the moment asked for, so the same moment is the same watch every time.
 */

import {
    createFlowTracker,
    type ConnectionFlow,
    type FlowGroup,
    type FlowTracker,
    type RemoteFlow,
} from '@winterop-com/sokkel-ui-tracking/network'
import { createNetworkSimulation, networkPlace, type NetworkSimulation } from '@winterop-com/sokkel-ui-tracking/simulate'

const SECOND = 1000

/** The moment the watch opens at: its first frame. */
export const NETWORK_NOW = Date.UTC(2026, 10, 20, 14, 0, 0)

/** How far back the watch keeps its readings: five minutes. */
export const NETWORK_KEEP = 5 * 60 * SECOND

/** How many seconds the machine has run when the watch opens. */
const RUN_BEFORE = 370

/** The second of its run the newcomer first starts at: twenty seconds before the watch opens. */
const NEWCOMER_AT = RUN_BEFORE - 20

/** Where this machine stands: Oslo. */
export const NETWORK_HOME: [number, number] = [10.75, 59.91]

/** One moment of the watch: every connection, by remote host and by process, and the machine's rates. */
export interface NetworkSnapshot {
    at: number
    connections: ConnectionFlow[]
    remotes: RemoteFlow[]
    processes: FlowGroup[]
    rateIn: number
    rateOut: number
}

/** A machine run from its first second, the tracker its readings went to, and the snapshots kept of them. */
interface Run {
    machine: NetworkSimulation
    tracker: FlowTracker
    history: NetworkSnapshot[]
    /** The moment of the last reading. */
    last: number
}

const begin = (): Run => ({
    machine: createNetworkSimulation({ newcomerAt: NEWCOMER_AT }),
    tracker: createFlowTracker({ window: 10 * SECOND, locate: networkPlace }),
    history: [],
    last: NETWORK_NOW - RUN_BEFORE * SECOND,
})

/** The run so far, kept so each second of a live story reads one more second of the machine and not all of them again. */
let run: Run | undefined

/**
 * The readings the watch holds at a moment, oldest first: one a second over the five minutes up to
 * it. A moment before the run kept so far starts the machine afresh, so a moment reads the same
 * whether it is come to live or gone back to.
 */
export function networkHistory(at: number = NETWORK_NOW): NetworkSnapshot[] {
    const end = Math.floor(at / SECOND) * SECOND
    if (run === undefined || end < run.last) run = begin()
    for (let time = run.last + SECOND; time <= end; time += SECOND) {
        run.tracker.add(run.machine.tick(time))
        const processes = run.tracker.byProcess(time)
        run.history.push({
            at: time,
            connections: run.tracker.byConnection(time),
            remotes: run.tracker.byRemote(time),
            processes,
            rateIn: processes.reduce((sum, group) => sum + group.rateIn, 0),
            rateOut: processes.reduce((sum, group) => sum + group.rateOut, 0),
        })
        run.last = time
    }
    const from = end - NETWORK_KEEP
    const drop = run.history.findIndex((snapshot) => snapshot.at >= from)
    if (drop > 0) run.history.splice(0, drop)
    return [...run.history]
}
