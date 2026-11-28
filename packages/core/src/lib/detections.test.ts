import { describe, expect, it } from 'vitest'

import { detectionAt, detectionSpans, detectionTrail, type Detection } from './detections'

const WALKER: Detection = {
    id: 'p-1',
    label: 'person',
    samples: [
        { t: 1, x: 0.1, y: 0.2, w: 0.1, h: 0.3, confidence: 0.9 },
        { t: 1.5, x: 0.2, y: 0.2, w: 0.1, h: 0.3, confidence: 0.8 },
        { t: 4, x: 0.6, y: 0.2, w: 0.1, h: 0.3 },
    ],
}

describe('detectionAt', () => {
    it('is nowhere before its first sample', () => {
        expect(detectionAt(WALKER, 0.9)).toBeUndefined()
    })

    it('stands on a sample at its time', () => {
        expect(detectionAt(WALKER, 1)).toEqual({ x: 0.1, y: 0.2, w: 0.1, h: 0.3, confidence: 0.9 })
    })

    it('glides between two samples within the gap', () => {
        expect(detectionAt(WALKER, 1.25)?.x).toBeCloseTo(0.15)
    })

    it('holds after a sample across a longer gap, then goes', () => {
        expect(detectionAt(WALKER, 1.9)?.x).toBe(0.2)
        expect(detectionAt(WALKER, 2.1)).toBeUndefined()
        expect(detectionAt(WALKER, 4.2)?.x).toBe(0.6)
        expect(detectionAt(WALKER, 4.6)).toBeUndefined()
    })

    it('takes its hold and gap from the timing given', () => {
        expect(detectionAt(WALKER, 3, { gap: 3 })?.x).toBeCloseTo(0.44)
        expect(detectionAt(WALKER, 2.1, { hold: 1 })?.x).toBe(0.2)
    })
})

describe('detectionTrail', () => {
    it('runs through the centers of the recent samples to where it is now', () => {
        expect(detectionTrail(WALKER, 1.6, 1)).toEqual([
            { x: 0.15000000000000002, y: 0.35 },
            { x: 0.25, y: 0.35 },
            { x: 0.25, y: 0.35 },
        ])
    })

    it('is empty while it is nowhere, or with no seconds to draw', () => {
        expect(detectionTrail(WALKER, 0.5, 1)).toEqual([])
        expect(detectionTrail(WALKER, 1.2, 0)).toEqual([])
    })
})

describe('detectionSpans', () => {
    it('splits a detection at a gap longer than the gap, each stretch held past its last sample', () => {
        expect(detectionSpans([WALKER])).toEqual([
            { id: 'p-1', label: 'person', affiliation: undefined, start: 1, end: 2 },
            { id: 'p-1', label: 'person', affiliation: undefined, start: 4, end: 4.5 },
        ])
    })

    it('orders the stretches of several detections by their start', () => {
        const other: Detection = { id: 'v-2', samples: [{ t: 2.5, x: 0, y: 0, w: 0.1, h: 0.1 }] }
        expect(detectionSpans([WALKER, other]).map((span) => `${span.id}@${String(span.start)}`)).toEqual(['p-1@1', 'v-2@2.5', 'p-1@4'])
    })
})
