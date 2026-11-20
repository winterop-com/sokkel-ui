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

/**
 * Runs `read` over a text an eighth as long and as long as `LONG`, and fails when the longer takes far
 * more than eight times the shorter: in step with the length it is about eight, while a reading that
 * backtracks takes sixty-four and more. The two are run in turn, five times each, and the fastest of
 * each kept, so a busy machine slows both alike: comparing them, not a fixed time, holds under load.
 */
function quick(read: (n: number) => unknown): void {
    let short = Number.POSITIVE_INFINITY
    let long = Number.POSITIVE_INFINITY
    for (let run = 0; run < 5; run += 1) {
        let started = performance.now()
        read(LONG / 8)
        short = Math.min(short, performance.now() - started)
        started = performance.now()
        read(LONG)
        long = Math.min(long, performance.now() - started)
    }
    // Under a fifth of a second the growth is lost in the timer's and the collector's noise; a reading
    // that backtracks takes seconds at this length.
    if (long < 200) return
    expect(long / Math.max(short, 1)).toBeLessThan(24)
}

// A spike of load on a busy machine can slow one size and not the other; a reading that backtracks
// fails every try, so a few tries tell the two apart.
describe('text an app or a person gives is read in time in step with its length', { retry: 3 }, () => {
    it('reads numbers', () => {
        quick((n) => readNumber(`0${'0'.repeat(n)}x`))
        quick((n) => readScalar(`0${'0'.repeat(n)}x`, ['number']))
        expect(readNumber('4.')).toBe(4)
        expect(readNumber('.5e2')).toBe(50)
        expect(readNumber('1.2.3')).toBeNull()
        expect(readScalar('2.50', ['number'])).toBe(2.5)
    })

    it('reads times and dates with times', () => {
        quick((n) => readTime('.'.repeat(n) + '1'))
        quick((n) => readDateTime(`! !${'!,!'.repeat(n / 3)}\n`))
        quick((n) => readDateTime(`${'1'.repeat(n)} ${' '.repeat(n)}x\n`))
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
        quick((n) => fileName(`a${'-'.repeat(n)}b`, 'csv'))
        expect(fileName('  Nightly export: runs!  ', '.csv')).toBe('nightly-export-runs.csv')
        expect(fileName('---', 'csv')).toBe('file.csv')
    })

    it('reads mentions', () => {
        quick((n) => mentionsIn(`@a${'-'.repeat(n)}b`, [{ id: 'u-ada', handle: 'ada' }]))
        expect(
            mentionsIn('ask @ada-- and @grace._', [
                { id: 'u-ada', handle: 'ada' },
                { id: 'u-grace', handle: 'grace' },
            ]),
        ).toEqual(['u-ada', 'u-grace'])
    })

    it('blanks code spans', () => {
        quick((n) => withoutCode('`'.repeat(n) + 'a'))
        quick((n) => withoutCode('`a'.repeat(n / 2)))
        expect(withoutCode('see `[[Note]]` and [[Plan]]')).toBe('see            and [[Plan]]')
        expect(withoutCode('``a`b` c')).toBe('`   b` c')
        expect(withoutCode('a ``x`` y ```')).toBe('a       y ```')
        expect(withoutCode('one ` only')).toBe('one ` only')
    })

    it('reads headings and their links', () => {
        quick((n) => markdownHeadings(`## a${' '.repeat(n)}x`))
        quick((n) => markdownHeadings(`## ${'[\\'.repeat(n / 2)}`))
        quick((n) => markdownHeadings(`## ${'[a]'.repeat(n / 3)}`))
        expect(
            markdownHeadings('## Runs ##\n### [Plan](plan.md) and [more]\n## #\n####### Too deep\n#nospace', [2, 3]).map(
                (heading) => heading.label,
            ),
        ).toEqual(['Runs', 'Plan and [more]', ''])
        // The words are those Markdown draws: `## #` is an empty heading, and `[b](c)` a link in `[a ... d`.
        expect(markdownHeadings('##   Spaced   #  \n## [a [b](c) d', [2]).map((heading) => heading.label)).toEqual(['Spaced', '[a b d'])
    })

    it('widens tracks', () => {
        quick((n) => widenTrack(`minmax(${' '.repeat(n)}`, '1rem'))
        quick((n) => widenTrack(`${'0'.repeat(n)}x`, '1rem'))
        expect(widenTrack('minmax(12rem , 1fr)', '1rem')).toBe('minmax(calc(12rem + 1rem), 1fr)')
        expect(widenTrack('8rem', '1rem')).toBe('calc(8rem + 1rem)')
        expect(widenTrack('.5ch', '1rem')).toBe('calc(.5ch + 1rem)')
        expect(widenTrack('1.rem', '1rem')).toBe('1.rem')
        expect(widenTrack('1fr', '1rem')).toBe('1fr')
        expect(widenTrack('minmax(12rem', '1rem')).toBe('minmax(12rem')
    })

    it('reads addresses', () => {
        quick((n) => isAddress(`!@!.${'!.'.repeat(n / 2)}@`))
        quick((n) => parseAddresses(`a${' '.repeat(n)}`))
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
        quick((n) => requestAddress(`https://api.example.org${'/'.repeat(n)}x`, { method: 'GET', path: '/jobs', params: [] }))
        expect(requestAddress('https://api.example.org///', { method: 'GET', path: '/jobs', params: [] })).toBe(
            'https://api.example.org/jobs',
        )
    })

    it('holds the external mark to the last word', () => {
        quick((n) => renderToStaticMarkup(<TextLink href="https://example.org" external>{`${'!'.repeat(n)} x`}</TextLink>))
        const html = renderToStaticMarkup(
            <TextLink href="https://example.org" external>
                {'nightly export runs  '}
            </TextLink>,
        )
        expect(html).toContain('nightly export <span class="whitespace-nowrap">runs  ')
    })
})
