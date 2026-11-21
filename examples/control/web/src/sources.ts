/**
 * The control site's sources, each a plugin for the engine: what it is called, how often it is
 * read (never faster than the source's own limit allows), the checks its answers must pass, how to
 * read it live and the simulation that stands in when it cannot be read. Each names whose data it
 * is and under which license, shown wherever the source is on.
 */
import { DHIS2_DEMO, DHIS2_SAMPLE_ANSWERS, dhis2Checks } from '@winterop-com/sokkel-ui-dhis2/checks'
import { parseFlights } from '@winterop-com/sokkel-ui-tracking/adsb'
import { createAisDecoder } from '@winterop-com/sokkel-ui-tracking/ais'
import { checkUrl, type Check, type CheckResponse } from '@winterop-com/sokkel-ui-tracking/checks'
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
    type NetworkSimulation,
} from '@winterop-com/sokkel-ui-tracking/simulate'
import type { Source, SourceReading } from '@winterop-com/sokkel-ui-tracking/sources'
import type { LonLat, Track } from '@winterop-com/sokkel-ui-tracking/track'

import { listenVessels, request, type Answer } from './transport'

/** Whose data a source shows, and under which license, as its terms ask a page to say. */
export interface Attribution {
    /** Who gives the data. */
    name: string
    /** The name in a few letters, for a strip with little room. */
    short: string
    href: string
    /** The license, or the credit its terms ask for. */
    license: string
    licenseHref?: string
}

/** A source of the control site: an engine source, and what the site says of it. */
export interface ControlSource<T = unknown> extends Source<T> {
    /** One line saying what it gives. */
    summary: string
    /** How often it may be read, as its terms say. */
    limit: string
    /** Whose data its live read shows; none for a source that is simulated alone. */
    attribution?: Attribution
}

/** What each source reads, by its id. */
export interface ControlData {
    quakes: Incident[]
    disasters: Incident[]
    warnings: Incident[]
    satellites: Satellite[]
    station: SatelliteTrack
    flights: Track[]
    vessels: Track[]
    server: ServerFacts
    machine: { tracks: Track[]; links: FlowLink[] }
}

export type SourceId = keyof ControlData

/** The server whose health is checked: the address its checks are asked at. */
export interface ServerFacts {
    url: string
}

const SECOND = 1000
const MINUTE = 60 * SECOND

/** The seed every simulation of the site is drawn from. */
export const SEED = 20261120

/** Where the watch looks for aircraft: off the coast by harbor, as far as the flight service answers for. */
export const FLIGHT_POINT = { lat: 60.2, lon: 5.2, radius: 250 }

/** Where the watched machine stands, for the lines to the hosts it talks to. */
export const HOME: LonLat = [5.32, 60.39]

const json = (answer: Answer): unknown => {
    try {
        return JSON.parse(answer.response.body ?? '') as unknown
    } catch {
        return undefined
    }
}

/** A check that the feed answers, and one that its answer has the shape its reader takes. */
const feedChecks = (shape: Check['expect'], slow = 3000): Check[] => [
    { id: 'answers', label: 'Feed answers', path: '', expect: { status: 200 }, latency: { degraded: slow, down: 15_000 } },
    { id: 'shape', label: 'Answer reads', path: '', expect: { status: 200, ...shape } },
]

/** One answer as every check of a feed's: they judge the same request. */
const both = (response: CheckResponse): Record<string, CheckResponse> => ({ answers: response, shape: response })

/** A simulated read: the server's simulated answer for each check, and the data unless the server is silent. */
function simulated<T>(id: string, at: number, checks: readonly Check[], body: unknown, data: T, latency = 180): SourceReading<T> {
    const first = simulateAnswer(at, { id, seed: SEED, latency }, {}, '')
    const responses = Object.fromEntries(
        checks.map((check) => [check.id, first.status === undefined ? first : ({ ...first, json: body } satisfies CheckResponse)]),
    )
    return first.status === undefined ? { responses } : { responses, data }
}

