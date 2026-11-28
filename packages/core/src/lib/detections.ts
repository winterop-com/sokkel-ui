import type { TrackAffiliation } from './tracks'

/**
 * Where a detection was at one moment of a video: `t` in seconds of the video, the box in shares of
 * the picture's size from its top left corner (`x` and `w` of its width, `y` and `h` of its
 * height, each from 0 to 1), and how sure the finder was, from 0 to 1.
 */
export interface DetectionSample {
    t: number
    x: number
    y: number
    w: number
    h: number
    confidence?: number
}

/**
 * One thing a finder follows through a video, such as a person or a vehicle: its track's `id`, what
 * it is (`label`), its affiliation, which colors it as a map colors its track, and where it was,
 * as samples in the order of their times.
 */
export interface Detection {
    id: string
    label?: string
    affiliation?: TrackAffiliation
    samples: readonly DetectionSample[]
}

/** A detection's box at one moment, and how sure the finder was there. */
export interface DetectionBox {
    x: number
    y: number
    w: number
    h: number
    confidence?: number
}

export interface DetectionTiming {
    /** How long a box stays after its last sample, in seconds. */
    hold?: number
    /** The longest gap between two samples a box glides across, in seconds; across a longer one it holds and then goes. */
    gap?: number
}

const HOLD = 0.5
const GAP = 1

/**
 * Where a detection is at `time`: between two samples no further apart than `gap` it glides from
 * one to the next, after a sample it holds for `hold`, and before its first sample or once the hold
 * is over it is nowhere (`undefined`).
 */
export function detectionAt(detection: Detection, time: number, timing: DetectionTiming = {}): DetectionBox | undefined {
    const { samples } = detection
    const hold = timing.hold ?? HOLD
    const gap = timing.gap ?? GAP
    const next = firstAfter(samples, time)
    const before = next === 0 ? undefined : samples[next - 1]
    if (before === undefined) return undefined
    const after = samples.at(next)
    if (after !== undefined && after.t - before.t <= gap) {
        const share = after.t === before.t ? 0 : (time - before.t) / (after.t - before.t)
        return {
            x: between(before.x, after.x, share),
            y: between(before.y, after.y, share),
            w: between(before.w, after.w, share),
            h: between(before.h, after.h, share),
            confidence: before.confidence,
        }
    }
    if (time - before.t > hold) return undefined
    return { x: before.x, y: before.y, w: before.w, h: before.h, confidence: before.confidence }
}

/**
 * The centers a detection passed through in the `seconds` before `time`, oldest first and ending
 * where it is now, for a trail behind it; empty while it is nowhere.
 */
export function detectionTrail(
    detection: Detection,
    time: number,
    seconds: number,
    timing: DetectionTiming = {},
): { x: number; y: number }[] {
    const now = detectionAt(detection, time, timing)
    if (now === undefined || seconds <= 0) return []
    const points = detection.samples
        .filter((sample) => sample.t >= time - seconds && sample.t < time)
        .map((sample) => ({ x: sample.x + sample.w / 2, y: sample.y + sample.h / 2 }))
    return [...points, { x: now.x + now.w / 2, y: now.y + now.h / 2 }]
}

/** The index of the first sample later than `time`, or the samples' length when none is. */
function firstAfter(samples: readonly DetectionSample[], time: number): number {
    let low = 0
    let high = samples.length
    while (low < high) {
        const middle = (low + high) >> 1
        if (samples[middle].t <= time) low = middle + 1
        else high = middle
    }
    return low
}

function between(from: number, to: number, share: number): number {
    return from + (to - from) * share
}

/** A stretch of a video in which one detection was seen, in seconds. */
export interface DetectionSpan {
    id: string
    label?: string
    affiliation?: TrackAffiliation
    start: number
    end: number
}

/**
 * The stretches in which each detection was seen: from a sample to the last one before a gap longer
 * than `gap`, each held `hold` past its last sample, as `detectionAt` shows them. Ordered by start.
 */
export function detectionSpans(detections: readonly Detection[], timing: DetectionTiming = {}): DetectionSpan[] {
    const hold = timing.hold ?? HOLD
    const gap = timing.gap ?? GAP
    const spans: DetectionSpan[] = []
    for (const detection of detections) {
        let start: number | undefined
        let last = 0
        const close = () => {
            if (start !== undefined)
                spans.push({ id: detection.id, label: detection.label, affiliation: detection.affiliation, start, end: last + hold })
        }
        for (const sample of detection.samples) {
            if (start === undefined) start = sample.t
            else if (sample.t - last > gap) {
                close()
                start = sample.t
            }
            last = sample.t
        }
        close()
    }
    return spans.sort((a, b) => a.start - b.start)
}
