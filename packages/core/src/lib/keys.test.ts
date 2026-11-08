import { describe, expect, it } from 'vitest'

import { keyLabels, shortcutLabel, typing } from './keys'

describe('shortcutLabel', () => {
    it('writes the command key as the device does', () => {
        expect(shortcutLabel('k', true)).toBe('⌘K')
        expect(shortcutLabel('k', false)).toBe('Ctrl K')
    })
})

describe('keyLabels', () => {
    it('writes the modifiers in the order each platform holds them', () => {
        expect(keyLabels({ key: 'k', mod: true, shift: true, alt: true }, true)).toEqual(['⌥', '⇧', '⌘', 'K'])
        expect(keyLabels({ key: 'k', mod: true, shift: true, alt: true }, false)).toEqual(['Ctrl', 'Alt', 'Shift', 'K'])
    })

    it('writes a character as itself and a named key by its short name', () => {
        expect(keyLabels({ key: '?' }, true)).toEqual(['?'])
        expect(keyLabels({ key: 'ø' }, false)).toEqual(['Ø'])
        expect(keyLabels({ key: ' ' }, true)).toEqual(['Space'])
        expect(keyLabels({ key: 'Space' }, false)).toEqual(['Space'])
        expect(keyLabels({ key: 'Escape' }, false)).toEqual(['Esc'])
        expect(keyLabels({ key: 'ArrowLeft' }, false)).toEqual(['←'])
        expect(keyLabels({ key: 'Enter', mod: true }, true)).toEqual(['⌘', '↩'])
        expect(keyLabels({ key: 'Enter', mod: true }, false)).toEqual(['Ctrl', 'Enter'])
        expect(keyLabels({ key: 'F2' }, false)).toEqual(['F2'])
    })
})

describe('typing', () => {
    const element = (tagName: string, attributes: Record<string, string> = {}) => ({
        tagName,
        getAttribute: (name: string) => attributes[name] ?? null,
    })

    it('takes text fields as typed in, and no other control', () => {
        expect(typing(element('INPUT') as unknown as EventTarget)).toBe(true)
        expect(typing(element('INPUT', { type: 'email' }) as unknown as EventTarget)).toBe(true)
        expect(typing(element('INPUT', { type: 'checkbox' }) as unknown as EventTarget)).toBe(false)
        expect(typing(element('INPUT', { type: 'range' }) as unknown as EventTarget)).toBe(false)
        expect(typing(element('SELECT') as unknown as EventTarget)).toBe(true)
        expect(typing(element('DIV', { contenteditable: 'false' }) as unknown as EventTarget)).toBe(false)
        expect(typing(null)).toBe(false)
    })
})
