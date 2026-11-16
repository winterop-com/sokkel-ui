import { describe, expect, it } from 'vitest'

import { guardedPattern, repeatDepth, testedLength } from './patterns'

describe('how deeply a pattern nests its repeats', () => {
    it('counts a repeat inside a repeated group', () => {
        expect(repeatDepth('^[a-z][a-z0-9-]*$')).toBe(1)
        expect(repeatDepth('^(a+)+$')).toBe(2)
        expect(repeatDepth('^((a+)+)+$')).toBe(3)
        expect(repeatDepth('^([a-z0-9]+-)*[a-z0-9]+$')).toBe(2)
        expect(repeatDepth('^(a{2,})*$')).toBe(2)
    })

    it('counts no repeat for a fixed count, an optional atom, or a quantifier inside a class or after an escape', () => {
        expect(repeatDepth('^(\\d{3}\\.){3}$')).toBe(0)
        expect(repeatDepth('^(ab)?c$')).toBe(0)
        expect(repeatDepth('^[+*]{2}\\+$')).toBe(0)
        expect(repeatDepth('^(\\d{1,3}\\.){3}\\d{1,3}$')).toBe(1)
    })
})

describe('a guarded pattern', () => {
    it('tests a text of any length against a pattern that cannot run away', () => {
        const slug = guardedPattern('^[a-z][a-z0-9-]*$')
        expect(slug.test('nightly-export'.repeat(10))).toBe(true)
        expect(slug.test(`${'a'.repeat(200)}!`)).toBe(false)
    })

    it('passes a text past the length a nested repeat answers quickly at, and tests a shorter one', () => {
        const nested = guardedPattern('^(a+)+$')
        const longest = testedLength(2)
        expect(nested.test(`${'a'.repeat(longest - 1)}!`)).toBe(false)
        const started = performance.now()
        expect(nested.test(`${'a'.repeat(64)}!`)).toBe(true)
        expect(performance.now() - started).toBeLessThan(50)
    })
})