/** A feed read through the page's transport, parsed when it answered. */
async function feed<T>(route: string, parse: (payload: unknown) => T, params?: Record<string, string>): Promise<SourceReading<T>> {
    const answer = await request(route, params)
    const payload = answer.response.status === 200 ? json(answer) : undefined
    const response = payload === undefined ? answer.response : { ...answer.response, json: payload }
    return payload === undefined ? { responses: both(response) } : { responses: both(response), data: parse(payload) }
}

const QUAKE_CHECKS = feedChecks({ json: [{ path: 'type', equals: 'FeatureCollection' }, { path: 'features' }] })

const quakes: ControlSource<Incident[]> = {
    id: 'quakes',
    label: 'Earthquakes',
    kind: 'incidents',
    summary: 'Earthquakes of magnitude 2.5 and over, the last day, the world over.',
    limit: 'Rebuilt every minute; read once a minute.',
    attribution: { name: 'U.S. Geological Survey', short: 'USGS', href: 'https://earthquake.usgs.gov/', license: 'Public domain' },
    interval: MINUTE,
    checks: QUAKE_CHECKS,
    read: () => feed('quakes', (payload) => parseUsgsQuakes(payload as Parameters<typeof parseUsgsQuakes>[0])),
    simulate: ({ at }) => {
        const answer = simulateQuakes(at, { seed: SEED })
        return simulated('quakes', at, QUAKE_CHECKS, answer, parseUsgsQuakes(answer, { source: 'simulated' }), 240)
    },
}

const DISASTER_CHECKS = feedChecks({ json: [{ path: 'features' }] }, 5000)

const disasters: ControlSource<Incident[]> = {
    id: 'disasters',
    label: 'Disasters',
    kind: 'incidents',
    summary: 'Cyclones, floods, eruptions, fires and droughts with an alert level.',
    limit: 'No limit stated; read every five minutes.',
    attribution: {
        name: 'GDACS',
        short: 'GDACS',
        href: 'https://www.gdacs.org/',
        license: 'CC BY 4.0; alerts are indicative',
        licenseHref: 'https://creativecommons.org/licenses/by/4.0/',
    },
    interval: 5 * MINUTE,
    checks: DISASTER_CHECKS,
    read: () => feed('disasters', (payload) => parseGdacs(payload as Parameters<typeof parseGdacs>[0])),
    simulate: ({ at }) => {
        const answer = simulateDisasters(at, { seed: SEED })
        return simulated('disasters', at, DISASTER_CHECKS, answer, parseGdacs(answer, { source: 'simulated' }), 620)
    },
}

const WARNING_CHECKS = feedChecks({ json: [{ path: 'features' }] })

const warnings: ControlSource<Incident[]> = {
    id: 'warnings',
    label: 'Weather warnings',
    kind: 'incidents',
    summary: 'Weather warnings for Norway and its waters, each with the area it covers.',
    limit: 'Never before the answer expires, two minutes; through the app’s own server.',
    attribution: {
        name: 'MET Norway',
        short: 'MET Norway',
        href: 'https://api.met.no/',
        license: 'NLOD 2.0 and CC BY 4.0',
        licenseHref: 'https://api.met.no/doc/License',
    },
    interval: 2 * MINUTE,
    checks: WARNING_CHECKS,
    read: () => feed('warnings', (payload) => parseMetAlerts(payload as Parameters<typeof parseMetAlerts>[0])),
    simulate: ({ at }) => {
        const answer = simulateWarnings(at, { seed: SEED })
        return simulated('warnings', at, WARNING_CHECKS, answer, parseMetAlerts(answer, { source: 'simulated' }), 140)
    },
}

const SATELLITE_CHECKS: Check[] = [
    { id: 'answers', label: 'Catalog answers', path: '', expect: { status: 200 }, latency: { degraded: 5000, down: 15_000 } },
    { id: 'shape', label: 'Elements read', path: '', expect: { status: 200, body: 'NORAD_CAT_ID' } },
]

