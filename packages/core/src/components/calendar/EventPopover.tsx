import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { useState, type CSSProperties, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { cssPixels } from '../../lib/css-pixels'
import { PopoverContent } from '../ui/popover'
import type { CalendarEvent } from './events'

/** Which event's details are open, held by the view or from outside. */
export function useOpenEvent(open: string | null | undefined, onOpenChange?: (id: string | null) => void) {
    const [own, setOwn] = useState<string | null>(null)
    const current = open === undefined ? own : open
    const set = (id: string | null) => {
        if (open === undefined) setOwn(id)
        onOpenChange?.(id)
    }
    return [current, set] as const
}

/** The room the details keep from the window's edges. */
const INSET = 'var(--density-overlay-inset)'

export interface EventPopoverProps<E extends CalendarEvent> {
    event: E
    open: boolean
    onOpenChange: (open: boolean) => void
    detail?: (event: E) => ReactNode
    onSelect?: (event: E) => void
    className?: string
    style?: CSSProperties
    children: ReactNode
    side?: 'right' | 'bottom' | 'left' | 'top'
}

/**
 * An event drawn as a control that opens its details beside it. With no `detail` it is a plain
 * button that calls `onSelect`. The details keep the overlay inset from the window's edges, and on a
 * phone they span the window between those insets.
 */
export function EventPopover<E extends CalendarEvent>({
    event,
    open,
    onOpenChange,
    detail,
    onSelect,
    className,
    style,
    children,
    side = 'right',
}: EventPopoverProps<E>) {
    const face = cn(
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid',
        className,
    )
    if (detail === undefined) {
        return (
            <button type="button" className={face} style={style} onClick={() => onSelect?.(event)}>
                {children}
            </button>
        )
    }
    return (
        <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <PopoverPrimitive.Trigger data-open={open || undefined} className={face} style={style} onClick={() => onSelect?.(event)}>
                {children}
            </PopoverPrimitive.Trigger>
            <PopoverContent
                side={side}
                align="start"
                sideOffset={6}
                collisionPadding={open ? cssPixels(INSET, 16) : 16}
                className="w-80 gap-3 p-3.5 max-sm:w-[calc(100vw-2*var(--density-overlay-inset))]"
                initialFocus={(type) => type !== ''}
            >
                {detail(event)}
            </PopoverContent>
        </PopoverPrimitive.Root>
    )
}
