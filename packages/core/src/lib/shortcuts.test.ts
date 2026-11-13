import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { KeyTarget } from './keys'
import { shortcutGroups } from './shortcut-groups'
import { openOverlay } from './overlay'
import {
    createShortcutRegistry,
    heard,
    layerOpen,
    matchesChord,
    overSearch,
    paletteMayOpen,
    pickBinding,
    pressPlace,
    openLayers,
    topLayer,
    type KeyBinding,
    type KeyPress,
    type PressPlace,
} from './shortcuts'

const press = (key: string, held: Partial<KeyPress> = {}): KeyPress => ({
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...held,
})

const run = () => undefined
const bind = (binding: Partial<KeyBinding> & { key: string }): KeyBinding => ({ id: binding.key, run, ...binding })

const open: PressPlace = { field: false, dialog: false, scopes: [] }

/** An element as the key helpers read it: a tag, attributes and the element around it. */
function element(tagName: string, attributes: Record<string, string> = {}, parentElement: KeyTarget | null = null): KeyTarget {
    return { tagName, getAttribute: (name) => attributes[name] ?? null, parentElement }
}

describe('matchesChord', () => {
    it('matches a letter by the character typed, in either case only as Shift says', () => {
        expect(matchesChord({ key: 'k' }, press('k'), false)).toBe(true)
        expect(matchesChord({ key: 'k' }, press('K', { shiftKey: true }), false)).toBe(false)
        expect(matchesChord({ key: 'k', shift: true }, press('K', { shiftKey: true }), false)).toBe(true)
        expect(matchesChord({ key: 'k' }, press('j'), false)).toBe(false)
    })

    it('matches a letter of any layout, such as the Norwegian ø', () => {
        expect(matchesChord({ key: 'ø' }, press('ø', { code: 'Semicolon' }), false)).toBe(true)
        expect(matchesChord({ key: 'ø', shift: true }, press('Ø', { shiftKey: true }), false)).toBe(true)
    })

    it('matches a character as itself, whatever Shift, Option or AltGr the layout took to type it', () => {
        // `?` is Shift and + on a Norwegian keyboard, Shift and / on an American one.
        expect(matchesChord({ key: '?' }, press('?', { shiftKey: true, code: 'Minus' }), false)).toBe(true)
        expect(matchesChord({ key: '?' }, press('?', { shiftKey: true, code: 'Slash' }), true)).toBe(true)
        // `/` is Shift and 7 on a Norwegian keyboard.
        expect(matchesChord({ key: '/' }, press('/', { shiftKey: true, code: 'Digit7' }), false)).toBe(true)
        // `{` is Option, Shift and 8 on a Norwegian Mac.
        expect(matchesChord({ key: '{' }, press('{', { altKey: true, shiftKey: true }), true)).toBe(true)
        // AltGr and 7 on Norwegian Windows, reported as Ctrl and Alt.
        expect(matchesChord({ key: '{' }, press('{', { ctrlKey: true, altKey: true, altGraph: true }), false)).toBe(true)
        expect(matchesChord({ key: '{' }, press('{', { ctrlKey: true, altKey: true }), false)).toBe(true)
    })

    it('takes mod as ⌘ on a Mac and Ctrl elsewhere, refusing the other', () => {
        const chord = { key: 'k', mod: true }
        expect(matchesChord(chord, press('k', { metaKey: true }), true)).toBe(true)
        expect(matchesChord(chord, press('k', { ctrlKey: true }), true)).toBe(false)
        expect(matchesChord(chord, press('k', { ctrlKey: true }), false)).toBe(true)
        expect(matchesChord(chord, press('k', { metaKey: true }), false)).toBe(false)
        expect(matchesChord(chord, press('k'), false)).toBe(false)
    })

    it('takes Ctrl as well as ⌘ on a Mac for a chord that asks, never both, and Ctrl alone elsewhere', () => {
        const chord = { key: 'k', mod: true, alsoCtrl: true }
        expect(matchesChord(chord, press('k', { metaKey: true }), true)).toBe(true)
        expect(matchesChord(chord, press('k', { ctrlKey: true }), true)).toBe(true)
        expect(matchesChord(chord, press('k', { ctrlKey: true, metaKey: true }), true)).toBe(false)
        expect(matchesChord(chord, press('k'), true)).toBe(false)
        expect(matchesChord(chord, press('k', { ctrlKey: true }), false)).toBe(true)
        expect(matchesChord(chord, press('k', { metaKey: true }), false)).toBe(false)
    })

    it("leaves Ctrl on a Mac to the field's own editing for a chord that does not ask", () => {
        expect(matchesChord({ key: 'a', mod: true }, press('a', { ctrlKey: true }), true)).toBe(false)
        expect(matchesChord({ key: 'k', alsoCtrl: true }, press('k', { ctrlKey: true }), true)).toBe(false)
    })

    it('refuses a bare key pressed with a modifier', () => {
        expect(matchesChord({ key: 'k' }, press('k', { ctrlKey: true }), false)).toBe(false)
        expect(matchesChord({ key: 'k' }, press('k', { metaKey: true }), true)).toBe(false)
        expect(matchesChord({ key: 'k' }, press('k', { ctrlKey: true }), true)).toBe(false)
        expect(matchesChord({ key: '?' }, press('?', { metaKey: true, shiftKey: true }), true)).toBe(false)
    })

    it('matches Alt with a letter by its key where Option makes another character', () => {
        expect(matchesChord({ key: 'k', alt: true }, press('˚', { altKey: true, code: 'KeyK' }), true)).toBe(true)
        expect(matchesChord({ key: 'k', alt: true }, press('k', { altKey: true, code: 'KeyK' }), false)).toBe(true)
        expect(matchesChord({ key: 'k' }, press('˚', { altKey: true, code: 'KeyK' }), true)).toBe(false)
    })

    it('matches a letter by its key on a non-Latin layout', () => {
        expect(matchesChord({ key: 'k', mod: true }, press('л', { ctrlKey: true, code: 'KeyK' }), false)).toBe(true)
        expect(matchesChord({ key: 'k' }, press('л', { code: 'KeyR' }), false)).toBe(false)
    })

    it('matches named keys exactly, Space and Esc by either name', () => {
        expect(matchesChord({ key: 'Escape' }, press('Escape'), false)).toBe(true)
        expect(matchesChord({ key: 'Esc' }, press('Escape'), false)).toBe(true)
        expect(matchesChord({ key: 'Space' }, press(' '), false)).toBe(true)
        expect(matchesChord({ key: ' ' }, press(' ', { shiftKey: true }), false)).toBe(false)
        expect(matchesChord({ key: 'ArrowLeft' }, press('ArrowLeft', { shiftKey: true }), false)).toBe(false)
        expect(matchesChord({ key: 'ArrowLeft', shift: true }, press('ArrowLeft', { shiftKey: true }), false)).toBe(true)
        expect(matchesChord({ key: 'Enter', mod: true }, press('Enter', { metaKey: true }), true)).toBe(true)
    })
})