const satellites: ControlSource<Satellite[]> = {
    id: 'satellites',
    label: 'Satellites',
    kind: 'tracks',
    summary: 'The space stations’ orbit elements, placed at any moment from them.',
    limit: 'One download for each update, every two hours; kept until then.',
    attribution: { name: 'CelesTrak', short: 'CelesTrak', href: 'https://celestrak.org/', license: 'Credit CelesTrak' },
    interval: 2 * 60 * MINUTE,
    checks: SATELLITE_CHECKS,
    read: async () => {
        const answer = await request('satellites')
        const read = answer.response.status === 200 ? parseOmmCsv(answer.response.body ?? '') : []
        return read.length === 0 ? { responses: both(answer.response) } : { responses: both(answer.response), data: read }
    },
    simulate: ({ at }) => {
        const csv = simulateOmmCsv()
        const first = simulateAnswer(at, { id: 'satellites', seed: SEED, latency: 420 }, { body: csv })
        return first.status === undefined ? { responses: both(first) } : { responses: both(first), data: parseOmmCsv(csv) }
    },
}

const STATION_CHECKS: Check[] = [
    { id: 'answers', label: 'Service answers', path: '', expect: { status: 200 }, latency: { degraded: 1500, down: 10_000 } },
    { id: 'shape', label: 'Position reads', path: '', expect: { status: 200, json: [{ path: 'latitude' }, { path: 'longitude' }] } },
]

const station: ControlSource<SatelliteTrack> = {
    id: 'station',
    label: 'Space station',
    kind: 'tracks',
    summary: 'Where the space station is now, asked of a position service.',
    limit: 'About one request a second; read every five seconds.',
    attribution: { name: 'wheretheiss.at', short: 'wheretheiss.at', href: 'https://wheretheiss.at/', license: 'No terms stated' },
    interval: 5 * SECOND,
    checks: STATION_CHECKS,
    pauseHidden: true,
    read: () =>
        feed('station', (payload) => parseStationPosition(payload as Parameters<typeof parseStationPosition>[0])).then((reading) =>
            reading.data === undefined ? { responses: reading.responses } : { responses: reading.responses, data: reading.data },
        ),
    simulate: ({ at }) => {
        const answer = simulateStation(at)
        const track = parseStationPosition(answer, { source: 'simulated' })
        const reading = simulated('station', at, STATION_CHECKS, answer, track, 210)
        return track === undefined ? { responses: reading.responses } : (reading as SourceReading<SatelliteTrack>)
    },
}

/** How many past positions a live aircraft's or vessel's trail keeps. */
const TRAIL = 12

/** The trails the live aircraft have drawn so far, by address. */
const flown = new Map<string, LonLat[]>()

const FLIGHT_CHECKS = feedChecks({ json: [{ path: 'now' }] })

const flights: ControlSource<Track[]> = {
    id: 'flights',
    label: 'Flights',
    kind: 'tracks',
    summary: 'Aircraft within 250 nautical miles of the coast by harbor.',
    limit: '500 requests a day for an address; read once a minute, and not while the page is hidden.',
    attribution: {
        name: 'adsb.lol',
        short: 'adsb.lol',
        href: 'https://adsb.lol',
        license: 'ODbL 1.0',
        licenseHref: 'https://opendatacommons.org/licenses/odbl/1-0/',
    },
    interval: MINUTE,
    pauseHidden: true,
    checks: FLIGHT_CHECKS,
    read: async () => {
        const reading = await feed(
            'flights',
            (payload) => parseFlights(payload as Parameters<typeof parseFlights>[0], { classify: () => 'neutral' }),
            { lat: String(FLIGHT_POINT.lat), lon: String(FLIGHT_POINT.lon), radius: String(FLIGHT_POINT.radius) },
        )
        if (reading.data === undefined) return reading
        const seen = new Set<string>()
        const tracks = reading.data.map((track) => {
            seen.add(track.id)
            const trail = [...(flown.get(track.id) ?? []), [track.lon, track.lat] as LonLat].slice(-TRAIL)
            flown.set(track.id, trail)
            return { ...track, trail: trail.slice(0, -1) }
        })
        for (const id of flown.keys()) if (!seen.has(id)) flown.delete(id)
        return { responses: reading.responses, data: tracks }
    },
    simulate: ({ at }) => {
        const answer = simulateFlights(at, { seed: SEED })
        const trails = flightTrails(at, { seed: SEED, minutes: 6, step: 30_000 })
        const tracks = parseFlights(answer, {
            classify: (track) => (typeof track.properties?.callsign === 'string' ? 'friend' : 'unknown'),
            source: 'simulated',
        }).map((track) => ({ ...track, trail: trails.get(track.id) }))
        return simulated('flights', at, FLIGHT_CHECKS, answer, tracks, 310)
    },
}

