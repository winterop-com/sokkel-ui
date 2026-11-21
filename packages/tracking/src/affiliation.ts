/**
 * Affiliations and kinds as a console says and orders them: the words, which an app translates by
 * their message ids (`tracking.affiliations.hostile`), the order a list groups tracks in, most
 * pressing first, and the names of the color tokens a theme paints each affiliation with.
 */
import type { WordsPart } from '@winterop-com/sokkel-ui/lib/words'

import type { Track, TrackAffiliation, TrackKind } from './track'

export interface TrackingWords {
    affiliations: Record<TrackAffiliation, string>
    kinds: Record<TrackKind, string>
}

export const TRACKING_WORDS: TrackingWords = {
    affiliations: { friend: 'Friend', hostile: 'Hostile', neutral: 'Neutral', unknown: 'Unknown', pending: 'Pending' },
    kinds: { vessel: 'Vessel', aircraft: 'Aircraft', satellite: 'Satellite', vehicle: 'Vehicle', sensor: 'Sensor', other: 'Other' },
}

export const TRACKING_PART: WordsPart<TrackingWords> = { id: 'tracking', words: TRACKING_WORDS }

/** The order tracks are grouped in, most pressing first. */
export const AFFILIATION_ORDER: readonly TrackAffiliation[] = ['hostile', 'unknown', 'pending', 'neutral', 'friend']

/** The color token each affiliation is painted with, by name: `track-friend` is `--track-friend` in a theme. */
export const AFFILIATION_TOKENS: Readonly<Record<TrackAffiliation, string>> = {
    friend: 'track-friend',
    hostile: 'track-hostile',
    neutral: 'track-neutral',
    unknown: 'track-unknown',
    pending: 'track-pending',
}

/** Compares two affiliations by `AFFILIATION_ORDER`, for `sort`. */
export function compareAffiliation(a: TrackAffiliation, b: TrackAffiliation): number {
    return AFFILIATION_ORDER.indexOf(a) - AFFILIATION_ORDER.indexOf(b)
}

/**
 * Tracks by affiliation, in `AFFILIATION_ORDER`, each group keeping the tracks' own order; an
 * affiliation with no tracks is left out.
 */
export function groupByAffiliation<T extends Pick<Track, 'affiliation'>>(tracks: readonly T[]): [TrackAffiliation, T[]][] {
    const groups = new Map<TrackAffiliation, T[]>(AFFILIATION_ORDER.map((affiliation) => [affiliation, []]))
    for (const track of tracks) groups.get(track.affiliation)?.push(track)
    return [...groups].filter(([, members]) => members.length > 0)
}

/** Tracks sorted by affiliation, in `AFFILIATION_ORDER`; tracks of one affiliation keep their order. */
export function sortByAffiliation<T extends Pick<Track, 'affiliation'>>(tracks: readonly T[]): T[] {
    return [...tracks].sort((a, b) => compareAffiliation(a.affiliation, b.affiliation))
}
