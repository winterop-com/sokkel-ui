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
    /** Gives the element its media and returns what takes it away again. */
    attach: (video: HTMLVideoElement, report: VideoSourceReport) => () => void
    /** Whether this browser can play it; when it cannot, the player says so and attaches nothing. */
    canPlay?: (video: HTMLVideoElement) => boolean
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
