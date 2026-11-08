import { describe, expect, it } from 'vitest'

import { clampDelay, createDelay, MOST_DELAY, outputDelay } from './sound-delay'

const bytes = (length: number) => new Uint8Array(length)

/** A ring fed one reading every `step` milliseconds from 0, each filled with its own index. */
function fed(frames: number, step = 10, slots?: number) {
    const ring = createDelay(bytes, slots)
    const reading = new Uint8Array(4)
    for (let index = 0; index < frames; index += 1) {
        reading.fill(index)
        ring.push(reading, index * step)
    }
    return ring
}

describe('createDelay', () => {
    it('reads nothing while empty', () => {
        expect(createDelay(bytes).read(0)).toBeNull()
        expect(createDelay(bytes).read(200)).toBeNull()
    })

    it('reads the newest reading with no delay', () => {
        expect(fed(10).read(0)?.[0]).toBe(9)
    })

    it('reads the reading from as long ago as the delay', () => {
        const ring = fed(50)
        expect(ring.read(100)?.[0]).toBe(39)
        expect(ring.read(250)?.[0]).toBe(24)
    })

    it('reads the newest reading old enough when the delay falls between two', () => {
        // The newest is stamped 490; 485 wanted, so the one at 480.
        expect(fed(50).read(5)?.[0]).toBe(48)
        expect(fed(50).read(15)?.[0]).toBe(47)
    })

    it('holds the oldest reading until the ring reaches back as far as the delay', () => {
        const ring = fed(5)
        expect(ring.read(300)?.[0]).toBe(0)
    })

    it('keeps copies, so the caller can read the analyser into one array every frame', () => {
        const ring = createDelay(bytes)
        const reading = new Uint8Array([1, 1, 1])
        ring.push(reading, 0)
        reading.fill(2)
        ring.push(reading, 16)
        reading.fill(3)
        expect(Array.from(ring.read(16) ?? [])).toEqual([1, 1, 1])
        expect(Array.from(ring.read(0) ?? [])).toEqual([2, 2, 2])
    })

    it('wraps around, keeping only the newest slots', () => {
        const ring = fed(20, 10, 8)
        expect(ring.read(0)?.[0]).toBe(19)
        expect(ring.read(30)?.[0]).toBe(16)
        // Seven slots back is as far as eight slots reach.
        expect(ring.read(500)?.[0]).toBe(12)
    })

    it('holds back by time rather than by frames, so dropped frames hold back the same time', () => {
        const ring = createDelay(bytes)
        const stamps = [0, 16, 33, 150, 166, 300]
        stamps.forEach((at, index) => ring.push(new Uint8Array([index]), at))
        expect(ring.read(140)?.[0]).toBe(3)
        expect(ring.read(150)?.[0]).toBe(3)
        expect(ring.read(151)?.[0]).toBe(2)
    })

    it('forgets everything on clear', () => {
        const ring = fed(10)
        ring.clear()
        expect(ring.read(0)).toBeNull()
        ring.push(new Uint8Array([7, 7, 7, 7]), 1000)
        expect(ring.read(200)?.[0]).toBe(7)
    })

    it('starts afresh when the readings change length', () => {
        const ring = fed(10)
        ring.push(new Uint8Array([5, 5]), 100)
        expect(ring.read(50)?.length).toBe(2)
        expect(ring.read(50)?.[0]).toBe(5)
    })

    it('holds waveform samples as floats', () => {
        const ring = createDelay((length) => new Float32Array(length))
        ring.push(new Float32Array([-0.5, 0.25]), 0)
        ring.push(new Float32Array([0.75, -1]), 200)
        expect(Array.from(ring.read(200) ?? [])).toEqual([-0.5, 0.25])
    })
})

describe('outputDelay', () => {
    it('adds the context latency and the output latency, in milliseconds', () => {
        expect(outputDelay({ baseLatency: 0.01, outputLatency: 0.19 })).toBeCloseTo(200)
    })

    it('counts what a browser does not say as nothing', () => {
        expect(outputDelay({ baseLatency: 0.005 })).toBeCloseTo(5)
        expect(outputDelay({})).toBe(0)
        expect(outputDelay(null)).toBe(0)
        expect(outputDelay(undefined)).toBe(0)
    })

    it('counts a value that is not a positive number as nothing', () => {
        expect(outputDelay({ baseLatency: Number.NaN, outputLatency: 0.15 })).toBeCloseTo(150)
        expect(outputDelay({ baseLatency: -1, outputLatency: Number.POSITIVE_INFINITY })).toBe(0)
    })
})

describe('clampDelay', () => {
    it('keeps a delay inside its bounds, in whole milliseconds', () => {
        expect(clampDelay(212.6)).toBe(213)
        expect(clampDelay(-40)).toBe(0)
        expect(clampDelay(5000)).toBe(MOST_DELAY)
        expect(clampDelay(Number.NaN)).toBe(0)
    })
})
