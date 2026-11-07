/**
 * What one frame of sound looks like, as numbers a canvas paints: the bands an analyser's bins
 * fold into, how a band's level is shaped and settled from frame to frame, where the bars, the
 * area's curve, the wave's trace and the ring's spokes go. Pure, so the shapes have tests and the
 * component only paints them.
 */

/**
 * How the sound is drawn: `spectrum` as bars, `area` as the bars' tops joined into a filled curve,
 * `wave` as the waveform itself traced like an oscilloscope, and `ring` as bars standing out from
 * a circle.
 */
export type SoundKind = 'spectrum' | 'area' | 'wave' | 'ring'

export const SOUND_KINDS: readonly SoundKind[] = ['spectrum', 'area', 'wave', 'ring']

/** Where a spectrum's bars or an area's curve stand: on the floor, or about the middle line. */
export type SoundAlign = 'bottom' | 'center'

/** One still picture of sound, drawn without any audio: a story's frame, or levels an app already holds. */
export interface SoundFrame {
    /** Loudness per band from low to high, each from 0 to 1, for a spectrum, an area or a ring. */
    levels?: readonly number[]
    /** The waveform, each sample from -1 to 1, for a wave. */
    samples?: readonly number[]
}

/** The frequencies the bands are spread over, in hertz. */
export interface SoundRange {
    low: number
    high: number
}

/** Where music has most of what a picture can show. */
export const MUSIC_RANGE: SoundRange = { low: 40, high: 14_000 }

/** Where a voice has its fundamentals and formants. */
export const VOICE_RANGE: SoundRange = { low: 80, high: 8000 }

/** A band's weight at the low end and at the high end: music is loud at the bottom and thin at the top. */
const LOW_WEIGHT = 0.82
const HIGH_WEIGHT = 1.2

/** Above 1, quiet bands sink and loud ones stand out. */
const CONTRAST = 1.35

/**
 * A band's level as drawn, from the analyser's byte for it (0 to 255, already scaled between the
 * analyser's quietest and loudest decibels) and the band's place from low (0) to high (1).
 */
export function shapeLevel(byte: number, place: number): number {
    if (!(byte > 0)) return 0
    const weight = LOW_WEIGHT + (HIGH_WEIGHT - LOW_WEIGHT) * Math.min(1, Math.max(0, place))
    return Math.min(1, (Math.min(255, byte) / 255) ** CONTRAST * weight)
}

/**
 * Folds an analyser's frequency bins into `count` bands spaced evenly in pitch, low to high, each
 * from 0 to 1. The bins are spread evenly from 0 to half the sample rate, so the low bands each
 * cover a few bins and the high ones hundreds. A band narrower than a bin reads between the two
 * nearest bins, so neighbors at the low end differ rather than repeat one bin.
 */
export function bandLevels(bins: ArrayLike<number>, count: number, sampleRate: number, range: SoundRange = MUSIC_RANGE): number[] {
    if (bins.length === 0 || count <= 0 || !(sampleRate > 0)) return []
    const binHz = sampleRate / 2 / bins.length
    const low = Math.max(binHz / 2, range.low)
    const high = Math.max(low * 1.01, Math.min(sampleRate / 2, range.high))
    const ratio = high / low
    const levels: number[] = []
    for (let band = 0; band < count; band += 1) {
        // Bin positions on a scale where bin i covers [i, i + 1).
        const from = (low * ratio ** (band / count)) / binHz
        const to = (low * ratio ** ((band + 1) / count)) / binHz
        const byte = to - from < 1 ? between(bins, Math.sqrt(from * to)) : mean(bins, from, to)
        levels.push(shapeLevel(byte, count === 1 ? 0 : band / (count - 1)))
    }
    return levels
}

/** The average of the bins from `from` up to `to`, never fewer than one. */
function mean(bins: ArrayLike<number>, from: number, to: number): number {
    const first = Math.min(bins.length - 1, Math.floor(from))
    const last = Math.min(bins.length, Math.max(first + 1, Math.ceil(to)))
    let total = 0
    for (let bin = first; bin < last; bin += 1) total += bins[bin] ?? 0
    return total / (last - first)
}