describe('pressPlace', () => {
    it('takes a text field as one typed in, for every key', () => {
        expect(pressPlace(element('INPUT'), 'k').field).toBe(true)
        expect(pressPlace(element('INPUT', { type: 'search' }), '/').field).toBe(true)
        expect(pressPlace(element('TEXTAREA'), 'k').field).toBe(true)
        expect(pressPlace(element('DIV', { contenteditable: 'true' }), 'k').field).toBe(true)
        expect(pressPlace({ ...element('DIV'), isContentEditable: true }, 'k').field).toBe(true)
        expect(pressPlace(element('DIV', { role: 'textbox' }), 'k').field).toBe(true)
    })

    it('leaves a letter to the app on a checkbox, a button or the page', () => {
        expect(pressPlace(element('INPUT', { type: 'checkbox' }), 'k').field).toBe(false)
        expect(pressPlace(element('BUTTON'), 'k').field).toBe(false)
        expect(pressPlace(element('BODY'), 'k').field).toBe(false)
        expect(pressPlace(null, 'k').field).toBe(false)
    })

    it("leaves Space and Enter to a focused button, and arrows to a slider's or a list's own", () => {
        expect(pressPlace(element('BUTTON'), ' ').field).toBe(true)
        expect(pressPlace(element('A'), 'Enter').field).toBe(true)
        expect(pressPlace(element('DIV', { role: 'switch' }), ' ').field).toBe(true)
        expect(pressPlace(element('DIV'), ' ').field).toBe(false)
        expect(pressPlace(element('INPUT', { type: 'range' }), 'ArrowLeft').field).toBe(true)
        expect(pressPlace(element('DIV', { role: 'slider' }), 'ArrowUp').field).toBe(true)
        expect(pressPlace(element('DIV', { role: 'option' }, element('DIV', { role: 'listbox' })), 'ArrowDown').field).toBe(true)
        expect(pressPlace(element('BUTTON'), 'ArrowLeft').field).toBe(false)
    })

    it('finds a dialog or a menu around the focus, or an overlay open anywhere', () => {
        const dialog = element('DIV', { role: 'dialog' }, element('BODY'))
        expect(pressPlace(element('BUTTON', {}, dialog), 'k').dialog).toBe(true)
        expect(pressPlace(element('DIV', { role: 'menuitem' }, element('DIV', { role: 'menu' })), 'k').dialog).toBe(true)
        expect(pressPlace(element('DIV', { 'aria-modal': 'true' }), 'k').dialog).toBe(true)
        expect(pressPlace(element('BUTTON', {}, element('MAIN')), 'k').dialog).toBe(false)
        expect(pressPlace(element('BODY'), 'k', true).dialog).toBe(true)
    })

    it('lists the scopes around the focus, innermost first', () => {
        const page = element('MAIN', { 'data-shortcut-scope': 'page' })
        const list = element('DIV', { 'data-shortcut-scope': 'list' }, page)
        expect(pressPlace(element('BUTTON', {}, list), 'j').scopes).toEqual(['list', 'page'])
    })
})

