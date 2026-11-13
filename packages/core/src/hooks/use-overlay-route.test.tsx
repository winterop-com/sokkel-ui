import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { overlayTracker, useOverlayRoute } from './use-overlay-route'

/** A history of routes, newest last, that the tracker's way back moves through. */
function history(...entries: (readonly string[])[]) {
    const stack = [...entries]
    return {
        now: () => stack[stack.length - 1] ?? [],
        push: (route: readonly string[]) => stack.push(route),
        back: () => void stack.pop(),
        replace: (route: readonly string[]) => {
            stack[stack.length - 1] = route
        },
        length: () => stack.length,
    }
}

describe('overlayTracker', () => {
    it('draws the route itself while the overlay is closed', () => {
        const tracker = overlayTracker('settings', ['jobs'])
        expect(tracker.step(['jobs'])).toEqual({ route: ['jobs'], open: false })
        expect(tracker.step(['jobs', 'nightly-export'])).toEqual({ route: ['jobs', 'nightly-export'], open: false })
    })

    it('draws the page it was opened from under the overlay, and goes back in the history to close', () => {
        const pages = history(['jobs', 'nightly-export'])
        const tracker = overlayTracker('settings', pages.now())
        tracker.step(pages.now())
        pages.push(['settings'])
        expect(tracker.step(pages.now())).toEqual({ route: ['jobs', 'nightly-export'], open: true })
        tracker.close(pages.back, pages.replace)
        expect(pages.now()).toEqual(['jobs', 'nightly-export'])
        expect(pages.length()).toBe(1)
        expect(tracker.step(pages.now())).toEqual({ route: ['jobs', 'nightly-export'], open: false })
    })

    it('keeps the page under the overlay as the overlay moves within its own route', () => {
        const tracker = overlayTracker('settings', ['runs'])
        tracker.step(['runs'])
        expect(tracker.step(['settings'])).toEqual({ route: ['runs'], open: true })
        expect(tracker.step(['settings', 'theme'])).toEqual({ route: ['runs'], open: true })
    })

    it('draws the fallback under an overlay the app opened on, and puts that page in its place to close', () => {
        const pages = history(['settings'])
        const tracker = overlayTracker('settings', pages.now(), ['runs'])
        expect(tracker.step(pages.now())).toEqual({ route: ['runs'], open: true })
        tracker.close(pages.back, pages.replace)
        expect(pages.now()).toEqual(['runs'])
        expect(pages.length()).toBe(1)
    })

    it('reads a route given twice as once, as a render React repeats', () => {
        const pages = history(['runs'])
        const tracker = overlayTracker('settings', pages.now())
        tracker.step(pages.now())
        tracker.step(pages.now())
        pages.push(['settings'])
        tracker.step(pages.now())
        tracker.step(pages.now())
        tracker.close(pages.back, pages.replace)
        expect(pages.now()).toEqual(['runs'])
        expect(pages.length()).toBe(1)
    })

    it('goes back to the last page left before a link that opened the overlay again', () => {
        const pages = history(['settings'])
        const tracker = overlayTracker('settings', pages.now())
        tracker.step(pages.now())
        pages.replace(['jobs'])
        tracker.step(pages.now())
        pages.push(['settings'])
        expect(tracker.step(pages.now())).toEqual({ route: ['jobs'], open: true })
        tracker.close(pages.back, pages.replace)
        expect(pages.now()).toEqual(['jobs'])
    })
})

describe('useOverlayRoute', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    function Probe({ route, fallback, replace }: { route: string[]; fallback?: string[]; replace?: (route: readonly string[]) => void }) {
        const overlay = useOverlayRoute(route, 'settings', { fallback, replace })
        if (overlay.open) overlay.close()
        return <p data-open={String(overlay.open)}>{overlay.route.join('/')}</p>
    }

    it('draws the route itself while closed', () => {
        expect(renderToStaticMarkup(<Probe route={['jobs']} />)).toBe('<p data-open="false">jobs</p>')
    })

    it('opens on its route over the fallback, and closes through the replace it is given', () => {
        const replace = vi.fn()
        expect(renderToStaticMarkup(<Probe route={['settings']} fallback={['runs']} replace={replace} />)).toBe(
            '<p data-open="true">runs</p>',
        )
        expect(replace).toHaveBeenCalledWith(['runs'])
    })

    it('puts the hash in its place to close when no router is given', () => {
        const replace = vi.fn()
        vi.stubGlobal('window', { location: { replace }, history: { back: vi.fn() } })
        renderToStaticMarkup(<Probe route={['settings']} fallback={['jobs', 'nightly-export']} />)
        expect(replace).toHaveBeenCalledWith('#/jobs/nightly-export')
    })
})
