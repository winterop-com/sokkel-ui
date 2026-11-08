import { describe, expect, test } from 'vitest'

import type { VideoError } from '@winterop-com/sokkel-ui/media/video-source'

import { hasMediaSource, hlsSource, type HlsModule } from './hls-source'

const STREAM = 'https://media.example.org/harbor/stream.m3u8'

type Listener = (event: string, data: unknown) => void

/** Stands in for hls.js: records what the source asks of it and lets a test raise its events. */
class FakeHls {
    static Events = { ERROR: 'hlsError', FRAG_BUFFERED: 'hlsFragBuffered' }
    static made: FakeHls[] = []
    readonly calls: string[] = []
    readonly listeners = new Map<string, Listener[]>()
    media: unknown = null

    constructor(readonly config?: object) {
        FakeHls.made.push(this)
    }

    on(event: string, listener: Listener) {
        this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener])
    }

    emit(event: string, data: unknown = {}) {
        for (const listener of this.listeners.get(event) ?? []) listener(event, data)
    }

    fail(type: string, fatal = true) {
        this.emit(FakeHls.Events.ERROR, { type, details: `${type}Details`, fatal })
    }

    loadSource(url: string) {
        this.calls.push(`loadSource ${url}`)
    }

    attachMedia(media: unknown) {
        this.media = media
        this.calls.push('attachMedia')
    }

    startLoad() {
        this.calls.push('startLoad')
    }

    recoverMediaError() {
        this.calls.push('recoverMediaError')
    }

    swapAudioCodec() {
        this.calls.push('swapAudioCodec')
    }

    destroy() {
        this.calls.push('destroy')
    }
}

/** A video element as far as the source reads one, playing HLS itself or not. */
function element(native: boolean) {
    const calls: string[] = []
    const video = {
        src: '',
        canPlayType: (type: string) => (native && type === 'application/vnd.apple.mpegurl' ? 'maybe' : ''),
        removeAttribute: (name: string) => {
            calls.push(`removeAttribute ${name}`)
        },
        load: () => {
            calls.push('load')
        },
    }
    return { video: video as unknown as HTMLVideoElement & { src: string }, calls }
}

function fake(): { load: () => Promise<HlsModule>; loads: () => number } {
    let loads = 0
    return {
        load: () => {
            loads += 1
            return Promise.resolve({ default: FakeHls as unknown as HlsModule['default'] })
        },
        loads: () => loads,
    }
}

/** Attaches a source playing through the fake and waits for the engine to be made. */
async function attached(options: Parameters<typeof hlsSource>[1] = {}) {
    FakeHls.made = []
    const engine = fake()
    const reports: VideoError[] = []
    const { video } = element(false)
    const detach = hlsSource(STREAM, { load: engine.load, ...options }).attach(video, (error) => {
        reports.push(error)
    })
    await Promise.resolve()
    return { hls: FakeHls.made[0], reports, detach, video, engine }
}

describe('an HLS source', () => {
    test('is known by its URL', () => {
        expect(hlsSource(STREAM).id).toBe(STREAM)
    })

    test('gives a browser that plays HLS itself the STREAM, and never loads hls.js', () => {
        const engine = fake()
        const { video, calls } = element(true)
        const detach = hlsSource(STREAM, { load: engine.load }).attach(video, () => undefined)
        expect(video.src).toBe(STREAM)
        expect(engine.loads()).toBe(0)
        detach()
        expect(calls).toEqual(['removeAttribute src', 'load'])
    })

    test('plays through hls.js, given its settings, where the browser does not play HLS', async () => {
        const { hls, video, engine } = await attached({ config: { lowLatencyMode: true } })
        expect(engine.loads()).toBe(1)
        expect(hls.config).toEqual({ lowLatencyMode: true })
        expect(hls.calls).toEqual([`loadSource ${STREAM}`, 'attachMedia'])
        expect(hls.media).toBe(video)
    })

    test('plays through hls.js even where the browser could, when told not to play natively', async () => {
        FakeHls.made = []
        const engine = fake()
        const { video } = element(true)
        hlsSource(STREAM, { load: engine.load, native: false }).attach(video, () => undefined)
        await Promise.resolve()
        expect(engine.loads()).toBe(1)
        expect(video.src).toBe('')
    })

    test('lets hls.js go when taken away', async () => {
        const { hls, detach } = await attached()
        detach()
        expect(hls.calls.at(-1)).toBe('destroy')
    })

    test('makes no engine when taken away before hls.js has loaded', async () => {
        FakeHls.made = []
        const engine = fake()
        const { video } = element(false)
        hlsSource(STREAM, { load: engine.load }).attach(video, () => undefined)()
        await Promise.resolve()
        expect(FakeHls.made).toEqual([])
    })

    test('loads again after a fatal network error, then gives up', async () => {
        const { hls, reports } = await attached({ recoveries: 2 })
        hls.fail('networkError')
        hls.fail('networkError')
        expect(hls.calls.filter((call) => call === 'startLoad')).toHaveLength(2)
        expect(reports.map((report) => report.fatal)).toEqual([false, false])
        hls.fail('networkError')
        expect(reports.at(-1)).toEqual({ kind: 'network', message: 'networkErrorDetails', fatal: true })
    })

    test('recovers the decoder after a fatal media error, swapping the audio codec from the second time', async () => {
        const { hls, reports } = await attached({ recoveries: 2 })
        hls.fail('mediaError')
        expect(hls.calls.slice(2)).toEqual(['recoverMediaError'])
        hls.fail('mediaError')
        expect(hls.calls.slice(3)).toEqual(['swapAudioCodec', 'recoverMediaError'])
        hls.fail('mediaError')
        expect(reports.map((report) => [report.kind, report.fatal])).toEqual([
            ['decode', false],
            ['decode', false],
            ['decode', true],
        ])
    })

    test('counts its recoveries from zero again once a fragment is buffered', async () => {
        const { hls, reports } = await attached({ recoveries: 1 })
        hls.fail('networkError')
        hls.emit(FakeHls.Events.FRAG_BUFFERED)
        hls.fail('networkError')
        expect(reports.every((report) => !report.fatal)).toBe(true)
    })

    test('gives up at once on an error it cannot recover from, and tells none that hls.js recovers by itself', async () => {
        const { hls, reports } = await attached()
        hls.fail('networkError', false)
        expect(reports).toEqual([])
        hls.fail('keySystemError')
        expect(reports).toEqual([{ kind: 'other', message: 'keySystemErrorDetails', fatal: true }])
    })

    test('gives up when hls.js cannot be loaded', async () => {
        const reports: VideoError[] = []
        const { video } = element(false)
        hlsSource(STREAM, { load: () => Promise.reject(new Error('Failed to fetch dynamically imported module')) }).attach(
            video,
            (error) => {
                reports.push(error)
            },
        )
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(reports).toEqual([{ kind: 'other', message: 'Failed to fetch dynamically imported module', fatal: true }])
    })

    test('can play where the browser plays HLS or has Media Source Extensions', () => {
        const { video: native } = element(true)
        const { video: plain } = element(false)
        expect(hlsSource(STREAM).canPlay?.(native)).toBe(true)
        expect(hlsSource(STREAM, { native: false }).canPlay?.(native)).toBe(hasMediaSource())
        expect(hasMediaSource({ MediaSource: class {} })).toBe(true)
        expect(hasMediaSource({ ManagedMediaSource: class {} })).toBe(true)
        expect(hasMediaSource({})).toBe(false)
        expect(hlsSource(STREAM).canPlay?.(plain)).toBe(hasMediaSource())
    })
})
