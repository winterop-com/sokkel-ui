import { afterEach, describe, expect, it, vi } from 'vitest'

import { ARTWORK_HUES, ARTWORK_MOTIFS, COVER_INKS, coverFor, coverShapes, drawCover, seedHash, type CoverContext } from './cover-seed'

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

describe('coverShapes', () => {
    it('draws every motif as path data, square and wide, each shape seen', () => {
        for (const motif of ARTWORK_MOTIFS) {
            for (const width of [100, 160]) {
                const shapes = coverShapes(motif, width)
                expect(shapes.length).toBeGreaterThan(0)
                for (const shape of shapes) {
                    expect(shape.d).toMatch(/^M/)
                    expect(shape.opacity).toBeGreaterThan(0)
                    expect(shape.opacity).toBeLessThanOrEqual(1)
                }
            }
        }
    })

    it('centers a motif in a wide frame', () => {
        // The innermost ring, ten across, from five left of the middle.
        expect(coverShapes('rings', 160)[0].d).toMatch(/^M70 50a10 10 /)
        expect(coverShapes('rings', 100)[0].d).toMatch(/^M40 50a10 10 /)
    })
})

describe('drawCover', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    /** A 2D context that records what is drawn, and the paths made from SVG path data. */
    function recorder() {
        const calls: string[] = []
        const stops: [number, string][] = []
        const context = {
            fillStyle: '' as unknown,
            strokeStyle: '' as unknown,
            globalAlpha: 1,
            lineWidth: 1,
            lineCap: 'butt',
            save: () => calls.push('save'),
            restore: () => calls.push('restore'),
            scale: (x: number, y: number) => calls.push(`scale ${String(x)} ${String(y)}`),
            createLinearGradient: (x0: number, y0: number, x1: number, y1: number) => {
                calls.push(`gradient ${[x0, y0, x1, y1].join(' ')}`)
                return { addColorStop: (offset: number, color: string) => stops.push([offset, color]) }
            },
            fillRect: (x: number, y: number, w: number, h: number) => calls.push(`fillRect ${[x, y, w, h].join(' ')}`),
            fill: (path: { d: string }) => calls.push(`fill ${path.d} ${String(context.fillStyle)} ${String(context.globalAlpha)}`),
            stroke: (path: { d: string }) =>
                calls.push(`stroke ${path.d} ${String(context.strokeStyle)} ${String(context.lineWidth)} ${context.lineCap}`),
        }
        vi.stubGlobal(
            'Path2D',
            class {
                constructor(readonly d: string) {}
            },
        )
        return { context: context as unknown as CoverContext, calls, stops }
    }

    /** Each token as the page would resolve it, named so a test can read which was asked for. */
    const paint = (token: string) => token.replace(/^var\(--(.+)\)$/, '$1')

    it('fills the gradient from corner to corner in the hues the theme gives, scaled to the size asked', () => {
        const { context, calls, stops } = recorder()
        drawCover(context, { motif: 'bands', from: 'blue', to: 'pink' }, 512, paint)
        expect(calls.slice(0, 4)).toEqual(['save', 'scale 5.12 5.12', 'gradient 0 0 100 100', 'fillRect 0 0 100 100'])
        expect(stops).toEqual([
            [0, 'kind-blue'],
            [1, 'kind-pink'],
        ])
        expect(calls.at(-1)).toBe('restore')
    })

    it('draws the shapes the SVG draws, each in its ink', () => {
        const { context, calls } = recorder()
        drawCover(context, { motif: 'sun', from: 'amber', to: 'coral' }, 96, paint)
        const [sun, near, far] = coverShapes('sun', 100)
        expect(calls).toContain(`fill ${sun.d} terminal-foreground 0.5`)
        expect(calls).toContain(`fill ${near.d} terminal 0.18`)
        expect(calls).toContain(`fill ${far.d} terminal 0.16`)
        expect(COVER_INKS.light).toBe('var(--terminal-foreground)')
    })

    it('strokes the motifs drawn in lines, with round ends', () => {
        const { context, calls } = recorder()
        drawCover(context, { motif: 'wave', from: 'teal', to: 'violet' }, 128, paint)
        expect(calls.filter((call) => call.startsWith('stroke'))).toHaveLength(3)
        expect(calls.find((call) => call.startsWith('stroke'))).toMatch(/ terminal-foreground 3 round$/)
    })
})
