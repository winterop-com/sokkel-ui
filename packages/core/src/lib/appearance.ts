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
 * Where the look is kept in place of `localStorage`, for a page that keeps its settings elsewhere:
 * a browser extension's storage, a desktop shell's settings file. Each key holds text.
 */
export interface AppearanceStorage {
    /** The text kept under `key`, or null or undefined where nothing is; at once, or as a promise. */
    read: (key: string) => string | null | undefined | PromiseLike<string | null | undefined>
    /** Keeps `value` under `key`; a promise it answers with is not waited on. */
    write: (key: string, value: string) => unknown
    /**
     * Hears the look change elsewhere, such as in another window of the app or another page of the
     * extension: `change` is called with the key and its new text (null once removed). Answers with
     * the way to stop.
     */
    subscribe?: (change: (key: string, value: string | null) => void) => () => void
}

let storage: AppearanceStorage | undefined
let stopStorage: (() => void) | undefined
/** How often each key was written here, so a read answered after a later choice is not taken. */
const writes = new Map<string, number>()

function isKey(key: string): boolean {
    return key === SCHEME_KEY || key === APPEARANCE_KEY
}

/** Takes text from the app's storage as the last known, kept beside it for `appearanceScript`, and tells the followers. */
function take(key: string, value: string | null): void {
    if (load(key) === value) return
    save(key, value)
    notify()
}

/** Asks the app's storage for a key, taking the answer unless the key was chosen again meanwhile. */
function fetchKept(from: AppearanceStorage, key: string): void {
    const asked = writes.get(key) ?? 0
    const answer = (value: string | null | undefined) => {
        if (storage === from && (writes.get(key) ?? 0) === asked) take(key, value ?? null)
    }
    try {
        const value = from.read(key)
        if (value !== null && typeof value === 'object' && typeof value.then === 'function') value.then(answer, () => undefined)
        else answer(value as string | null | undefined)
    } catch {
        // The last known look stands.
    }
}

/** Keeps a chosen value: in the last known copy at once, and in the app's storage when it gave one. */
function keep(key: string, value: string): void {
    save(key, value)
    writes.set(key, (writes.get(key) ?? 0) + 1)
    if (storage === undefined) return
    try {
        const kept = storage.write(key, value)
        if (kept !== null && typeof kept === 'object' && typeof (kept as PromiseLike<unknown>).then === 'function') {
            ;(kept as PromiseLike<unknown>).then(undefined, () => undefined)
        }
    } catch {
        // The choice holds for this page.
    }
}

/**
 * Keeps the look in the app's own storage in place of `localStorage` from now on, for every
 * `useAppearance`, `useScheme` and `SchemeToggle`; undefined goes back to `localStorage` alone.
 * Called once before the app first draws, as `setStoredPrefix` is.
 *
 * The storage may answer later than asked, as a browser extension's and a desktop shell's do: until
 * it answers, the look is the last known one, or the defaults where none is known, and the kept
 * look is worn the moment the answer comes. The last known look is a copy in `localStorage` (in
 * memory where that is refused), written on every choice and every answer, which is what
 * `appearanceScript` reads before the page draws, so a page that keeps its look elsewhere still
 * starts in it. With `subscribe`, a change made elsewhere is worn here as it comes.
 */
export function setAppearanceStorage(next: AppearanceStorage | undefined): void {
    stopStorage?.()
    stopStorage = undefined
    storage = next
    if (next === undefined) return
    fetchKept(next, SCHEME_KEY)
    fetchKept(next, APPEARANCE_KEY)
    stopStorage = next.subscribe?.((key, value) => {
        if (isKey(key) && storage === next) take(key, value)
    })
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

/** Keeps the scheme chosen, in the app's storage when it gave one, and tells everyone following it. */
export function storeScheme(scheme: Scheme): void {
    keep(SCHEME_KEY, scheme)
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

/** Keeps the whole look, the scheme under its own key, in the app's storage when it gave one, and tells everyone following it. */
export function storeAppearance(settings: ThemeSettings): void {
    const { scheme, ...rest } = settings
    keep(APPEARANCE_KEY, JSON.stringify(rest))
    keep(SCHEME_KEY, scheme)
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

/** JSON that cannot close the script element it is written into. */
function scriptJson(value: unknown): string {
    return JSON.stringify(value).replaceAll('<', '\\u003c')
}

/**
 * The one script both `appearanceScript` and `appearanceScriptFile` are, with the app's defaults
 * read from the expression `defaults`: the look kept in `localStorage` over the defaults over the
 * library's, the scheme following the system until one is chosen, worn as `applyAppearance` wears it.
 */
function scriptWith(defaults: string): string {
    const { scheme: _scheme, ...base } = DEFAULT_APPEARANCE
    return [
        '(function(){try{',
        `var r=document.documentElement,l=window.localStorage,o=${defaults}||{},`,
        `a=Object.assign(${scriptJson(base)},o,JSON.parse(l.getItem(${scriptJson(APPEARANCE_KEY)})||'{}')),`,
        `s=l.getItem(${scriptJson(SCHEME_KEY)})||o.scheme||'system',`,
        `f=${scriptJson(FACES)},`,
        `d=s==='dark'||(s!=='light'&&window.matchMedia(${scriptJson(DARK_QUERY)}).matches);`,
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

/**
 * A script for `<head>`, run before the page draws, that writes the kept look on `<html>` as
 * `applyAppearance` will, so the page never shows the wrong scheme first. `defaults` are the same
 * ones given to `useAppearance`. It only sets: `<html>` starts with nothing on it. It reads the
 * look from `localStorage`, where `setAppearanceStorage` keeps the last known copy too.
 *
 * A page that refuses inline script (a browser extension's pages, a strict Content Security
 * Policy) loads the same script from a file instead: `appearanceScriptFile`, which the core package
 * ships built as `@winterop-com/sokkel-ui/appearance.js`.
 */
export function appearanceScript(defaults: Partial<ThemeSettings> = {}): string {
    return scriptWith(scriptJson(defaults))
}

/**
 * `appearanceScript` as the text of a file a page loads with `<script src>`, for a page that refuses
 * inline script. The core package ships it built as `@winterop-com/sokkel-ui/appearance.js`; an app
 * copies it beside its pages, or lets its bundler hand it a URL. It is a classic script, not a
 * module, loaded first in `<head>` with neither `async` nor `defer`, so it runs before the page
 * draws. It takes the defaults `useAppearance` is given from its own data attributes:
 * `<script src="appearance.js" data-theme="paper" data-scheme="dark"></script>`, and `data-density`,
 * `data-corners`, `data-typeface` and `data-motion` likewise.
 */
export function appearanceScriptFile(): string {
    return scriptWith('(document.currentScript||{}).dataset')
}
