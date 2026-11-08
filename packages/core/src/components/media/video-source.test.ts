import { describe, expect, test } from 'vitest'

import { isStalled, mediaError, nextTry, onReturn, resumeAt, RETRY_DELAY, trackProgress, type Progress } from './video-source'

describe("a media element's error", () => {
    test('reads its kind from the code', () => {
        expect(mediaError({ code: 2, message: 'net::ERR_CONNECTION_RESET' })).toEqual({
            kind: 'network',
            message: 'net::ERR_CONNECTION_RESET',
        })
        expect(mediaError({ code: 3, message: 'PIPELINE_ERROR_DECODE' })).toEqual({ kind: 'decode', message: 'PIPELINE_ERROR_DECODE' })
        expect(mediaError({ code: 4, message: 'Format error' })).toEqual({ kind: 'unsupported', message: 'Format error' })
    })

    test('is no error when the fetch was aborted or there is none', () => {
        expect(mediaError({ code: 1, message: '' })).toBeNull()
        expect(mediaError(null)).toBeNull()
    })

    test('names the code when the browser says nothing', () => {
        expect(mediaError({ code: 2, message: '' })?.message).toBe('MediaError 2')
    })
})

describe('the next try', () => {
    test('waits a second, then twice as long each time', () => {
        expect(nextTry('stalled', 0, 3)).toEqual({ delay: RETRY_DELAY })
        expect(nextTry('network', 1, 3)).toEqual({ delay: RETRY_DELAY * 2 })
        expect(nextTry('decode', 2, 3)).toEqual({ delay: RETRY_DELAY * 4 })
    })

    test('gives up once the tries are spent, or at once with none', () => {
        expect(nextTry('network', 3, 3)).toBeNull()
        expect(nextTry('stalled', 0, 0)).toBeNull()
    })

    test('gives up at once on media the browser cannot play', () => {
        expect(nextTry('unsupported', 0, 3)).toBeNull()
    })
})

describe('a stall', () => {
    /** The playhead read once a second from `start`, at each of `positions`, as the player watches it. */
    function watch(positions: number[], start = 0): Progress | null {
        let progress: Progress | null = null
        positions.forEach((at, second) => {
            progress = trackProgress(progress, at, start + second * 1000)
        })
        return progress
    }

    test('is no stall while the playhead moves', () => {
        const progress = watch([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
        expect(progress).toEqual({ at: 9, since: 9000 })
        expect(isStalled(progress, 9000, 8000)).toBe(false)
    })

    test('is said once the playhead has stood as long as the player waits', () => {
        // Playing on to 12 seconds, then the encoder stops writing and the playhead stands.
        const progress = watch([10, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12])
        expect(progress).toEqual({ at: 12, since: 2000 })
        expect(isStalled(progress, 9000, 8000)).toBe(false)
        expect(isStalled(progress, 10_000, 8000)).toBe(true)
    })

    test('counts from the latest move, so a playhead that creeps on is not stalled', () => {
        const progress = watch([12, 12, 12, 12, 12, 12, 12, 12.5, 12.5, 12.5])
        expect(progress?.since).toBe(7000)
        expect(isStalled(progress, 10_000, 8000)).toBe(false)
    })

    test('counts a seek as a move, and one that never lands as standing', () => {
        const progress = watch([20, 21, 95, 95, 95, 95, 95, 95, 95, 95, 95])
        expect(progress?.since).toBe(2000)
        expect(isStalled(progress, 10_000, 8000)).toBe(true)
    })

    test('ignores the jitter of a playhead read twice at one frame', () => {
        expect(trackProgress({ at: 12, since: 0 }, 12.004, 1000)).toEqual({ at: 12, since: 0 })
    })

    test('is never said before the playhead has been read', () => {
        expect(isStalled(null, 60_000, 8000)).toBe(false)
    })
})

describe('where a try picks up', () => {
    test('is where it was', () => {
        expect(resumeAt(312.4, { start: 0, end: 600 }, false)).toBe(312.4)
        expect(resumeAt(312.4, { start: 0, end: 330 }, true)).toBe(312.4)
    })

    test("is the live edge once a live stream's window has moved past where it was", () => {
        expect(resumeAt(40, { start: 60, end: 120 }, true)).toBeUndefined()
    })

    test('is the live edge for a live stream that could seek nowhere, as a browser playing it itself may draw it', () => {
        expect(resumeAt(17.9, null, true)).toBeUndefined()
    })

    test('is where it was for media that is not live, wherever it could seek', () => {
        expect(resumeAt(40, { start: 60, end: 120 }, false)).toBe(40)
        expect(resumeAt(40, null, false)).toBe(40)
    })
})

describe('a page shown again', () => {
    test('plays on a video that was playing as the page was hidden and has been paused since', () => {
        expect(onReturn(true, true, 4)).toBe('play')
    })

    test('nudges a video that plays on but whose buffer stalled while away', () => {
        expect(onReturn(true, false, 2)).toBe('nudge')
        expect(onReturn(true, false, 4)).toBeNull()
    })

    test('leaves alone a video that was not playing, or whose pause was asked for', () => {
        expect(onReturn(false, true, 4)).toBeNull()
        expect(onReturn(false, false, 1)).toBeNull()
    })
})
