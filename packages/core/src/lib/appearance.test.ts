import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
    APPEARANCE_KEY,
    appearanceScript,
    appearanceScriptFile,
    applyAppearance,
    type AppearanceRoot,
    type AppearanceStorage,
    CORNERS,
    DEFAULT_APPEARANCE,
    FACES,
    motionReduced,
    parseAppearance,
    readAppearance,
    readStoredScheme,
    resolveScheme,
    SCHEME_KEY,
    setAppearanceStorage,
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
    it('offer every theme in the tokens, tidevann first, with a label and a swatch', () => {
        expect(THEMES[0]).toEqual({ value: 'tidevann', label: 'Tidevann', swatch: true })
        expect(THEMES[0]?.value).toBe(DEFAULT_APPEARANCE.theme)
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

/** Runs a script against a fake document, as the browser runs it in `<head>`; `data` are its element's data attributes. */
function run(script: string, dark = false, data?: Record<string, string>): FakeRoot {
    const root = new FakeRoot()
    const window = { localStorage: storage, matchMedia: fakeMedia(dark).matchMedia }
    const currentScript = data === undefined ? null : { dataset: data }
    new Function('document', 'window', script)({ documentElement: root, currentScript }, window)
    return root
}

describe('appearanceScript', () => {
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

    it('wears tidevann, the base theme, with no data-theme', () => {
        storeAppearance({ ...LOOK, theme: 'tidevann' })
        expect(run(appearanceScript({ theme: 'paper' })).attributes.has('data-theme')).toBe(false)
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

describe('appearanceScriptFile', () => {
    it('is the inline script, taking the defaults from its own data attributes', () => {
        const looks: (ThemeSettings | null)[] = [null, LOOK, { ...DEFAULT_APPEARANCE, scheme: 'light', density: 'compact' }]
        const defaults = { theme: 'paper', scheme: 'dark', typeface: 'system' } as const
        for (const look of looks) {
            storage.items.clear()
            if (look !== null) storeAppearance(look)
            for (const dark of [false, true]) {
                const inline = run(appearanceScript(defaults), dark)
                const file = run(appearanceScriptFile(), dark, { ...defaults })
                expect(file.classes).toEqual(inline.classes)
                expect(file.attributes).toEqual(inline.attributes)
                expect(file.properties).toEqual(inline.properties)
            }
        }
    })

    it("takes the library's defaults with no data attributes, or where the script cannot find itself", () => {
        const expected = run(appearanceScript(), true)
        expect(run(appearanceScriptFile(), true, {}).attributes).toEqual(expected.attributes)
        expect(run(appearanceScriptFile(), true).classes).toEqual(expected.classes)
    })
})

describe('setAppearanceStorage', () => {
    afterEach(() => {
        setAppearanceStorage(undefined)
    })

    const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

    /** An app's own storage that answers its reads when told to, as an extension's or a desktop shell's does. */
    function laterStorage(kept: Record<string, string>) {
        const pending: (() => void)[] = []
        const written = new Map<string, string>()
        let change: ((key: string, value: string | null) => void) | undefined
        const own: AppearanceStorage = {
            read: (key) => new Promise<string | null>((resolve) => pending.push(() => resolve(kept[key] ?? null))),
            write: (key, value) => {
                written.set(key, value)
                return Promise.resolve()
            },
            subscribe: (listener) => {
                change = listener
                return () => {
                    change = undefined
                }
            },
        }
        return {
            own,
            written,
            answer: async () => {
                for (const resolve of pending.splice(0)) resolve()
                await tick()
            },
            change: (key: string, value: string | null) => change?.(key, value),
        }
    }

    const keptText = (look: ThemeSettings): Record<string, string> => {
        const { scheme, ...rest } = look
        return { [SCHEME_KEY]: scheme, [APPEARANCE_KEY]: JSON.stringify(rest) }
    }

    it('reads a storage that answers at once before anything draws', () => {
        const kept = keptText(LOOK)
        setAppearanceStorage({ read: (key) => kept[key], write: () => undefined })
        expect(readAppearance()).toEqual(LOOK)
    })

    it('draws the last known look until a later storage answers, then wears its own and keeps it for the script', async () => {
        storeScheme('light')
        const later = laterStorage(keptText(LOOK))
        const listener = vi.fn()
        const stop = subscribeAppearance(listener)
        setAppearanceStorage(later.own)
        expect(readAppearance().scheme).toBe('light')
        expect(listener).not.toHaveBeenCalled()
        await later.answer()
        expect(readAppearance()).toEqual(LOOK)
        expect(listener).toHaveBeenCalled()
        // The copy the script reads before the next page draws.
        expect(run(appearanceScript()).attributes.get('data-theme')).toBe('paper')
        stop()
    })

    it("keeps a choice in the app's storage and in the copy", () => {
        const later = laterStorage({})
        setAppearanceStorage(later.own)
        storeAppearance(LOOK)
        expect(Object.fromEntries(later.written)).toEqual(keptText(LOOK))
        expect(storage.items.get(SCHEME_KEY)).toBe('dark')
    })

    it('never lets an answer to an older read undo a choice made meanwhile', async () => {
        const later = laterStorage(keptText(LOOK))
        setAppearanceStorage(later.own)
        storeScheme('light')
        await later.answer()
        expect(readStoredScheme()).toBe('light')
        expect(readAppearance().theme).toBe('paper')
    })

    it('takes an answer of nothing as nothing kept', async () => {
        storeScheme('dark')
        const later = laterStorage({})
        setAppearanceStorage(later.own)
        await later.answer()
        expect(readStoredScheme()).toBeNull()
    })

    it('wears a change made elsewhere until it is let go', () => {
        const later = laterStorage({})
        setAppearanceStorage(later.own)
        const listener = vi.fn()
        const stop = subscribeAppearance(listener)
        later.change(SCHEME_KEY, 'dark')
        later.change('another-key', 'x')
        expect(readStoredScheme()).toBe('dark')
        expect(listener).toHaveBeenCalledOnce()
        setAppearanceStorage(undefined)
        later.change(SCHEME_KEY, 'light')
        expect(readStoredScheme()).toBe('dark')
        stop()
    })

    it('stands at the last known look where the storage throws or refuses', async () => {
        storeScheme('dark')
        setAppearanceStorage({
            read: () => {
                throw new Error('gone')
            },
            write: () => {
                throw new Error('gone')
            },
        })
        expect(readStoredScheme()).toBe('dark')
        expect(() => storeScheme('light')).not.toThrow()
        expect(readStoredScheme()).toBe('light')
        setAppearanceStorage({ read: () => Promise.reject(new Error('gone')), write: () => Promise.reject(new Error('gone')) })
        storeScheme('dark')
        await tick()
        expect(readStoredScheme()).toBe('dark')
    })
})

describe('motionReduced', () => {
    it("follows the look's own motion where it says, and the system's otherwise", () => {
        expect(motionReduced('off', false)).toBe(true)
        expect(motionReduced('on', true)).toBe(false)
        expect(motionReduced(null, true)).toBe(true)
        expect(motionReduced(null, false)).toBe(false)
        expect(motionReduced('system', true)).toBe(true)
    })
})
