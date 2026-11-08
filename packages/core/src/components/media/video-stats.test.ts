import { describe, expect, test } from 'vitest'

import { bufferAhead, formatBitrate, formatResolution, readVideoStats, type StatsElement } from './video-stats'

/** A video element as a reading sees one. */
function element(overrides: Partial<StatsElement> = {}, ranges: [number, number][] = []): StatsElement {
    return {
        currentTime: 30,
        paused: false,
        ended: false,
        readyState: 4,
        videoWidth: 1280,
        videoHeight: 720,
        buffered: { length: ranges.length, start: (index) => ranges[index][0], end: (index) => ranges[index][1] },
        getVideoPlaybackQuality: () => ({ droppedVideoFrames: 3, totalVideoFrames: 1204 }),
        ...overrides,
    }
}

describe('the buffer ahead', () => {
    test('is what is loaded past the playhead in the range it stands in', () => {
        expect(
            bufferAhead(
                [
                    { start: 0, end: 12 },
                    { start: 20, end: 42.5 },
                ],
                30,
            ),
        ).toBe(12.5)
    })

    test('is nothing where the playhead stands outside every range', () => {
        expect(bufferAhead([{ start: 0, end: 12 }], 15)).toBe(0)
        expect(bufferAhead([], 3)).toBe(0)
    })

    test('counts a playhead a hair before a range, as after a seek, as in it', () => {
        expect(bufferAhead([{ start: 20, end: 26 }], 19.95)).toBeCloseTo(6.05)
    })
})

describe('a stats reading', () => {
    test("shapes what the element knows with what the source's engine knows", () => {
        const stats = readVideoStats(element({}, [[0, 42]]), {
            engine: 'hls.js',
            bandwidth: 18_400_000,
            level: { index: 2, count: 4, bitrate: 4_200_000, width: 1280, height: 720 },
            bufferAhead: 11,
            live: false,
        })
        expect(stats).toEqual({
            resolution: { width: 1280, height: 720 },
            bitrate: 4_200_000,
            bandwidth: 18_400_000,
            bufferAhead: 12,
            droppedFrames: 3,
            totalFrames: 1204,
            level: 2,
            levels: 4,
            engine: 'hls.js',
            live: false,
            playing: true,
            readyState: 4,
        })
    })

    test('says what nobody can tell as null, never a zero', () => {
        const stats = readVideoStats(element({ videoWidth: 0, videoHeight: 0, getVideoPlaybackQuality: undefined }))
        expect(stats.resolution).toBeNull()
        expect(stats.bitrate).toBeNull()
        expect(stats.bandwidth).toBeNull()
        expect(stats.droppedFrames).toBeNull()
        expect(stats.totalFrames).toBeNull()
        expect(stats.level).toBeNull()
        expect(stats.engine).toBeNull()
        expect(stats.live).toBeNull()
    })

    test("takes the engine's buffer where the element has no ranges to read", () => {
        expect(readVideoStats(element(), { engine: 'hls.js', bufferAhead: 7.5 }).bufferAhead).toBe(7.5)
        expect(readVideoStats(element()).bufferAhead).toBe(0)
    })

    test('reads a paused or ended video as not playing', () => {
        expect(readVideoStats(element({ paused: true })).playing).toBe(false)
        expect(readVideoStats(element({ ended: true })).playing).toBe(false)
    })

    test('drops an estimate the engine has not measured', () => {
        expect(readVideoStats(element(), { engine: 'hls.js', bandwidth: Number.NaN }).bandwidth).toBeNull()
    })
})

describe('the stats as an overlay says them', () => {
    test('write a bitrate in Mbit/s from a million, else kbit/s', () => {
        expect(formatBitrate(4_200_000)).toBe('4.2 Mbit/s')
        expect(formatBitrate(850_400)).toBe('850 kbit/s')
        expect(formatBitrate(null)).toBe('-')
        expect(formatBitrate(null, 'n/a')).toBe('n/a')
    })

    test('write a resolution as width by height', () => {
        expect(formatResolution({ width: 1920, height: 1080 })).toBe('1920×1080')
        expect(formatResolution(null)).toBe('-')
    })
})
