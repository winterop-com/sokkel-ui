import { forgetStored, readStored as load, writeStored as save } from './stored'
import { THEME_LIST } from './theme-list'

/** Light, dark, or whichever the system uses. */
export type Scheme = 'light' | 'dark' | 'system'

/** The scheme the document wears once `system` is answered. */
export type ResolvedScheme = 'light' | 'dark'

/** One choice a theme picker offers: what it answers with, what it is called, and a short note beside it. */
export interface ThemeOption {
    value: string
    label: string
    /** A short note after the label, such as where the theme comes from. */
    note?: string
    /** Draws a swatch of the theme beside its name. Only themes that answer `data-theme-scope` can be drawn. */
    swatch?: boolean
}

/** The whole look of an app: the named theme, the scheme, the density, the corners, the typeface and the motion. */
export interface ThemeSettings {
    theme: string
    scheme: Scheme
    density: string
    corners: string
    typeface: string
    /** Whether things slide and fade: as the system asks, always, or never. */
    motion?: 'system' | 'on' | 'off'
}

/** A typeface the look can wear instead of the theme's: sans and mono together, with mono's x-heights where they differ. */
export interface Face {
    label: string
    sans: string
    mono: string
    monoX?: string
    monoXSmall?: string
}

/** Every theme in the tokens, the default first, each drawn with its swatch. */
export const THEMES: readonly ThemeOption[] = THEME_LIST.map((theme) => ({ ...theme, swatch: true }))

/** The corner radii offered over the theme's own. */
export const CORNERS: readonly ThemeOption[] = [
    { value: 'theme', label: "Theme's corners" },
    { value: '0px', label: 'Square' },
    { value: '3px', label: '3px' },
    { value: '4px', label: '4px' },
    { value: '5px', label: '5px' },
    { value: '6px', label: '6px' },
    { value: '8px', label: '8px' },
    { value: '10px', label: '10px' },
]

/** The typefaces offered over the theme's own, by the value `typeface` takes. Geist needs its optional fonts installed. */
export const FACES: Readonly<Record<string, Face>> = {
    geist: {
        label: 'Geist and Geist Mono',
        sans: "'Geist Variable', system-ui, sans-serif",
        mono: "'Geist Mono Variable', ui-monospace, monospace",
        // Mono at the default's share of Geist's x-height (0.530), as 0.45 and 0.49 are of Plex Sans's 0.516.
        monoX: '0.462',
        monoXSmall: '0.503',
    },
    system: {
        label: 'System',
        sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
    },
}

/** The typefaces as picker options, the theme's own first. */
export const TYPEFACES: readonly ThemeOption[] = [
    { value: 'theme', label: "Theme's typeface" },
    ...Object.entries(FACES).map(([value, face]) => ({ value, label: face.label })),
]

/** The look before anything is chosen: the default theme, following the system's scheme and motion. */
export const DEFAULT_APPEARANCE: Readonly<ThemeSettings> = {
    theme: 'default',
    scheme: 'system',
    density: 'regular',
    corners: 'theme',
    typeface: 'theme',
    motion: 'system',
}

/** The `localStorage` key the chosen scheme is kept under; without it the scheme follows the system. */
export const SCHEME_KEY = 'sokkel-ui-scheme'

/** The `localStorage` key the rest of the look is kept under, as JSON. */
export const APPEARANCE_KEY = 'sokkel-ui-appearance'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** The parts of `<html>` the look is written to; the document's root element has them all. */
export interface AppearanceRoot {
    classList: { toggle(name: string, force?: boolean): unknown }
    setAttribute(name: string, value: string): void
    removeAttribute(name: string): void
    style: { setProperty(name: string, value: string): void; removeProperty(name: string): unknown }
}

/** Whether the system asks for dark, false where nothing can tell. */
export function systemDark(): boolean {
    try {
        return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(DARK_QUERY).matches
    } catch {
        return false
    }
}

