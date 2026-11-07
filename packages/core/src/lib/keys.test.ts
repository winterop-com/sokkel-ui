import { describe, expect, it } from 'vitest'

import { shortcutLabel } from './keys'

describe('shortcutLabel', () => {
    it('writes the command key as the device does', () => {
        expect(shortcutLabel('k', true)).toBe('⌘K')
        expect(shortcutLabel('k', false)).toBe('Ctrl K')
    })
})