/** How long a vessel is shown after it was last heard, in milliseconds. */
const VESSEL_KEPT = 10 * MINUTE

/** The most vessels handed to the views, the latest heard first. */
const MOST_VESSELS = 1500

/** The live vessel stream as the reader holds it: the decoder, whether it is connected, and when a line last came. */
interface VesselStream {
    decoder: ReturnType<typeof createAisDecoder>
    connected: boolean
    heard?: number
    error?: string
    stop: () => void
}

let stream: VesselStream | undefined

function openStream(): VesselStream {
    if (stream !== undefined) return stream
    const decoder = createAisDecoder({ trail: 6, classify: () => 'neutral' })
    const held: VesselStream = { decoder, connected: false, stop: () => undefined }
    held.stop = listenVessels((message) => {
        if ('lines' in message) {
            held.connected = true
            held.heard = Date.now()
            decoder.push(message.lines.join('\n'), held.heard)
        } else {
            held.connected = message.connected
            held.error = message.error
        }
    })
    stream = held
    return held
}

/** Lets the live streams go, as when the window stops leading or the source is switched off. */
export function releaseStreams(): void {
    stream?.stop()
    stream = undefined
}

const VESSEL_CHECKS: Check[] = [
    {
        id: 'stream',
        label: 'Stream is heard',
        path: '',
        expect: { status: 200 },
        // How long since the last sentence came: quiet past fifteen seconds, lost past a minute.
        latency: { degraded: 15_000, down: 60_000 },
    },
]

const vessels: ControlSource<Track[]> = {
    id: 'vessels',
    label: 'Vessels',
    kind: 'tracks',
    summary: 'Vessels in Norwegian waters, from the coastal AIS network’s open stream.',
    limit: 'A stream, held open by the app’s own server; read every five seconds.',
    attribution: {
        name: 'Norwegian Coastal Administration',
        short: 'Kystverket',
        href: 'https://www.kystverket.no/',
        license: 'NLOD',
        licenseHref: 'https://data.norge.no/nlod/en/2.0',
    },
    interval: 5 * SECOND,
    checks: VESSEL_CHECKS,
    read: async ({ at }) => {
        const held = openStream()
        // A stream just opened is given a few seconds to say something before it is judged.
        for (let waited = 0; held.heard === undefined && held.error === undefined && waited < 4000; waited += 250)
            await new Promise((resolve) => setTimeout(resolve, 250))
        const now = Date.now()
        if (!held.connected || held.heard === undefined)
            return { responses: { stream: { at, error: held.error ?? 'Nothing is heard on the stream.' } } }
        const tracks = held.decoder
            .tracks()
            .filter((track) => now - (track.updatedAt ?? 0) < VESSEL_KEPT)
            .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
            .slice(0, MOST_VESSELS)
        return { responses: { stream: { at, status: 200, latency: now - held.heard } }, data: tracks }
    },
    simulate: ({ at }) => {
        const picture = simulateCoast(SEED, at)
        const first = simulateAnswer(at, { id: 'vessels', seed: SEED, latency: 900, slow: 0.04 })
        return first.status === undefined ? { responses: { stream: first } } : { responses: { stream: first }, data: picture.tracks }
    },
}

/** The sign-in the server's checks are made with, held in this window's memory alone and never kept. */
let credentials: { username: string; password: string } | undefined

/** Sets, or with nothing forgets, the sign-in the server's checks are made with. */
export function setCredentials(given: { username: string; password: string } | undefined): void {
    credentials = given !== undefined && given.username !== '' ? given : undefined
    landed = undefined
}

export const hasCredentials = (): boolean => credentials !== undefined

/** Where the server's address leads, once its redirect has been followed. */
let landed: string | undefined

const serverChecks = (): Check[] => dhis2Checks({ credentials: credentials !== undefined }) as Check[]

