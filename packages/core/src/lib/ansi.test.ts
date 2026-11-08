import { describe, expect, it } from 'vitest'

import { ansiColor, ansiCss, applySgr, parseAnsi, stripAnsi } from './ansi'

const E = '\u001b['

describe('parseAnsi', () => {
    it('reads plain text as one run in the default style', () => {
        expect(parseAnsi('nightly-export').segments).toEqual([{ text: 'nightly-export', style: {} }])
    })

    it('splits the text where a color starts and resets', () => {
        const { segments, style } = parseAnsi(`run ${E}32msucceeded${E}0m in 4s`)
        expect(segments).toEqual([
            { text: 'run ', style: {} },
            { text: 'succeeded', style: { color: 2 } },
            { text: ' in 4s', style: {} },
        ])
        expect(style).toEqual({})
    })

    it('reads bold, dim, italic, underline and their resets', () => {
        const { segments } = parseAnsi(`${E}1;3mA${E}22mB${E}2;4mC${E}23;24mD`)
        expect(segments.map((segment) => segment.style)).toEqual([
            { bold: true, italic: true },
            { italic: true },
            { italic: true, dim: true, underline: true },
            { dim: true },
        ])
    })

    it('reads bright, 256 and 24-bit colors for text and ground', () => {
        expect(applySgr({}, '91')).toEqual({ color: 9 })
        expect(applySgr({}, '38;5;208')).toEqual({ color: 208 })
        expect(applySgr({}, '38;2;10;20;30')).toEqual({ color: [10, 20, 30] })
        expect(applySgr({}, '48;5;21;1')).toEqual({ background: 21, bold: true })
        expect(applySgr({}, '38:2:1:2:3')).toEqual({ color: [1, 2, 3] })
        expect(applySgr({ color: 1, background: 2 }, '39;49')).toEqual({})
    })

    it('treats an empty sequence as a reset', () => {
        expect(parseAnsi(`${E}31mfailed${E}m ok`).segments[1]).toEqual({ text: ' ok', style: {} })
    })

    it('drops escapes that are not colors', () => {
        expect(stripAnsi(`${E}2K\r${E}1Afetch\u001b]0;tidevann\u0007 done${E}?25l`)).toBe('\rfetch done')
        expect(parseAnsi(`${E}2Kfetch`).segments).toEqual([{ text: 'fetch', style: {} }])
    })

    it('carries the style from one piece of output to the next', () => {
        const first = parseAnsi(`${E}33mwarn`)
        const second = parseAnsi(' still', first.style)
        expect(second.segments).toEqual([{ text: ' still', style: { color: 3 } }])
    })

    it('joins runs in the same style', () => {
        expect(parseAnsi(`a${E}0mb${E}31m${E}31mc`).segments).toEqual([
            { text: 'ab', style: {} },
            { text: 'c', style: { color: 1 } },
        ])
    })
})

describe('ansiColor', () => {
    it('draws the sixteen colors in tokens and the rest as their palette value', () => {
        expect(ansiColor(2)).toBe('var(--kind-green-ink)')
        expect(ansiColor(16)).toBe('rgb(0 0 0)')
        expect(ansiColor(196)).toBe('rgb(255 0 0)')
        expect(ansiColor(232)).toBe('rgb(8 8 8)')
        expect(ansiColor([1, 2, 3])).toBe('rgb(1 2 3)')
    })
})

describe('ansiCss', () => {
    it('sets the color, weight, slant and lines a style asks for', () => {
        expect(ansiCss({ color: 1, bold: true, italic: true, underline: true, strike: true })).toEqual({
            color: 'var(--status-failed-ink)',
            fontWeight: '600',
            fontStyle: 'italic',
            textDecorationLine: 'underline line-through',
        })
    })

    it('swaps text and ground when inverse', () => {
        expect(ansiCss({ color: 4, inverse: true })).toEqual({ color: 'var(--background)', backgroundColor: 'var(--kind-blue-ink)' })
    })
})
