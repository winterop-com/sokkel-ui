import { useRef } from 'react'

/** A route drawn as an overlay over a page: the page to draw, whether the overlay shows, and its way back. */
export interface OverlayRoute {
    /** The page to draw: the one the overlay was opened from while it shows, else the route itself. */
    route: readonly string[]
    /** Whether the overlay's route is the current one. */
    open: boolean
    /** Goes back to the page under the overlay. */
    close: () => void
}

/** How `useOverlayRoute` draws a page under an overlay opened by a link, and how it goes back. */
export interface OverlayRouteOptions {
    /** The page under the overlay when the app opened on its route, as from a link; the root by default. */
    fallback?: readonly string[]
    /** Goes back one entry in the history; the browser's own Back by default, which a hash or history router follows. */
    back?: () => void
    /** Goes to a route in place of the current entry in the history; the location's hash (`#/runs`) by default. */
    replace?: (route: readonly string[]) => void
}

/** What `useOverlayRoute` keeps between renders, apart from React, so its steps are tested without a page. */
export interface OverlayTracker {
    /** Reads the route of this render: the page to draw and whether the overlay shows. */
    step: (route: readonly string[]) => { route: readonly string[]; open: boolean }
    /** Goes back to the page under the overlay: back in the history when the overlay was opened from it, else in its place. */
    close: (back: () => void, replace: (route: readonly string[]) => void) => void
}

/**
 * Follows an overlay's route across renders, from the route the app opened on. Reading the same
 * route twice changes nothing, so a render React repeats reads as one.
 */
export function overlayTracker(overlay: string, first: readonly string[], fallback: readonly string[] = []): OverlayTracker {
    let wasOpen = first[0] === overlay
    let under = wasOpen ? fallback : first
    // Whether the page under the overlay is the entry before it in the history.
    let cameFrom = false
    return {
        step: (route) => {
            const open = route[0] === overlay
            if (open && !wasOpen) cameFrom = true
            if (!open) {
                under = route
                cameFrom = false
            }
            wasOpen = open
            return { route: open ? under : route, open }
        },
        close: (back, replace) => {
            if (cameFrom) back()
            else replace(under)
        },
    }
}

const historyBack = () => window.history.back()
const replaceHash = (route: readonly string[]) => window.location.replace(`#/${route.join('/')}`)

/**
 * A route drawn as an overlay over the page it was opened from, as every app's Settings is a
 * `SettingsDialog` on `#/settings`. Given the app's route as its parts (`['jobs', 'nightly-export']`)
 * and the overlay's first part (`settings`), it gives the page to draw under the overlay (the last
 * route before it, or `fallback` when the app opened on it), whether it is open, and `close`, which
 * goes back to that page: back in the history when the overlay was opened from it, so Back
 * afterwards does not open it again, and in its place for a link that opened the app on the
 * overlay. Links to the overlay keep working, and Back closes it.
 *
 * The library has no router: it reads the route the app hands it and goes back through the
 * history and the hash, which a hash router follows as they are; an app with a client router passes
 * its own `back` and `replace`.
 */
export function useOverlayRoute(
    route: readonly string[],
    overlay: string,
    { fallback = [], back = historyBack, replace = replaceHash }: OverlayRouteOptions = {},
): OverlayRoute {
    const tracker = useRef<OverlayTracker | null>(null)
    tracker.current ??= overlayTracker(overlay, route, fallback)
    const held = tracker.current
    return { ...held.step(route), close: () => held.close(back, replace) }
}
