import { describe, expect, it } from 'vitest'

import {
    ATTACK,
    MUSIC_RANGE,
    RELEASE,
    areaPoints,
    autoBands,
    bandLevels,
    barLayout,
    holdPeak,
    isQuiet,
    MIRROR_SHARE,
    MOST_GAIN,
    SOUND_RAMPS,
    TRAIL_FADE,
    mirrorBase,
    rampAlong,
    rampIndex,
    rampStops,
    rampSteps,
    resample,
    ringRadii,
    ringSpokes,
    settle,
    shapeLevel,
    stopColor,
    trailFade,
    triggerAt,
    waveGain,
    wavePoints,
} from './sound'

describe('shapeLevel', () => {
    it('draws silence as nothing and full scale as at most full height', () => {
        expect(shapeLevel(0, 0)).toBe(0)
        expect(shapeLevel(Number.NaN, 0.5)).toBe(0)
        expect(shapeLevel(255, 1)).toBe(1)
        expect(shapeLevel(400, 0)).toBeLessThanOrEqual(1)
    })

    it('sinks a quiet byte further than a loud one', () => {
        const quiet = shapeLevel(64, 0.5) / (64 / 255)
        const loud = shapeLevel(230, 0.5) / (230 / 255)
        expect(quiet).toBeLessThan(loud)
    })

    it('weighs the high bands above the low ones', () => {
        expect(shapeLevel(128, 1)).toBeGreaterThan(shapeLevel(128, 0))
    })

    it('rises with the byte', () => {
        let previous = -1
        for (let byte = 0; byte <= 255; byte += 15) {
            const level = shapeLevel(byte, 0.3)
            expect(level).toBeGreaterThanOrEqual(previous)
            previous = level
        }
    })
})

describe('bandLevels', () => {
    const SAMPLE_RATE = 48_000
    const BINS = 1024
    /** The bin a frequency falls in, at this rate and size. */
    const binOf = (hz: number) => Math.floor(hz / (SAMPLE_RATE / 2 / BINS))

    it('gives as many bands as asked, each between 0 and 1', () => {
        const bins = Uint8Array.from({ length: BINS }, (_, index) => (index * 37) % 256)
        const levels = bandLevels(bins, 48, SAMPLE_RATE)
        expect(levels).toHaveLength(48)
        for (const level of levels) {
            expect(level).toBeGreaterThanOrEqual(0)
            expect(level).toBeLessThanOrEqual(1)
        }
    })

    it('reads silence as a row of nothing', () => {
        expect(bandLevels(new Uint8Array(BINS), 32, SAMPLE_RATE).every((level) => level === 0)).toBe(true)
    })

    it('answers nothing for no bins, no bands or no rate', () => {
        expect(bandLevels(new Uint8Array(0), 32, SAMPLE_RATE)).toEqual([])
        expect(bandLevels(new Uint8Array(BINS), 0, SAMPLE_RATE)).toEqual([])
        expect(bandLevels(new Uint8Array(BINS), 32, 0)).toEqual([])
    })

    it('puts a low tone in the first bands and a high one in the last', () => {
        const low = new Uint8Array(BINS)
        low[binOf(60)] = 255
        const high = new Uint8Array(BINS)
        high[binOf(10_000)] = 255
        const lowLevels = bandLevels(low, 32, SAMPLE_RATE)
        const highLevels = bandLevels(high, 32, SAMPLE_RATE)
        const loudest = (levels: number[]) => levels.indexOf(Math.max(...levels))
        expect(loudest(lowLevels)).toBeLessThan(6)
        expect(loudest(highLevels)).toBeGreaterThan(26)
    })

    it('spaces the bands by pitch, so each octave of music gets about the same number of bands', () => {
        const octaves = Math.log2(MUSIC_RANGE.high / MUSIC_RANGE.low)
        const perOctave = 64 / octaves
        // The octave from 440 to 880 Hz, lit alone, lights about one octave's share of the bands.
        const bins = new Uint8Array(BINS)
        for (let bin = binOf(440) + 1; bin < binOf(880); bin += 1) bins[bin] = 255
        const lit = bandLevels(bins, 64, SAMPLE_RATE).filter((level) => level > 0.5).length
        expect(lit).toBeGreaterThanOrEqual(Math.floor(perOctave) - 1)
        expect(lit).toBeLessThanOrEqual(Math.ceil(perOctave) + 1)
    })

    it('reads between bins where a band is narrower than one, so the low bands are not a staircase', () => {
        const bins = Uint8Array.from({ length: BINS }, (_, index) => Math.max(0, 255 - index * 20))
        const levels = bandLevels(bins, 96, SAMPLE_RATE)
        const lowest = levels.slice(0, 8)
        expect(new Set(lowest.map((level) => level.toFixed(4))).size).toBe(lowest.length)
    })
})

