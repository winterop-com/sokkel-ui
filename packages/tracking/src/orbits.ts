/**
 * Satellites as tracks, worked out from their orbits. The app fetches the mean elements CelesTrak and
 * Space-Track publish as OMM, in JSON or in CSV (`gp.php?GROUP=stations&FORMAT=csv`); this module reads
 * them and propagates each orbit with SGP4 (satellite.js) to where the satellite is at any time, so one
 * fetch of elements places a satellite for days and every reader of one clock agrees on where it is.
 *
 * A satellite's position is the point under it, with its height over the WGS84 ellipsoid as the
 * altitude. Its ground track is the path that point draws, before and after a time, as lines split
 * where they cross the antimeridian; its footprint is the circle on the ground it is in view from.
 * Units are SI: meters, meters per second, degrees and milliseconds since the epoch.
 */
import { eciToGeodetic, gstime, json2satrec, propagate, type SatRec } from 'satellite.js'

import { bearing, distance, EARTH_RADIUS } from './geo'
import type { LonLat, Track, TrackAffiliation, TrackClassifier, TrackProperties } from './track'

/** One satellite's mean elements as OMM in JSON; numbers come as numbers from CelesTrak and as text from Space-Track. */
export interface OmmRecord {
    OBJECT_NAME: string
    /** The international designator, such as `1998-067A`. */
    OBJECT_ID: string
    /** When the elements were measured, in UTC, written without a zone. */
    EPOCH: string
    /** Revolutions a day. */
    MEAN_MOTION: number | string
    ECCENTRICITY: number | string
    /** In degrees, as the three angles after it. */
    INCLINATION: number | string
    RA_OF_ASC_NODE: number | string
    ARG_OF_PERICENTER: number | string
    MEAN_ANOMALY: number | string
    EPHEMERIS_TYPE?: number | string
    CLASSIFICATION_TYPE?: string
    NORAD_CAT_ID: number | string
    ELEMENT_SET_NO?: number | string
    REV_AT_EPOCH?: number | string
    BSTAR: number | string
    MEAN_MOTION_DOT: number | string
    MEAN_MOTION_DDOT: number | string
    [field: string]: unknown
}

/** One satellite and its orbit, as a plain record: what is read once from its elements. */
export interface Satellite {
    /** The NORAD catalog number, as text: stable for as long as the object is in orbit. */
    id: string
    name: string
    /** The international designator, such as `1998-067A`. */
    designator?: string
    /** When its elements were measured, in milliseconds since the epoch; a position far from it is less sure. */
    epoch: number
    /** How long one revolution takes, in seconds. */
    period: number
    /** How far its orbit tilts from the equator, in degrees. */
    inclination: number
    eccentricity: number
    /** The elements as they were read, which every position is worked out from. */
    omm: OmmRecord
}

/** Where a satellite is at one time. */
export interface SatellitePosition {
    /** The point under it. */
    lon: number
    lat: number
    /** Its height over the WGS84 ellipsoid, in meters. */
    altitude: number
    /** Its speed along its orbit, in meters per second. */
    velocity: number
    /** The time the position is for, in milliseconds since the epoch. */
    at: number
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined)
const numeric = (value: unknown): number | undefined => {
    const read = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
    return finite(read) ? read : undefined
}

const DEGREES = 180 / Math.PI

/** The seven elements and the drag terms SGP4 cannot work without. */
const NEEDED = [
    'MEAN_MOTION',
    'ECCENTRICITY',
    'INCLINATION',
    'RA_OF_ASC_NODE',
    'ARG_OF_PERICENTER',
    'MEAN_ANOMALY',
    'BSTAR',
    'MEAN_MOTION_DOT',
    'MEAN_MOTION_DDOT',
] as const

/** An OMM epoch in milliseconds since the epoch: UTC, whether or not it says so. */
function epochOf(value: unknown): number | undefined {
    const written = text(value)
    if (written === undefined) return undefined
    const at = Date.parse(/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(written) ? written : `${written}Z`)
    return Number.isFinite(at) ? at : undefined
}

/** SGP4's state for each satellite, built from its elements the first time it is placed; null for elements SGP4 refuses. */
const RECORDS = new WeakMap<Satellite, SatRec | null>()

/**
 * An epoch as satellite.js reads one: in UTC, ending in `Z`. It reads any other ending as a time
 * without a zone, so an epoch written with an offset is written again here, with the digits past the
 * millisecond it was given.
 */
function epochText(satellite: Satellite): string {
    const past = /\.\d{3}(\d+)/.exec(String(satellite.omm.EPOCH))?.[1] ?? ''
    return new Date(satellite.epoch).toISOString().replace('Z', `${past}Z`)
}

