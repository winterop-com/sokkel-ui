import { describe, expect, test } from 'vitest'

import { codeProblem, normalizeCode } from './CodeField'

describe('a code', () => {
    test('is shaped as it is typed', () => {
        expect(normalizeCode('Nightly Export')).toBe('nightly-export')
        expect(normalizeCode('send_daily  digest')).toBe('send-daily-digest')
    })

    test('names the one thing to change', () => {
        expect(codeProblem('nightly-export')).toBeNull()
        expect(codeProblem('')).toBeNull()
        expect(codeProblem('2-export')).toBe('Start with a letter.')
        expect(codeProblem('-export')).toBe('Start with a letter.')
        expect(codeProblem('nightly.export')).toBe('Use only letters, digits and hyphens.')
    })
})
