import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { DiffView, diffLines, foldDiff, type DiffLine } from './DiffView'

/** The header's counts and words, as text. */
function header(before: string, after: string, words?: { unchanged: string }): string {
    const html = renderToStaticMarkup(<DiffView title="a.yaml" before={before} after={after} words={words} />)
    const head = /data-slot="code-block-title"[^>]*>a\.yaml<\/div>(.*?)<pre/.exec(html)?.[1] ?? ''
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

    test('takes no row without a title: the counts and actions float at the top end', () => {
        const html = renderToStaticMarkup(<DiffView before="a" after={'a\nb'} actions={<button type="button">Copy</button>} />)
        expect(html).not.toContain('data-slot="code-block-header"')
        expect(html).toMatch(/data-slot="diff-view-counts"[^>]*>.*>\+1<.*Copy<\/button>.*<\/div><pre/)
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

/** A diff of `count` unchanged lines with one changed line at each of `changed`, as kinds and fold sizes. */
function shape(count: number, changed: number[], context?: number, opened?: Set<number>): string[] {
    const lines: DiffLine[] = Array.from({ length: count }, (_, index) => ({
        kind: changed.includes(index) ? 'added' : 'same',
        text: String(index),
    }))
    return foldDiff(lines, context, opened).map((row) =>
        row.kind === 'fold' ? `fold ${row.start}+${row.count}` : row.line.kind === 'same' ? row.line.text : `+${row.line.text}`,
    )
}

describe('folding a diff', () => {
    test('keeps three lines of context around a change and folds the rest', () => {
        expect(shape(20, [10])).toEqual(['fold 0+7', '7', '8', '9', '+10', '11', '12', '13', 'fold 14+6'])
    })

    test('folds the run between two changes and keeps the context of each', () => {
        expect(shape(20, [2, 15], 1)).toEqual(['0', '1', '+2', '3', 'fold 4+10', '14', '+15', '16', 'fold 17+3'])
    })

    test('draws a run of one line rather than folding it', () => {
        expect(shape(9, [0, 8], 3)).toEqual(['+0', '1', '2', '3', '4', '5', '6', '7', '+8'])
    })

    test('draws an opened run whole', () => {
        expect(shape(10, [9], 2, new Set([0]))).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '+9'])
    })

    test('folds every line when nothing changed, and none with an endless context', () => {
        expect(shape(5, [])).toEqual(['fold 0+5'])
        expect(shape(5, [], Infinity)).toEqual(['0', '1', '2', '3', '4'])
    })

    test('keeps only the changes with no context', () => {
        expect(shape(5, [2], 0)).toEqual(['fold 0+2', '+2', 'fold 3+2'])
    })
})

describe('a folded diff', () => {
    test('names each folded run in its words', () => {
        const long = Array.from({ length: 30 }, (_, index) => `line ${index}`).join('\n')
        const html = renderToStaticMarkup(<DiffView before={long} after={long.replace('line 15', 'line fifteen')} />)
        expect(html).toContain('12 unchanged lines')
        expect(html).toContain('11 unchanged lines')
        const told = renderToStaticMarkup(
            <DiffView
                before={long}
                after={long}
                words={{ folded: (count) => `${count} hidden` }}
                actions={<button type="button">Open</button>}
            />,
        )
        expect(told).toContain('30 hidden')
        expect(told).toContain('>Open</button>')
    })
})