describe('resample', () => {
    it('keeps levels that already fit', () => {
        expect(resample([0.1, 0.5, 0.9], 3)).toEqual([0.1, 0.5, 0.9])
    })

    it('stretches by reading between neighbors, keeping both ends', () => {
        expect(resample([0, 1], 5)).toEqual([0, 0.25, 0.5, 0.75, 1])
    })

    it('squeezes onto fewer bands', () => {
        expect(resample([0, 0.5, 1, 0.5, 0], 3)).toEqual([0, 1, 0])
    })

    it('fills from a single level and answers nothing for nothing', () => {
        expect(resample([0.4], 3)).toEqual([0.4, 0.4, 0.4])
        expect(resample([], 3)).toEqual([])
        expect(resample([0.4], 0)).toEqual([])
    })
})

describe('settle', () => {
    it('rises fast toward a louder reading and falls slowly toward a quieter one', () => {
        const [risen] = settle([0], [1])
        const [fallen] = settle([1], [0])
        expect(risen).toBeCloseTo(ATTACK)
        expect(fallen).toBeCloseTo(1 - RELEASE)
        expect(risen).toBeGreaterThan(1 - (fallen ?? 0))
    })

    it('moves as far in one long frame as in the short frames it spans', () => {
        let short = [0]
        for (let frame = 0; frame < 4; frame += 1) short = settle(short, [1], 1000 / 60)
        const [long] = settle([0], [1], (4 * 1000) / 60)
        expect(long).toBeCloseTo(short[0] ?? 0)
    })

    it('starts a band the last frame did not have from the floor', () => {
        expect(settle([], [1, 1])).toEqual([ATTACK, ATTACK])
        expect(settle([1, 1, 1], [1])).toEqual([1])
    })

    it('comes to rest after the sound stops', () => {
        let levels = [1, 0.6, 0.3]
        let frames = 0
        while (!isQuiet(levels) && frames < 600) {
            levels = settle(levels, [0, 0, 0])
            frames += 1
        }
        expect(frames).toBeLessThan(60)
    })
})

describe('isQuiet', () => {
    it('holds for nothing and for values within the threshold, either side', () => {
        expect(isQuiet([])).toBe(true)
        expect(isQuiet([0, 0.001, -0.002])).toBe(true)
        expect(isQuiet([0, -0.2])).toBe(false)
        expect(isQuiet(new Float32Array([0, 0.3]))).toBe(false)
    })
})

describe('barLayout', () => {
    it('fills the width with bars and gaps', () => {
        const { bar, gap, offset } = barLayout(400, 32)
        expect(offset).toBe(0)
        expect(bar * 32 + gap * 31).toBeCloseTo(400)
        expect(gap).toBeGreaterThanOrEqual(1)
    })

    it('keeps bars to the widest asked and centers the row', () => {
        const { bar, gap, offset } = barLayout(800, 10, 12)
        expect(bar).toBe(12)
        expect(offset * 2 + bar * 10 + gap * 9).toBeCloseTo(800)
        expect(offset).toBeGreaterThan(0)
    })

    it('drops the gap where bars are too thin for one', () => {
        expect(barLayout(100, 60).gap).toBe(0)
    })

    it('answers nothing for no bars or no room', () => {
        expect(barLayout(0, 10)).toEqual({ bar: 0, gap: 0, offset: 0 })
        expect(barLayout(100, 0)).toEqual({ bar: 0, gap: 0, offset: 0 })
    })
})

