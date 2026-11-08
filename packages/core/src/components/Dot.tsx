import type { CSSProperties } from 'react'

import { cn } from '../lib/cn'
import { KIND_FILL, type KindColor } from '../lib/kind'
import { useStatus } from './StatusProvider'

export interface DotProps {
    kind?: KindColor
    /** A CSS color, such as a token, when the color is not one of the kinds. */
    color?: string
    /** A state, drawn in its color as the status map gives it: a run state or one the app names. */
    status?: string
    outline?: boolean
    size?: 'sm' | 'md'
    className?: string
}

/**
 * A small round mark for a label, a calendar or a legend entry: filled in a kind color, any CSS
 * color or a state's color from the status map, or drawn as an outline for something not started.
 */
export function Dot({ kind, color, status, outline = false, size = 'md', className }: DotProps) {
    const look = useStatus(status ?? '')
    const fill = color ?? (status === undefined ? undefined : look.css)
    const style: CSSProperties | undefined = fill === undefined ? undefined : { background: fill }
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
