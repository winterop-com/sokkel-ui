import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react'

import {
    applyScheme,
    readStoredScheme,
    resolveScheme,
    type ResolvedScheme,
    type Scheme,
    storeScheme,
    subscribeAppearance,
    systemDark,
} from '../lib/appearance'

/** A layout effect in the browser, so the look is on `<html>` before the page draws; a plain one on a server. */
export const useBeforePaint = typeof document === 'undefined' ? useEffect : useLayoutEffect

/** What `useScheme` answers: the scheme chosen, the one worn, and how to choose. */
export interface SchemeState {
    /** The scheme chosen, or the fallback until one is. */
    scheme: Scheme
    /** The scheme the document wears, with `system` answered. */
    resolved: ResolvedScheme
    /** Chooses a scheme and keeps it; `system` follows the system again. */
    setScheme: (scheme: Scheme) => void
}

/**
 * Light, dark or the system's: the scheme kept in `localStorage` (or the app's own storage, given to
 * `setAppearanceStorage`), following the system until one is chosen, worn as `.dark` on `<html>`.
 * Every component using it, in every tab, follows the same choice, and the system's changes as they
 * come.
 */
export function useScheme(fallback: Scheme = 'system'): SchemeState {
    const stored = useSyncExternalStore(subscribeAppearance, readStoredScheme, () => null)
    const dark = useSyncExternalStore(subscribeAppearance, systemDark, () => false)
    const scheme = stored ?? fallback
    const resolved = resolveScheme(scheme, dark)
    useBeforePaint(() => applyScheme(resolved), [resolved])
    return { scheme, resolved, setScheme: storeScheme }
}
