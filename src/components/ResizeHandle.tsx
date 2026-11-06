import type { RefObject } from 'react'

import { useDragSize } from '../hooks/use-drag-size'
import { cn } from '../lib/cn'

/**
 * The edge a panel is resized by: dragged with a pointer, moved 16px a press with the arrows, sent
 * to its limits with Home and End, and put back to `reset` with a double click or Enter. It draws a
 * line in the accent while it is hovered, focused or dragged, and nothing otherwise. Inside an
 * element marked `data-overlay`, such as the shell's drawer and its panel sheet, it is not drawn.
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
    label,
    className,
}: {
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
    label: string
    className?: string
}) {
    const clamp = (value: number) => Math.round(Math.min(max, Math.max(min, value)))
    const now = () => {
        if (size !== undefined) return size
        const element = target.current
        return element === null ? min : axis === 'x' ? element.offsetWidth : element.offsetHeight
    }
    const { dragging, begin } = useDragSize(axis, now, grows, onSize, clamp, target)
    const step = (by: number) => onSize(clamp(now() + by))
    const restore = () => {
        if (onReset !== undefined) onReset()
        else if (reset !== undefined) onSize(clamp(reset))
    }
    const forward = axis === 'x' ? (grows === 1 ? 'ArrowRight' : 'ArrowLeft') : grows === 1 ? 'ArrowDown' : 'ArrowUp'
    const back = axis === 'x' ? (grows === 1 ? 'ArrowLeft' : 'ArrowRight') : grows === 1 ? 'ArrowUp' : 'ArrowDown'
    return (
        <div
            role="separator"
            aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
            aria-label={label}
            aria-valuenow={size}
            aria-valuemin={min}
            aria-valuemax={max}
            tabIndex={0}
            data-dragging={dragging || undefined}
            onPointerDown={begin}
            onDoubleClick={restore}
            onKeyDown={(event) => {
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
