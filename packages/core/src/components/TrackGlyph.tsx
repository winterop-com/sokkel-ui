import { cn } from '../lib/cn'
import { TRACK_COLORS, TRACK_NAMES_PART, TRACK_OUTLINES, type TrackAffiliation, type TrackKind, type TrackNameWords } from '../lib/tracks'
import { useWords } from '../lib/words'

export type { TrackAffiliation, TrackKind } from '../lib/tracks'

/** A glyph's size: 14px beside small text, 16px in a line of text, 20px leading a card. */
export type TrackGlyphSize = 'sm' | 'md' | 'lg'

const SIZE: Record<TrackGlyphSize, string> = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' }

export interface TrackGlyphProps {
    kind: TrackKind
    /** Paints it in the affiliation's token; the text's own color without one. */
    affiliation?: TrackAffiliation
    /** Which way it points, in degrees from north; north without one. A sensor never turns. */
    heading?: number
    size?: TrackGlyphSize
    /**
     * Names the glyph as an image ("Hostile vessel"); `true` names it by its affiliation and kind in
     * the words. Without it the glyph is decoration, for one beside words that already say it.
     */
    label?: string | boolean
    words?: Partial<TrackNameWords>
    className?: string
}

/**
 * What a track is, as the map draws it: its kind's shape (a hull, an arrowhead, a box with a point,
 * a ring round a dot for a sensor, a body between two panels for a satellite, a triangle for
 * anything else) filled in its affiliation's color
 * and turned to its heading, so a list, a card and a line between two things show a track as the map
 * shows it.
 */
export function TrackGlyph({ kind, affiliation, heading, size = 'md', label, words: given, className }: TrackGlyphProps) {
    const words = useWords(TRACK_NAMES_PART, given)
    const named =
        label === true
            ? affiliation === undefined
                ? words[kind]
                : `${words[affiliation]} ${words[kind].toLowerCase()}`
            : label || undefined
    const turn = kind === 'sensor' || heading === undefined || !Number.isFinite(heading) ? undefined : `rotate(${String(heading)} 24 24)`
    return (
        <svg
            viewBox="0 0 48 48"
            role={named === undefined ? undefined : 'img'}
            aria-label={named}
            aria-hidden={named === undefined || undefined}
            data-kind={kind}
            data-affiliation={affiliation}
            className={cn('shrink-0', SIZE[size], className)}
            style={{ color: affiliation === undefined ? undefined : TRACK_COLORS[affiliation] }}
        >
            <g transform={turn}>
                {kind === 'sensor' ? (
                    <>
                        <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="5" />
                        <circle cx="24" cy="24" r="4.5" fill="currentColor" />
                    </>
                ) : (
                    <polygon points={TRACK_OUTLINES[kind].map(([x, y]) => `${String(x)},${String(y)}`).join(' ')} fill="currentColor" />
                )}
            </g>
        </svg>
    )
}
