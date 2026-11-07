import { describe, expect, test } from 'vitest'

import { parseAnsi } from './ansi'

const E = '\u001b'

describe('terminal text with escape codes', () => {
    test('plain text is one unstyled run', () => {
        expect(parseAnsi('ready')).toEqual([{ text: 'ready', style: {} }])
    })

    test('a color holds until a reset', () => {
        expect(parseAnsi(`${E}[31merror${E}[0m done`)).toEqual([
            { text: 'error', style: { color: 'var(--terminal-critical)' } },
            { text: ' done', style: {} },
        ])
    })

    test('codes combine, and bright colors take their base color', () => {
        expect(parseAnsi(`${E}[1;92mok`)).toEqual([{ text: 'ok', style: { bold: true, color: 'var(--status-succeeded)' } }])
    })

    test('a partial reset clears only its own part', () => {
        expect(parseAnsi(`${E}[1;33mwarn${E}[22m tail`)).toEqual([
            { text: 'warn', style: { bold: true, color: 'var(--terminal-warning)' } },
            { text: ' tail', style: { color: 'var(--terminal-warning)' } },
        ])
    })

    test('escape sequences that are not styling are dropped', () => {
        expect(parseAnsi(`${E}[2Kline${E}[1A`)).toEqual([{ text: 'line', style: {} }])
    })
})

describe('output as screen lines', () => {
    test('a carriage return overwrites the line it is on', async () => {
        const { screenLines } = await import('./screen')
        expect(screenLines('download  10%\rdownload  55%\rdownload 100%\ndone')).toEqual(['download 100%', 'done'])
        expect(screenLines('abcdef\rXY')).toEqual(['XYcdef'])
    })

    test('a trailing partial line stays as the last line, and only the newest lines are kept', async () => {
        const { screenLines } = await import('./screen')
        expect(screenLines('one\ntwo\nthr')).toEqual(['one', 'two', 'thr'])
        expect(screenLines('a\nb\nc\nd', 2)).toEqual(['c', 'd'])
    })
})
