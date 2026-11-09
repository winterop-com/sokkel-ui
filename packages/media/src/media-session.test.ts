import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    artworkOf,
    bindActions,
    describeMedia,
    mediaSession,
    needsPosition,
    positionOf,
    runAction,
    skipBy,
    tellPlaying,
    tellPosition,
    type MediaSessionActionName,
} from './media-session'

type Handler = ((details: MediaSessionActionDetails) => void) | null

/** A media session as a browser keeps one, recording what it is told; `refuses` names actions it does not know. */
function fakeSession(refuses: readonly string[] = []) {
    const handlers = new Map<string, Handler>()
    const positions: (MediaPositionState | undefined)[] = []
    const session = {
        metadata: null as MediaMetadata | null,
        playbackState: 'none' as MediaSessionPlaybackState,
        setActionHandler(action: string, handler: Handler) {
            if (refuses.includes(action)) throw new TypeError(`${action} is not a known action`)
            if (handler === null) handlers.delete(action)
            else handlers.set(action, handler)
        },
        setPositionState(state?: MediaPositionState) {
            if (state !== undefined && (state.position ?? 0) > (state.duration ?? 0)) throw new TypeError('position past the end')
            positions.push(state)
        },
    }
    const press = (action: MediaSessionActionName, details: Partial<MediaSessionActionDetails> = {}) =>
        handlers.get(action)?.({ action, ...details })
    return { session: session as unknown as MediaSession, fake: session, handlers, positions, press }
}

