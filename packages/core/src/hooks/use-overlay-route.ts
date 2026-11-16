import { useRef, useState } from 'react'

/** A route drawn as an overlay over a page: the page to draw, whether the overlay shows, and its way back. */
export interface OverlayRoute {
    /** The page to draw: the one the overlay was opened from while it shows, else the route itself. */
    route: readonly string[]
    /** Whether the overlay's route is the current one, and `close` has not been called on it. */
    open: boolean
    /** Goes back to the page under the overlay. */
    close: () => void
}

/** How `useOverlayRoute` draws a page under an overlay opened by a link, and how it goes back. */
export interface OverlayRouteOptions {
    /** The page under the overlay when the app opened on its route, as from a link; the root by default. */
    fallback?: readonly string[]
    /**
     * Goes back `steps` entries in the history: one, or more when moves inside the overlay pushed
     * entries of their own. The browser's own `history.go` by default, which a hash or history router follows.
     */
    back?: (steps: number) => void
    /** Goes to a route in place of the current entry in the history; the location's hash (`#/runs`) by default. */
    replace?: (route: readonly string[]) => void
}

/** What `useOverlayRoute` keeps between renders, apart from React, so its steps are tested without a page. */
export interface OverlayTracker {
    /** Reads the route of this render: the page to draw and whether the overlay shows. */
    step: (route: readonly string[]) => { route: readonly string[]; open: boolean }
    /** Goes back to the page under the overlay: back in the history when the overlay was opened from it, else in its place. */
    close: (back: (steps: number) => void, replace: (route: readonly string[]) => void) => void
}

/** Whether two routes name the same parts. */
function same(a: readonly string[], b: readonly string[]): boolean {
    return a.length === b.length && a.every((part, index) => part === b[index])
}

/**
 * Follows an overlay's route across renders, from the route the app opened on. Reading the same
 * route twice changes nothing, so a render React repeats reads as one. A move to another route
 * inside the overlay counts as an entry pushed, and a move to the route before it as Back, so
 * closing goes back past every entry the overlay pushed.
 */
export function overlayTracker(overlay: string, first: readonly string[], fallback: readonly string[] = []): OverlayTracker {
    let wasOpen = first[0] === overlay
    let under = wasOpen ? fallback : first
    // Whether the page under the overlay is the entry before it in the history.
    let cameFrom = false
    // The overlay's own entries in the history, oldest first, while it is open.
    let entries: (readonly string[])[] = wasOpen ? [first] : []
    return {
        step: (route) => {
            const open = route[0] === overlay
            if (open && !wasOpen) {
                cameFrom = true
                entries = [route]
            } else if (open) {
                const top = entries[entries.length - 1]
                if (top === undefined || !same(top, route)) {
                    const before = entries[entries.length - 2]
                    if (before !== undefined && same(before, route)) entries.pop()
                    else entries.push(route)
                }
            }
            if (!open) {
                under = route
                cameFrom = false
                entries = []
            }
            wasOpen = open
            return { route: open ? under : route, open }
        },
        close: (back, replace) => {
            if (cameFrom) back(Math.max(1, entries.length))
            else replace(under)
        },
    }
}

const historyBack = (steps: number) => window.history.go(-steps)
const replaceHash = (route: readonly string[]) => window.location.replace(`#/${route.join('/')}`)

/**
 * A route drawn as an overlay over the page it was opened from, as every app's Settings is a
 * `SettingsDialog` on `#/settings`. Given the app's route as its parts (`['jobs', 'nightly-export']`)
 * and the overlay's first part (`settings`), it gives the page to draw under the overlay (the last
 * route before it, or `fallback` when the app opened on it), whether it is open, and `close`, which
 * goes back to that page: back in the history when the overlay was opened from it, so Back
 * afterwards does not open it again, and in its place for a link that opened the app on the
 * overlay. Links to the overlay keep working, and Back closes it. A move inside the overlay that
 * pushes an entry (`settings` to `settings/theme`) is gone back past too. A move inside is read as
 * pushed, as a link pushes, so an app moves inside an overlay by pushing, never by replacing.
 *
 * The library has no router: it reads the route the app hands it and goes back through the
 * history and the hash, which a hash router follows as they are; an app with a client router passes
 * its own `back` and `replace`. Going back in the history lands later, so `open` is false from the
 * moment `close` is called, and the overlay no longer stands over the page (refusing the command
 * palette's key) while the route catches up.
 */
export function useOverlayRoute(
    route: readonly string[],
    overlay: string,
    { fallback = [], back = historyBack, replace = replaceHash }: OverlayRouteOptions = {},
): OverlayRoute {
    const tracker = useRef<OverlayTracker | null>(null)
    tracker.current ??= overlayTracker(overlay, route, fallback)
    const held = tracker.current
    // The route `close` was called on, until the route moves on from it.
    const [closed, setClosed] = useState<readonly string[] | null>(null)
    const step = held.step(route)
    const closing = closed !== null && same(closed, route)
    if (closed !== null && !closing) setClosed(null)
    return {
        route: step.route,
        open: step.open && !closing,
        close: () => {
            setClosed(route)
            held.close(back, replace)
        },
    }
}