describe('heard', () => {
    it('is quiet while typing in a field, unless the binding asks', () => {
        const field = { ...open, field: true }
        expect(heard(bind({ key: 'k' }), {}, field)).toBe(false)
        expect(heard(bind({ key: 'k', mod: true, inFields: true }), {}, field)).toBe(true)
    })

    it("reaches inputs but not an editable region with inFields 'inputs'", () => {
        const rail = bind({ key: 'b', mod: true, inFields: 'inputs' })
        expect(heard(rail, {}, pressPlace(element('INPUT', { type: 'text' }), 'b'))).toBe(true)
        expect(heard(rail, {}, pressPlace(element('TEXTAREA'), 'b'))).toBe(true)
        expect(heard(rail, {}, pressPlace(element('SELECT'), 'b'))).toBe(true)
        expect(heard(rail, {}, pressPlace(element('DIV', { contenteditable: 'true' }), 'b'))).toBe(false)
        expect(heard(rail, {}, pressPlace(element('DIV', { role: 'textbox' }), 'b'))).toBe(false)
        expect(heard(rail, {}, pressPlace(element('BODY'), 'b'))).toBe(true)
    })

    it('reaches the fields a function picks', () => {
        const save = bind({
            key: 's',
            mod: true,
            inFields: (field) => field.getAttribute('data-editor') === null,
        })
        expect(heard(save, {}, pressPlace(element('INPUT', { type: 'text' }), 's'))).toBe(true)
        expect(heard(save, {}, pressPlace(element('DIV', { contenteditable: 'true', 'data-editor': '' }), 's'))).toBe(false)
        // A sequence is never heard in a field, whatever the function says.
        expect(heard({ ...save, next: 'd' }, {}, pressPlace(element('INPUT', { type: 'text' }), 's'))).toBe(false)
    })

    it('is quiet under a dialog, unless the binding asks or its scope holds the focus', () => {
        const dialog = { ...open, dialog: true }
        expect(heard(bind({ key: 'k' }), {}, dialog)).toBe(false)
        expect(heard(bind({ key: 'k', inDialogs: true }), {}, dialog)).toBe(true)
        expect(heard(bind({ key: 'k', scope: 'player' }), {}, { ...dialog, scopes: ['player'] })).toBe(true)
    })

    it('hears a scoped binding only inside its scope', () => {
        expect(heard(bind({ key: 'j', scope: 'list' }), {}, open)).toBe(false)
        expect(heard(bind({ key: 'j', scope: 'list' }), {}, { ...open, scopes: ['list'] })).toBe(true)
    })

    it("hears a held key's repeats only when asked, and nothing turned off", () => {
        expect(heard(bind({ key: 'j' }), { repeat: true }, open)).toBe(false)
        expect(heard(bind({ key: 'j', repeat: true }), { repeat: true }, open)).toBe(true)
        expect(heard(bind({ key: 'j', disabled: true }), {}, open)).toBe(false)
    })
})

