/**
 * The control site's sources for its stories: every one its simulation alone, so a story reaches no
 * network. Each is read at the story's simulated clock, answers as a simulated server does (now and
 * then slow, now and then silent), and is judged by the checks its live feed would be.
 */
import { DHIS2_SAMPLE_ANSWERS, dhis2Checks } from '@winterop-com/sokkel-ui-dhis2/checks'
import { parseFlights } from '@winterop-com/sokkel-ui-tracking/adsb'
import type { Check, CheckResponse } from '@winterop-com/sokkel-ui-tracking/checks'
import { parseGdacs, parseMetAlerts, parseUsgsQuakes, type Incident } from '@winterop-com/sokkel-ui-tracking/events'
import { createFlowTracker, flowTracks, type FlowLink } from '@winterop-com/sokkel-ui-tracking/network'
import { parseOmmCsv, parseStationPosition, type Satellite, type SatelliteTrack } from '@winterop-com/sokkel-ui-tracking/orbits'
import {
    createNetworkSimulation,
    flightTrails,
    networkPlace,
    simulateAnswer,
    simulateCoast,
    simulateDisasters,
    simulateFlights,
    simulateOmmCsv,
    simulateQuakes,
    simulateStation,
    simulateWarnings,
    type ServerSimOptions,
} from '@winterop-com/sokkel-ui-tracking/simulate'
import { createSourceEngine, type Source, type SourceEngine, type SourceReading } from '@winterop-com/sokkel-ui-tracking/sources'
import type { LonLat, Track } from '@winterop-com/sokkel-ui-tracking/track'

/** What each source reads, by its id. */
export interface ControlData {
    quakes: Incident[]
    disasters: Incident[]
    warnings: Incident[]
    satellites: Satellite[]
    station: SatelliteTrack
    flights: Track[]
    vessels: Track[]
    server: { url: string }
    machine: { tracks: Track[]; links: FlowLink[] }
}

/** The moment the control site's stories open at: 20 November 2026, 18:30 UTC. */
export const CONTROL_NOW = Date.parse('2026-11-20T18:30:00Z')

/** The seed the stories' simulations are drawn from. */
const SEED = 20261120

const SECOND = 1000
const MINUTE = 60 * SECOND

/** Where the watched machine stands. */
const HOME: LonLat = [5.32, 60.39]

/** What a source's tile and its row say of it beside its state. */
export interface ControlSourceWords {
    summary: string
    limit: string
    /** Whose data the live source shows, which a story names but never reads. */
    credit?: string
}

export const CONTROL_SOURCE_WORDS: Record<keyof ControlData, ControlSourceWords> = {
    quakes: {
        summary: 'Earthquakes of magnitude 2.5 and over, the last day, the world over.',
        limit: 'Read once a minute.',
        credit: 'U.S. Geological Survey',
    },
    disasters: {
        summary: 'Cyclones, floods, eruptions, fires and droughts with an alert level.',
        limit: 'Read every five minutes.',
        credit: 'GDACS',
    },
    warnings: {
        summary: 'Weather warnings along the coast, each with the area it covers.',
        limit: 'Read every two minutes.',
        credit: 'MET Norway',
    },
    vessels: { summary: 'Vessels off the coast, from an AIS stream.', limit: 'A stream, read every five seconds.' },
    flights: { summary: 'Aircraft within 250 nautical miles of the coast by harbor.', limit: 'Read once a minute.' },
    satellites: { summary: 'Orbit elements, placed at any moment from them.', limit: 'One download every two hours.' },
    station: { summary: 'Where the space station is now, asked of a position service.', limit: 'Read every five seconds.' },
    server: { summary: 'The health of a demo server: whether it answers, and the version it runs.', limit: 'Read once a minute.' },
    machine: { summary: 'A machine’s connections, from home to each host it talks to.', limit: 'Read every two seconds.' },
}

const feedChecks = (shape: Check['expect'], slow = 3000): Check[] => [
    { id: 'answers', label: 'Feed answers', path: '', expect: { status: 200 }, latency: { degraded: slow, down: 15_000 } },
    { id: 'shape', label: 'Answer reads', path: '', expect: { status: 200, ...shape } },
]

/** A simulated read: the simulated server's answer for every check, and the data unless the server is silent. */
function simulated<T>(server: ServerSimOptions, at: number, checks: readonly Check[], body: unknown, data: T): SourceReading<T> {
    const first = simulateAnswer(at, { seed: SEED, ...server })
    const answered: CheckResponse = first.status === undefined || body === undefined ? first : { ...first, json: body }
    const responses = Object.fromEntries(checks.map((check) => [check.id, answered]))
    return first.status === undefined ? { responses } : { responses, data }
}

const QUAKES = feedChecks({ json: [{ path: 'type', equals: 'FeatureCollection' }, { path: 'features' }] })
const FEATURES = feedChecks({ json: [{ path: 'features' }] })
const FLIGHTS = feedChecks({ json: [{ path: 'now' }] })
const CATALOG: Check[] = [
    { id: 'answers', label: 'Catalog answers', path: '', expect: { status: 200 }, latency: { degraded: 5000, down: 15_000 } },
]
const STATION: Check[] = [
    {
        id: 'answers',
        label: 'Service answers',
        path: '',
        expect: { status: 200, json: [{ path: 'latitude' }] },
        latency: { degraded: 1500, down: 10_000 },
    },
]
const STREAM: Check[] = [
    { id: 'stream', label: 'Stream is heard', path: '', expect: { status: 200 }, latency: { degraded: 15_000, down: 60_000 } },
]
const MACHINE: Check[] = [
    { id: 'reads', label: 'Connections read', path: '', expect: { status: 200 }, latency: { degraded: 400, down: 5000 } },
]

