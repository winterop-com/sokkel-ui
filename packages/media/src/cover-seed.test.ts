import { describe, expect, it } from 'vitest'

import { ARTWORK_HUES, ARTWORK_MOTIFS, coverFor, seedHash } from './cover-seed'

const ids = (count: number) => Array.from({ length: count }, (_, index) => `album-${String(index)}`)

describe('seedHash', () => {
    it('gives the same number for the same seed', () => {
        expect(seedHash('harbor-2025')).toBe(seedHash('harbor-2025'))
    })

    it('gives another number for a seed one character apart', () => {
        expect(seedHash('album-17')).not.toBe(seedHash('album-18'))
        expect(seedHash('a')).not.toBe(seedHash('b'))
    })

    it('is an unsigned 32-bit integer for any seed', () => {
        for (const seed of ['', 'a', 'album-1138', 'Ærø og Tønsberg', '\u{1d11e} clef', 'x'.repeat(1000)]) {
            const hash = seedHash(seed)
            expect(Number.isInteger(hash)).toBe(true)
            expect(hash).toBeGreaterThanOrEqual(0)
            expect(hash).toBeLessThanOrEqual(0xffffffff)
        }
    })

    it('is pinned, so a record wears the same cover after an upgrade', () => {
        expect([seedHash(''), seedHash('juniper'), seedHash('nightly-export')]).toEqual([2872998923, 1595389470, 2763624205])
    })
})

describe('coverFor', () => {
    it('is the same cover every time for one seed', () => {
        expect(coverFor('larkspur')).toEqual(coverFor('larkspur'))
    })

    it('chooses a motif and two hues it can draw', () => {
        for (const seed of ids(300)) {
            const cover = coverFor(seed)
            expect(ARTWORK_MOTIFS).toContain(cover.motif)
            expect(Object.keys(ARTWORK_HUES)).toContain(cover.from)
            expect(Object.keys(ARTWORK_HUES)).toContain(cover.to)
        }
    })

    it('never paints a gradient from a hue to itself', () => {
        for (const seed of ids(500)) {
            const cover = coverFor(seed)
            expect(cover.to).not.toBe(cover.from)
        }
    })

    it('spreads a library over every motif and every hue, in both places', () => {
        const motifs = new Set<string>()
        const froms = new Set<string>()
        const tos = new Set<string>()
        for (const seed of ids(400)) {
            const cover = coverFor(seed)
            motifs.add(cover.motif)
            froms.add(cover.from)
            tos.add(cover.to)
        }
        expect(motifs.size).toBe(ARTWORK_MOTIFS.length)
        expect(froms.size).toBe(Object.keys(ARTWORK_HUES).length)
        expect(tos.size).toBe(Object.keys(ARTWORK_HUES).length)
    })

    it('gives a grid of neighbors mostly different covers', () => {
        const covers = ids(24).map((seed) => {
            const cover = coverFor(seed)
            return `${cover.motif}/${cover.from}/${cover.to}`
        })
        expect(new Set(covers).size).toBeGreaterThanOrEqual(20)
    })

    it('draws an empty seed rather than refusing it', () => {
        expect(ARTWORK_MOTIFS).toContain(coverFor('').motif)
    })
})
