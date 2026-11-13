import type { PointerEvent as ReactPointerEvent } from 'react'

/** How far a press on a resize handle moves before it is a drag, in pixels. */
const DISTANCE = 4

/**
 * Follows a press on an event's resize handle until it is let go: `move` hears the pointer on every
 * move once it has moved a few pixels, and `done` where it was let go, or null when it never moved
 * or Escape put it back. The release is never also a press on what lies under it, such as the
 * event it resizes.
 */
export function followPress(
    event: ReactPointerEvent<HTMLElement>,
    cursor: string,
    move: (point: { x: number; y: number }) => void,
    done: (point: { x: number; y: number } | null) => void,
): void {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const start = { x: event.clientX, y: event.clientY }
    let moved = false
    const onMove = (next: PointerEvent) => {
        if (!moved && Math.hypot(next.clientX - start.x, next.clientY - start.y) < DISTANCE) return
        if (!moved) document.body.style.cursor = cursor
        moved = true
        move({ x: next.clientX, y: next.clientY })
    }
    const finish = (point: { x: number; y: number } | null) => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.removeEventListener('keydown', onKey, true)
        document.body.style.removeProperty('cursor')
        if (moved) {
            const swallow = (click: MouseEvent) => {
                click.stopPropagation()
                click.preventDefault()
            }
            window.addEventListener('click', swallow, { capture: true, once: true })
            window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
        }
        done(moved ? point : null)
    }
    const onUp = (up: PointerEvent) => finish({ x: up.clientX, y: up.clientY })
    const onKey = (key: KeyboardEvent) => {
        if (key.key !== 'Escape') return
        key.preventDefault()
        key.stopPropagation()
        moved = false
        finish(null)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('keydown', onKey, true)
}
