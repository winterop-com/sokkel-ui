import { useMemo, useSyncExternalStore } from 'react'

import { BREAKPOINTS } from '../lib/breakpoints'

/** The window narrower than the `md` breakpoint (`breakpoint-md`, 768): a phone, or a foldable folded. */
export const MOBILE_QUERY = `(max-width: ${String(BREAKPOINTS.md - 1)}px)`

/** A media query as a store: its answer now, and a way to hear it change that returns the way to stop. */
export interface MediaStore {
    matches: () => boolean
    subscribe: (change: () => void) => () => void
}

/** A media query of the window as a store, for `useSyncExternalStore`. */
export function mediaStore(media: string): MediaStore {
    return {
        matches: () => window.matchMedia(media).matches,
        subscribe: (change) => {
            const query = window.matchMedia(media)
            query.addEventListener('change', change)
            return () => query.removeEventListener('change', change)
        },
    }
}

/**
 * Whether the window matches a media query, followed as it is resized. In a browser the answer is
 * read as the component first draws, so a phone never draws the wide layout first; `initial` is
 * the answer on a server and while a server's page is hydrated (false when not given).
 */
export function useMedia(media: string, initial = false): boolean {
    const store = useMemo(() => mediaStore(media), [media])
    return useSyncExternalStore(store.subscribe, store.matches, () => initial)
}

/** Whether the window is phone-sized, under 768px wide (`MOBILE_QUERY`); false on a server. */
export const useIsMobile = () => useMedia(MOBILE_QUERY)
