import { useId } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'

/** The shapes a cover is drawn with. */
export type Motif = 'sun' | 'rings' | 'bands' | 'dots' | 'wave' | 'peaks'

/** The hues a cover is painted in, each a token. */
export const HUES = {
    blue: 'var(--kind-blue)',
    teal: 'var(--kind-teal)',
    green: 'var(--kind-green)',
    jade: 'var(--kind-jade)',
    violet: 'var(--kind-violet)',
    pink: 'var(--kind-pink)',
    amber: 'var(--chart-4)',
    coral: 'var(--chart-5)',
} as const

export type Hue = keyof typeof HUES

/** What a cover is drawn from: a motif over a gradient between two hues. */
export interface Cover {
    motif: Motif
    from: Hue
    to: Hue
}

/**
 * A cover drawn as a gradient between two token hues with one motif over it, square by default and
 * wide for a video frame. It fills whatever box it is placed in.
 */
export function Artwork({ cover, wide = false, className }: { cover: Cover; wide?: boolean; className?: string }) {
    const id = useId()
    const width = wide ? 160 : 100
    const fill = `url(#${id})`
    return (
        <svg
            viewBox={`0 0 ${String(width)} 100`}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden
            className={cn('block size-full', className)}
        >
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={HUES[cover.from]} />
                    <stop offset="1" stopColor={HUES[cover.to]} />
                </linearGradient>
            </defs>
            <rect width={width} height="100" fill={fill} />
            <Shapes motif={cover.motif} width={width} />
        </svg>
    )
}

function Shapes({ motif, width }: { motif: Motif; width: number }) {
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
