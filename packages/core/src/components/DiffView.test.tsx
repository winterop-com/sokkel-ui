import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { DiffView, diffLines } from './DiffView'

/** The header's counts and words, as text. */
function header(before: string, after: string, words?: { unchanged: string }): string {
    const html = renderToStaticMarkup(<DiffView before={before} after={after} words={words} />)
    const head = /data-slot="code-block-header"[^>]*>(.*?)<pre/.exec(html)?.[1] ?? ''
    return head
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

describe('the header of a diff', () => {
    test('counts each side that changed', () => {
        expect(header('a\nb', 'a\nx\ny')).toBe('+2 -1')
    })

    test('leaves out a side with no changes', () => {
        expect(header('a\nb\nc', 'a')).toBe('-2')
        expect(header('a', 'a\nb')).toBe('+1')
    })

    test('says there are no changes when the two are the same', () => {
        expect(header('a\nb', 'a\nb')).toBe('No changes')
        expect(header('', '', { unchanged: 'Same' })).toBe('Same')
    })
})

describe('a line diff', () => {
    test('keeps shared lines and marks what changed', () => {
        expect(diffLines('a\nb\nc', 'a\nx\nc')).toEqual([
            { kind: 'same', text: 'a' },
            { kind: 'removed', text: 'b' },
            { kind: 'added', text: 'x' },
            { kind: 'same', text: 'c' },
        ])
    })

    test('reads an empty side as no lines', () => {
        expect(diffLines('', 'a')).toEqual([{ kind: 'added', text: 'a' }])
        expect(diffLines('a\n', '')).toEqual([{ kind: 'removed', text: 'a' }])
        expect(diffLines('same\n', 'same')).toEqual([{ kind: 'same', text: 'same' }])
    })

    test('finds an inserted step between unchanged lines', () => {
        const kinds = diffLines('fetch\nvalidate\nwrite', 'fetch\nclean\nvalidate\nwrite').map((line) => line.kind)
        expect(kinds).toEqual(['same', 'added', 'same', 'same'])
    })
})
