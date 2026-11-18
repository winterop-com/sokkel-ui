import { describe, expect, it } from 'vitest'

import { compileMessage, formatMessage, messageArguments } from './message-format'

/** Intl writes a narrow no-break space in some groups and before some marks; compare them as plain spaces. */
const plain = (text: string) => text.replace(/[  ]/g, ' ')

describe('formatMessage', () => {
    it('fills named arguments and leaves plain text as it is', () => {
        expect(formatMessage('Move {row} to {place}', { row: 'nightly-export', place: 3 })).toBe('Move nightly-export to 3')
        expect(formatMessage('Nothing here.')).toBe('Nothing here.')
    })

    it('chooses a plural by the locale, with # as the number in that locale', () => {
        const rows = '{count, plural, one {# row} other {# rows}}'
        expect(formatMessage(rows, { count: 1 })).toBe('1 row')
        expect(formatMessage(rows, { count: 1234 })).toBe('1,234 rows')
        const rader = '{count, plural, one {# rad} other {# rader}}'
        expect(plain(formatMessage(rader, { count: 1234 }, 'nb-NO'))).toBe('1 234 rader')
        expect(formatMessage(rader, { count: 1 }, 'nb-NO')).toBe('1 rad')
        const files = '{count, plural, one {# plik} few {# pliki} many {# plików} other {# pliku}}'
        expect([1, 2, 5, 22, 25].map((count) => formatMessage(files, { count }, 'pl'))).toEqual([
            '1 plik',
            '2 pliki',
            '5 plików',
            '22 pliki',
            '25 plików',
        ])
    })

    it('takes an exact match before a category, and an offset off #', () => {
        const limit = '{limit, plural, =1 {one file} other {at most # files}}'
        expect(formatMessage(limit, { limit: 1 })).toBe('one file')
        expect(formatMessage(limit, { limit: 4 })).toBe('at most 4 files')
        const others = '{count, plural, offset:1 =0 {nobody} =1 {ada} one {ada and # other} other {ada and # others}}'
        expect([0, 1, 2, 3].map((count) => formatMessage(others, { count }))).toEqual([
            'nobody',
            'ada',
            'ada and 1 other',
            'ada and 2 others',
        ])
    })

    it('orders with selectordinal', () => {
        const nth = '{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}'
        expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map((n) => formatMessage(nth, { n }))).toEqual([
            '1st',
            '2nd',
            '3rd',
            '4th',
            '11th',
            '12th',
            '13th',
            '21st',
            '22nd',
            '23rd',
            '101st',
        ])
    })

    it('selects by the value written as text, a missing one as undefined', () => {
        const more = '{count, select, undefined {Load more} other {Load {count, number} more}}'
        expect(formatMessage(more, {})).toBe('Load more')
        expect(formatMessage(more, { count: 2500 })).toBe('Load 2,500 more')
        expect(formatMessage('{open, select, true {Hide} other {Show}}', { open: true })).toBe('Hide')
        expect(formatMessage('{open, select, true {Hide} other {Show}}', { open: false })).toBe('Show')
    })

    it('keeps # of the nearest plural inside a select within it', () => {
        const deleted = '{count, plural, one {Clip} other {# clips}} deleted{ripple, select, true {, the gap closed} other {}}'
        expect(formatMessage(deleted, { count: 1, ripple: false })).toBe('Clip deleted')
        expect(formatMessage(deleted, { count: 3, ripple: true })).toBe('3 clips deleted, the gap closed')
        expect(formatMessage('{count, plural, other {{ripple, select, true {# closed} other {# open}}}}', { count: 4, ripple: true })).toBe(
            '4 closed',
        )
    })

    it('formats numbers by their style or skeleton in the locale', () => {
        expect(formatMessage('{n, number}', { n: 1234.5 })).toBe('1,234.5')
        expect(formatMessage('{n, number}', { n: 1234.5 }, 'de-DE')).toBe('1.234,5')
        expect(formatMessage('{n, number, integer}', { n: 2.6 })).toBe('3')
        expect(formatMessage('{n, number, percent}', { n: 0.25 })).toBe('25%')
        expect(formatMessage('{n, number, ::compact-short}', { n: 12_300 })).toBe('12K')
        expect(formatMessage('{n, number, ::.00}', { n: 2 })).toBe('2.00')
    })

    it('formats dates and times by their style or skeleton in the locale', () => {
        const date = new Date(2026, 10, 17, 9, 5)
        expect(formatMessage('{at, date, ::MMMd}', { at: date })).toBe('Nov 17')
        expect(formatMessage('{at, date, ::EEE}', { at: date })).toBe('Tue')
        expect(formatMessage('{at, time, ::HHmm}', { at: date })).toBe('09:05')
        expect(formatMessage('{at, date, ::MMMMd}', { at: date }, 'nb-NO')).toBe('17. november')
        expect(formatMessage('{at, date, short}', { at: date }, 'en-US')).toBe('11/17/26')
    })

    it('reads quoted text as literal', () => {
        expect(formatMessage("Don't")).toBe("Don't")
        expect(formatMessage("It''s '{'braced'}'")).toBe("It's {braced}")
        expect(formatMessage("{count, plural, other {'#' is # here}}", { count: 2 })).toBe('# is 2 here')
    })

    it('refuses a message it cannot read', () => {
        expect(() => compileMessage('{count, plural, one {# row}}')).toThrow(SyntaxError)
        expect(() => compileMessage('{count, plural, other {# rows}')).toThrow(SyntaxError)
        expect(() => compileMessage('{count, spell}')).toThrow(SyntaxError)
        expect(() => compileMessage('a } b')).toThrow(SyntaxError)
    })

    it('names the arguments a message takes', () => {
        expect(messageArguments('{row} moved to {place, number} of {count, plural, other {#}}')).toEqual(['row', 'place', 'count'])
        expect(messageArguments('{a, select, x {{b}} other {{c}}}')).toEqual(['a', 'b', 'c'])
    })
})

describe('a number in a plain argument', () => {
    it('is written as the locale writes numbers, its thousands grouped, as ICU writes it', () => {
        expect(formatMessage('{count} runs', { count: 1200 })).toBe('1,200 runs')
        expect(plain(formatMessage('{count} runs', { count: 1200 }, 'nb-NO'))).toBe('1 200 runs')
        expect(formatMessage('{name}', { name: '1200' })).toBe('1200')
        expect(formatMessage('{year, number, ::group-off}', { year: 2026 })).toBe('2026')
    })
})
