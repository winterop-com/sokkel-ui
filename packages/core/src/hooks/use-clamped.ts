import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Whether an element's text is cut short by its line limit or an ellipsis, measured again whenever
 * the element resizes. Give the returned ref to the element; the flag tells when to offer its whole
 * text, as a `title`.
 */
export function useClamped<T extends HTMLElement>(): [(node: T | null) => void, boolean] {
    const [clamped, setClamped] = useState(false)
    const observer = useRef<ResizeObserver | null>(null)
    const ref = useCallback((node: T | null) => {
        observer.current?.disconnect()
        observer.current = null
        if (node === null) return
        const measure = () => setClamped(node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1)
        measure()
        if (typeof ResizeObserver === 'undefined') return
        observer.current = new ResizeObserver(measure)
        observer.current.observe(node)
    }, [])
    useEffect(() => () => observer.current?.disconnect(), [])
    return [ref, clamped]
}