describe('pickBinding', () => {
    it('takes the first that matches, a binding in a scope holding the focus before one outside', () => {
        const page = bind({ id: 'page', key: 'j' })
        const list = bind({ id: 'list', key: 'j', scope: 'list' })
        const row = bind({ id: 'row', key: 'j', scope: 'row' })
        expect(pickBinding([page, list], press('j'), open, false)?.id).toBe('page')
        expect(pickBinding([page, list], press('j'), { ...open, scopes: ['list'] }, false)?.id).toBe('list')
        expect(pickBinding([page, list, row], press('j'), { ...open, scopes: ['row', 'list'] }, false)?.id).toBe('row')
        expect(pickBinding([page], press('k'), open, false)).toBeUndefined()
    })
})

/** A keyboard event as the registry reads it, recording whether it was taken. */
function keydown(key: string, held: Partial<KeyPress> = {}, target: KeyTarget = element('BODY')) {
    const event = {
        ...press(key, held),
        target,
        repeat: false,
        isComposing: false,
        keyCode: 0,
        defaultPrevented: false,
        getModifierState: () => false,
        preventDefault() {
            event.defaultPrevented = true
        },
    }
    return event
}

describe('createShortcutRegistry', () => {
    it("runs a later screen's binding before an earlier one's, and the fallback's last", () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false })
        registry.set('shell', [bind({ id: 'shell', key: 'f', run: () => ran.push('shell') })], { fallback: true })
        registry.set('album', [bind({ id: 'album', key: 'f', run: () => ran.push('album') })])
        registry.set('video', [bind({ id: 'video', key: 'f', run: () => ran.push('video') })])
        const event = keydown('f')
        expect(registry.handle(event as unknown as KeyboardEvent)).toBe(true)
        expect(event.defaultPrevented).toBe(true)
        registry.remove('video')
        registry.handle(keydown('f') as unknown as KeyboardEvent)
        registry.remove('album')
        registry.handle(keydown('f') as unknown as KeyboardEvent)
        expect(ran).toEqual(['video', 'album', 'shell'])
    })

    it('lists screens in the order first set and the fallback last, keeping a place when set again', () => {
        const registry = createShortcutRegistry({ apple: false })
        registry.set('shell', [bind({ id: 'palette', key: 'k', mod: true })], { fallback: true })
        registry.set('first', [bind({ id: 'one', key: '1' })])
        registry.set('second', [bind({ id: 'two', key: '2' })])
        registry.set('first', [bind({ id: 'uno', key: '1' })])
        expect(registry.bindings().map((binding) => binding.id)).toEqual(['uno', 'two', 'palette'])
    })

    it('leaves a press another handler took, one being composed, and one in a field', () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false })
        registry.set('page', [bind({ key: 'k', run: () => ran.push('k') })])
        const taken = keydown('k')
        taken.defaultPrevented = true
        expect(registry.handle(taken as unknown as KeyboardEvent)).toBe(false)
        expect(registry.handle({ ...keydown('k'), isComposing: true } as unknown as KeyboardEvent)).toBe(false)
        expect(registry.handle(keydown('k', {}, element('INPUT')) as unknown as KeyboardEvent)).toBe(false)
        expect(ran).toEqual([])
    })

    it('stays quiet while an overlay is open', () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false })
        registry.set('page', [bind({ key: 'k', run: () => ran.push('k') })])
        const layer = openOverlay()
        registry.handle(keydown('k') as unknown as KeyboardEvent)
        layer.close()
        registry.handle(keydown('k') as unknown as KeyboardEvent)
        expect(ran).toEqual(['k'])
    })

    it('stays quiet while a surface of the app is open, and says it is covered', () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false })
        registry.set('page', [
            bind({ key: 'k', run: () => ran.push('k') }),
            bind({ id: 'over', key: 'j', inDialogs: true, run: () => ran.push('j') }),
        ])
        registry.surface('palette', true)
        expect(registry.covered()).toBe(true)
        registry.handle(keydown('k') as unknown as KeyboardEvent)
        registry.handle(keydown('j') as unknown as KeyboardEvent)
        registry.surface('palette', false)
        expect(registry.covered()).toBe(false)
        registry.handle(keydown('k') as unknown as KeyboardEvent)
        expect(ran).toEqual(['j', 'k'])
    })

    it('tells its listeners of every change', () => {
        const registry = createShortcutRegistry()
        let told = 0
        const stop = registry.subscribe(() => told++)
        registry.set('page', [bind({ key: 'k' })])
        registry.remove('page')
        registry.remove('page')
        stop()
        registry.set('page', [])
        expect(told).toBe(2)
    })
})

