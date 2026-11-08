/**
 * What plays, told to the operating system through the Media Session API: the media keys, the
 * now-playing widget and the lock screen. Every function here is safe where the API is missing,
 * and `useMediaSession` (`use-media-session`) is built on them.
 */

/** The system's controls an app can answer, by the API's own names. */
export type MediaSessionActionName = 'play' | 'pause' | 'stop' | 'previoustrack' | 'nexttrack' | 'seekbackward' | 'seekforward' | 'seekto'

export const MEDIA_SESSION_ACTIONS: readonly MediaSessionActionName[] = [
    'play',
    'pause',
    'stop',
    'previoustrack',
    'nexttrack',
    'seekbackward',
    'seekforward',
    'seekto',
]

/** What each of the system's controls does; a control with no handler is not offered. */
export interface MediaSessionHandlers {
    play?: () => void
    pause?: () => void
    stop?: () => void
    previoustrack?: () => void
    nexttrack?: () => void
    /** Moves back by the seconds given: the system's own offset, or the session's `skip`. */
    seekbackward?: (seconds: number) => void
    /** Moves forward by the seconds given: the system's own offset, or the session's `skip`. */
    seekforward?: (seconds: number) => void
    /** Goes to the second given. */
    seekto?: (seconds: number) => void
}

/** A picture of what plays: its address and, when known, its size ("512x512") and type. */
export interface MediaSessionImage {
    src: string
    sizes?: string
    type?: string
}

/** What plays, as the system is told it. */
export interface MediaSessionInfo {
    title: string
    artist?: string
    album?: string
    /** A picture's address, or the picture at several sizes. */
    artwork?: string | readonly MediaSessionImage[]
    /** The length in seconds. Zero, unknown or infinite, as on a live stream, tells no position. */
    duration?: number
    /** Seconds from the start. */
    position?: number
    /** The playback speed, as a multiple of normal: 1 by default. */
    rate?: number
    playing: boolean
    handlers?: MediaSessionHandlers
    /** How far `seekbackward` and `seekforward` move when the system gives no offset, in seconds: 15 by default. */
    skip?: number
}

/** How far the system's seek buttons move when it gives no offset, in seconds. */
export const MEDIA_SESSION_SKIP = 15

/** How far, in seconds, the position may stray from where the system has been running it on to before it is told again. */
export const POSITION_DRIFT = 1

/** The page's media session, or `undefined` where the browser has none. */
export function mediaSession(): MediaSession | undefined {
    const browser = (globalThis as { navigator?: { mediaSession?: MediaSession } }).navigator
    return browser?.mediaSession ?? undefined
}

/** The artwork as the API takes it: a list of pictures. */
export function artworkOf(artwork: MediaSessionInfo['artwork']): MediaImage[] {
    if (artwork === undefined) return []
    if (typeof artwork === 'string') return artwork === '' ? [] : [{ src: artwork }]
    return artwork.map((image) => ({ ...image }))
}

/** Tells the system what plays, or that nothing does for `null`. Where the browser has no `MediaMetadata` it is not told. */
export function describeMedia(session: MediaSession, info: Pick<MediaSessionInfo, 'title' | 'artist' | 'album' | 'artwork'> | null) {
    if (info === null) {
        session.metadata = null
        return
    }
    const Metadata = (globalThis as { MediaMetadata?: typeof MediaMetadata }).MediaMetadata
    if (Metadata === undefined) return
    session.metadata = new Metadata({
        title: info.title,
        artist: info.artist ?? '',
        album: info.album ?? '',
        artwork: artworkOf(info.artwork),
    })
}

/** Tells the system whether it plays: `null` while nothing does. */
export function tellPlaying(session: MediaSession, playing: boolean | null) {
    session.playbackState = playing === null ? 'none' : playing ? 'playing' : 'paused'
}

/** The position as the API takes it, or `undefined` when there is no length to place it on. */
export function positionOf(info: Pick<MediaSessionInfo, 'duration' | 'position' | 'rate'>): MediaPositionState | undefined {
    const duration = info.duration ?? 0
    if (!Number.isFinite(duration) || duration <= 0) return undefined
    const position = info.position ?? 0
    const rate = info.rate ?? 1
    return {
        duration,
        position: Math.min(duration, Math.max(0, Number.isFinite(position) ? position : 0)),
        playbackRate: Number.isFinite(rate) && rate > 0 ? rate : 1,
    }
}

/** A position as last told, with whether it was playing and when, in milliseconds on any steady clock. */
export interface ToldPosition {
    state: MediaPositionState
    playing: boolean
    at: number
}

/**
 * Whether the system needs the position again. It runs a playing position on by itself, so it is
 * told when the length, the speed or playing changes, or when the position strays more than
 * `POSITION_DRIFT` seconds from where it has run it to: a seek, a skip, a chapter.
 */
export function needsPosition(told: ToldPosition | null, next: ToldPosition): boolean {
    if (told === null) return true
    const { state: last } = told
    if (told.playing !== next.playing || last.duration !== next.state.duration || last.playbackRate !== next.state.playbackRate) return true
    const ran = told.playing ? ((next.at - told.at) / 1000) * (last.playbackRate ?? 1) : 0
    return Math.abs((last.position ?? 0) + ran - (next.state.position ?? 0)) > POSITION_DRIFT
}

/** Tells the system the position, or clears it for `undefined`. A position the browser refuses is let go. */
export function tellPosition(session: MediaSession, state: MediaPositionState | undefined): boolean {
    if (typeof session.setPositionState !== 'function') return false
    try {
        if (state === undefined) session.setPositionState()
        else session.setPositionState(state)
        return true
    } catch {
        return false
    }
}

/** Runs the handler for `action` with what the system said, the seek buttons moving `skip` seconds when it gave no offset. */
export function runAction(
    handlers: MediaSessionHandlers | undefined,
    action: MediaSessionActionName,
    details: Pick<MediaSessionActionDetails, 'seekOffset' | 'seekTime'>,
    skip: number = MEDIA_SESSION_SKIP,
) {
    if (handlers === undefined) return
    switch (action) {
        case 'seekbackward':
            handlers.seekbackward?.(details.seekOffset ?? skip)
            return
        case 'seekforward':
            handlers.seekforward?.(details.seekOffset ?? skip)
            return
        case 'seekto':
            if (details.seekTime !== undefined) handlers.seekto?.(details.seekTime)
            return
        default:
            handlers[action]?.()
    }
}

/**
 * Answers `actions` through `run` until the returned function is called, which takes them away
 * again. An action the browser does not know is left out, and the rest still answer.
 */
export function bindActions(
    session: MediaSession,
    actions: readonly MediaSessionActionName[],
    run: (action: MediaSessionActionName, details: MediaSessionActionDetails) => void,
): () => void {
    const bound: MediaSessionActionName[] = []
    for (const action of actions) {
        try {
            session.setActionHandler(action, (details) => run(action, details))
            bound.push(action)
        } catch {
            // An action this browser does not know.
        }
    }
    return () => {
        for (const action of bound) {
            try {
                session.setActionHandler(action, null)
            } catch {
                // Already gone with the page.
            }
        }
    }
}
