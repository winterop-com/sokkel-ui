import type { ExpressionSpecification } from 'maplibre-gl'

import type { TrackAffiliation } from './TrackLayer'

/**
 * The color an overlay on a map is drawn in: a track affiliation's, so a zone, a sensor's cover or a
 * link reads as the side it belongs to, or `plain` for what belongs to no side.
 */
export type MapTone = TrackAffiliation | 'plain'

/** Every tone, in the order a legend lists them. */
export const MAP_TONES: readonly MapTone[] = ['friend', 'hostile', 'neutral', 'unknown', 'pending', 'plain']

/** The color each tone is drawn in: the affiliations' tokens, and the muted foreground for plain. */
export const MAP_TONE_COLORS: Record<MapTone, string> = {
    friend: 'var(--track-friend)',
    hostile: 'var(--track-hostile)',
    neutral: 'var(--track-neutral)',
    unknown: 'var(--track-unknown)',
    pending: 'var(--track-pending)',
    plain: 'var(--muted-foreground)',
}

/** The feature property an overlay stores each feature's tone under. */
export const TONE_PROPERTY = 'tone'

/** A `match` on the tone property: each tone's color, plain for a tone it does not know. */
export function toneColor(colors: Record<MapTone, string>): ExpressionSpecification {
    return [
        'match',
        ['get', TONE_PROPERTY],
        ...MAP_TONES.flatMap((tone) => [tone, colors[tone]]),
        colors.plain,
    ] as unknown as ExpressionSpecification
}

/** A tone as given, or plain for one it does not know. */
export function toneOf(tone: string | undefined): MapTone {
    return (MAP_TONES as readonly string[]).includes(tone ?? '') ? (tone as MapTone) : 'plain'
}
