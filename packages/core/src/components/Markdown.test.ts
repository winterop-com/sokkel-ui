import { describe, expect, it } from 'vitest'

import { headingId, markdownHeadings } from './Markdown'

describe('markdownHeadings', () => {
    it('lists the second and third level headings outside fenced code', () => {
        const source = [
            '# Title',
            '## Getting `started`',
            '```sh',
            '## not a heading',
            '```',
            '### The [api](https://example.org)',
            '#### Deep',
        ].join('\n')
        expect(markdownHeadings(source)).toEqual([
            { id: 'getting-started', label: 'Getting started', level: 2 },
            { id: 'the-api', label: 'The api', level: 3 },
        ])
    })

    it('lists headings underlined with === and ---', () => {
        const source = ['Overview', '========', '', 'Setup', '-----', '', '- a list item', '---', '', '| a | b |', '---'].join('\n')
        // A row of one column over `---` is no table but a heading, as Markdown draws it; a list item is never one.
        expect(markdownHeadings(source, [1, 2])).toEqual([
            { id: 'overview', label: 'Overview', level: 1 },
            { id: 'setup', label: 'Setup', level: 2 },
            { id: '-a-b-', label: '| a | b |', level: 2 },
        ])
    })

    it('numbers a repeated heading after the first, at any level', () => {
        const source = ['## Example', '', '# Example', '', '### Example'].join('\n')
        expect(markdownHeadings(source).map((heading) => heading.id)).toEqual(['example', 'example-2'])
    })

    it('makes the same id as a heading of that text', () => {
        expect(headingId('Retries & back-off, in short')).toBe('retries-back-off-in-short')
    })
})