const server: ControlSource<ServerFacts> = {
    id: 'server',
    label: 'Demo server',
    kind: 'server',
    summary: 'The health of a public demo server: whether it answers, and the version it runs.',
    limit: 'Read once a minute, through the app’s own server.',
    attribution: { name: DHIS2_DEMO.label, short: DHIS2_DEMO.label, href: DHIS2_DEMO.url, license: 'A public demo server' },
    interval: MINUTE,
    get checks() {
        return serverChecks()
    },
    read: async ({ at }) => {
        const checks = serverChecks()
        if (landed === undefined) {
            // The address redirects to the release of the day: follow it once, and check where it leads.
            const first = await request('server', { url: DHIS2_DEMO.url })
            const status = first.response.status
            const location = first.headers.location
            if (status !== undefined && status >= 300 && status < 400 && location !== undefined) landed = location.replace(/\/+$/, '')
            else if (status !== undefined && status < 300) landed = DHIS2_DEMO.url
            else return { responses: Object.fromEntries(checks.map((check) => [check.id, { ...first.response, at }])) }
        }
        const base = landed
        const sign = credentials === undefined ? undefined : `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`
        // One after another, a moment apart: the site's own server lets two requests a second through to it.
        const answers: (readonly [string, CheckResponse])[] = []
        for (const check of checks) {
            await new Promise((resolve) => setTimeout(resolve, 600))
            const headers: Record<string, string> = { ...check.headers }
            if (check.credentials === true && sign !== undefined) headers.authorization = sign
            const answer = await request('server', { url: checkUrl(base, check) }, headers)
            answers.push([check.id, answer.response])
        }
        // An address that stopped answering is looked up again next time.
        if (answers.every(([, response]) => response.status === undefined || response.status >= 400)) landed = undefined
        return { responses: Object.fromEntries(answers), data: { url: base } }
    },
    simulate: ({ at }) => {
        const responses = Object.fromEntries(
            serverChecks().map((check) => [
                check.id,
                simulateAnswer(
                    at,
                    { id: 'server', seed: SEED, latency: 380, slow: 0.12, silent: 0.04 },
                    DHIS2_SAMPLE_ANSWERS[check.id],
                    check.id,
                ),
            ]),
        )
        return { responses, data: { url: 'https://server.example.org/demo' } }
    },
}

/** The simulated machine, moved on a second for each second passed since it was last read. */
let machineSim: { simulation: NetworkSimulation; tracker: ReturnType<typeof createFlowTracker>; at: number } | undefined

const MACHINE_CHECKS: Check[] = [
    { id: 'reads', label: 'Connections read', path: '', expect: { status: 200 }, latency: { degraded: 400, down: 5000 } },
]

const machine: ControlSource<ControlData['machine']> = {
    id: 'machine',
    label: 'Network',
    kind: 'links',
    summary: 'A simulated machine’s connections, from home to each host it talks to.',
    limit: 'Simulated; read every two seconds.',
    interval: 2 * SECOND,
    checks: MACHINE_CHECKS,
    simulate: ({ at }) => {
        const second = Math.floor(at / SECOND) * SECOND
        if (machineSim === undefined || second < machineSim.at || second - machineSim.at > 5 * MINUTE)
            machineSim = {
                simulation: createNetworkSimulation({ seed: SEED }),
                tracker: createFlowTracker({ window: 10_000, locate: networkPlace }),
                at: second - 90 * SECOND,
            }
        while (machineSim.at < second) {
            machineSim.at += SECOND
            machineSim.tracker.add(machineSim.simulation.tick(machineSim.at))
        }
        const data = flowTracks(machineSim.tracker.byRemote(second), { home: HOME })
        return simulated('machine', at, MACHINE_CHECKS, undefined, data, 35)
    },
}

/** Every source of the control site, in the order the wall and the lists show them. */
export const SOURCES: readonly ControlSource[] = [
    quakes,
    disasters,
    warnings,
    vessels,
    flights,
    satellites,
    station,
    server,
    machine,
] as ControlSource[]

/** A source by its id. */
export const sourceOf = (id: string): ControlSource | undefined => SOURCES.find((source) => source.id === id)