/** The level at a point on the bin scale, straight between the middles of the two nearest bins. */
function between(bins: ArrayLike<number>, at: number): number {
    const position = Math.min(bins.length - 1, Math.max(0, at - 0.5))
    const below = Math.floor(position)
    const above = Math.min(bins.length - 1, below + 1)
    const lean = position - below
    return (bins[below] ?? 0) * (1 - lean) + (bins[above] ?? 0) * lean
}

/** Levels stretched or squeezed to `count`, read straight between neighbors, so a still frame fits any width. */
export function resample(levels: readonly number[], count: number): number[] {
    if (count <= 0 || levels.length === 0) return []
    if (levels.length === count) return [...levels]
    if (levels.length === 1 || count === 1) return Array.from({ length: count }, () => levels[0] ?? 0)
    return Array.from({ length: count }, (_, index) => {
        const at = (index / (count - 1)) * (levels.length - 1)
        const below = Math.floor(at)
        const above = Math.min(levels.length - 1, below + 1)
        return (levels[below] ?? 0) + ((levels[above] ?? 0) - (levels[below] ?? 0)) * (at - below)
    })
}

/** How far a band moves toward a louder reading in one sixtieth of a second, and toward a quieter one. */
export const ATTACK = 0.55
export const RELEASE = 0.14

const FRAME_MS = 1000 / 60

/**
 * This frame's levels settled against the last frame's: a band rises most of the way to a louder
 * reading at once and falls back slowly, so a hit reads as a hit and the bars do not flicker with
 * the transform. The rates are per sixtieth of a second, so a faster screen moves at the same pace.
 * A band the last frame did not have starts from the floor.
 */
export function settle(previous: readonly number[], target: readonly number[], elapsedMs = FRAME_MS): number[] {
    const steps = Math.max(0, elapsedMs) / FRAME_MS
    const rise = 1 - (1 - ATTACK) ** steps
    const fall = 1 - (1 - RELEASE) ** steps
    return target.map((wanted, index) => {
        const current = previous[index] ?? 0
        return current + (wanted - current) * (wanted > current ? rise : fall)
    })
}

/** Whether every value is within `threshold` of nothing: a frame not worth painting again. */
export function isQuiet(values: ArrayLike<number>, threshold = 0.004): boolean {
    for (let index = 0; index < values.length; index += 1) {
        if (Math.abs(values[index] ?? 0) > threshold) return false
    }
    return true
}

/** How wide a bar is, the room between two, and where the first one starts. */
export interface BarLayout {
    bar: number
    gap: number
    offset: number
}

/**
 * Where `count` bars go across `width`. The gap is a share of each bar's slot, at least a pixel,
 * so bars stay apart on a strip and on a whole screen alike. With `widest`, bars are never wider
 * than that, and the row is centered in the room left over.
 */
export function barLayout(width: number, count: number, widest = Number.POSITIVE_INFINITY): BarLayout {
    if (count <= 0 || width <= 0) return { bar: 0, gap: 0, offset: 0 }
    const slot = width / count
    const gap = slot < 3 ? 0 : Math.max(1, Math.round(slot * 0.22))
    const bar = Math.max(0.5, Math.min(widest, (width - gap * (count - 1)) / count))
    const used = bar * count + gap * (count - 1)
    return { bar, gap, offset: Math.max(0, (width - used) / 2) }
}

/** The room one bar and its gap take, for working out how many bars a width holds. */
const BAR_SLOT = 8
/** The room one point of an area's curve takes. */
const AREA_SLOT = 14
/** The room one spoke takes around a ring's inner circle. */
const SPOKE_SLOT = 7

/** How many bands a kind draws in a box of this size when the app names no count. */
export function autoBands(kind: SoundKind, width: number, height: number): number {
    const clamp = (value: number, least: number, most: number) => Math.round(Math.min(most, Math.max(least, value)))
    switch (kind) {
        case 'spectrum':
            return clamp(width / BAR_SLOT, 8, 192)
        case 'area':
            return clamp(width / AREA_SLOT, 12, 96)
        case 'ring':
            // Half the circle carries the bands and the other half mirrors them.
            return clamp((Math.PI * ringRadii(width, height).inner) / SPOKE_SLOT, 12, 96)
        case 'wave':
            return 0
    }
}

/** A place on the canvas, in CSS pixels. */
export interface Point {
    x: number
    y: number
}