/** The scheme the document wears: the one chosen, or the system's for `system`. */
export function resolveScheme(scheme: Scheme, dark: boolean = systemDark()): ResolvedScheme {
    if (scheme === 'system') return dark ? 'dark' : 'light'
    return scheme
}

function rootElement(): AppearanceRoot | undefined {
    return typeof document === 'undefined' ? undefined : document.documentElement
}

/** The media query the system's reduced-motion setting answers. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Whether the system asks for reduced motion, false where nothing can tell. */
export function systemReducedMotion(): boolean {
    try {
        return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(REDUCED_MOTION_QUERY).matches
    } catch {
        return false
    }
}

/**
 * Whether motion is reduced, from the `data-motion` the look wears on `<html>` (`off` reduces it,
 * `on` keeps it) and else the system's setting, as `motion.css` decides.
 */
export function motionReduced(attribute: string | null | undefined, system: boolean): boolean {
    if (attribute === 'off') return true
    if (attribute === 'on') return false
    return system
}

/** Puts `.dark` on `<html>` for the dark scheme and takes it off for the light one. */
export function applyScheme(resolved: ResolvedScheme, root: AppearanceRoot | undefined = rootElement()): void {
    root?.classList.toggle('dark', resolved === 'dark')
}

/**
 * Writes the whole look on `<html>`: `.dark` for the scheme (the system's for `system`), `data-theme`
 * unless the default, `data-density`, `data-motion` unless the system's, `--radius` unless the
 * theme's, and the typeface's variables unless the theme's. Whatever it does not set it clears, so
 * the look before leaves nothing behind.
 */
export function applyAppearance(settings: ThemeSettings, root: AppearanceRoot | undefined = rootElement()): void {
    if (root === undefined) return
    applyScheme(resolveScheme(settings.scheme), root)
    if (settings.theme === 'default') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', settings.theme)
    root.setAttribute('data-density', settings.density)
    if (settings.motion === undefined || settings.motion === 'system') root.removeAttribute('data-motion')
    else root.setAttribute('data-motion', settings.motion)
    if (settings.corners === 'theme') root.style.removeProperty('--radius')
    else root.style.setProperty('--radius', settings.corners)
    const face = Object.hasOwn(FACES, settings.typeface) ? FACES[settings.typeface] : undefined
    const faceProps: [string, string | undefined][] = [
        ['--typeface-sans', face?.sans],
        ['--typeface-mono', face?.mono],
        ['--mono-x-height', face?.monoX],
        ['--mono-x-height-small', face?.monoXSmall],
    ]
    for (const [name, value] of faceProps) {
        if (value === undefined) root.style.removeProperty(name)
        else root.style.setProperty(name, value)
    }
}

const listeners = new Set<() => void>()

function notify(): void {
    for (const listener of listeners) listener()
}

/**
 * Calls `listener` when the kept look changes: here, in another tab, or by the system's scheme.
 * Answers with the function that stops it.
 */
export function subscribeAppearance(listener: () => void): () => void {
    listeners.add(listener)
    const onStorage = (event: StorageEvent) => {
        if (event.key !== null && event.key !== SCHEME_KEY && event.key !== APPEARANCE_KEY) return
        forgetStored(event.key)
        listener()
    }
    globalThis.addEventListener?.('storage', onStorage)
    let query: MediaQueryList | undefined
    try {
        query = globalThis.matchMedia?.(DARK_QUERY)
    } catch {
        query = undefined
    }
    query?.addEventListener?.('change', listener)
    return () => {
        listeners.delete(listener)
        globalThis.removeEventListener?.('storage', onStorage)
        query?.removeEventListener?.('change', listener)
    }
}

const SCHEMES: readonly Scheme[] = ['light', 'dark', 'system']

/** The scheme chosen and kept, or null when none has been. */
export function readStoredScheme(): Scheme | null {
    const stored = load(SCHEME_KEY)
    return SCHEMES.find((scheme) => scheme === stored) ?? null
}

