import { describe, expect, it } from 'vitest'

import { mentionsOf, readWikiLink, tagsIn, wikiLinkQuery, wikiLinksIn, withoutCode } from './wiki-links'

describe('readWikiLink', () => {
    it('reads the name, the heading and the words shown', () => {
        expect(readWikiLink('Nightly export')).toEqual({ target: 'Nightly export' })
        expect(readWikiLink('Nightly export#Steps')).toEqual({ target: 'Nightly export', heading: 'Steps' })
        expect(readWikiLink(' Nightly export | the export ')).toEqual({ target: 'Nightly export', label: 'the export' })
        expect(readWikiLink('Nightly export#Steps|the steps')).toEqual({ target: 'Nightly export', heading: 'Steps', label: 'the steps' })
    })
})

describe('wikiLinksIn', () => {
    it('finds every link with where it stands', () => {
        const text = 'See [[Nightly export]] and [[harbor|the harbor project]].'
        expect(wikiLinksIn(text)).toEqual([
            { target: 'Nightly export', from: 4, to: 22 },
            { target: 'harbor', label: 'the harbor project', from: 27, to: 56 },
        ])
    })

    it('reads nothing inside code', () => {
        const text = ['Run `[[not a link]]` first.', '```', '[[nor this]]', '```', 'But [[this]].'].join('\n')
        expect(wikiLinksIn(text).map((link) => link.target)).toEqual(['this'])
    })

    it('leaves out a link to nowhere and a link across lines', () => {
        expect(wikiLinksIn('[[#Heading]] and [[two\nlines]]')).toEqual([])
    })
})

describe('withoutCode', () => {
    it('keeps every offset', () => {
        const text = 'a `b` c\n```js\nx\n```\nd'
        expect(withoutCode(text)).toHaveLength(text.length)
        expect(withoutCode(text)).toBe('a     c\n     \n \n   \nd')
    })

    it('closes a fence only with the same mark at least as long', () => {
        expect(withoutCode('````\n```\n[[x]]\n````\n[[y]]').trim()).toBe('[[y]]')
    })
})

describe('tagsIn', () => {
    it('finds each tag once, in order, without its #', () => {
        expect(tagsIn('#runbook for #harbor, and #runbook again (#on-call/weekly)')).toEqual(['runbook', 'harbor', 'on-call/weekly'])
    })

    it('takes no heading, number, anchor, code or link for a tag', () => {
        expect(tagsIn('# Heading\n## Steps\nIssue #12, see example.org/#anchor, `#code` and [[Note#Part]]')).toEqual([])
    })

    it('takes a tag at a line start', () => {
        expect(tagsIn('#meeting\nnotes')).toEqual(['meeting'])
    })
})

describe('mentionsOf', () => {
    it('finds a name written as whole words, in any case, outside links', () => {
        const text = 'The nightly export failed. [[Nightly export]] has the steps. Nightly exports differ.'
        expect(mentionsOf(text, 'Nightly export')).toEqual([{ from: 4, to: 18 }])
    })

    it('finds nothing for a blank name', () => {
        expect(mentionsOf('anything', ' ')).toEqual([])
    })
})

describe('wikiLinkQuery', () => {
    it('reads the name typed after [[ up to the caret', () => {
        expect(wikiLinkQuery('See [[Nigh', 10)).toEqual({ start: 6, query: 'Nigh' })
        expect(wikiLinkQuery('See [[', 6)).toEqual({ start: 6, query: '' })
    })

    it('reads none once the link is closed or on another line', () => {
        expect(wikiLinkQuery('See [[Nightly export]] now', 26)).toBeNull()
        expect(wikiLinkQuery('[[open\nnext', 11)).toBeNull()
    })
})
