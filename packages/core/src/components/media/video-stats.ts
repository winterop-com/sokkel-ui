import { useEffect, useState, type RefObject } from 'react'

import type { MediaRange } from './time'
import type { VideoSourceStats } from './video-source'

/**
 * One reading of how a video is playing, for a stats overlay: what the element knows (the picture's
 * size, what is buffered, the frames), with what the source's engine knows beside it (the link's
 * bandwidth, the rendition playing). A fact nobody can tell is null, never a zero, which would
 * read as a measurement.
 */
export interface VideoStats {
    /** The picture's size as decoded, or null before the first frame. */
    resolution: { width: number; height: number } | null
    /** The bitrate the playing rendition declares, in bits per second. */
    bitrate: number | null
    /** The engine's estimate of the link's bandwidth, in bits per second. */
    bandwidth: number | null
    /** Seconds buffered past the playhead. */
    bufferAhead: number
    /** Frames the browser dropped, and of how many it has shown, where it counts them. */
    droppedFrames: number | null
    totalFrames: number | null
    /** The rendition playing, counting from 0, and how many there are, where an engine picks among them. */
    level: number | null
    levels: number | null
    /** What plays the media: an engine's name, `native` where the browser plays it itself, or null for a plain file. */
    engine: string | null
    /** Whether the media is live, with no end yet, where the engine says. */
    live: boolean | null
    playing: boolean
    /** `HTMLMediaElement.readyState`: 0 has nothing, 4 enough to play through. */
    readyState: number
}

/** A video element as far as a reading looks at it. */
export interface StatsElement {
    currentTime: number
    paused: boolean
    ended: boolean
    readyState: number
    videoWidth: number
    videoHeight: number
    buffered: { length: number; start: (index: number) => number; end: (index: number) => number }
    getVideoPlaybackQuality?: () => { droppedVideoFrames: number; totalVideoFrames: number }
}

/** Seconds buffered past `at`: the end of the range it stands in, 0 when it stands in none. */
export function bufferAhead(ranges: readonly MediaRange[], at: number): number {
    // A playhead a hair before a range's start, as after a seek, counts as in it.
    const range = ranges.find((one) => at >= one.start - 0.1 && at <= one.end)
    return range === undefined ? 0 : Math.max(0, range.end - at)
}

function rangesOf(buffered: StatsElement['buffered']): MediaRange[] {
    const ranges: MediaRange[] = []
    for (let index = 0; index < buffered.length; index += 1) ranges.push({ start: buffered.start(index), end: buffered.end(index) })
    return ranges
}

const known = (value: number | undefined): number | null => (value !== undefined && Number.isFinite(value) && value >= 0 ? value : null)

/** A reading of a video element and its source's engine, shaped for an overlay. */
export function readVideoStats(video: StatsElement, source: VideoSourceStats | null = null): VideoStats {
    const quality = typeof video.getVideoPlaybackQuality === 'function' ? video.getVideoPlaybackQuality() : null
    const ranges = rangesOf(video.buffered)
    const own = bufferAhead(ranges, video.currentTime)
    const level = source?.level
    return {
        resolution: video.videoWidth > 0 && video.videoHeight > 0 ? { width: video.videoWidth, height: video.videoHeight } : null,
        bitrate: known(level?.bitrate),
        bandwidth: known(source?.bandwidth),
        bufferAhead: ranges.length > 0 ? own : (known(source?.bufferAhead) ?? 0),
        droppedFrames: quality === null ? null : quality.droppedVideoFrames,
        totalFrames: quality === null ? null : quality.totalVideoFrames,
        level: level === undefined ? null : level.index,
        levels: level === undefined ? null : level.count,
        engine: source?.engine ?? null,
        live: source?.live ?? null,
        playing: !video.paused && !video.ended,
        readyState: video.readyState,
    }
}

/** A rate of bits per second as an overlay says it: `4.2 Mbit/s`, `850 kbit/s`; a dash when unknown. */
export function formatBitrate(bitsPerSecond: number | null, none = '-'): string {
    if (bitsPerSecond === null || !Number.isFinite(bitsPerSecond)) return none
    if (bitsPerSecond >= 1e6) return `${(bitsPerSecond / 1e6).toFixed(1)} Mbit/s`
    return `${String(Math.round(bitsPerSecond / 1e3))} kbit/s`
}

/** A picture's size as `1920×1080`; a dash before the first frame. */
export function formatResolution(resolution: VideoStats['resolution'], none = '-'): string {
    return resolution === null ? none : `${String(resolution.width)}×${String(resolution.height)}`
}

/** What reads a player's stats: its handle, through `ref`. */
export interface StatsReader {
    stats: () => VideoStats | null
}

export interface UseVideoStatsOptions {
    /** How often to read, in milliseconds. */
    interval?: number
    /** Whether to read at all: off, as while the overlay is closed, nothing runs. */
    enabled?: boolean
}

/**
 * Reads a `VideoPlayer`'s stats through its handle every `interval` while `enabled`, for an overlay
 * the app shows and hides: null until the first reading, and again once turned off.
 */
export function useVideoStats(
    player: RefObject<StatsReader | null>,
    { interval = 1000, enabled = true }: UseVideoStatsOptions = {},
): VideoStats | null {
    const [stats, setStats] = useState<VideoStats | null>(null)
    useEffect(() => {
        if (!enabled) {
            setStats(null)
            return
        }
        const read = () => {
            setStats(player.current?.stats() ?? null)
        }
        read()
        const timer = setInterval(read, interval)
        return () => {
            clearInterval(timer)
        }
    }, [player, interval, enabled])
    return stats
}
