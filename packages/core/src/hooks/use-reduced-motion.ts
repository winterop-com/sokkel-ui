import { useSyncExternalStore } from 'react'

import { motionReduced, REDUCED_MOTION_QUERY, systemReducedMotion } from '../lib/appearance'

function subscribe(changed: () => void): () => void {
    let media: MediaQueryList | undefined
    try {
        media = globalThis.matchMedia?.(REDUCED_MOTION_QUERY)
    } catch {
        media = undefined
    }
    media?.addEventListener?.('change', changed)
    // The look's own setting, worn as `data-motion` on `<html>` by `useAppearance` or by hand.
    const observer = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(changed)
    if (typeof document !== 'undefined') observer?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })
    return () => {
        media?.removeEventListener?.('change', changed)
        observer?.disconnect()
    }
}

function snapshot(): boolean {
    const attribute = typeof document === 'undefined' ? null : document.documentElement.getAttribute('data-motion')
    return motionReduced(attribute, systemReducedMotion())
}

/**
 * Whether motion is reduced: the look's own setting when it says (`motion` in `useAppearance`,
 * worn as `data-motion` on `<html>`), else the system's, following either as it changes. For motion
 * drawn by script, such as a canvas or a scroll, which `motion.css` cannot stop; false on the server.
 */
export function useReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, snapshot, () => false)
}