describe('autoBands', () => {
    it('grows with the width and stays within bounds', () => {
        expect(autoBands('spectrum', 1440, 300)).toBeGreaterThan(autoBands('spectrum', 390, 300))
        expect(autoBands('spectrum', 20, 300)).toBe(8)
        expect(autoBands('spectrum', 10_000, 300)).toBe(192)
        expect(autoBands('area', 1440, 300)).toBeLessThan(autoBands('spectrum', 1440, 300))
    })

    it('fits a ring to its circle, and gives a wave none', () => {
        expect(autoBands('ring', 1440, 200)).toBe(autoBands('ring', 200, 200))
        expect(autoBands('ring', 600, 600)).toBeGreaterThan(autoBands('ring', 200, 200))
        expect(autoBands('wave', 1440, 300)).toBe(0)
    })
})

describe('areaPoints', () => {
    it('puts a point at each band middle, standing up from the base by its level', () => {
        expect(areaPoints([0, 1], 200, 100, 80)).toEqual([
            { x: 50, y: 100 },
            { x: 150, y: 20 },
        ])
    })

    it('holds a level outside 0 to 1 to the range', () => {
        expect(areaPoints([-1, 2], 100, 50, 50).map((point) => point.y)).toEqual([50, 0])
    })
})

describe('triggerAt', () => {
    it('starts at the first rise through zero', () => {
        const samples = [0.5, 0.2, -0.3, -0.1, 0.2, 0.6, -0.2, 0.1]
        expect(triggerAt(samples, 4)).toBe(4)
    })

    it('lands on the same phase of a tone wherever the frame began', () => {
        const tone = (shift: number) => Array.from({ length: 400 }, (_, index) => Math.sin((index + shift) / 7))
        const first = tone(0)
        const later = tone(11)
        const a = triggerAt(first, 200)
        const b = triggerAt(later, 200)
        expect(first[a]).toBeCloseTo(later[b] ?? Number.NaN, 1)
        expect(first[a + 3]).toBeCloseTo(later[b + 3] ?? Number.NaN, 1)
    })

    it('starts at the beginning when the signal never crosses', () => {
        expect(triggerAt([0.1, 0.2, 0.3], 2)).toBe(0)
        expect(triggerAt([], 2)).toBe(0)
    })
})

describe('holdPeak and waveGain', () => {
    it('catch up at once with a louder sample, either side of the middle', () => {
        expect(holdPeak(0.1, [0.2, -0.6, 0.3])).toBe(0.6)
    })

    it('fall back slowly after a loud moment, and faster over a longer frame', () => {
        const next = holdPeak(0.8, [0.1])
        expect(next).toBeLessThan(0.8)
        expect(next).toBeGreaterThan(0.75)
        expect(holdPeak(0.8, [0.1], 500)).toBeLessThan(next)
    })

    it('enlarge a quiet wave, up to a limit, and keep a loud one clear of the edges', () => {
        expect(waveGain(0.3)).toBeCloseTo(3)
        expect(waveGain(0.01)).toBe(MOST_GAIN)
        expect(waveGain(1)).toBeLessThan(1)
        expect(waveGain(0)).toBe(1)
    })
})

describe('wavePoints', () => {
    it('lays the samples across the width about the middle', () => {
        expect(wavePoints([0, 1, -1], 100, 50)).toEqual([
            { x: 0, y: 25 },
            { x: 50, y: 0 },
            { x: 100, y: 50 },
        ])
    })

    it('draws too few samples as a flat line, and clips beyond full scale', () => {
        expect(wavePoints([], 100, 50)).toEqual([
            { x: 0, y: 25 },
            { x: 100, y: 25 },
        ])
        expect(wavePoints([3, -3], 10, 10).map((point) => point.y)).toEqual([0, 10])
    })
})

