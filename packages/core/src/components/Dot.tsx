import type { CSSProperties, ReactNode } from 'react'

import { cn } from '../lib/cn'
import { KIND_FILL, type KindColor } from '../lib/kind'
import { useStatus } from './StatusProvider'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

/** A dot's size: 6px beside small text, 8px as a status dot and a status chip's, 10px by default. */
export type DotSize = 'sm' | 'md' | 'lg'

const SIZE: Record<DotSize, string> = { sm: 'size-1.5', md: 'size-2', lg: 'size-2.5' }

export interface DotProps {
    kind?: KindColor
    /** A CSS color, such as a token, when the color is not one of the kinds. */
    color?: string
    /** A state, drawn in its color as the status map gives it: a run state or one the app names. */
    status?: string
    /**
     * A hollow dot: a ring in the tone's own ink, for a state not known; with no tone, a ring in the
     * strong border for something not started.
     */
    outline?: boolean
    /** 6px (`sm`), 8px (`md`, a status dot's) or 10px (`lg`, the default). */
    size?: DotSize
    /** The dot's accessible name; with it the dot is an image a screen reader says, without it hidden. */
    label?: string
    /** Said in a tooltip on hover, and on focus with `focusable`; its words name the dot when `label` is absent. */
    tip?: ReactNode
    /** Puts the dot in the tab order, so a keyboard reaches its tooltip. */
    focusable?: boolean
    /**
     * Says the word beside the dot, for a state that is news rather than background: `true` says
     * `label` or the status's word, a string says itself.
     */
    say?: boolean | string
    className?: string
}

/**
 * A small round mark for a label, a calendar, a legend entry or a state: filled in a kind color,
 * any CSS color or a state's color from the status map, or hollow, a ring in the tone's ink for a
 * state not known (or in the strong border, with no tone, for something not started).
 *
 * Alone it is decoration, hidden from a screen reader; `label` names it, `tip` explains it on hover
 * (and on focus with `focusable`), and `say` writes the word beside it where the state is news.
 */
export function Dot({ kind, color, status, outline = false, size = 'lg', label, tip, focusable = false, say, className }: DotProps) {
    const look = useStatus(status ?? '')
    const fill = color ?? (status === undefined ? undefined : look.css)
    const ink = color ?? (status === undefined ? (kind === undefined ? undefined : `var(--kind-${kind}-ink)`) : look.ink)
    let style: CSSProperties | undefined
    if (outline) style = ink === undefined ? undefined : { borderColor: ink }
    else if (fill !== undefined) style = { background: fill }
    const word = typeof say === 'string' ? say : say === true ? (label ?? (status === undefined ? undefined : look.label)) : undefined
    const name = word === undefined ? (label ?? (typeof tip === 'string' ? tip : undefined)) : undefined
    const ring =
        focusable && 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid'
    const tabIndex = focusable ? 0 : undefined
    const dot = (
        <span
            {...(name === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}
            tabIndex={word === undefined ? tabIndex : undefined}
            style={style}
            className={cn(
                'inline-block shrink-0 rounded-full',
                SIZE[size],
                outline ? cn('border', ink === undefined && 'border-border-strong') : kind !== undefined && KIND_FILL[kind],
                word === undefined && ring,
                word === undefined && className,
            )}
        />
    )
    const mark =
        word === undefined ? (
            dot
        ) : (
            <span
                data-slot="dot"
                tabIndex={tabIndex}
                className={cn('inline-flex min-w-0 items-center gap-1.5 rounded-chip', ring, className)}
            >
                {dot}
                <span className="truncate">{word}</span>
            </span>
        )
    if (tip === undefined) return mark
    return (
        <Tooltip>
            <TooltipTrigger render={mark} />
            <TooltipContent>{tip}</TooltipContent>
        </Tooltip>
    )
}