describe('key sequences', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    const handle = (registry: ReturnType<typeof createShortcutRegistry>, event: ReturnType<typeof keydown>) =>
        registry.handle(event as unknown as KeyboardEvent)

    const goKeys = (ran: string[]) => [
        bind({ id: 'go-dashboard', key: 'g', next: 'd', run: () => ran.push('dashboard') }),
        bind({ id: 'go-runs', key: 'g', next: { key: 'r' }, run: () => ran.push('runs') }),
    ]

    it('runs a sequence when its second key follows the first in time', () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false })
        registry.set('page', goKeys(ran))
        const first = keydown('g')
        expect(handle(registry, first)).toBe(true)
        expect(first.defaultPrevented).toBe(true)
        expect(ran).toEqual([])
        vi.advanceTimersByTime(900)
        const second = keydown('r')
        expect(handle(registry, second)).toBe(true)
        expect(second.defaultPrevented).toBe(true)
        expect(ran).toEqual(['runs'])
        // The wait is over: a second d alone is nothing.
        expect(handle(registry, keydown('d'))).toBe(false)
        expect(ran).toEqual(['runs'])
    })

    it('drops a pending first key once the time runs out', () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false, sequenceTimeout: 1000 })
        registry.set('page', goKeys(ran))
        handle(registry, keydown('g'))
        vi.advanceTimersByTime(1001)
        expect(handle(registry, keydown('d'))).toBe(false)
        expect(ran).toEqual([])
    })

    it('drops a pending first key on Escape, leaving Escape to others', () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false })
        registry.set('page', [...goKeys(ran), bind({ id: 'alone', key: 'g', run: () => ran.push('alone') })])
        handle(registry, keydown('g'))
        const escape = keydown('Escape')
        expect(handle(registry, escape)).toBe(false)
        expect(escape.defaultPrevented).toBe(false)
        expect(handle(registry, keydown('d'))).toBe(false)
        vi.advanceTimersByTime(2000)
        expect(ran).toEqual([])
    })

    it('drops a pending first key on any other key, which is then heard as itself', () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false })
        registry.set('page', [...goKeys(ran), bind({ id: 'log', key: 'l', run: () => ran.push('log') })])
        handle(registry, keydown('g'))
        expect(handle(registry, keydown('l'))).toBe(true)
        expect(handle(registry, keydown('d'))).toBe(false)
        expect(ran).toEqual(['log'])
    })

    it('waits through a modifier and a held first key', () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false })
        registry.set('page', [bind({ id: 'go-help', key: 'g', next: { key: '?' }, run: () => ran.push('help') })])
        handle(registry, keydown('g'))
        handle(registry, { ...keydown('g'), repeat: true })
        handle(registry, keydown('Shift', { shiftKey: true }))
        handle(registry, keydown('?', { shiftKey: true }))
        expect(ran).toEqual(['help'])
    })

    it('runs a single-key binding on the first key once no second key comes', () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false })
        registry.set('page', [...goKeys(ran), bind({ id: 'alone', key: 'g', run: () => ran.push('alone') })])
        handle(registry, keydown('g'))
        expect(ran).toEqual([])
        vi.advanceTimersByTime(1000)
        expect(ran).toEqual(['alone'])
        // A second key that ends no sequence runs it at once, then is heard itself.
        handle(registry, keydown('g'))
        handle(registry, keydown('x'))
        expect(ran).toEqual(['alone', 'alone'])
        // A sequence that does follow leaves it unrun.
        handle(registry, keydown('g'))
        handle(registry, keydown('d'))
        vi.advanceTimersByTime(2000)
        expect(ran).toEqual(['alone', 'alone', 'dashboard'])
    })

    it('runs a key that starts no sequence at once', () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false })
        registry.set('page', [...goKeys(ran), bind({ id: 'log', key: 'l', run: () => ran.push('log') })])
        handle(registry, keydown('l'))
        expect(ran).toEqual(['log'])
    })

    it('never starts a sequence while typing in a field, even one that asks for fields', () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false })
        registry.set('page', [bind({ id: 'go', key: 'g', next: 'd', inFields: true, run: () => ran.push('go') })])
        const field = element('INPUT')
        expect(handle(registry, keydown('g', {}, field))).toBe(false)
        expect(handle(registry, keydown('d', {}, field))).toBe(false)
        // Nor ends one there.
        handle(registry, keydown('g'))
        expect(handle(registry, keydown('d', {}, field))).toBe(false)
        expect(ran).toEqual([])
    })

    it('stays quiet under a dialog like any key', () => {
        const ran: string[] = []
        const registry = createShortcutRegistry({ apple: false })
        registry.set('page', goKeys(ran))
        registry.surface('palette', true)
        expect(handle(registry, keydown('g'))).toBe(false)
        registry.surface('palette', false)
    })
})

