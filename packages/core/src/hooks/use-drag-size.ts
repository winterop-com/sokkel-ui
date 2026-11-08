import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'

/** How far a collapsed panel's edge is pulled before the pull counts as a drag that expands it. */
const PULL = 8

/**
 * Follow a drag on an element's edge and report the size it gives. The drag is followed on the
 * document, so the pointer may leave the handle mid-drag; the element's own style follows every
 * move with its transition held off, and `set` hears the size once a frame and once more on
 * release. `size` reads the size the drag starts from. `grows` is 1 for an edge dragged away from the origin, such as a left panel's right
 * edge, and -1 for one dragged toward it. With `follow` off the element's style is left alone, for a
 * size that takes effect elsewhere, such as a grid's column.
 *
 * Given `expand`, the panel is collapsed: a press that is not pulled outward stays a press, and
 * once the edge is pulled a few pixels outward `expand` is called and the drag sizes the panel from
 * where it stood, never below what `clamp` allows.
 */
export function useDragSize(
    axis: 'x' | 'y',
    size: () => number,
    grows: 1 | -1,
    set: (size: number) => void,
    clamp: (size: number) => number,
    element: RefObject<HTMLElement | null>,
    follow = true,
    expand?: () => void,
) {
    const [dragging, setDragging] = useState(false)
    const start = useRef({ at: 0, size: 0 })

    const begin = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => {
            if (event.button !== 0) return
            event.preventDefault()
            const along = (point: { clientX: number; clientY: number }) => (axis === 'x' ? point.clientX : point.clientY)
            start.current = { at: along(event), size: size() }
            let latest = start.current.size
            let frame: number | null = null
            let awake = expand === undefined
            const wake = () => {
                awake = true
                document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
                if (follow) element.current?.style.setProperty('transition', 'none')
                setDragging(true)
            }
            const track = (move: PointerEvent) => {
                const pulled = grows * (along(move) - start.current.at)
                if (!awake) {
                    if (pulled <= PULL) return
                    expand?.()
                    wake()
                }
                latest = clamp(start.current.size + pulled)
                if (follow && element.current !== null) element.current.style[axis === 'x' ? 'width' : 'height'] = `${latest}px`
                frame ??= requestAnimationFrame(() => {
                    frame = null
                    set(latest)
                })
            }
            const release = () => {
                document.removeEventListener('pointermove', track)
                document.removeEventListener('pointerup', release)
                if (!awake) return
                if (frame !== null) cancelAnimationFrame(frame)
                document.body.style.removeProperty('cursor')
                if (follow) element.current?.style.removeProperty('transition')
                setDragging(false)
                set(latest)
            }
            if (awake) wake()
            document.addEventListener('pointermove', track)
            document.addEventListener('pointerup', release)
        },
        [axis, size, grows, set, clamp, element, follow, expand],
    )

    return { dragging, begin }
}
