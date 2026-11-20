/**
 * Aircraft as tracks, read from the JSON public flight-tracking services answer with. The app fetches
 * the payload; these functions only read it. Two shapes are read:
 *
 * - readsb's, which its `aircraft.json` writes and the v2 APIs built on it answer `/v2/point`,
 *   `/v2/hex`, `/v2/callsign` and the like with: `{ now, ac: [{ hex, flight, lat, lon, track, gs,
 *   alt_baro, ... }] }` (`aircraft` in place of `ac` in the file readsb writes), speeds in knots and
 *   altitudes in feet.
 * - OpenSky's `/api/states/all`: `{ time, states: [[icao24, callsign, origin_country, time_position,
 *   last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate,
 *   sensors, geo_altitude, squawk, spi, position_source, category?], ...] }`, already in SI units.
 *
 * Every value is turned to SI (meters, meters per second), and a row without a position is skipped.
 */
import { FOOT, KNOT, type Track, type TrackAffiliation, type TrackClassifier, type TrackProperties } from './track'

/** One aircraft in a readsb-shaped answer; only the fields read here are named. */
export interface ReadsbAircraft {
    /** The 24-bit ICAO address in hex; a `~` before it marks an address that is not ICAO's. */
    hex: string
    /** The callsign, padded with spaces. */
    flight?: string
    /** The registration. */
    r?: string
    /** The aircraft type designator. */
    t?: string
    /** The source of the position: `adsb_icao`, `mlat`, `tisb_icao` and others. */
    type?: string
    lat?: number
    lon?: number
    /** Barometric altitude in feet, or `ground`. */
    alt_baro?: number | 'ground'
    /** Geometric (GNSS) altitude in feet. */
    alt_geom?: number
    /** Ground speed in knots. */
    gs?: number
    /** Track over ground, in degrees true. */
    track?: number
    /** Heading, in degrees true. */
    true_heading?: number
    /** Barometric rate of climb, in feet per minute. */
    baro_rate?: number
    /** Geometric rate of climb, in feet per minute. */
    geom_rate?: number
    squawk?: string
    emergency?: string
    /** The emitter category, such as `A3`. */
    category?: string
    /** Seconds since the position was last updated. */
    seen_pos?: number
    /** Seconds since any message was last received. */
    seen?: number
    [field: string]: unknown
}

/** A readsb-shaped answer: `ac` from the v2 APIs, `aircraft` in the file readsb writes. */
export interface ReadsbResponse {
    /** When the answer was made: milliseconds since the epoch from the v2 APIs, seconds in the file. */
    now?: number
    ac?: ReadsbAircraft[] | null
    aircraft?: ReadsbAircraft[] | null
    [field: string]: unknown
}

/** One row of OpenSky's state vectors, by position. */
export type OpenSkyState = [
    icao24: string,
    callsign: string | null,
    originCountry: string,
    timePosition: number | null,
    lastContact: number,
    longitude: number | null,
    latitude: number | null,
    baroAltitude: number | null,
    onGround: boolean,
    velocity: number | null,
    trueTrack: number | null,
    verticalRate: number | null,
    sensors: number[] | null,
    geoAltitude: number | null,
    squawk: string | null,
    spi: boolean,
    positionSource: number,
    category?: number,
]

/** OpenSky's answer to `/api/states/all`; `states` is null when no aircraft matched. */
export interface OpenSkyResponse {
    /** Seconds since the epoch. */
    time: number
    states: OpenSkyState[] | null
}

export interface FlightOptions {
    /** Gives each aircraft its affiliation from its callsign, address or the rest; `unknown` when it gives none. */
    classify?: TrackClassifier
    /** The track's `source`; `adsb` for readsb's shape and `opensky` for OpenSky's by default. */
    source?: string
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined)

/** Drops the properties a feed left out, so a track holds only what is known. */
function known(properties: Record<string, string | number | boolean | null | undefined>): TrackProperties {
    return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined)) as TrackProperties
}

function classified(track: Track, classify: TrackClassifier | undefined): Track {
    const affiliation: TrackAffiliation | undefined = classify?.(track)
    return affiliation === undefined ? track : { ...track, affiliation }
}

/** A readsb `now` in milliseconds: the v2 APIs give milliseconds, the file readsb writes gives seconds. */
function milliseconds(now: number | undefined): number | undefined {
    if (!finite(now)) return undefined
    return now < 1e11 ? now * 1000 : now
}

