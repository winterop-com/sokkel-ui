import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { isAddress, parseAddresses } from '../components/AddressInput'
import { requestAddress } from '../components/ApiPlayground'
import { widenTrack } from '../components/DataTable'
import { markdownHeadings } from '../components/Markdown'
import { readScalar } from '../components/schema/issues'
import { TextLink } from '../components/TextLink'
import { readDateTime, readTime } from './dates'
import { fileName } from './download'
import { mentionsIn } from './mentions'
import { readNumber } from './numbers'
import { withoutCode } from './wiki-links'

/** Long enough that a reading which backtracks over it takes seconds, not milliseconds. */
const LONG = 100_000

/** Runs `read` and fails when it takes longer than a reading in step with the text's length would. */
function quick(read: () => unknown): void {
    const started = performance.now()
    read()
    expect(performance.now() - started).toBeLessThan(500)
}

describe('text an app or a person gives is read in time in step with its length', () => {
    it('reads numbers', () => {
        quick(() => readNumber(`0${'0'.repeat(LONG)}x`))
        quick(() => readScalar(`0${'0'.repeat(LONG)}x`, ['number']))
        expect(readNumber('4.')).toBe(4)
        expect(readNumber('.5e2')).toBe(50)
        expect(readNumber('1.2.3')).toBeNull()
        expect(readScalar('2.50', ['number'])).toBe(2.5)
    })

    it('reads times and dates with times', () => {
        quick(() => readTime('.'.repeat(LONG) + '1'))
        quick(() => readDateTime(`! !${'!,!'.repeat(LONG / 3)}\n`))
        quick(() => readDateTime(`${'1'.repeat(LONG)} ${' '.repeat(LONG)}x\n`))
        expect(readTime('9:30 pm')).toBe('21:30')
        expect(readTime('930p.m.')).toBe('21:30')
        expect(readTime('9.')).toBeNull()
        expect(readDateTime('2026-11-17T09:30')).toBe('2026-11-17T09:30')
        expect(readDateTime('2026-11-17 , 9:30 pm')).toBe('2026-11-17T21:30')
        expect(readDateTime('2026-11-17   09:30')).toBe('2026-11-17T09:30')
        expect(readDateTime('2026-11-17\n09:30')).toBe('2026-11-17T09:30')
        expect(readDateTime('2026-11-17 09:30\nx')).toBeNull()
        expect(readDateTime('2026-11-17')).toBeNull()
    })

    it('makes file names', () => {
        quick(() => fileName(`a${'-'.repeat(LONG)}b`, 'csv'))
        expect(fileName('  Nightly export: runs!  ', '.csv')).toBe('nightly-export-runs.csv')
        expect(fileName('---', 'csv')).toBe('file.csv')
    })

    it('reads mentions', () => {
        quick(() => mentionsIn(`@a${'-'.repeat(LONG)}b`, [{ id: 'u-ada', handle: 'ada' }]))
        expect(
            mentionsIn('ask @ada-- and @grace._', [
                { id: 'u-ada', handle: 'ada' },
                { id: 'u-grace', handle: 'grace' },
            ]),
        ).toEqual(['u-ada', 'u-grace'])
    })

    it('blanks code spans', () => {
        quick(() => withoutCode('`'.repeat(LONG) + 'a'))
        quick(() => withoutCode('`a'.repeat(LONG / 2)))
        expect(withoutCode('see `[[Note]]` and [[Plan]]')).toBe('see            and [[Plan]]')
        expect(withoutCode('``a`b` c')).toBe('`   b` c')
        expect(withoutCode('a ``x`` y ```')).toBe('a       y ```')
        expect(withoutCode('one ` only')).toBe('one ` only')
    })

    it('reads headings and their links', () => {
        quick(() => markdownHeadings(`## a${' '.repeat(LONG)}x`))
        quick(() => markdownHeadings(`## ${'[\\'.repeat(LONG / 2)}`))
        quick(() => markdownHeadings(`## ${'[a]'.repeat(LONG / 3)}`))
        expect(
            markdownHeadings('## Runs ##\n### [Plan](plan.md) and [more]\n## #\n####### Too deep\n#nospace', [2, 3]).map(
                (heading) => heading.label,
            ),
        ).toEqual(['Runs', 'Plan and [more]', ''])
        // The words are those Markdown draws: `## #` is an empty heading, and `[b](c)` a link in `[a ... d`.
        expect(markdownHeadings('##   Spaced   #  \n## [a [b](c) d', [2]).map((heading) => heading.label)).toEqual(['Spaced', '[a b d'])
    })

    it('widens tracks', () => {
        quick(() => widenTrack(`minmax(${' '.repeat(LONG)}`, '1rem'))
        quick(() => widenTrack(`${'0'.repeat(LONG)}x`, '1rem'))
        expect(widenTrack('minmax(12rem , 1fr)', '1rem')).toBe('minmax(calc(12rem + 1rem), 1fr)')
        expect(widenTrack('8rem', '1rem')).toBe('calc(8rem + 1rem)')
        expect(widenTrack('.5ch', '1rem')).toBe('calc(.5ch + 1rem)')
        expect(widenTrack('1.rem', '1rem')).toBe('1.rem')
        expect(widenTrack('1fr', '1rem')).toBe('1fr')
        expect(widenTrack('minmax(12rem', '1rem')).toBe('minmax(12rem')
    })

    it('reads addresses', () => {
        quick(() => isAddress(`!@!.${'!.'.repeat(LONG / 2)}@`))
        quick(() => parseAddresses(`a${' '.repeat(LONG)}`))
        expect(isAddress('ada@example.org')).toBe(true)
        expect(isAddress('ada@.org')).toBe(false)
        expect(isAddress('ada@example.')).toBe(false)
        expect(isAddress('a@b@example.org')).toBe(false)
        expect(parseAddresses('"Ada Berg"  <ada@example.org>; Grace<grace@example.org>; a"b <x@example.org>')).toEqual([
            { address: 'ada@example.org', name: 'Ada Berg' },
            { address: 'grace@example.org', name: 'Grace' },
            { address: 'a"b <x@example.org>' },
        ])
    })

    it('joins a base and a path', () => {
        quick(() => requestAddress(`https://api.example.org${'/'.repeat(LONG)}x`, { method: 'GET', path: '/jobs', params: [] }))
        expect(requestAddress('https://api.example.org///', { method: 'GET', path: '/jobs', params: [] })).toBe(
            'https://api.example.org/jobs',
        )
    })

    it('holds the external mark to the last word', () => {
        quick(() => renderToStaticMarkup(<TextLink href="https://example.org" external>{`${'!'.repeat(LONG)} x`}</TextLink>))
        const html = renderToStaticMarkup(
            <TextLink href="https://example.org" external>
                {'nightly export runs  '}
            </TextLink>,
        )
        expect(html).toContain('nightly export <span class="whitespace-nowrap">runs  ')
    })
})
