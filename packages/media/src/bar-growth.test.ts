import { describe, expect, it } from 'vitest'

import {
    GLOW_MOST,
    GROWS_FROM,
    LINE,
    TIER_ROOM,
    glow,
    grows,
    mix,
    panelGrowth,
    ramp,
    rowsGrowth,
    rowsHeightFor,
    stageGrowth,
    tierFor,
    type MediaBarLayout,
    type Tier,
} from './bar-growth'

const LAYOUTS: readonly MediaBarLayout[] = ['rows', 'panel', 'stage']
const DESKTOP = 1200
const PHONE = 390

/** Every height from the one line to the bar's usual most. */
const HEIGHTS = Array.from({ length: 360 - LINE + 1 }, (_, index) => LINE + index)

describe('ramp and mix', () => {
    it('ramp from 0 to 1 between two values and hold outside them', () => {
        expect(ramp(10, 20, 40)).toBe(0)
        expect(ramp(30, 20, 40)).toBe(0.5)
        expect(ramp(50, 20, 40)).toBe(1)
    })

    it('mix whole numbers between two ends', () => {
        expect(mix(18, 96, 0)).toBe(18)
        expect(mix(18, 96, 1)).toBe(96)
        expect(mix(10, 20, 0.25)).toBe(13)
    })
})

describe('the one line', () => {
    it('holds in every layout up to about 96 pixels, and each layout grows from its own height', () => {
        expect(GROWS_FROM).toEqual({ rows: 96, panel: 104, stage: 96 })
        for (const layout of LAYOUTS) {
            expect(grows(layout, LINE)).toBe(false)
            expect(grows(layout, GROWS_FROM[layout] - 1)).toBe(false)
            expect(grows(layout, GROWS_FROM[layout])).toBe(true)
        }
    })
})

describe('every layout', () => {
    const growths: Record<MediaBarLayout, (height: number, width: number) => { room: number; tier: Tier }> = {
        rows: (height, width) => ({ room: rowsGrowth(height, width).head, tier: rowsGrowth(height, width).tier }),
        panel: (height, width) => panelGrowth(height, width),
        stage: (height, width) => stageGrowth(height, width),
    }
    const ORDER: readonly Tier[] = ['line', 'pair', 'liner', 'poster']

    it('leaves the words a line of room from the height it grows at, at any width', () => {
        for (const layout of LAYOUTS) {
            for (const width of [PHONE, DESKTOP]) {
                const short = HEIGHTS.filter((height) => grows(layout, height) && growths[layout](height, width).room < TIER_ROOM.line)
                expect(short, `${layout} at ${String(width)} pixels`).toEqual([])
            }
        }
    })

    it('never says less as the bar is dragged taller, so the words do not flicker', () => {
        for (const layout of LAYOUTS) {
            for (const width of [PHONE, DESKTOP]) {
                const grown = HEIGHTS.filter((height) => grows(layout, height))
                const back = grown
                    .slice(1)
                    .filter(
                        (height) =>
                            ORDER.indexOf(growths[layout](height, width).tier) < ORDER.indexOf(growths[layout](height - 1, width).tier),
                    )
                expect(back, `${layout} at ${String(width)} pixels`).toEqual([])
            }
        }
    })

    it('gives the words more room as the bar grows', () => {
        for (const layout of ['panel', 'stage'] as const) {
            const grown = HEIGHTS.filter((height) => grows(layout, height))
            for (const height of grown.slice(1)) {
                expect(growths[layout](height, DESKTOP).room).toBeGreaterThan(growths[layout](height - 1, DESKTOP).room)
            }
        }
    })
})

describe('the visualizer', () => {
    it('shows from about 96 pixels, faint, and at its most from 220', () => {
        expect(glow(LINE)).toBe(0)
        expect(glow(88)).toBe(0)
        expect(glow(96)).toBeGreaterThan(0.05)
        expect(glow(220)).toBe(GLOW_MOST)
        expect(glow(360)).toBe(GLOW_MOST)
    })

    it('never fades as the bar grows', () => {
        for (const height of HEIGHTS.slice(1)) expect(glow(height)).toBeGreaterThanOrEqual(glow(height - 1))
    })

    it('stays faint enough to read over', () => {
        expect(Math.max(...HEIGHTS.map(glow))).toBeLessThanOrEqual(0.3)
    })
})

describe('the words', () => {
    it('say more as their room grows', () => {
        expect(tierFor(0)).toBe('line')
        expect(tierFor(TIER_ROOM.pair)).toBe('pair')
        expect(tierFor(TIER_ROOM.liner - 1)).toBe('pair')
        expect(tierFor(TIER_ROOM.liner)).toBe('liner')
        expect(tierFor(TIER_ROOM.poster)).toBe('poster')
    })

    it('stop at the most they are allowed', () => {
        expect(tierFor(500, 'pair')).toBe('pair')
        expect(tierFor(500, 'liner')).toBe('liner')
        expect(tierFor(30, 'liner')).toBe('line')
    })
})

