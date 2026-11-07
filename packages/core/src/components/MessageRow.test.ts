import { describe, expect, test } from 'vitest'

import { excerpt } from './MessageRow'

describe('the line of text a row shows under a search', () => {
    const text = '12 runs succeeded, 2 failed and 1 was cancelled across harbor, juniper and larkspur.'

    test('is the whole text with no term, or with a match near its start', () => {
        expect(excerpt(text)).toBe(text)
        expect(excerpt(text, '  ')).toBe(text)
        expect(excerpt(text, 'runs')).toBe(text)
    })

    test('starts at a word a little before a match deep in the text', () => {
        expect(excerpt(text, 'Harbor')).toBe('…1 was cancelled across harbor, juniper and larkspur.')
    })

    test('is the whole text when the term is not in it', () => {
        expect(excerpt(text, 'margaret')).toBe(text)
    })
})
