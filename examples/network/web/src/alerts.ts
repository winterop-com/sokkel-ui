/**
 * What the watch raises: a process seen talking out for the first time, a country reached for the
 * first time, and a process moving bytes faster than its limit. What is already known is kept by
 * the backend, so a reload raises nothing again; what the simulated machine did before the page
 * opened is learned without raising.
 */

import { addressScope } from '@winterop-com/sokkel-ui-tracking/network'

import { alerts, known } from './collections'
import { formatRate } from './format'
import { DEFAULT_PREFS, type Known, type Prefs } from './model'
import type { Place } from './places'
import type { Snapshot } from './watch'

/** How long a process's spike in one direction stays quiet after it is raised, in milliseconds. */
const QUIET = 2 * 60_000
const MEGA = 1_000_000

export interface AlertWatch {
    /** Learns what a snapshot holds without raising anything, as the history before the page opened. */
    learn: (snapshot: Snapshot, places: ReadonlyMap<string, Place>) => void
    /** Keeps what was learned. */
    settle: () => Promise<void>
    processes: Set<string>
    countries: Set<string>
    learned: Known[]
    /** When each process last raised a spike in each direction. */
    spiked: Map<string, number>
}

let tuned: Pick<Prefs, 'alertCountry' | 'alertProcess' | 'alertSpike' | 'spikeIn' | 'spikeOut'> = DEFAULT_PREFS

/** Takes the latest preferences: which alerts are on, and the spike limits. */
export function tuneAlerts(prefs: Prefs): void {
    tuned = prefs
}

const knownRow = (kind: Known['kind'], value: string, at: number): Known => ({ id: `${kind}:${value}`, kind, value, firstSeen: at })

/** What a snapshot shows: the processes talking out and the countries reached, each with the connection that shows it. */
function* sightings(snapshot: Snapshot, places: ReadonlyMap<string, Place>) {
    for (const connection of snapshot.connections) {
        const scope = addressScope(connection.remoteAddress)
        // Talking out is reaching another machine: on the internet or the local network, not the host itself or a link's neighbors.
        if (scope !== 'public' && scope !== 'private') continue
        const place = places.get(connection.remoteAddress)
        if (connection.process !== undefined) yield { kind: 'process' as const, value: connection.process, connection, place }
        if (place !== undefined) yield { kind: 'country' as const, value: place.country, connection, place }
    }
}

/** Reads what is already known, to raise only what is new from here on. */
export async function startAlerts(): Promise<AlertWatch> {
    const rows = await known.list()
    const watch: AlertWatch = {
        processes: new Set(rows.filter((row) => row.kind === 'process').map((row) => row.value)),
        countries: new Set(rows.filter((row) => row.kind === 'country').map((row) => row.value)),
        learned: [],
        spiked: new Map(),
        learn(snapshot, places) {
            for (const seen of sightings(snapshot, places)) {
                const set = seen.kind === 'process' ? watch.processes : watch.countries
                if (set.has(seen.value)) continue
                set.add(seen.value)
                watch.learned.push(knownRow(seen.kind, seen.value, snapshot.at))
            }
        },
        async settle() {
            if (watch.learned.length === 0) return
            const learned = watch.learned
            watch.learned = []
            await known.insert(learned)
        },
    }
    return watch
}

/** Forgets what is known, so the next process and country seen each raise again. */
export function forgetKnown(watch: AlertWatch | undefined): void {
    watch?.processes.clear()
    watch?.countries.clear()
}

/** Raises what a live snapshot shows that is new, or too fast. */
export function watchAlerts(watch: AlertWatch, snapshot: Snapshot, places: ReadonlyMap<string, Place>): void {
    for (const seen of sightings(snapshot, places)) {
        const set = seen.kind === 'process' ? watch.processes : watch.countries
        if (set.has(seen.value)) continue
        set.add(seen.value)
        void known.upsert(`${seen.kind}:${seen.value}`, () => knownRow(seen.kind, seen.value, snapshot.at))
        const { connection, place } = seen
        const where = place === undefined ? connection.remoteAddress : `${connection.remoteAddress} in ${place.label}`
        if (seen.kind === 'process' && tuned.alertProcess)
            void alerts.create({
                kind: 'process',
                title: `${seen.value} talked out for the first time`,
                detail: `Process ${connection.pid === undefined ? '' : `${String(connection.pid)} `}opened ${connection.protocol.toUpperCase()} to ${where}, port ${String(connection.remotePort)}.`,
                at: snapshot.at,
                acknowledged: false,
                process: seen.value,
                address: connection.remoteAddress,
            })
        if (seen.kind === 'country' && tuned.alertCountry)
            void alerts.create({
                kind: 'country',
                title: `First connection to ${seen.value}`,
                detail: `${connection.process ?? 'A process'} reached ${where}.`,
                at: snapshot.at,
                acknowledged: false,
                process: connection.process,
                address: connection.remoteAddress,
                country: seen.value,
            })
    }
    if (!tuned.alertSpike) return
    for (const group of snapshot.processes) {
        if (group.key === '') continue
        const sole = group.remoteAddresses.length === 1 ? group.remoteAddresses[0] : undefined
        const soleAt = sole === undefined ? undefined : places.get(sole)
        for (const [direction, rate, limit] of [
            ['in', group.rateIn, tuned.spikeIn],
            ['out', group.rateOut, tuned.spikeOut],
        ] as const) {
            if (rate <= limit * MEGA) continue
            const key = `${group.key}:${direction}`
            if (snapshot.at - (watch.spiked.get(key) ?? -Infinity) < QUIET) continue
            watch.spiked.set(key, snapshot.at)
            const hosts =
                sole === undefined
                    ? `${String(group.remoteAddresses.length)} hosts`
                    : soleAt === undefined
                      ? 'one host'
                      : `one host in ${soleAt.label}`
            void alerts.create({
                kind: 'spike',
                title: `${group.key} ${direction === 'in' ? 'received' : 'sent'} ${formatRate(rate)}`,
                detail: `Over the ${String(limit)} MB/s limit for ${direction === 'in' ? 'receiving, from' : 'sending, to'} ${hosts}.`,
                at: snapshot.at,
                acknowledged: false,
                process: group.key,
                address: sole,
            })
        }
    }
}
