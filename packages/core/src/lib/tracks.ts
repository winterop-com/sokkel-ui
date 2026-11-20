import type { WordsPart } from './words'

/** Whose a track is: one's own side, the other side, neither, not known yet, or waiting to be judged. */
export type TrackAffiliation = 'friend' | 'hostile' | 'neutral' | 'unknown' | 'pending'

/** What a track is, which picks its glyph. */
export type TrackKind = 'vessel' | 'aircraft' | 'vehicle' | 'sensor' | 'other'

/** Every affiliation, in the order a list groups them and a menu offers them. */
export const TRACK_AFFILIATIONS: readonly TrackAffiliation[] = ['friend', 'hostile', 'neutral', 'unknown', 'pending']

/** Every kind, in the order a filter lists them. */
export const TRACK_KINDS: readonly TrackKind[] = ['vessel', 'aircraft', 'vehicle', 'sensor', 'other']

/** The color each affiliation is drawn in: a token per affiliation (`--track-friend`), so a theme can change them. */
export const TRACK_COLORS: Readonly<Record<TrackAffiliation, string>> = {
    friend: 'var(--track-friend)',
    hostile: 'var(--track-hostile)',
    neutral: 'var(--track-neutral)',
    unknown: 'var(--track-unknown)',
    pending: 'var(--track-pending)',
}

/**
 * Each kind's glyph pointing north, as the points of its outline in a 48 square: the same shapes a
 * map draws its tracks in. A sensor has no outline; it is a ring around a dot.
 */
export const TRACK_OUTLINES: Readonly<Record<Exclude<TrackKind, 'sensor'>, readonly (readonly [number, number])[]>> = {
    // A hull: a pointed bow, straight sides and a narrower stern.
    vessel: [
        [24, 4],
        [35, 17],
        [35, 37],
        [30, 44],
        [18, 44],
        [13, 37],
        [13, 17],
    ],
    // An arrowhead with a notched tail.
    aircraft: [
        [24, 4],
        [41, 43],
        [24, 34],
        [7, 43],
    ],
    // A box with a point on its front.
    vehicle: [
        [24, 5],
        [31, 13],
        [36, 13],
        [36, 43],
        [12, 43],
        [12, 13],
        [17, 13],
    ],
    // A plain triangle.
    other: [
        [24, 6],
        [40, 41],
        [8, 41],
    ],
}

/** The names of the affiliations and the kinds, as a track's card, list and glyph say them. */
export type TrackNameWords = Record<TrackAffiliation | TrackKind, string>

export const TRACK_NAMES_WORDS: TrackNameWords = {
    friend: 'Friend',
    hostile: 'Hostile',
    neutral: 'Neutral',
    unknown: 'Unknown',
    pending: 'Pending',
    vessel: 'Vessel',
    aircraft: 'Aircraft',
    vehicle: 'Vehicle',
    sensor: 'Sensor',
    other: 'Other',
}

/** Where a catalog holds the names of the affiliations and kinds. */
export const TRACK_NAMES_PART: WordsPart<TrackNameWords> = { id: 'trackNames', words: TRACK_NAMES_WORDS }

/** Whether a value names an affiliation. */
export function isTrackAffiliation(value: string): value is TrackAffiliation {
    return (TRACK_AFFILIATIONS as readonly string[]).includes(value)
}
