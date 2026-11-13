import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MOBILE_QUERY, mediaStore, useIsMobile, useMedia } from './use-mobile'

/** A window whose queries answer `matches`, with the listeners each query holds. */
function fakeWindow(matches: (media: string) => boolean) {
    const listeners = new Set<() => void>()
    vi.stubGlobal('window', {
        matchMedia: (media: string) => ({
            matches: matches(media),
            addEventListener: (_: string, listener: () => void) => listeners.add(listener),
            removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
        }),
    })
    return listeners
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('mediaStore', () => {
    it('answers the query at once, with no effect to wait for', () => {
        fakeWindow((media) => media === MOBILE_QUERY)
        expect(mediaStore(MOBILE_QUERY).matches()).toBe(true)
        expect(mediaStore('(min-width: 64rem)').matches()).toBe(false)
    })

    it('hears the query change until stopped', () => {
        const listeners = fakeWindow(() => false)
        const change = vi.fn()
        const stop = mediaStore(MOBILE_QUERY).subscribe(change)
        expect(listeners.size).toBe(1)
        for (const listener of listeners) listener()
        expect(change).toHaveBeenCalledOnce()
        stop()
        expect(listeners.size).toBe(0)
    })
})

describe('useMedia', () => {
    function Answer({ media, initial }: { media: string; initial?: boolean }) {
        return <>{String(useMedia(media, initial))}</>
    }
    function Phone() {
        return <>{String(useIsMobile())}</>
    }

    it('answers initial on a server, false unless given, whatever the window says', () => {
        fakeWindow(() => true)
        expect(renderToStaticMarkup(<Answer media={MOBILE_QUERY} />)).toBe('false')
        expect(renderToStaticMarkup(<Answer media={MOBILE_QUERY} initial />)).toBe('true')
        expect(renderToStaticMarkup(<Phone />)).toBe('false')
    })
})