/** Keeps the scheme chosen and tells everyone following it. */
export function storeScheme(scheme: Scheme): void {
    save(SCHEME_KEY, scheme)
    notify()
}

/** The kept look as JSON, or null; the raw text, so it can be compared between reads. */
export function readStoredAppearanceText(): string | null {
    return load(APPEARANCE_KEY)
}

/** The look in the kept JSON, its scheme aside, with anything unreadable left out. */
export function parseAppearance(text: string | null): Partial<Omit<ThemeSettings, 'scheme'>> {
    if (text === null) return {}
    let value: unknown
    try {
        value = JSON.parse(text)
    } catch {
        return {}
    }
    if (typeof value !== 'object' || value === null) return {}
    const record = value as Record<string, unknown>
    const out: Partial<Omit<ThemeSettings, 'scheme'>> = {}
    for (const key of ['theme', 'density', 'corners', 'typeface'] as const) {
        const field = record[key]
        if (typeof field === 'string') out[key] = field
    }
    if (record.motion === 'system' || record.motion === 'on' || record.motion === 'off') out.motion = record.motion
    return out
}

/** Keeps the whole look, the scheme under its own key, and tells everyone following it. */
export function storeAppearance(settings: ThemeSettings): void {
    const { scheme, ...rest } = settings
    save(APPEARANCE_KEY, JSON.stringify(rest))
    save(SCHEME_KEY, scheme)
    notify()
}

/** The kept look over `defaults` over the library's, the scheme following the system until one is chosen. */
export function readAppearance(defaults: Partial<ThemeSettings> = {}): ThemeSettings {
    return {
        ...DEFAULT_APPEARANCE,
        ...defaults,
        ...parseAppearance(readStoredAppearanceText()),
        scheme: readStoredScheme() ?? defaults.scheme ?? 'system',
    }
}

/**
 * A script for `<head>`, run before the page draws, that writes the kept look on `<html>` as
 * `applyAppearance` will, so the page never shows the wrong scheme first. `defaults` are the same
 * ones given to `useAppearance`. It only sets: `<html>` starts with nothing on it.
 */
export function appearanceScript(defaults: Partial<ThemeSettings> = {}): string {
    const { scheme = 'system', ...rest } = defaults
    const { scheme: _scheme, ...base } = DEFAULT_APPEARANCE
    const json = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c')
    return [
        '(function(){try{',
        'var r=document.documentElement,l=window.localStorage,',
        `a=Object.assign(${json({ ...base, ...rest })},JSON.parse(l.getItem(${json(APPEARANCE_KEY)})||'{}')),`,
        `s=l.getItem(${json(SCHEME_KEY)})||${json(scheme)},`,
        `f=${json(FACES)},`,
        `d=s==='dark'||(s!=='light'&&window.matchMedia(${json(DARK_QUERY)}).matches);`,
        "r.classList.toggle('dark',d);",
        "if(typeof a.theme==='string'&&a.theme!=='default')r.setAttribute('data-theme',a.theme);",
        "if(typeof a.density==='string')r.setAttribute('data-density',a.density);",
        "if(a.motion==='on'||a.motion==='off')r.setAttribute('data-motion',a.motion);",
        "if(typeof a.corners==='string'&&a.corners!=='theme')r.style.setProperty('--radius',a.corners);",
        'var t=Object.prototype.hasOwnProperty.call(f,a.typeface)?f[a.typeface]:null;',
        "if(t){r.style.setProperty('--typeface-sans',t.sans);r.style.setProperty('--typeface-mono',t.mono);",
        "if(t.monoX)r.style.setProperty('--mono-x-height',t.monoX);",
        "if(t.monoXSmall)r.style.setProperty('--mono-x-height-small',t.monoXSmall)}",
        '}catch(e){}})()',
    ].join('')
}
