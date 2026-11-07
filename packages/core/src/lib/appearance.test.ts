import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
    APPEARANCE_KEY,
    appearanceScript,
    applyAppearance,
    type AppearanceRoot,
    CORNERS,
    DEFAULT_APPEARANCE,
    FACES,
    parseAppearance,
    readAppearance,
    readStoredScheme,
    resolveScheme,
    SCHEME_KEY,
    storeAppearance,
    storeScheme,
    subscribeAppearance,
    THEMES,
    type ThemeSettings,
    TYPEFACES,
} from './appearance'

/** `<html>` as far as the look touches it. */
class FakeRoot implements AppearanceRoot {
    classes = new Set<string>()
    attributes = new Map<string, string>()
    properties = new Map<string, string>()
    classList = {
        toggle: (name: string, force?: boolean) => {
            const on = force ?? !this.classes.has(name)
            if (on) this.classes.add(name)
            else this.classes.delete(name)
            return on
        },
    }
    style = {
        setProperty: (name: string, value: string) => void this.properties.set(name, value),
        removeProperty: (name: string) => this.properties.delete(name),
    }
    setAttribute(name: string, value: string) {
        this.attributes.set(name, value)
    }
    removeAttribute(name: string) {
        this.attributes.delete(name)
    }
}

class FakeStorage {
    items = new Map<string, string>()
    getItem(key: string) {
        return this.items.get(key) ?? null
    }
    setItem(key: string, value: string) {
        this.items.set(key, value)
    }
    removeItem(key: string) {
        this.items.delete(key)
    }
}

/** A `matchMedia` whose dark query answers `dark`, and which can be flipped as the system changes. */
function fakeMedia(dark: boolean) {
    const listeners = new Set<() => void>()
    const media = {
        dark,
        matchMedia: (query: string) => ({
            get matches() {
                return query === '(prefers-color-scheme: dark)' && media.dark
            },
            addEventListener: (_: string, listener: () => void) => listeners.add(listener),
            removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
        }),
        flip(next: boolean) {
            media.dark = next
            for (const listener of listeners) listener()
        },
    }
    return media
}

let storage: FakeStorage

