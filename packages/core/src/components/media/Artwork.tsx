import { useId, useState } from 'react'

import { cn } from '../../lib/cn'
import { ARTWORK_HUES, coverFor, type ArtworkCover, type ArtworkMotif } from './cover-seed'

export { ARTWORK_HUES, ARTWORK_MOTIFS, coverFor, seedHash } from './cover-seed'
export type { ArtworkCover, ArtworkHue, ArtworkMotif } from './cover-seed'

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
    const middle = width / 2
    switch (motif) {
        case 'sun':
            return (
                <>
                    <circle cx={middle + 18} cy="36" r="16" fill="var(--terminal-foreground)" opacity="0.5" />
                    <path d={`M0 74 L28 56 L50 66 L74 48 L${String(width)} 64 V100 H0 Z`} fill="var(--terminal)" opacity="0.18" />
                    <path d={`M0 86 L34 72 L62 80 L${String(width)} 70 V100 H0 Z`} fill="var(--terminal)" opacity="0.16" />
                </>
            )
        case 'rings':
            return (
                <g fill="none" stroke="var(--terminal-foreground)">
                    {[10, 20, 30, 40, 50].map((r, index) => (
                        <circle key={r} cx={middle} cy="50" r={r} strokeWidth="3" opacity={0.5 - index * 0.08} />
                    ))}
                </g>
            )
        case 'bands':
            return (
                <g>
                    {[0, 1, 2, 3, 4].map((band) => (
                        <rect
                            key={band}
                            y={18 + band * 14}
                            width={width}
                            height="6"
                            fill="var(--terminal-foreground)"
                            opacity={0.14 + band * 0.07}
                        />
                    ))}
                </g>
            )
        case 'dots':
            return (
                <g fill="var(--terminal-foreground)">
                    {Array.from({ length: 36 }, (_, index) => {
                        const column = index % 6
                        const row = Math.floor(index / 6)
                        return (
                            <circle
                                key={index}
                                cx={middle - 40 + column * 16}
                                cy={10 + row * 16}
                                r={1.5 + ((column + row) % 4) * 0.9}
                                opacity="0.55"
                            />
                        )
                    })}
                </g>
            )
        case 'wave':
            return (
                <g fill="none" stroke="var(--terminal-foreground)" strokeWidth="3" strokeLinecap="round">
                    {[38, 52, 66].map((y, index) => (
                        <path
                            key={y}
                            d={`M-4 ${String(y)} Q ${String(width * 0.25)} ${String(y - 14)} ${String(middle)} ${String(y)} T ${String(width + 4)} ${String(y)}`}
                            opacity={0.6 - index * 0.15}
                        />
                    ))}
                </g>
            )
        case 'peaks':
            return (
                <>
                    <path
                        d={`M0 100 L${String(middle - 20)} 30 L${String(middle + 4)} 62 L${String(middle + 24)} 42 L${String(width)} 100 Z`}
                        fill="var(--terminal)"
                        opacity="0.22"
                    />
                    <path
                        d={`M${String(middle - 20)} 30 L${String(middle - 11)} 41 L${String(middle - 27)} 39 Z`}
                        fill="var(--terminal-foreground)"
                        opacity="0.7"
                    />
                    <circle cx={middle - 26} cy="22" r="5" fill="var(--terminal-foreground)" opacity="0.6" />
                </>
            )
    }
}
