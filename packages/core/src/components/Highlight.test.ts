import { describe, expect, it } from 'vitest'

import { highlightParts } from './Highlight'

const marked = (text: string, ranges: { start: number; end: number }[]) =>
    highlightParts(text, ranges)
        .map((part) => (part.marked ? `[${part.text}]` : part.text))
        .join('')

describe('highlightParts', () => {
    it('marks one range', () => {
        expect(marked('nightly-export failed', [{ start: 15, end: 21 }])).toBe('nightly-export [failed]')
    })

    it('marks several ranges, in any order', () => {
        expect(
            marked('fetch, transform, upload', [
                { start: 18, end: 24 },
                { start: 0, end: 5 },
            ]),
        ).toBe('[fetch], transform, [upload]')
    })

    it('joins ranges that overlap or touch', () => {
        expect(
            marked('rebuild-index', [
                { start: 0, end: 4 },
                { start: 2, end: 7 },
                { start: 7, end: 8 },
            ]),
        ).toBe('[rebuild-]index')
    })

    it('holds ranges to the text and drops empty ones', () => {
        expect(
            marked('queued', [
                { start: -3, end: 2 },
                { start: 4, end: 40 },
                { start: 3, end: 3 },
                { start: 5, end: 1 },
            ]),
        ).toBe('[qu]eu[ed]')
    })

    it('leaves a text with no ranges whole', () => {
        expect(highlightParts('send-digest', [])).toEqual([{ text: 'send-digest', marked: false }])
        expect(highlightParts('', [{ start: 0, end: 2 }])).toEqual([])
    })
})