/** The browser's metadata, which keeps what it is given. */
class FakeMetadata {
    constructor(init: MediaMetadataInit) {
        Object.assign(this, init)
    }
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('the media session', () => {
    it('is found on the navigator, and is nothing where the browser has none', () => {
        const { session } = fakeSession()
        vi.stubGlobal('navigator', { mediaSession: session })
        expect(mediaSession()).toBe(session)
        vi.stubGlobal('navigator', {})
        expect(mediaSession()).toBeUndefined()
        vi.stubGlobal('navigator', undefined)
        expect(mediaSession()).toBeUndefined()
    })

    it('is told what plays, its artwork as a list, and nothing once it stops', () => {
        vi.stubGlobal('MediaMetadata', FakeMetadata)
        const { session, fake } = fakeSession()
        describeMedia(session, { title: 'Northern Coast', artist: 'Ada', album: 'Larkspur', artwork: 'https://example.org/cover.png' })
        expect(fake.metadata).toEqual({
            title: 'Northern Coast',
            artist: 'Ada',
            album: 'Larkspur',
            artwork: [{ src: 'https://example.org/cover.png' }],
        })
        describeMedia(session, null)
        expect(fake.metadata).toBeNull()
    })

    it('leaves the metadata alone where the browser cannot make it', () => {
        vi.stubGlobal('MediaMetadata', undefined)
        const { session, fake } = fakeSession()
        describeMedia(session, { title: 'Northern Coast' })
        expect(fake.metadata).toBeNull()
    })

    it('says whether it plays', () => {
        const { session, fake } = fakeSession()
        tellPlaying(session, true)
        expect(fake.playbackState).toBe('playing')
        tellPlaying(session, false)
        expect(fake.playbackState).toBe('paused')
        tellPlaying(session, null)
        expect(fake.playbackState).toBe('none')
    })

    it('takes artwork as an address or as pictures at several sizes', () => {
        expect(artworkOf(undefined)).toEqual([])
        expect(artworkOf('')).toEqual([])
        const sizes = [{ src: 'https://example.org/96.png', sizes: '96x96' }]
        expect(artworkOf(sizes)).toEqual(sizes)
        expect(artworkOf(sizes)).not.toBe(sizes)
    })

    it('places the position on the length, and has none on a live stream', () => {
        expect(positionOf({ duration: 300, position: 320, rate: 1.5 })).toEqual({ duration: 300, position: 300, playbackRate: 1.5 })
        expect(positionOf({ duration: 300, position: -4 })).toEqual({ duration: 300, position: 0, playbackRate: 1 })
        expect(positionOf({ duration: Number.POSITIVE_INFINITY, position: 40 })).toBeUndefined()
        expect(positionOf({ duration: 0 })).toBeUndefined()
        expect(positionOf({})).toBeUndefined()
    })

    it('is told the position again only when it strays from where the system runs it', () => {
        const told = { state: { duration: 300, position: 10, playbackRate: 1 }, playing: true, at: 0 }
        const at = (position: number, ms: number, more: Partial<typeof told> = {}) => ({
            ...told,
            state: { ...told.state, position },
            at: ms,
            ...more,
        })
        expect(needsPosition(null, told)).toBe(true)
        expect(needsPosition(told, at(12, 2000))).toBe(false)
        expect(needsPosition(told, at(40, 2000))).toBe(true)
        expect(needsPosition(told, at(10, 2000, { playing: false }))).toBe(true)
        expect(needsPosition(told, at(12, 2000, { state: { duration: 300, position: 12, playbackRate: 2 } }))).toBe(true)
        const paused = { ...told, playing: false }
        expect(needsPosition(paused, { ...paused, at: 5000 })).toBe(false)
    })

    it('tells the position, clears it, and lets go of one the browser refuses', () => {
        const { session, positions } = fakeSession()
        expect(tellPosition(session, { duration: 300, position: 30, playbackRate: 1 })).toBe(true)
        expect(tellPosition(session, undefined)).toBe(true)
        expect(tellPosition(session, { duration: 30, position: 300, playbackRate: 1 })).toBe(false)
        expect(positions).toEqual([{ duration: 300, position: 30, playbackRate: 1 }, undefined])
        expect(tellPosition({} as MediaSession, undefined)).toBe(false)
    })

    it('answers the controls it binds, skips those the browser does not know, and takes them away', () => {
        const { session, handlers, press } = fakeSession(['stop'])
        const run = vi.fn()
        const unbind = bindActions(session, ['play', 'stop', 'seekto'], run)
        expect([...handlers.keys()]).toEqual(['play', 'seekto'])
        press('seekto', { seekTime: 42 })
        expect(run).toHaveBeenCalledWith('seekto', { action: 'seekto', seekTime: 42 })
        unbind()
        expect(handlers.size).toBe(0)
    })

    it('runs each control with what the system said, the seek buttons moving the skip without an offset', () => {
        const handlers = {
            play: vi.fn(),
            nexttrack: vi.fn(),
            seekbackward: vi.fn(),
            seekforward: vi.fn(),
            seekto: vi.fn(),
        }
        runAction(handlers, 'play', {})
        runAction(handlers, 'nexttrack', {})
        runAction(handlers, 'seekbackward', {})
        runAction(handlers, 'seekforward', { seekOffset: 10 })
        runAction(handlers, 'seekforward', {}, 30)
        runAction(handlers, 'seekto', { seekTime: 95 })
        runAction(handlers, 'seekto', {})
        runAction(handlers, 'pause', {})
        runAction(undefined, 'play', {})
        expect(handlers.play).toHaveBeenCalledTimes(1)
        expect(handlers.nexttrack).toHaveBeenCalledTimes(1)
        expect(handlers.seekbackward).toHaveBeenCalledWith(15)
        expect(handlers.seekforward.mock.calls).toEqual([[10], [30]])
        expect(handlers.seekto.mock.calls).toEqual([[95]])
    })

    it('moves the seek buttons each by its own skip when given a pair', () => {
        const handlers = { seekbackward: vi.fn(), seekforward: vi.fn() }
        const skip = { back: 15, forward: 30 }
        runAction(handlers, 'seekbackward', {}, skip)
        runAction(handlers, 'seekforward', {}, skip)
        runAction(handlers, 'seekforward', { seekOffset: 10 }, skip)
        expect(handlers.seekbackward.mock.calls).toEqual([[15]])
        expect(handlers.seekforward.mock.calls).toEqual([[30], [10]])
        expect([skipBy(20, 'back'), skipBy(20, 'forward'), skipBy(skip, 'back'), skipBy(skip, 'forward')]).toEqual([20, 20, 15, 30])
    })
})
