import { describe, expect, it } from 'vitest'

import { describedBy } from './Field'

describe('describedBy', () => {
    it('names the description, then the help', () => {
        expect(describedBy('level', { description: 'Read at the gauge.', help: 'Between 0 and 10.' })).toBe('level-description level-help')
    })

    it('names the one there is', () => {
        expect(describedBy('level', { help: 'Between 0 and 10.' })).toBe('level-help')
        expect(describedBy('level', { description: 'Read at the gauge.' })).toBe('level-description')
    })

    it('names nothing without either', () => {
        expect(describedBy('level', {})).toBeUndefined()
    })
})