beforeEach(() => {
    storage = new FakeStorage()
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('matchMedia', fakeMedia(false).matchMedia)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

const LOOK: ThemeSettings = { theme: 'paper', scheme: 'dark', density: 'compact', corners: '4px', typeface: 'geist', motion: 'off' }

describe('the option lists', () => {
    it('offer every theme in the tokens, the default first, with a label and a swatch', () => {
        expect(THEMES[0]).toEqual({ value: 'default', label: 'Default', swatch: true })
        expect(THEMES.map((theme) => theme.value)).toContain('paper')
        for (const theme of THEMES) expect(theme.label).not.toBe('')
    })

    it('offer the theme’s own corners and typeface first, and a typeface per face', () => {
        expect(CORNERS[0]?.value).toBe('theme')
        expect(TYPEFACES[0]?.value).toBe('theme')
        expect(TYPEFACES.slice(1).map((face) => face.value)).toEqual(Object.keys(FACES))
    })
})

describe('applyAppearance', () => {
    it('writes the whole look on the root', () => {
        const root = new FakeRoot()
        applyAppearance(LOOK, root)
        expect(root.classes.has('dark')).toBe(true)
        expect(Object.fromEntries(root.attributes)).toEqual({ 'data-theme': 'paper', 'data-density': 'compact', 'data-motion': 'off' })
        expect(root.properties.get('--radius')).toBe('4px')
        expect(root.properties.get('--typeface-sans')).toBe(FACES.geist?.sans)
        expect(root.properties.get('--mono-x-height')).toBe(FACES.geist?.monoX)
    })

    it('clears what the default look does not set', () => {
        const root = new FakeRoot()
        applyAppearance(LOOK, root)
        applyAppearance({ ...DEFAULT_APPEARANCE, scheme: 'light' }, root)
        expect(root.classes.has('dark')).toBe(false)
        expect(Object.fromEntries(root.attributes)).toEqual({ 'data-density': 'regular' })
        expect(root.properties.size).toBe(0)
    })

    it('leaves out the variables a face does not set', () => {
        const root = new FakeRoot()
        applyAppearance({ ...LOOK, typeface: 'system' }, root)
        expect(root.properties.has('--typeface-mono')).toBe(true)
        expect(root.properties.has('--mono-x-height')).toBe(false)
    })

    it('answers the system scheme from matchMedia', () => {
        const root = new FakeRoot()
        vi.stubGlobal('matchMedia', fakeMedia(true).matchMedia)
        applyAppearance({ ...LOOK, scheme: 'system' }, root)
        expect(root.classes.has('dark')).toBe(true)
        expect(resolveScheme('system', false)).toBe('light')
        expect(resolveScheme('light', true)).toBe('light')
    })

    it('takes the system as light where matchMedia is missing', () => {
        vi.stubGlobal('matchMedia', undefined)
        expect(resolveScheme('system')).toBe('light')
    })
})

describe('the kept look', () => {
    it('follows the system until a scheme is chosen', () => {
        expect(readStoredScheme()).toBeNull()
        expect(readAppearance().scheme).toBe('system')
        storeScheme('dark')
        expect(storage.items.get(SCHEME_KEY)).toBe('dark')
        expect(readAppearance().scheme).toBe('dark')
        storeScheme('system')
        expect(readAppearance({ scheme: 'dark' }).scheme).toBe('system')
    })

    it('keeps the whole look and reads it back over the defaults', () => {
        expect(readAppearance({ theme: 'amber' })).toEqual({ ...DEFAULT_APPEARANCE, theme: 'amber' })
        storeAppearance(LOOK)
        expect(JSON.parse(storage.items.get(APPEARANCE_KEY) ?? '')).not.toHaveProperty('scheme')
        expect(readAppearance({ theme: 'amber' })).toEqual(LOOK)
    })

    it('ignores what it cannot read', () => {
        storage.setItem(SCHEME_KEY, 'purple')
        expect(readStoredScheme()).toBeNull()
        expect(parseAppearance('not json')).toEqual({})
        expect(parseAppearance('null')).toEqual({})
        expect(parseAppearance('{"theme":3,"density":"compact","motion":"sometimes"}')).toEqual({ density: 'compact' })
    })

    it('holds a choice in memory where storage throws', () => {
        const broken = {
            getItem: () => {
                throw new Error('blocked')
            },
            setItem: () => {
                throw new Error('blocked')
            },
            removeItem: () => {
                throw new Error('blocked')
            },
        }
        vi.stubGlobal('localStorage', broken)
        expect(readStoredScheme()).toBeNull()
        storeAppearance(LOOK)
        expect(readAppearance()).toEqual(LOOK)
        // Once storage works again, a choice is kept there and the memory let go.
        vi.stubGlobal('localStorage', storage)
        storeAppearance({ ...DEFAULT_APPEARANCE, scheme: 'light' })
        expect(storage.items.get(SCHEME_KEY)).toBe('light')
        expect(readAppearance()).toEqual({ ...DEFAULT_APPEARANCE, scheme: 'light' })
    })

    it('tells its followers of a choice and of the system changing', () => {
        const media = fakeMedia(false)
        vi.stubGlobal('matchMedia', media.matchMedia)
        const listener = vi.fn()
        const stop = subscribeAppearance(listener)
        storeScheme('light')
        media.flip(true)
        expect(listener).toHaveBeenCalledTimes(2)
        stop()
        storeScheme('dark')
        media.flip(false)
        expect(listener).toHaveBeenCalledTimes(2)
    })
})

describe('appearanceScript', () => {
    /** Runs the script against a fake document, as the browser runs it in `<head>`. */
    function run(script: string, dark = false): FakeRoot {
        const root = new FakeRoot()
        const window = { localStorage: storage, matchMedia: fakeMedia(dark).matchMedia }
        new Function('document', 'window', script)({ documentElement: root }, window)
        return root
    }

    it('wears the kept look as applyAppearance does', () => {
        storeAppearance(LOOK)
        const expected = new FakeRoot()
        applyAppearance(LOOK, expected)
        const root = run(appearanceScript())
        expect(root.classes).toEqual(expected.classes)
        expect(root.attributes).toEqual(expected.attributes)
        expect(root.properties).toEqual(expected.properties)
    })

    it('follows the system until a scheme is chosen, and takes the defaults given', () => {
        expect(run(appearanceScript(), true).classes.has('dark')).toBe(true)
        expect(run(appearanceScript(), false).classes.has('dark')).toBe(false)
        const root = run(appearanceScript({ scheme: 'dark', theme: 'paper' }), false)
        expect(root.classes.has('dark')).toBe(true)
        expect(root.attributes.get('data-theme')).toBe('paper')
    })

    it('does nothing where storage throws', () => {
        const root = new FakeRoot()
        const window = {
            localStorage: {
                getItem: () => {
                    throw new Error('blocked')
                },
            },
        }
        expect(() => new Function('document', 'window', appearanceScript())({ documentElement: root }, window)).not.toThrow()
    })

    it('cannot close the script element it sits in', () => {
        expect(appearanceScript({ theme: '</script><script>' })).not.toContain('</script>')
    })
})
