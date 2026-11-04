import { describe, expect, test } from 'vitest'

import { diffLines } from './DiffView'

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