describe('overSearch', () => {
    it("tells a search's results, or what is inside them, from any other layer", () => {
        const results = { closest: (selector: string) => (selector === '[data-slot="search-results"]' ? ({} as Element) : null) }
        const dialog = { closest: () => null }
        expect(overSearch(results)).toBe(true)
        expect(overSearch(dialog)).toBe(false)
        expect(overSearch(null)).toBe(false)
    })
})

describe('paletteMayOpen', () => {
    const stubbed = (layers: Element[]) => {
        const doc = {
            querySelector: () => layers.at(0) ?? null,
            querySelectorAll: () => layers as unknown as NodeListOf<Element>,
        }
        vi.stubGlobal('document', doc)
    }
    const results = { closest: () => ({}) as Element } as unknown as Element
    const settings = { closest: () => null } as unknown as Element
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('opens where nothing stands over the page', () => {
        stubbed([])
        expect(paletteMayOpen(createShortcutRegistry())).toBe(true)
    })

    it("opens over a search's results alone, which it replaces", () => {
        stubbed([results])
        const registry = createShortcutRegistry()
        expect(registry.covered()).toBe(true)
        expect(registry.covered(true)).toBe(false)
        expect(paletteMayOpen(registry)).toBe(true)
    })

    it("stays closed over a dialog, a dialog under a search's results, or a surface of the app", () => {
        stubbed([settings])
        expect(paletteMayOpen(createShortcutRegistry())).toBe(false)
        stubbed([settings, results])
        expect(paletteMayOpen(createShortcutRegistry())).toBe(false)
        stubbed([results])
        const registry = createShortcutRegistry()
        registry.surface('shortcuts', true)
        expect(paletteMayOpen(registry)).toBe(false)
        const layer = openOverlay()
        registry.surface('shortcuts', false)
        expect(paletteMayOpen(registry)).toBe(false)
        layer.close()
    })

    it("asks the app's own rule in its place, with the layer on top", () => {
        stubbed([settings, results])
        const asked: (Element | null)[] = []
        expect(
            paletteMayOpen(createShortcutRegistry(), (over) => {
                asked.push(over)
                return overSearch(over)
            }),
        ).toBe(true)
        expect(asked).toEqual([results])
        stubbed([])
        expect(paletteMayOpen(createShortcutRegistry(), () => false)).toBe(false)
    })
})

describe('openLayers', () => {
    it('gives the open layers in the order they were opened, and none without a page', () => {
        const one = {} as Element
        const two = {} as Element
        expect(openLayers({ querySelectorAll: () => [one, two] as unknown as NodeListOf<Element> })).toEqual([one, two])
        expect(openLayers(undefined)).toEqual([])
    })
})

describe('layerOpen', () => {
    it('sees an open dialog or a menu by its role or slot, and nothing where none is', () => {
        const page = (found: string[]) => ({
            querySelector: (selector: string) => (selector.split(', ').some((one) => found.includes(one)) ? {} : null) as Element | null,
        })
        expect(layerOpen(page(['[data-slot="dropdown-menu-content"]:not([data-closed])']))).toBe(true)
        expect(layerOpen(page(['[data-slot="select-content"]:not([data-closed])']))).toBe(true)
        // A select's list stays in the page once it has opened; closed, it is no layer.
        expect(layerOpen(page(['[data-slot="select-content"]']))).toBe(false)
        expect(layerOpen(page(['[role="dialog"][data-open]:not([aria-modal="false"])']))).toBe(true)
        expect(layerOpen(page([]))).toBe(false)
        expect(layerOpen(undefined)).toBe(false)
    })
})