function recordOf(satellite: Satellite): SatRec | null {
    let satrec = RECORDS.get(satellite)
    if (satrec === undefined) {
        try {
            satrec = json2satrec({ ...satellite.omm, EPOCH: epochText(satellite) } as Parameters<typeof json2satrec>[0])
        } catch {
            satrec = null
        }
        RECORDS.set(satellite, satrec)
    }
    return satrec
}

/**
 * The satellites of an OMM answer: an array of records, or one record. A record without a catalog
 * number, an epoch or one of the elements SGP4 needs is skipped, as is one whose mean motion is not
 * above zero.
 */
export function parseOmm(payload: OmmRecord[] | OmmRecord): Satellite[] {
    const rows: unknown[] = Array.isArray(payload) ? payload : [payload]
    const satellites: Satellite[] = []
    for (const row of rows) {
        if (typeof row !== 'object' || row === null) continue
        const omm = row as OmmRecord
        const id = numeric(omm.NORAD_CAT_ID)
        const epoch = epochOf(omm.EPOCH)
        const motion = numeric(omm.MEAN_MOTION)
        if (id === undefined || epoch === undefined || motion === undefined || motion <= 0) continue
        if (NEEDED.some((field) => numeric(omm[field]) === undefined)) continue
        const satellite: Satellite = {
            id: String(id),
            name: text(omm.OBJECT_NAME) ?? String(id),
            epoch,
            period: 86_400 / motion,
            inclination: numeric(omm.INCLINATION) as number,
            eccentricity: numeric(omm.ECCENTRICITY) as number,
            omm,
        }
        const designator = text(omm.OBJECT_ID)
        if (designator !== undefined) satellite.designator = designator
        satellites.push(satellite)
    }
    return satellites
}

/** The fields of one CSV line: a field in quotes may hold commas, and a quote inside it is written twice. */
function csvFields(line: string): string[] {
    const fields: string[] = []
    let field = ''
    let quoted = false
    for (let at = 0; at < line.length; at += 1) {
        const char = line[at]
        if (quoted) {
            if (char !== '"') field += char
            else if (line[at + 1] === '"') {
                field += '"'
                at += 1
            } else quoted = false
        } else if (char === '"') quoted = true
        else if (char === ',') {
            fields.push(field)
            field = ''
        } else field += char
    }
    fields.push(field)
    return fields
}

/**
 * The satellites of an OMM answer in CSV (`FORMAT=csv`): a line of field names, then a line for each
 * satellite. It holds what the JSON holds at a third of the size, and is the form CelesTrak asks its
 * readers to take. A line that `parseOmm` would skip as a record is skipped.
 */
export function parseOmmCsv(csv: string): Satellite[] {
    const [head, ...lines] = csv.split(/\r?\n/).filter((line) => line.trim() !== '')
    if (head === undefined) return []
    const names = csvFields(head).map((name) => name.trim())
    return parseOmm(
        lines.map((line) => {
            const fields = csvFields(line)
            return Object.fromEntries(names.map((name, index) => [name, fields[index] ?? ''])) as OmmRecord
        }),
    )
}

/**
 * Where a satellite is at a time, in milliseconds since the epoch; undefined when SGP4 gives no
 * position for it, as for an orbit that has decayed.
 */
export function satellitePosition(satellite: Satellite, at: number): SatellitePosition | undefined {
    const satrec = recordOf(satellite)
    if (satrec === null || !Number.isFinite(at)) return undefined
    const date = new Date(at)
    const state = propagate(satrec, date)
    if (state === null) return undefined
    const place = eciToGeodetic(state.position, gstime(date))
    const lon = place.longitude * DEGREES
    const lat = place.latitude * DEGREES
    const velocity = Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z) * 1000
    if (!finite(lon) || !finite(lat) || !finite(place.height) || !finite(velocity)) return undefined
    return { lon: ((((lon + 180) % 360) + 360) % 360) - 180, lat, altitude: place.height * 1000, velocity, at }
}

/** A satellite as a track: a `Track` whose kind is `satellite`. */
export type SatelliteTrack = Track & { kind: 'satellite' }

export interface SatelliteOptions {
    /** Gives each satellite its affiliation from its name, catalog number or the rest; `unknown` when it gives none. */
    classify?: TrackClassifier
    /** The tracks' `source`; `omm` by default. */
    source?: string
}

/** How far ahead a satellite is placed again, in milliseconds, to read which way the point under it moves. */
const AHEAD = 1000

