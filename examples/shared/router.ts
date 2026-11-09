import { useEffect, useRef, useState } from 'react'

/** The route in the location's hash as its parts: `#/tasks/today` is `['tasks', 'today']`, `#/` is none. */
function read(): string[] {
    return window.location.hash
        .replace(/^#\/?/, '')
        .split('/')
        .filter((part) => part !== '')
}

/** The hash route, followed as it changes. */
export function useRoute(): string[] {
    const [route, setRoute] = useState(read)
    useEffect(() => {
        const change = () => setRoute(read())
        window.addEventListener('hashchange', change)
        return () => window.removeEventListener('hashchange', change)
    }, [])
    return route
}

/** Goes to a route such as `/tasks/today`. */
export function go(path: string): void {
    window.location.hash = path
}

/**
 * A route drawn as a dialog over the page it was opened from, such as `#/settings`: `route` is the
 * page to draw under it (the last route before it, or `fallback` when the app opened on it),
 * `open` whether it is showing, and `close` goes back to that page: back in the history when the
 * dialog was opened from it, so Back afterwards does not open it again, and in its place for a
 * link that opened the app on the dialog. Links to it keep working, and Back closes it.
 */
export function useOverlayRoute(route: readonly string[], overlay: string, fallback: readonly string[] = []) {
    const open = route[0] === overlay
    const under = useRef<readonly string[]>(open ? fallback : route)
    // Whether the page under the dialog is the entry before it in the history.
    const cameFrom = useRef(false)
    const wasOpen = useRef(open)
    if (open && !wasOpen.current) cameFrom.current = true
    if (!open) {
        under.current = route
        cameFrom.current = false
    }
    wasOpen.current = open
    return {
        route: open ? under.current : route,
        open,
        close: () => {
            if (cameFrom.current) window.history.back()
            else window.location.replace(`#/${under.current.join('/')}`)
        },
    }
}