describe('topLayer', () => {
    it('gives the dialog or menu opened last, else the overlay on top, else null', () => {
        const settings = {} as Element
        const menu = {} as Element
        const drawer = {} as Element
        const page = (open: Element[]) => ({ querySelectorAll: () => open as unknown as NodeListOf<Element> })
        expect(topLayer(page([settings, menu]))).toBe(menu)
        expect(topLayer(page([]))).toBeNull()
        const layer = openOverlay(drawer)
        expect(topLayer(page([]))).toBe(drawer)
        expect(topLayer(page([settings]))).toBe(settings)
        layer.close()
    })
})

describe('shortcutGroups', () => {
    it("lists the labeled bindings with their keys, a screen's groups before General, then the groups given", () => {
        const groups = shortcutGroups(
            [
                bind({ id: 'palette', key: 'k', mod: true, label: 'Open the command palette' }),
                bind({ id: 'hidden', key: 'x' }),
                bind({ id: 'rerun', key: 'r', label: 'Run again', group: 'This run' }),
            ],
            [{ title: 'General', shortcuts: [{ id: 'close', action: 'Close a dialog', keys: ['Esc'] }] }],
            'General',
            true,
        )
        expect(groups).toEqual([
            { title: 'This run', shortcuts: [{ id: 'rerun', action: 'Run again', keys: ['R'] }] },
            {
                title: 'General',
                shortcuts: [
                    { id: 'palette', action: 'Open the command palette', keys: ['⌘', 'K'] },
                    { id: 'close', action: 'Close a dialog', keys: ['Esc'] },
                ],
            },
        ])
    })

    it("keeps an app's shortcut on the id of a bound one but other keys, both listed", () => {
        const groups = shortcutGroups(
            [bind({ id: 'search', key: '/', label: 'Search' })],
            [{ title: 'Runs', shortcuts: [{ id: 'search', action: "Search this screen's listing", keys: ['S'] }] }],
            'General',
            true,
        )
        expect(groups).toEqual([
            { title: 'General', shortcuts: [{ id: 'search', action: 'Search', keys: ['/'] }] },
            { title: 'Runs', shortcuts: [{ id: 'search', action: "Search this screen's listing", keys: ['S'] }] },
        ])
    })

    it("lists a bound shortcut the app names on the same id and keys once, in the app's words and group", () => {
        const groups = shortcutGroups(
            [
                bind({ id: 'palette', key: 'k', mod: true, label: 'Open the command palette' }),
                bind({ id: 'search', key: '/', label: 'Search' }),
            ],
            [{ title: 'Runs', shortcuts: [{ id: 'search', action: "Search this screen's listing", keys: ['/'] }] }],
            'General',
            true,
        )
        expect(groups).toEqual([
            { title: 'General', shortcuts: [{ id: 'palette', action: 'Open the command palette', keys: ['⌘', 'K'] }] },
            { title: 'Runs', shortcuts: [{ id: 'search', action: "Search this screen's listing", keys: ['/'] }] },
        ])
    })

    it('lists two bindings of one id and keys once, as two search fields bind the same /', () => {
        const groups = shortcutGroups(
            [bind({ id: 'search', key: '/', label: 'Search' }), bind({ id: 'search', key: '/', label: 'Search' })],
            [],
            'General',
            true,
        )
        expect(groups).toEqual([{ title: 'General', shortcuts: [{ id: 'search', action: 'Search', keys: ['/'] }] }])
    })
})

describe('shortcutGroups with sequences', () => {
    it('lists a sequence with its second keys apart, and as its own shortcut beside a single key of the same id', () => {
        const groups = shortcutGroups(
            [
                bind({ id: 'go-dashboard', key: 'g', next: 'd', label: 'Go to the dashboard', group: 'Go to' }),
                bind({ id: 'go-dashboard', key: 'd', label: 'Go to the dashboard', group: 'Go to' }),
            ],
            [],
            'General',
            false,
        )
        expect(groups).toEqual([
            {
                title: 'Go to',
                shortcuts: [
                    { id: 'go-dashboard', action: 'Go to the dashboard', keys: ['G'], next: ['D'] },
                    { id: 'go-dashboard', action: 'Go to the dashboard', keys: ['D'] },
                ],
            },
        ])
    })
})