/**
 * The satellites as tracks of kind `satellite` at a time, skipping any SGP4 cannot place. A track's
 * `heading` and `speed` are those of the point under the satellite, over the ground; its speed along
 * its orbit is `properties.velocity`.
 */
export function satelliteTracks(satellites: readonly Satellite[], at: number, options: SatelliteOptions = {}): SatelliteTrack[] {
    const tracks: SatelliteTrack[] = []
    for (const satellite of satellites) {
        const here = satellitePosition(satellite, at)
        if (here === undefined) continue
        const properties: Record<string, string | number | boolean | undefined> = {
            catalogNumber: Number(satellite.id),
            designator: satellite.designator,
            period: satellite.period,
            inclination: satellite.inclination,
            eccentricity: satellite.eccentricity,
            epoch: satellite.epoch,
            velocity: here.velocity,
        }
        const track: SatelliteTrack = {
            id: satellite.id,
            lon: here.lon,
            lat: here.lat,
            altitude: here.altitude,
            affiliation: 'unknown',
            kind: 'satellite',
            label: satellite.name,
            updatedAt: at,
            source: options.source ?? 'omm',
            properties: Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined)) as TrackProperties,
        }
        const next = satellitePosition(satellite, at + AHEAD)
        if (next !== undefined) {
            const from: LonLat = [here.lon, here.lat]
            const to: LonLat = [next.lon, next.lat]
            const moved = distance(from, to)
            track.speed = moved / (AHEAD / 1000)
            // A point that stands still, as under a geostationary satellite, heads nowhere.
            if (moved > 1) track.heading = bearing(from, to)
        }
        const affiliation: TrackAffiliation | undefined = options.classify?.(track)
        tracks.push(affiliation === undefined ? track : { ...track, affiliation })
    }
    return tracks
}

/**
 * A path as lines that never cross the antimeridian: where two positions in a row are more than half
 * the world apart in longitude, the line ends on one side at 180° and the next starts on the other at
 * the same latitude. A map then draws no line back across the whole world.
 */
export function splitAtAntimeridian(path: readonly LonLat[]): LonLat[][] {
    const lines: LonLat[][] = []
    let line: LonLat[] = []
    for (const position of path) {
        const last = line[line.length - 1]
        if (last !== undefined && Math.abs(position[0] - last[0]) > 180) {
            const edge = last[0] > 0 ? 180 : -180
            // The position's longitude carried past the edge, so the crossing can be found between the two.
            const beyond = position[0] + (last[0] > 0 ? 360 : -360)
            const share = beyond === last[0] ? 0 : (edge - last[0]) / (beyond - last[0])
            const lat = last[1] + share * (position[1] - last[1])
            line.push([edge, lat])
            lines.push(line)
            line = [[-edge, lat]]
        }
        line.push([position[0], position[1]])
    }
    if (line.length > 0) lines.push(line)
    return lines
}

export interface GroundTrackOptions {
    /** How far back the past path reaches, in milliseconds; one revolution by default. */
    before?: number
    /** How far ahead the future path reaches, in milliseconds; one revolution by default. */
    after?: number
    /** The time between two positions of a path, in milliseconds; a 180th of a revolution by default, and never under a second. */
    step?: number
}

/** The path the point under a satellite draws over the ground, before and after a time. */
export interface GroundTrack {
    /** The satellite's id. */
    id: string
    /** Where it has been, oldest first, ending where it is; lines split at the antimeridian. */
    past: LonLat[][]
    /** Where it goes, starting where it is; lines split at the antimeridian. */
    future: LonLat[][]
}

/** The positions of a satellite from one time to another, a step apart, the last one at the end exactly. */
function pathBetween(satellite: Satellite, from: number, to: number, step: number): LonLat[] {
    const path: LonLat[] = []
    // A step that falls short of the end by a rounding error is the last one, not one before it.
    const steps = Math.max(1, Math.ceil((to - from) / step - 1e-9))
    for (let index = 0; index <= steps; index += 1) {
        const place = satellitePosition(satellite, index === steps ? to : from + index * step)
        if (place !== undefined) path.push([place.lon, place.lat])
    }
    return path
}

/**
 * A satellite's ground track round a time: the path behind it and the path ahead of it, each as
 * lines split where they cross the antimeridian. Both meet where the satellite is at that time.
 */
