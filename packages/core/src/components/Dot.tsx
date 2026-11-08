import type { CSSProperties } from 'react'

import { cn } from '../lib/cn'
import { KIND_FILL, type KindColor } from '../lib/kind'

export interface DotProps {
    kind?: KindColor
    /** A CSS color, such as a token, when the color is not one of the kinds. */
    color?: string
    outline?: boolean
    size?: 'sm' | 'md'
    className?: string
}

/**
 * A small round mark for a label, a calendar or a legend entry: filled in a kind color or any CSS
 * color, or drawn as an outline for something not started.
 */
export function Dot({ kind, color, outline = false, size = 'md', className }: DotProps) {
    const style: CSSProperties | undefined = color === undefined ? undefined : { background: color }
    return (
        <span
            aria-hidden
            style={style}
            className={cn(
                'inline-block shrink-0 rounded-full',
                size === 'sm' ? 'size-1.5' : 'size-2.5',
                outline ? 'border border-border-strong' : kind !== undefined && KIND_FILL[kind],
                className,
            )}
        />
    )
}
