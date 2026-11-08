/**
 * Holding a visualizer's picture back by the output's latency. An analyser reads the sound before
 * the output has played it: a wired output is a few milliseconds behind, a Bluetooth one 150 to
 * 500. So each reading is kept in a short ring, stamped with when it was read, and the one drawn is
 * the reading from as long ago as the output is behind, so the picture moves with what is heard.
 * Stamped by time rather than counted in frames, so a loop that drops frames still holds back the
 * same time. Pure, so the ring has tests.
 */

/** The longest a picture is held back, in milliseconds; past this it is not an output's latency. */
export const MOST_DELAY = 1000

/** How many readings the ring keeps: more than a second at 120 frames a second. */
export const DELAY_SLOTS = 128

/** One frame of an analyser's readings: its frequency bins or a window of its waveform. */
export type Reading = Uint8Array<ArrayBuffer> | Float32Array<ArrayBuffer>

/** A ring of recent readings, read back as they were some milliseconds ago. */
export interface ReadingDelay<T extends Reading> {
    /** Keeps a copy of `reading`, read at `at` milliseconds; the caller may reuse its array. */
    push: (reading: T, at: number) => void
    /**
     * The newest reading at least `delay` milliseconds older than the newest of all; the oldest
     * held when the ring does not reach back that far yet, so a picture that starts or a delay
     * that grows holds still rather than going blank. The newest itself for no delay, and null
     * while the ring is empty.
     */
    read: (delay: number) => T | null
    /** Forgets every reading, as when the sound stops and what it held is stale. */
    clear: () => void
}

/** A delay ring of `slots` readings, each made by `make` at the length of the first reading pushed. */
export function createDelay<T extends Reading>(make: (length: number) => T, slots = DELAY_SLOTS): ReadingDelay<T> {
    const depth = Math.max(1, Math.floor(slots))
    let held: T[] = []
    const stamps = new Float64Array(depth)
    let width = -1
    let head = -1
    let count = 0

    return {
        push(reading, at) {
            // A reading of another length (a larger transform, another kind) starts the ring afresh.
            if (reading.length !== width) {
                width = reading.length
                held = []
                head = -1
                count = 0
            }
            head = (head + 1) % depth
            const slot = (held[head] ??= make(width))
            slot.set(reading)
            stamps[head] = at
            count = Math.min(depth, count + 1)
        },
        read(delay) {
            if (count === 0) return null
            const newest = held[head]
            if (!(delay > 0)) return newest
            const wanted = stamps[head] - delay
            let found = newest
            for (let back = 0; back < count; back += 1) {
                const at = (head - back + depth) % depth
                found = held[at]
                if (stamps[at] <= wanted) break
            }
            return found
        },
        clear() {
            head = -1
            count = 0
        },
    }
}

/** The part of an audio context that says how far behind it the output is. */
export interface OutputLatency {
    baseLatency?: number
    outputLatency?: number
}

/**
 * How far behind the graph the speakers are, in milliseconds, as the browser says: the context's
 * own latency and the output device's, each in seconds. Either may be missing (a browser without
 * `outputLatency`) or not a positive number, and counts as nothing then.
 */
export function outputDelay(context: OutputLatency | null | undefined): number {
    if (context === null || context === undefined) return 0
    const seconds = (value: number | undefined) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0)
    return (seconds(context.baseLatency) + seconds(context.outputLatency)) * 1000
}

/** A delay in milliseconds as held: a whole number from none to `MOST_DELAY`, nothing for one that is not a number. */
export function clampDelay(delay: number): number {
    if (!Number.isFinite(delay)) return 0
    return Math.min(MOST_DELAY, Math.max(0, Math.round(delay)))
}