export function groundTrack(satellite: Satellite, at: number, options: GroundTrackOptions = {}): GroundTrack {
    const revolution = satellite.period * 1000
    const before = Math.max(0, options.before ?? revolution)
    const after = Math.max(0, options.after ?? revolution)
    const step = Math.max(1000, options.step ?? revolution / 180)
    return {
        id: satellite.id,
        past: before > 0 ? splitAtAntimeridian(pathBetween(satellite, at - before, at, step)) : [],
        future: after > 0 ? splitAtAntimeridian(pathBetween(satellite, at, at + after, step)) : [],
    }
}

/**
 * How far along the ground a satellite at an altitude is in view from, in meters from the point under
 * it: to the horizon, or to where it stands a least elevation, in degrees, over the horizon. The Earth
 * is taken as a sphere of its mean radius.
 */
export function horizonRange(altitude: number, elevation = 0): number {
    if (!finite(altitude) || altitude <= 0) return 0
    const tilt = (Math.min(90, Math.max(0, elevation)) * Math.PI) / 180
    const angle = Math.acos((EARTH_RADIUS * Math.cos(tilt)) / (EARTH_RADIUS + altitude)) - tilt
    return Math.max(0, angle) * EARTH_RADIUS
}

export interface FootprintOptions {
    /** How high over the horizon a satellite must stand to count as in view, in degrees; 0, the horizon, by default. */
    elevation?: number
}

/** The circle on the ground a satellite is in view from: its middle and how far it reaches, in meters. */
export interface Footprint {
    /** The satellite's id. */
    id: string
    /** The point under the satellite: longitude, latitude. */
    position: LonLat
    /** How far the circle reaches from its middle, along the ground, in meters. */
    range: number
}

/** The footprint of a satellite's track, or undefined for a track without an altitude above the ground. */
export function footprint(track: Pick<Track, 'id' | 'lon' | 'lat' | 'altitude'>, options: FootprintOptions = {}): Footprint | undefined {
    if (!finite(track.altitude) || track.altitude <= 0) return undefined
    return { id: track.id, position: [track.lon, track.lat], range: horizonRange(track.altitude, options.elevation) }
}

/** The station's position as two public services answer with it; only the fields read here are named. */
export interface StationPosition {
    /** wheretheiss.at: the catalog number, the point under it, and its height and speed in `units`. */
    id?: number
    name?: string
    latitude?: number
    longitude?: number
    altitude?: number
    velocity?: number
    /** `kilometers` (and kilometers an hour) or `miles` (and miles an hour). */
    units?: string
    visibility?: string
    /** Seconds since the epoch. */
    timestamp?: number
    /** Open Notify: the point under it, as text. */
    iss_position?: { latitude?: string | number; longitude?: string | number }
    [field: string]: unknown
}

/** The International Space Station's catalog number. */
export const STATION_ID = '25544'

const UNIT_METERS: Readonly<Record<string, number>> = { kilometers: 1000, miles: 1609.344 }

/**
 * The International Space Station's position as a track, read from what wheretheiss.at
 * (`/v1/satellites/25544`) or Open Notify (`/iss-now.json`) answers with. The first gives the height
 * and the speed along the orbit as well, turned to SI; the second gives the point alone. Undefined
 * when the answer holds no position.
 */
export function parseStationPosition(response: StationPosition, options: SatelliteOptions = {}): SatelliteTrack | undefined {
    const point = response.iss_position
    const lon = numeric(point === undefined ? response.longitude : point.longitude)
    const lat = numeric(point === undefined ? response.latitude : point.latitude)
    if (lon === undefined || lat === undefined || Math.abs(lon) > 180 || Math.abs(lat) > 90) return undefined
    const units = text(response.units) ?? 'kilometers'
    const unit = Object.hasOwn(UNIT_METERS, units) ? UNIT_METERS[units] : undefined
    const id = finite(response.id) ? String(response.id) : STATION_ID
    const velocity = finite(response.velocity) && unit !== undefined ? (response.velocity * unit) / 3600 : undefined
    const properties: Record<string, string | number | boolean | undefined> = {
        catalogNumber: Number(id),
        velocity,
        visibility: text(response.visibility),
    }
    const track: SatelliteTrack = {
        id,
        lon,
        lat,
        affiliation: 'unknown',
        kind: 'satellite',
        label: 'ISS',
        source: options.source ?? (point === undefined ? 'wheretheiss' : 'open-notify'),
        properties: Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined)) as TrackProperties,
    }
    if (finite(response.altitude) && unit !== undefined) track.altitude = response.altitude * unit
    if (finite(response.timestamp)) track.updatedAt = response.timestamp * 1000
    const affiliation: TrackAffiliation | undefined = options.classify?.(track)
    return affiliation === undefined ? track : { ...track, affiliation }
}