describe('ringSpokes', () => {
    it('lays the bands down both sides, mirrored about the upright', () => {
        const spokes = ringSpokes([0.5, 1], { x: 100, y: 100 }, 40, 20)
        expect(spokes).toHaveLength(4)
        const [right, , left] = spokes
        expect(right?.from.x).toBeGreaterThan(100)
        expect(left?.from.x).toBeLessThan(100)
        expect(right?.from.y).toBeCloseTo(left?.from.y ?? Number.NaN)
        expect((right?.from.x ?? 0) - 100).toBeCloseTo(100 - (left?.from.x ?? 0))
    })

    it('stands each spoke out from the circle by its level, at least the least asked', () => {
        const center = { x: 0, y: 0 }
        const length = (spoke: { from: { x: number; y: number }; to: { x: number; y: number } }) =>
            Math.hypot(spoke.to.x - spoke.from.x, spoke.to.y - spoke.from.y)
        const [quiet, loud] = ringSpokes([0, 1], center, 50, 30, 2)
        expect(Math.hypot(quiet?.from.x ?? 0, quiet?.from.y ?? 0)).toBeCloseTo(50)
        expect(length(quiet!)).toBeCloseTo(2)
        expect(length(loud!)).toBeCloseTo(30)
    })

    it('fits the ring in the shorter side of its box', () => {
        const { inner, reach } = ringRadii(800, 200)
        expect(inner + reach).toBeLessThanOrEqual(100)
    })
})

describe('ramps', () => {
    it('reads a named ramp as its tokens and stops as given', () => {
        expect(rampStops('heat')).toEqual(SOUND_RAMPS.heat)
        expect(rampStops(['warning', 'oklch(0.6 0.2 30)'])).toEqual(['warning', 'oklch(0.6 0.2 30)'])
    })

    it('reads a bare name as a token, falling back to the color of that name, and anything else as written', () => {
        expect(stopColor('primary')).toBe('var(--primary, primary)')
        expect(stopColor(' kind-teal ')).toBe('var(--kind-teal, kind-teal)')
        expect(stopColor('oklch(0.7 0.1 80)')).toBe('oklch(0.7 0.1 80)')
        expect(stopColor('var(--brand)')).toBe('var(--brand)')
    })

    it('mixes evenly between the stops, landing on each stop on the way', () => {
        const steps = rampSteps(['a', 'b', 'c'], 5)
        expect(steps).toEqual(['a', 'color-mix(in oklab, a, b 50%)', 'b', 'color-mix(in oklab, b, c 50%)', 'c'])
        expect(rampSteps(['a'], 3)).toEqual(['a', 'a', 'a'])
        expect(rampSteps([], 3)).toEqual([])
    })

    it('places a level on its step, quiet at the first and full at the last', () => {
        expect(rampIndex(0, 24)).toBe(0)
        expect(rampIndex(Number.NaN, 24)).toBe(0)
        expect(rampIndex(1, 24)).toBe(23)
        expect(rampIndex(2, 24)).toBe(23)
        expect(rampIndex(0.5, 3)).toBe(1)
    })

    it('runs a gradient out from the baseline, or out both ways from the middle', () => {
        expect(rampAlong(3, false)).toEqual([
            { offset: 0, step: 0 },
            { offset: 0.5, step: 1 },
            { offset: 1, step: 2 },
        ])
        const centered = rampAlong(3, true)
        expect(centered.map((stop) => stop.offset)).toEqual([0, 0.25, 0.5, 0.75, 1])
        expect(centered.map((stop) => stop.step)).toEqual([2, 1, 0, 1, 2])
    })
})

describe('mirrorBase', () => {
    it('stands the bars above the room their reflection takes', () => {
        const { base, room } = mirrorBase(200)
        expect(room).toBe(Math.round(200 * MIRROR_SHARE))
        expect(base + room).toBe(200)
        expect(mirrorBase(0)).toEqual({ base: 0, room: 0 })
    })
})

describe('trailFade', () => {
    it('wipes the same share each sixtieth of a second, whatever the screen', () => {
        expect(trailFade(1000 / 60)).toBeCloseTo(TRAIL_FADE)
        expect(trailFade(2000 / 60)).toBeCloseTo(1 - (1 - TRAIL_FADE) ** 2)
        expect(trailFade(0)).toBe(0)
        expect(trailFade(10_000)).toBeLessThanOrEqual(1)
    })
})
