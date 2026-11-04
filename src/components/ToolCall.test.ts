import { describe, expect, test } from 'vitest'

import { digest } from './ToolCall'

describe('a payload in one line', () => {
    test('names the first pairs of an object and marks the rest as elided', () => {
        expect(digest({ code: 'import-orders', limit: 20 })).toBe('code: "import-orders", limit: 20')
        expect(digest({ a: 1, b: 2, c: 3, d: 4 })).toBe('a: 1, b: 2, c: 3, …')
    })

    test('counts lists and elides nested objects', () => {
        expect(digest({ rows: [1, 2, 3], where: { state: 'failed' } })).toBe('rows: [3], where: {…}')
        expect(digest([1, 2])).toBe('[2 items]')
    })

    test('clips a long string and says nothing for no payload', () => {
        expect(digest({ query: 'x'.repeat(50) })).toBe(`query: "${'x'.repeat(31)}…"`)
        expect(digest(undefined)).toBe('')
        expect(digest(null)).toBe('null')
    })
})
