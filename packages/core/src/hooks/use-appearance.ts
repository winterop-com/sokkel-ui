import { useMemo, useSyncExternalStore } from 'react'

import {
    applyAppearance,
    DEFAULT_APPEARANCE,
    parseAppearance,
    readStoredAppearanceText,
    type ResolvedScheme,
    storeAppearance,
    subscribeAppearance,
    type ThemeSettings,
} from '../lib/appearance'
import { useBeforePaint, useScheme } from './use-scheme'

/** What `useAppearance` answers: the look, the scheme it wears, and how to change it. */
export interface AppearanceState {
    /** The whole look, as `ThemePicker` takes it. */
    settings: ThemeSettings
    /** The scheme the document wears, with `system` answered. */
    resolved: ResolvedScheme
    /** Changes the look and keeps it, as `ThemePicker`'s `onChange` answers. */
    setSettings: (next: ThemeSettings) => void
}

/**
 * The whole look of an app, kept in `localStorage` and worn on `<html>`: the theme, the scheme
 * (through `useScheme`, following the system until one is chosen), the density, the corners, the
 * typeface and the motion. Called once in the app's root; `ThemePicker` takes its `settings` and
 * `setSettings`. `defaults` stand until the person chooses otherwise.
 *
 * A page that keeps its settings elsewhere, such as a browser extension's storage or a desktop
 * shell's settings file, hands that storage to `setAppearanceStorage` in `lib/appearance` once,
 * before the app draws: reads may answer later, the look standing at the last known one (or the
 * defaults) until they do.
 */
export function useAppearance(defaults: Partial<ThemeSettings> = {}): AppearanceState {
    const { scheme, resolved } = useScheme(defaults.scheme ?? 'system')
    const text = useSyncExternalStore(subscribeAppearance, readStoredAppearanceText, () => null)
    const { theme, density, corners, typeface, motion } = { ...DEFAULT_APPEARANCE, ...defaults, ...parseAppearance(text) }
    const settings = useMemo(
        (): ThemeSettings => ({ theme, scheme, density, corners, typeface, motion }),
        [theme, scheme, density, corners, typeface, motion],
    )
    useBeforePaint(() => applyAppearance({ ...settings, scheme: resolved }), [settings, resolved])
    return { settings, resolved, setSettings: storeAppearance }
}