/** The control site's sources, each its simulation alone; a machine of their own, so every engine starts the same. */
export function controlSources(): Source[] {
    const simulation = createNetworkSimulation({ seed: SEED })
    const tracker = createFlowTracker({ window: 10_000, locate: networkPlace })
    let machineAt: number | undefined
    const sources: Source[] = [
        {
            id: 'quakes',
            label: 'Earthquakes',
            kind: 'incidents',
            interval: MINUTE,
            checks: QUAKES,
            simulate: ({ at }) => {
                const answer = simulateQuakes(at, { seed: SEED })
                return simulated({ id: 'quakes', latency: 240 }, at, QUAKES, answer, parseUsgsQuakes(answer, { source: 'simulated' }))
            },
        },
        {
            id: 'disasters',
            label: 'Disasters',
            kind: 'incidents',
            interval: 5 * MINUTE,
            checks: FEATURES,
            simulate: ({ at }) => {
                const answer = simulateDisasters(at, { seed: SEED })
                return simulated({ id: 'disasters', latency: 620 }, at, FEATURES, answer, parseGdacs(answer, { source: 'simulated' }))
            },
        },
        {
            id: 'warnings',
            label: 'Weather warnings',
            kind: 'incidents',
            interval: 2 * MINUTE,
            checks: FEATURES,
            simulate: ({ at }) => {
                const answer = simulateWarnings(at, { seed: SEED })
                return simulated({ id: 'warnings', latency: 140 }, at, FEATURES, answer, parseMetAlerts(answer, { source: 'simulated' }))
            },
        },
        {
            id: 'vessels',
            label: 'Vessels',
            kind: 'tracks',
            interval: MINUTE,
            checks: STREAM,
            simulate: ({ at }) =>
                simulated({ id: 'vessels', latency: 900, slow: 0.04 }, at, STREAM, undefined, simulateCoast(SEED, at).tracks),
        },
        {
            id: 'flights',
            label: 'Flights',
            kind: 'tracks',
            interval: MINUTE,
            checks: FLIGHTS,
            simulate: ({ at }) => {
                const answer = simulateFlights(at, { seed: SEED })
                const trails = flightTrails(at, { seed: SEED, minutes: 6, step: 30_000 })
                const tracks = parseFlights(answer, {
                    classify: (track) => (typeof track.properties?.callsign === 'string' ? 'friend' : 'unknown'),
                    source: 'simulated',
                }).map((track) => ({ ...track, trail: trails.get(track.id) }))
                return simulated({ id: 'flights', latency: 310, slow: 0.3 }, at, FLIGHTS, answer, tracks)
            },
        },
        {
            id: 'satellites',
            label: 'Satellites',
            kind: 'tracks',
            interval: 2 * 60 * MINUTE,
            checks: CATALOG,
            simulate: ({ at }) => simulated({ id: 'satellites', latency: 420 }, at, CATALOG, undefined, parseOmmCsv(simulateOmmCsv())),
        },
        {
            id: 'station',
            label: 'Space station',
            kind: 'tracks',
            interval: MINUTE,
            checks: STATION,
            simulate: ({ at }) => {
                const answer = simulateStation(at)
                return simulated(
                    { id: 'station', latency: 210 },
                    at,
                    STATION,
                    answer,
                    parseStationPosition(answer, { source: 'simulated' }),
                )
            },
        },
        {
            id: 'server',
            label: 'Demo server',
            kind: 'server',
            interval: MINUTE,
            checks: dhis2Checks() as Check[],
            simulate: ({ at }) => ({
                responses: Object.fromEntries(
                    dhis2Checks().map((check) => [
                        check.id,
                        simulateAnswer(
                            at,
                            { id: 'server', seed: SEED, latency: 380, slow: 0.1, silent: 0.3 },
                            DHIS2_SAMPLE_ANSWERS[check.id],
                            check.id,
                        ),
                    ]),
                ),
                data: { url: 'https://server.example.org/demo' },
            }),
        },
        {
            id: 'machine',
            label: 'Network',
            kind: 'links',
            interval: MINUTE,
            checks: MACHINE,
            simulate: ({ at }) => {
                // The machine runs a minute and a half before it is first read, then a few seconds for each read.
                const second = Math.floor(at / SECOND) * SECOND
                let from = machineAt ?? second - 90 * SECOND
                const until = machineAt === undefined ? second : from + 4 * SECOND
                while (from < until) {
                    from += SECOND
                    tracker.add(simulation.tick(from))
                }
                machineAt = from
                return simulated({ id: 'machine', latency: 35 }, at, MACHINE, undefined, flowTracks(tracker.byRemote(from), { home: HOME }))
            },
        },
    ]
    return sources
}

/** How long before the story's moment the engine starts reading, so the wall opens with a history. */
const WARM = 40 * MINUTE

/** An engine over the simulated sources, read through the forty minutes before `now`: the same state every time. */
export function controlEngine(now = CONTROL_NOW): SourceEngine {
    const engine = createSourceEngine({ sources: controlSources(), failures: 3, window: 3_600_000 })
    for (let at = now - WARM; at <= now; at += MINUTE) engine.poll(at)
    return engine
}
