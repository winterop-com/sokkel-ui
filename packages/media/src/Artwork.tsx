import { useEffect, useId, useRef, useState } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { ARTWORK_HUES, COVER_INKS, coverFor, coverShapes, drawCover, type ArtworkCover, type ArtworkMotif } from './cover-seed'
import type { MediaSessionDrawing } from './media-session'

export { ARTWORK_HUES, ARTWORK_MOTIFS, coverFor, seedHash } from './cover-seed'
export type { ArtworkCover, ArtworkHue, ArtworkMotif } from './cover-seed'
export type { MediaSessionDrawing } from './media-session'

export interface ArtworkProps {
    /** The picture's address. The drawn cover shows until it has loaded, and stays when it fails. */
    src?: string
    /** What the picture shows, for a screen reader; without it the artwork is hidden from one, as the title beside it says what it is. */
    alt?: string
    /** The motif and the two hues to draw. Without it they are chosen from `seed`. */
    cover?: ArtworkCover
    /**
     * A stable id the drawn cover is chosen from, such as the record's id: the same seed wears the
     * same cover everywhere and in every session, and a grid of records without pictures does not
     * look all alike.
     */
    seed?: string
    /** Drawn for a wide frame, as a video's, rather than a square. */
    wide?: boolean
    className?: string
}

/**
 * A record's cover: its picture, or a cover drawn in the theme's hues, a gradient between two with
 * one motif over it, chosen from a stable `seed` unless `cover` names it. A picture takes the drawn
 * cover's place only once it has loaded, so nothing moves while it loads and a broken one never
 * shows. It fills whatever box it is placed in.
 */
export function Artwork({ src, alt, cover, seed = '', wide = false, className }: ArtworkProps) {
    const id = useId()
    const [loaded, setLoaded] = useState<string | null>(null)
    const drawn = cover ?? coverFor(seed)
    const width = wide ? 160 : 100
    const shown = src !== undefined && loaded === src
    const picture = useRef<HTMLImageElement>(null)
    // A picture that loaded before the page was hydrated fired its load with no one listening.
    useEffect(() => {
        const element = picture.current
        if (src !== undefined && element !== null && element.complete && element.naturalWidth > 0) setLoaded(src)
    }, [src])
    return (
        <span
            data-slot="artwork"
            aria-hidden={alt === undefined || undefined}
            className={cn('relative block size-full overflow-hidden', className)}
        >
            {!shown && (
                <svg
                    viewBox={`0 0 ${String(width)} 100`}
                    preserveAspectRatio="xMidYMid slice"
                    aria-hidden
                    data-motif={drawn.motif}
                    className="absolute inset-0 block size-full"
                >
                    <defs>
                        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor={ARTWORK_HUES[drawn.from]} />
                            <stop offset="1" stopColor={ARTWORK_HUES[drawn.to]} />
                        </linearGradient>
                    </defs>
                    <rect width={width} height="100" fill={`url(#${id})`} />
                    <Motif motif={drawn.motif} width={width} />
                </svg>
            )}
            {src !== undefined && (
                <img
                    ref={picture}
                    src={src}
                    alt={alt ?? ''}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setLoaded(src)}
                    onError={() => setLoaded(null)}
                    className={cn('absolute inset-0 block size-full object-cover', !shown && 'invisible')}
                />
            )}
        </span>
    )
}

/** The motif's shapes, in the light and dark inks over the gradient. */
function Motif({ motif, width }: { motif: ArtworkMotif; width: number }) {
    return coverShapes(motif, width).map(({ d, ink, opacity, stroke }, index) =>
        stroke === undefined ? (
            <path key={index} d={d} fill={COVER_INKS[ink]} opacity={opacity} />
        ) : (
            <path key={index} d={d} fill="none" stroke={COVER_INKS[ink]} strokeWidth={stroke} strokeLinecap="round" opacity={opacity} />
        ),
    )
}

/**
 * A drawn cover as the operating system's media session takes artwork (`useMediaSession`): drawn on
 * a canvas at each size it asks for, in the hues the page's theme gives the tokens as it is drawn,
 * keyed by the cover so the same cover is not told again.
 */
export function coverArtwork(cover: ArtworkCover): MediaSessionDrawing {
    return {
        key: `cover:${cover.motif}:${cover.from}:${cover.to}`,
        draw: (context, size) => {
            withPaint((paint) => {
                drawCover(context, cover, size, paint)
            })
        },
    }
}

/**
 * Runs `draw` with a function that turns a token into the color the page resolves it to, read from
 * an element put in the page for as long as it runs, so the theme on the root applies.
 */
function withPaint(draw: (paint: (token: string) => string) => void) {
    const probe = document.createElement('span')
    probe.hidden = true
    document.body.append(probe)
    const seen = new Map<string, string>()
    try {
        draw((token) => {
            const known = seen.get(token)
            if (known !== undefined) return known
            probe.style.color = token
            const color = getComputedStyle(probe).color
            seen.set(token, color)
            return color
        })
    } finally {
        probe.remove()
    }
}