/**
 * The tops of the bands across the width, one point at each band's middle, standing up from
 * `base` by `reach` at full level. The canvas joins them through the midpoints between neighbors,
 * a curve that never overshoots a band, and closes it down to the base.
 */
export function areaPoints(levels: readonly number[], width: number, base: number, reach: number): Point[] {
    if (levels.length === 0 || width <= 0) return []
    const step = width / levels.length
    return levels.map((level, index) => ({ x: step * (index + 0.5), y: base - Math.min(1, Math.max(0, level)) * reach }))
}

/** How many samples a wave shows across its width: a few hundredths of a second, a handful of cycles. */
export const WAVE_SPAN = 640

/**
 * Where a wave's window starts: the first place in the first half where the signal rises through
 * zero, as an oscilloscope triggers, so one frame's trace lands where the last one was rather than
 * sliding about. Zero when the signal never crosses.
 */
export function triggerAt(samples: ArrayLike<number>, span: number): number {
    const last = samples.length - span
    for (let index = 1; index <= last; index += 1) {
        if ((samples[index - 1] ?? 0) < 0 && (samples[index] ?? 0) >= 0) return index
    }
    return 0
}

/** How much of a wave's held peak is kept from one sixtieth of a second to the next. */
export const PEAK_HOLD = 0.99
/** The most a quiet wave is enlarged. */
export const MOST_GAIN = 4
/** The share of the room either side of the middle a wave's loud moments reach. */
const WAVE_HEADROOM = 0.9

/** A wave's held peak after this frame: caught up at once by a louder sample, falling back slowly after. */
export function holdPeak(previous: number, samples: ArrayLike<number>, elapsedMs = FRAME_MS): number {
    let peak = 0
    for (let index = 0; index < samples.length; index += 1) peak = Math.max(peak, Math.abs(samples[index] ?? 0))
    return Math.max(peak, previous * PEAK_HOLD ** (Math.max(0, elapsedMs) / FRAME_MS))
}

/** How much a wave with this held peak is enlarged, so a quiet mix still fills the room and a loud one keeps clear of the edges. */
export function waveGain(peak: number): number {
    if (!(peak > 0)) return 1
    return Math.min(MOST_GAIN, WAVE_HEADROOM / peak)
}

/** The wave's trace across `width`, its middle at half the height and full scale at the edges. */
export function wavePoints(samples: ArrayLike<number>, width: number, height: number): Point[] {
    if (width <= 0 || height <= 0) return []
    const middle = height / 2
    if (samples.length < 2)
        return [
            { x: 0, y: middle },
            { x: width, y: middle },
        ]
    const points: Point[] = []
    for (let index = 0; index < samples.length; index += 1) {
        const level = Math.min(1, Math.max(-1, samples[index] ?? 0))
        points.push({ x: (index / (samples.length - 1)) * width, y: middle - level * middle })
    }
    return points
}

/** A ring's middle circle and how far its spokes reach past it, for a box of this size. */
export function ringRadii(width: number, height: number): { inner: number; reach: number } {
    const half = Math.max(0, Math.min(width, height) / 2)
    return { inner: half * 0.46, reach: half * 0.46 }
}

/** One spoke of a ring: from its foot on the circle out to its tip. */
export interface Spoke {
    from: Point
    to: Point
    level: number
}

/**
 * The ring's spokes around `center`: the bands from the top down the right side, low to high,
 * and the same again mirrored down the left, so the ring is even about its upright. Each spoke
 * stands out from the inner circle by its level of `reach`, at least `least`.
 */
export function ringSpokes(levels: readonly number[], center: Point, inner: number, reach: number, least = 0): Spoke[] {
    const count = levels.length
    const spokes: Spoke[] = []
    for (const side of [1, -1]) {
        levels.forEach((raw, index) => {
            const level = Math.min(1, Math.max(0, raw))
            const angle = -Math.PI / 2 + side * Math.PI * ((index + 0.5) / count)
            const length = Math.max(least, level * reach)
            const cos = Math.cos(angle)
            const sin = Math.sin(angle)
            spokes.push({
                from: { x: center.x + cos * inner, y: center.y + sin * inner },
                to: { x: center.x + cos * (inner + length), y: center.y + sin * (inner + length) },
                level,
            })
        })
    }
    return spokes
}
