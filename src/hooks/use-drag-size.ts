import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'

/**
 * Follow a drag on an element's edge and report the size it gives. The drag is followed on the
 * document, so the pointer may leave the handle mid-drag; the element's own style follows every
 * move with its transition held off, and `set` hears the size once a frame and once more on
 * release. `grows` is 1 for an edge dragged away from the origin, such as a left panel's right
 * edge, and -1 for one dragged toward it.
 */
export function useDragSize(
    axis: 'x' | 'y',
    size: number,
    grows: 1 | -1,
    set: (size: number) => void,
    clamp: (size: number) => number,
    element: RefObject<HTMLElement | null>,
) {
    const [dragging, setDragging] = useState(false)
    const start = useRef({ at: 0, size: 0 })

    const begin = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => {
            if (event.button !== 0) return
            event.preventDefault()
            const along = (point: { clientX: number; clientY: number }) => (axis === 'x' ? point.clientX : point.clientY)
            start.current = { at: along(event), size }
            setDragging(true)
            let latest = size
            let frame: number | null = null
            const follow = (move: PointerEvent) => {
                latest = clamp(start.current.size + grows * (along(move) - start.current.at))
                if (element.current !== null) element.current.style[axis === 'x' ? 'width' : 'height'] = `${latest}px`
                frame ??= requestAnimationFrame(() => {
                    frame = null
                    set(latest)
                })
            }
            const release = () => {
                document.removeEventListener('pointermove', follow)
                document.removeEventListener('pointerup', release)
                if (frame !== null) cancelAnimationFrame(frame)
                document.body.style.removeProperty('cursor')
                element.current?.style.removeProperty('transition')
                setDragging(false)
                set(latest)
            }
            document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
            element.current?.style.setProperty('transition', 'none')
            document.addEventListener('pointermove', follow)
            document.addEventListener('pointerup', release)
        },
        [axis, size, grows, set, clamp, element],
    )

    return { dragging, begin }
}