/** The aircraft of a readsb-shaped answer as tracks, skipping any without a position. */
export function parseReadsb(response: ReadsbResponse, options: FlightOptions = {}): Track[] {
    const rows = response.ac ?? response.aircraft ?? []
    const now = milliseconds(response.now)
    const tracks: Track[] = []
    for (const row of rows) {
        if (typeof row.hex !== 'string' || !finite(row.lat) || !finite(row.lon)) continue
        const onGround = row.alt_baro === 'ground'
        const feet = onGround ? 0 : finite(row.alt_baro) ? row.alt_baro : finite(row.alt_geom) ? row.alt_geom : undefined
        const heading = finite(row.track) ? row.track : finite(row.true_heading) ? row.true_heading : undefined
        const rate = finite(row.baro_rate) ? row.baro_rate : finite(row.geom_rate) ? row.geom_rate : undefined
        const age = finite(row.seen_pos) ? row.seen_pos : finite(row.seen) ? row.seen : 0
        const callsign = text(row.flight)
        const hex = row.hex.toLowerCase()
        const track: Track = {
            id: hex,
            lon: row.lon,
            lat: row.lat,
            affiliation: 'unknown',
            kind: 'aircraft',
            label: callsign ?? text(row.r) ?? hex,
            source: options.source ?? 'adsb',
            properties: known({
                icao24: hex,
                callsign,
                registration: text(row.r),
                aircraftType: text(row.t),
                positionSource: text(row.type),
                squawk: text(row.squawk),
                emergency: text(row.emergency),
                category: text(row.category),
                onGround,
                verticalRate: rate === undefined ? undefined : (rate * FOOT) / 60,
            }),
        }
        if (heading !== undefined) track.heading = heading
        if (finite(row.gs)) track.speed = row.gs * KNOT
        if (feet !== undefined) track.altitude = feet * FOOT
        if (now !== undefined) track.updatedAt = Math.round(now - age * 1000)
        tracks.push(classified(track, options.classify))
    }
    return tracks
}

/** The aircraft of an OpenSky `/api/states/all` answer as tracks, skipping any without a position. */
export function parseOpenSky(response: OpenSkyResponse, options: FlightOptions = {}): Track[] {
    const tracks: Track[] = []
    for (const state of response.states ?? []) {
        const [icao24, callsign, country, timePosition, lastContact, lon, lat, baroAltitude, onGround, velocity, trueTrack, verticalRate] =
            state
        if (typeof icao24 !== 'string' || !finite(lon) || !finite(lat)) continue
        const geoAltitude = state[13]
        const altitude = finite(baroAltitude) ? baroAltitude : finite(geoAltitude) ? geoAltitude : undefined
        const at = finite(timePosition) ? timePosition : finite(lastContact) ? lastContact : response.time
        const id = icao24.toLowerCase()
        const name = text(callsign)
        const track: Track = {
            id,
            lon,
            lat,
            affiliation: 'unknown',
            kind: 'aircraft',
            label: name ?? id,
            source: options.source ?? 'opensky',
            properties: known({
                icao24: id,
                callsign: name,
                originCountry: text(country),
                squawk: text(state[14]),
                onGround: onGround === true,
                verticalRate: finite(verticalRate) ? verticalRate : undefined,
                positionSource: finite(state[16]) ? state[16] : undefined,
                category: finite(state[17]) ? state[17] : undefined,
            }),
        }
        if (finite(trueTrack)) track.heading = trueTrack
        if (finite(velocity)) track.speed = velocity
        if (altitude !== undefined) track.altitude = altitude
        else if (onGround === true) track.altitude = 0
        if (finite(at)) track.updatedAt = at * 1000
        tracks.push(classified(track, options.classify))
    }
    return tracks
}

/** Aircraft as tracks from either shape, told apart by OpenSky's `states` and readsb's `ac` or `aircraft`. */
export function parseFlights(response: ReadsbResponse | OpenSkyResponse, options: FlightOptions = {}): Track[] {
    if ('states' in response) return parseOpenSky(response as OpenSkyResponse, options)
    return parseReadsb(response as ReadsbResponse, options)
}

/** Where an aircraft flies by its altitude: on the ground, low (below 10,000 ft), medium (to 25,000 ft) or high. */
export type AltitudeBand = 'ground' | 'low' | 'medium' | 'high'

/** Every altitude band, from the ground up. */
export const ALTITUDE_BANDS: readonly AltitudeBand[] = ['ground', 'low', 'medium', 'high']

/** Where the medium and high bands start, in meters: 10,000 and 25,000 feet. */
export const ALTITUDE_BREAKS: Readonly<Record<'medium' | 'high', number>> = { medium: 10_000 * FOOT, high: 25_000 * FOOT }

/** The band an aircraft flies in: `ground` when a feed says it is on the ground; undefined when its altitude is not known. */
export function altitudeBand(track: Pick<Track, 'altitude' | 'properties'>): AltitudeBand | undefined {
    if (track.properties?.onGround === true) return 'ground'
    const altitude = track.altitude
    if (!finite(altitude)) return undefined
    if (altitude <= 0) return 'ground'
    if (altitude < ALTITUDE_BREAKS.medium) return 'low'
    return altitude < ALTITUDE_BREAKS.high ? 'medium' : 'high'
}

/** Whether an aircraft climbs, holds its level or descends. */
export type VerticalTrend = 'climbing' | 'level' | 'descending'

/** The vertical rate, in meters per second, past which an aircraft climbs or descends: about 300 feet a minute. */
export const LEVEL_RATE = (300 * FOOT) / 60

/** Whether an aircraft climbs, holds its level or descends, by the `verticalRate` a reader keeps; undefined on the ground or without one. */
export function verticalTrend(track: Pick<Track, 'properties'>): VerticalTrend | undefined {
    const rate = track.properties?.verticalRate
    if (track.properties?.onGround === true || !finite(rate)) return undefined
    if (rate > LEVEL_RATE) return 'climbing'
    return rate < -LEVEL_RATE ? 'descending' : 'level'
}
