import { describe, expect, test } from 'vitest'

import { codeProblem, normalizeCode } from './CodeField'

describe('a code', () => {
    test('is shaped as it is typed', () => {
        expect(normalizeCode('DHIS2 Play')).toBe('dhis2-play')
        expect(normalizeCode('org_unit  tree')).toBe('org-unit-tree')
    })

    test('names the one thing to change', () => {
        expect(codeProblem('dhis2-play')).toBeNull()
        expect(codeProblem('')).toBeNull()
        expect(codeProblem('2-play')).toBe('Start with a letter.')
        expect(codeProblem('-play')).toBe('Start with a letter.')
        expect(codeProblem('play.dhis2')).toBe('Use only letters, digits and hyphens.')
    })
})
