import type { RefObject } from 'react'

import { useDragSize } from '../hooks/use-drag-size'
import { cn } from '../lib/cn'

export interface ResizeHandleProps {
    /** The element whose size the drag sets. */
    target: RefObject<HTMLElement | null>
    /** The size in pixels; when not known, as for a panel resting at a CSS length, the target's rendered size. */
    size?: number
    onSize: (size: number) => void
    min: number
    max: number
    /** The size a double click or Enter returns to. */
    reset?: number
    /** Called in place of returning to `reset`. */
    onReset?: () => void
    axis?: 'x' | 'y'
    /** 1 when dragging away from the origin grows the panel (a left panel's right edge), -1 otherwise. */
    grows?: 1 | -1
    /**
     * Whether the drag sets the target's own width or height as it moves; off when the size takes
     * effect elsewhere, such as a grid's column. On, the target's own style must carry the size
     * `onSize` hears, so a reset that clears it also clears what the drag wrote.
     */
    follow?: boolean
    label: string
    /**
     * Given, the panel is collapsed and the edge is the way to expand it: pulled outward a few
     * pixels it calls this and goes on sizing the panel under the pointer, and Enter, Space or the
     * arrow that grows the panel call it too. It carries no size meanwhile.
     */
    onExpand?: () => void
    className?: string
}

/**
 * The edge a panel is resized by: dragged with a pointer, moved 16px a press with the arrows, sent
 * to its limits with Home and End, and put back to `reset` with a double click or Enter. It draws a
 * line in the accent while it is hovered, focused or dragged, and nothing otherwise. Inside an
 * element marked `data-overlay`, such as the shell's drawer and its panel sheet, it is not drawn.
 * With `onExpand` it is a collapsed panel's edge, which a drag outward or a key expands.
 */
export function ResizeHandle({
    target,
    size,
    onSize,
    min,
    max,
    reset,
    onReset,
    axis = 'x',
    grows = 1,
    follow = true,
    label,
    onExpand,
    className,
}: ResizeHandleProps) {
    const clamp = (value: number) => Math.round(Math.min(max, Math.max(min, value)))
    const now = () => {
        if (size !== undefined && onExpand === undefined) return size
        const element = target.current
        return element === null ? min : axis === 'x' ? element.offsetWidth : element.offsetHeight
    }
    const { dragging, begin } = useDragSize(axis, now, grows, onSize, clamp, target, follow, onExpand)
    const step = (by: number) => onSize(clamp(now() + by))
    const restore = () => {
        if (onReset !== undefined) onReset()
        else if (reset !== undefined) onSize(clamp(reset))
    }
    const keys = axis === 'x' ? ['ArrowRight', 'ArrowLeft'] : ['ArrowDown', 'ArrowUp']
    const [forward, back] = grows === 1 ? keys : keys.reverse()
    return (
        <div
            role="separator"
            aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
            aria-label={label}
            aria-valuenow={onExpand === undefined ? size : undefined}
            aria-valuemin={onExpand === undefined ? min : undefined}
            aria-valuemax={onExpand === undefined ? max : undefined}
            tabIndex={0}
            data-dragging={dragging || undefined}
            onPointerDown={begin}
            onDoubleClick={onExpand === undefined ? restore : undefined}
            onKeyDown={(event) => {
                if (onExpand !== undefined) {
                    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== forward) return
                    event.preventDefault()
                    onExpand()
                    return
                }
                if (event.key === forward) step(16)
                else if (event.key === back) step(-16)
                else if (event.key === 'Home') onSize(min)
                else if (event.key === 'End') onSize(max)
                else if (event.key === 'Enter' && (onReset !== undefined || reset !== undefined)) restore()
                else return
                event.preventDefault()
            }}
            className={cn(
                'group/handle relative z-10 shrink-0 touch-none outline-none in-data-overlay:hidden',
                axis === 'x' ? '-mx-1 w-2 cursor-col-resize' : '-my-1 h-2 cursor-row-resize',
                className,
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'absolute bg-primary opacity-0 transition-opacity group-hover/handle:opacity-100 group-focus-visible/handle:opacity-100 group-data-dragging/handle:opacity-100',
                    axis === 'x' ? 'inset-y-0 left-1/2 w-0.5 -translate-x-1/2' : 'inset-x-0 top-1/2 h-0.5 -translate-y-1/2',
                )}
            />
        </div>
    )
}
