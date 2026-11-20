/**
 * A track: one thing a tracking console follows on a map, as a plain, serializable record. Every
 * reader in this package (flights, AIS, network connections) gives tracks in this shape, so a map
 * layer, a list and a filter take any of them alike.
 */

/** Whose side a track is on. */
export type TrackAffiliation = 'friend' | 'hostile' | 'neutral' | 'unknown' | 'pending'

/** What moves. */
export type TrackKind = 'vessel' | 'aircraft' | 'vehicle' | 'sensor' | 'other'

/** A point as longitude and latitude, in degrees. */
export type LonLat = [lon: number, lat: number]

/** The values a track carries beside its position: plain data only, so a track survives JSON. */
export type TrackProperties = Record<string, string | number | boolean | null>

/** One thing followed on a map. Units are SI: meters, meters per second, degrees, milliseconds. */
export interface Track {
    /** Stable across updates: the same aircraft, vessel or host keeps its id. */
    id: string
    lon: number
    lat: number
    /** Where it points, in degrees from true north, clockwise. */
    heading?: number
    /** Speed over ground, in meters per second. */
    speed?: number
    /** Altitude, in meters. */
    altitude?: number
    affiliation: TrackAffiliation
    kind: TrackKind
    /** What a map or a list writes beside it: a callsign, a vessel's name, a host. */
    label?: string
    /** Where it has been, as longitude and latitude, oldest first. */
    trail?: LonLat[]
    /** When its position was last reported, in milliseconds since the epoch. */
    updatedAt?: number
    /** Which feed it came from. */
    source?: string
    properties?: TrackProperties
}

/** Every affiliation, in the order the words list them. */
export const TRACK_AFFILIATIONS: readonly TrackAffiliation[] = ['friend', 'hostile', 'neutral', 'unknown', 'pending']

/** Every kind, in the order the words list them. */
export const TRACK_KINDS: readonly TrackKind[] = ['vessel', 'aircraft', 'vehicle', 'sensor', 'other']

/** Gives a track its affiliation from what a feed knows of it; undefined leaves it `unknown`. */
export type TrackClassifier = (track: Track) => TrackAffiliation | undefined

/** Knots in meters per second. */
export const KNOT = 1852 / 3600

/** Feet in meters. */
export const FOOT = 0.3048
