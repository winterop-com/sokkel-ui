import { useEffect, useLayoutEffect, useRef } from 'react'

import {
    bindActions,
    describeMedia,
    MEDIA_SESSION_ACTIONS,
    mediaSession,
    needsPosition,
    positionOf,
    runAction,
    tellPlaying,
    tellPosition,
    type MediaSessionInfo,
    type ToldPosition,
} from './media-session'

export type { MediaSessionHandlers, MediaSessionImage, MediaSessionInfo, MediaSkip } from './media-session'

/**
 * Tells the operating system what plays, so its media keys, its now-playing widget and the lock
 * screen show it and control it: the title, artist, album and artwork as the session's metadata,
 * whether it plays, the position along its `duration` at its `rate`, and a handler for each of
 * the system's controls the app gives (play, pause, stop, previoustrack, nexttrack, seekbackward,
 * seekforward, seekto). Pass `null` while nothing plays.
 *
 * Call it once, where the app's player state lives. The position is told again only when it
 * strays from where the system runs it on to by itself, so passing the clock as it ticks costs
 * nothing; a live stream passes no duration and tells no position. Handlers may change on every
 * render: each control is bound once and calls the latest. Unmounting takes it all away. Where
 * the browser has no media session it does nothing.
 */
export function useMediaSession(info: MediaSessionInfo | null | undefined): void {
    const latest = useRef(info)
    useLayoutEffect(() => {
        latest.current = info
    })

    const active = info !== null && info !== undefined
    const title = info?.title
    const artist = info?.artist
    const album = info?.album
    const artwork = info?.artwork === undefined || typeof info.artwork === 'string' ? info?.artwork : JSON.stringify(info.artwork)
    const playing = info?.playing ?? false
    useEffect(() => {
        const session = mediaSession()
        if (session === undefined) return
        const now = latest.current
        describeMedia(session, now === null || now === undefined ? null : now)
    }, [active, title, artist, album, artwork])

    useEffect(() => {
        const session = mediaSession()
        if (session !== undefined) tellPlaying(session, active ? playing : null)
    }, [active, playing])

    const told = useRef<ToldPosition | null>(null)
    const state = active ? positionOf(info) : undefined
    const duration = state?.duration
    const position = state?.position
    const rate = state?.playbackRate
    useEffect(() => {
        const session = mediaSession()
        if (session === undefined) return
        if (duration === undefined || position === undefined) {
            if (told.current !== null) tellPosition(session, undefined)
            told.current = null
            return
        }
        const next: ToldPosition = { state: { duration, position, playbackRate: rate }, playing, at: performance.now() }
        if (!needsPosition(told.current, next)) return
        told.current = tellPosition(session, next.state) ? next : null
    }, [duration, position, rate, playing])

    const actions = MEDIA_SESSION_ACTIONS.filter((action) => info?.handlers?.[action] !== undefined).join(' ')
    useEffect(() => {
        const session = mediaSession()
        if (session === undefined || actions === '') return
        return bindActions(session, actions.split(' ') as typeof MEDIA_SESSION_ACTIONS, (action, details) =>
            runAction(latest.current?.handlers, action, details, latest.current?.skip),
        )
    }, [actions])

    useEffect(
        () => () => {
            const session = mediaSession()
            if (session === undefined) return
            describeMedia(session, null)
            tellPlaying(session, null)
            tellPosition(session, undefined)
            told.current = null
        },
        [],
    )
}