describe('rows', () => {
    it('grow the waveform from 18 to 96 pixels with no jump', () => {
        expect(rowsGrowth(96, DESKTOP).wave).toBe(18)
        expect(rowsGrowth(260, DESKTOP).wave).toBe(96)
        expect(rowsGrowth(360, DESKTOP).wave).toBe(96)
        const grown = HEIGHTS.filter((height) => grows('rows', height))
        for (const height of grown.slice(1)) {
            const step = rowsGrowth(height, DESKTOP).wave - rowsGrowth(height - 1, DESKTOP).wave
            expect(step).toBeGreaterThanOrEqual(0)
            expect(step).toBeLessThanOrEqual(1)
        }
    })

    it('leave the top row room for the words and the transport from the start', () => {
        const start = rowsGrowth(GROWS_FROM.rows, DESKTOP)
        expect(start.head).toBeGreaterThanOrEqual(TIER_ROOM.pair)
        expect(start.corner).toBe(false)
        expect(rowsGrowth(200, DESKTOP).tier).toBe('liner')
        expect(rowsGrowth(300, DESKTOP).tier).toBe('poster')
        expect(rowsGrowth(300, DESKTOP).corner).toBe(true)
    })

    it('fill the bar exactly', () => {
        for (const height of HEIGHTS.filter((each) => grows('rows', each))) {
            const rows = rowsGrowth(height, DESKTOP)
            expect(2 * rows.pad + rows.head + rows.gap + rows.wave).toBe(height)
        }
    })

    it('keep a wide cover as tall as the rows, up to a quarter of the width', () => {
        expect(rowsGrowth(200, DESKTOP).cover).toBe(200 - 2 * rowsGrowth(200, DESKTOP).pad)
        expect(rowsGrowth(360, 700).cover).toBe(175)
    })

    it('put a small cover beside the words on a narrow bar, and stop the words at two lines', () => {
        const narrow = rowsGrowth(300, PHONE)
        expect(narrow.cover).toBe(72)
        expect(narrow.tier).toBe('pair')
    })

    it('drop the volume slider where the top row has no room for it', () => {
        expect(rowsGrowth(200, DESKTOP).compactVolume).toBe(false)
        expect(rowsGrowth(200, 700).compactVolume).toBe(true)
        expect(rowsGrowth(300, 700).tier).toBe('liner')
    })

    it('say the least height that draws a cover of a given size', () => {
        expect(rowsHeightFor(158)).toBe(182)
        for (const cover of [80, 120, 158, 200, 300]) {
            const height = rowsHeightFor(cover)
            expect(rowsGrowth(height, DESKTOP).cover).toBe(cover)
            expect(rowsGrowth(height - 1, DESKTOP).cover).toBeLessThan(cover)
        }
        expect(rowsHeightFor(20)).toBe(GROWS_FROM.rows)
        expect(rowsHeightFor(Number.NaN)).toBe(GROWS_FROM.rows)
    })
})

describe('the panel', () => {
    it('grows the waveform from 20 to 60 pixels', () => {
        expect(panelGrowth(GROWS_FROM.panel, DESKTOP).wave).toBe(20)
        expect(panelGrowth(300, DESKTOP).wave).toBe(60)
    })

    it('says more as the room over the waveform grows, the largest only on a wide bar', () => {
        expect(panelGrowth(GROWS_FROM.panel, DESKTOP).tier).toBe('line')
        expect(panelGrowth(150, DESKTOP).tier).toBe('pair')
        expect(panelGrowth(200, DESKTOP).tier).toBe('liner')
        expect(panelGrowth(300, DESKTOP).tier).toBe('poster')
        expect(panelGrowth(300, PHONE).tier).toBe('liner')
    })

    it('keeps a wide cover as tall as the bar, leaving the panel 360 pixels', () => {
        expect(panelGrowth(200, DESKTOP).cover).toBe(200)
        expect(panelGrowth(360, 700).cover).toBe(340)
        expect(panelGrowth(360, 700).compactVolume).toBe(true)
        expect(panelGrowth(300, DESKTOP).compactVolume).toBe(false)
    })

    it('puts a cover beside the words on a narrow bar once there is room for one', () => {
        expect(panelGrowth(GROWS_FROM.panel, PHONE).cover).toBe(0)
        expect(panelGrowth(200, PHONE).cover).toBeGreaterThanOrEqual(44)
        expect(panelGrowth(360, PHONE).cover).toBe(112)
    })
})

describe('the stage', () => {
    it('grows the waveform from 18 to 56 pixels', () => {
        expect(stageGrowth(GROWS_FROM.stage, DESKTOP).wave).toBe(18)
        expect(stageGrowth(300, DESKTOP).wave).toBe(56)
    })

    it('stays centered, its sides as wide as the cover and never narrower than the volume', () => {
        const low = stageGrowth(120, DESKTOP)
        expect(low.side).toBe(176)
        expect(low.cover).toBe(120 - 2 * low.pad)
        const high = stageGrowth(300, DESKTOP)
        expect(high.side).toBe(high.cover)
        expect(high.compactVolume).toBe(false)
    })

    it('keeps 360 pixels for the stage on a bar just wide enough for its columns', () => {
        const tight = stageGrowth(300, 700)
        expect(700 - 2 * tight.pad - 2 * 24 - 2 * tight.side).toBeGreaterThanOrEqual(360)
        expect(tight.cover).toBeLessThanOrEqual(tight.side)
        expect(tight.compactVolume).toBe(true)
    })

    it('has no side columns on a narrow bar', () => {
        expect(stageGrowth(200, PHONE).side).toBe(0)
        expect(stageGrowth(200, PHONE).cover).toBe(0)
    })

    it('stands the visualizer on the waveform', () => {
        const stage = stageGrowth(200, DESKTOP)
        expect(stage.under).toBe(stage.pad + 36 + 2 * stage.gap + stage.wave)
    })
})
