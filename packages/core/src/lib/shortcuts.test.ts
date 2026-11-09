import { describe, expect, it } from 'vitest'

import type { KeyTarget } from './keys'
import { openOverlay } from './overlay'
import {
    createShortcutRegistry,
    heard,
    layerOpen,
    matchesChord,
    pickBinding,
    pressPlace,
    shortcutGroups,
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
            [
                { title: 'General', shortcuts: [{ id: 'close', action: 'Close a dialog', keys: ['Esc'] }] },
                { title: 'Editor', shortcuts: [{ id: 'palette', action: 'Twice', keys: ['⌘', 'K'] }] },
            ],
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
})
