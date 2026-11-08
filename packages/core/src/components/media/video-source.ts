/**
 * What went wrong with a video: the network, decoding, media this browser cannot play, playback
 * that stopped for data and did not start again, or anything else.
 */
export type VideoErrorKind = 'network' | 'decode' | 'unsupported' | 'stalled' | 'other'

/** An error a video met. */
export interface VideoError {
    kind: VideoErrorKind
    /** What the browser or the engine said, in its own words, for a log. */
    message: string
    /**
     * Whether whoever tells it has given up: a player once its tries are spent, a source once it
     * can recover no further and leaves the next try to the player.
     */
    fatal: boolean
}

/** How a source tells the player of an error it met. */
export type VideoSourceReport = (error: VideoError) => void

/** What the player asks of a source as it attaches it. */
export interface VideoSourceAttach {
    /**
     * Where playback picks up, in seconds: `startAt`, or where it was before a try. An engine that
     * can starts loading there, so the first fragment fetched is the one played rather than the
     * first of the media. Absent, the media's own start, or a live stream's live edge.
     */
    startAt?: number
}

/** What a source's engine knows of the playback, for a stats overlay. Each is left out where the engine cannot tell. */
export interface VideoSourceStats {
    /** What plays it: an engine's name, or `native` where the browser plays it itself. */
    engine: string
    /** The engine's estimate of the link's bandwidth, in bits per second. */
    bandwidth?: number
    /** The rendition playing, counting from 0, of how many, with what it declares. */
    level?: { index: number; count: number; bitrate?: number; width?: number; height?: number }
    /** Seconds buffered past the playhead, as the engine counts them. */
    bufferAhead?: number
    /** Whether the media is live, with no end yet. */
    live?: boolean
}

/**
 * What feeds a `VideoPlayer`'s element when a URL alone will not play, such as a stream an engine
 * plays. The player knows nothing of the engine: it hands the source its element, takes the media
 * away again before each try after a failure and on unmount, and hears of the source's errors
 * through `report`. A fatal one is a try for the player, which attaches the source again where
 * playback was; a recoverable one is only told on to `onError`.
 */
export interface VideoSource {
    /**
     * What the media is, such as its URL: the player attaches again only when it changes, so a
     * source made anew on each render is the same source. Without it, a new object is a new source.
     */
    id?: string
    /** Gives the element its media, from where `options` says, and returns what takes it away again. */
    attach: (video: HTMLVideoElement, report: VideoSourceReport, options?: VideoSourceAttach) => () => void
    /** Whether this browser can play it; when it cannot, the player says so and attaches nothing. */
    canPlay?: (video: HTMLVideoElement) => boolean
    /** What the engine attached to `video` knows now, or null while none is. */
    stats?: (video: HTMLVideoElement) => VideoSourceStats | null
}

/** `MediaError`'s codes, which a test without a DOM has no `MediaError` to read from. */
const MEDIA_ERR_ABORTED = 1
const MEDIA_ERR_NETWORK = 2
const MEDIA_ERR_DECODE = 3

/**
 * The error a media element's failure is, without whether it is fatal, which the player decides;
 * null for a fetch the user aborted, which is no error.
 */
export function mediaError(error: { code: number; message: string } | null): Omit<VideoError, 'fatal'> | null {
    if (error === null || error.code === MEDIA_ERR_ABORTED) return null
    const kind = error.code === MEDIA_ERR_NETWORK ? 'network' : error.code === MEDIA_ERR_DECODE ? 'decode' : 'unsupported'
    return { kind, message: error.message === '' ? `MediaError ${String(error.code)}` : error.message }
}

/** How long a player waits before its first try after a failure, in milliseconds; each next waits twice as long. */
export const RETRY_DELAY = 1000

/**
 * What a player does about an error after `tries` tries: wait `delay` milliseconds and try again, or,
 * with null, give up. Media the browser cannot play is given up at once.
 */
export function nextTry(kind: VideoErrorKind, tries: number, retries: number): { delay: number } | null {
    if (kind === 'unsupported' || tries >= retries) return null
    return { delay: RETRY_DELAY * 2 ** tries }
}

/** Where the playhead stood, and since when, by a clock in milliseconds. */
export interface Progress {
    at: number
    since: number
}

/** How far the playhead must move to count as moving, in seconds. */
const MOVED = 0.01

/**
 * The playhead watched while a video plays: a reading where it moved starts the count again, one
 * where it stands keeps the time it has stood since. A seek moves it, so a seek starts the count
 * too, and one that never lands counts as standing.
 */
export function trackProgress(previous: Progress | null, at: number, now: number): Progress {
    if (previous === null || Math.abs(at - previous.at) >= MOVED) return { at, since: now }
    return previous
}

/**
 * Whether playback has stalled: the playhead has stood `after` milliseconds or more while playing,
 * waiting for data that does not come (a stream whose encoder fell behind or stopped, a buffer an
 * engine never fills, a seek past what is there yet).
 */
export function isStalled(progress: Progress | null, now: number, after: number): boolean {
    return progress !== null && now - progress.since >= after
}

/**
 * Where a try picks the media up again: where it was, or the live edge, which undefined asks for
 * (an engine's own start), for a live stream whose window has moved past that point or that could
 * seek nowhere, as a browser playing a live stream itself may draw its timeline from where it
 * joined. `window` is what the media could seek in before the try, null when nothing.
 */
export function resumeAt(position: number, window: { start: number; end: number } | null, live: boolean): number | undefined {
    if (live && (window === null || position < window.start)) return undefined
    return position
}

/** `HTMLMediaElement.HAVE_FUTURE_DATA`: from here the element can play on from where it is. */
const HAVE_FUTURE_DATA = 3

/**
 * What a player does as its page is shown again: play once more when it was playing as the page was
 * hidden and is paused now (as a browser pauses a page put away, unless the app paused it), move the
 * playhead a hair when it plays but its buffer stalled while away (as a background tab's media
 * engine is throttled and comes back stuck), and otherwise nothing.
 */
export function onReturn(wasPlaying: boolean, paused: boolean, readyState: number): 'play' | 'nudge' | null {
    if (!wasPlaying) return null
    if (paused) return 'play'
    return readyState < HAVE_FUTURE_DATA ? 'nudge' : null
}
