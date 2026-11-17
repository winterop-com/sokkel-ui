import { afterEach, describe, expect, test, vi } from 'vitest'

import type { HlsConfig } from 'hls.js'

import type { VideoError } from '@winterop-com/sokkel-ui/media/video-source'

import {
    hasMediaSource,
    hlsSource,
    hlsStats,
    isAppleWebKit,
    playsHlsNatively,
    retriesMissing,
    waitingConfig,
    type HlsModule,
} from './hls-source'

const STREAM = 'https://media.example.org/harbor/stream.m3u8'

/** User agents as each engine sends them; a WKWebView's names no Safari. */
const SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Safari/605.1.15'
const WKWEBVIEW = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)'
const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/156.0.8078.4 Mobile/15E148 Safari/604.1'
const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36'
const HEADLESS_CHROME =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.8078.4 Safari/537.36'
const ELECTRON =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Electron/41.0.0 Safari/537.36'
const EDGE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36 Edg/156.0.0.0'
const ANDROID = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36'
const FIREFOX = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:150.0) Gecko/20100101 Firefox/150.0'
const LINUX_WEBKIT = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko)'

type Listener = (event: string, data: unknown) => void

/** Stands in for hls.js: records what the source asks of it and lets a test raise its events. */
class FakeHls {
    static Events = { ERROR: 'hlsError', FRAG_BUFFERED: 'hlsFragBuffered', FRAG_LOADED: 'hlsFragLoaded' }
    static made: FakeHls[] = []
    /** hls.js's fragment policy as it ships. */
    static DefaultConfig = {
        fragLoadPolicy: {
            default: {
                maxTimeToFirstByteMs: 10000,
                maxLoadTimeMs: 120000,
                timeoutRetry: { maxNumRetry: 4, retryDelayMs: 0, maxRetryDelayMs: 0 },
                errorRetry: { maxNumRetry: 6, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
            },
        },
    }
    readonly calls: string[] = []
    readonly listeners = new Map<string, Listener[]>()
    media: unknown = null
    bandwidthEstimate = 18_400_000
    currentLevel = 1
    levels = [
        { bitrate: 1_200_000, width: 640, height: 360 },
        { bitrate: 4_200_000, width: 1280, height: 720 },
    ]
    mainForwardBufferInfo: { len: number } | null = { len: 11.5 }
    latestLevelDetails: { live: boolean } | null = { live: true }

    constructor(readonly config?: object) {
        FakeHls.made.push(this)
    }

    on(event: string, listener: Listener) {
        this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener])
    }

    emit(event: string, data: unknown = {}) {
        for (const listener of this.listeners.get(event) ?? []) listener(event, data)
    }

    fail(type: string, fatal = true, details = `${type}Details`) {
        this.emit(FakeHls.Events.ERROR, { type, details, fatal })
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

    stopLoad() {
        this.calls.push('stopLoad')
    }

    /** Asks the fragment policy hls.js was given whether to fetch a fragment again, as hls.js does after it fails. */
    shouldRetry(retryCount: number, code: number, retry = false): boolean | undefined {
        const errorRetry = (this.config as Partial<HlsConfig> | undefined)?.fragLoadPolicy?.default.errorRetry
        return errorRetry?.shouldRetry?.(errorRetry, retryCount, false, { code, data: '', url: STREAM }, retry)
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
async function attached(options: Parameters<typeof hlsSource>[1] = {}, startAt?: number) {
    FakeHls.made = []
    const engine = fake()
    const reports: VideoError[] = []
    const { video } = element(false)
    const source = hlsSource(STREAM, { load: engine.load, ...options })
    const detach = source.attach(
        video,
        (error) => {
            reports.push(error)
        },
        { startAt },
    )
    await Promise.resolve()
    return { hls: FakeHls.made[0], reports, detach, video, engine, source }
}

/** The settings hls.js was given, without the fragment policy the source adds for missing live segments. */
function given(hls: FakeHls): object {
    const { fragLoadPolicy: _policy, ...rest } = (hls.config ?? {}) as { fragLoadPolicy?: unknown }
    return rest
}

describe('an HLS source', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

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
        expect(given(hls)).toEqual({ lowLatencyMode: true })
        expect(hls.calls).toEqual([`loadSource ${STREAM}`, 'attachMedia'])
        expect(hls.media).toBe(video)
    })

    test("gives Apple's WebKit the stream to play itself, Media Source Extensions or not", () => {
        vi.stubGlobal('navigator', { userAgent: WKWEBVIEW })
        vi.stubGlobal('MediaSource', class {})
        const engine = fake()
        const { video } = element(true)
        hlsSource(STREAM, { load: engine.load }).attach(video, () => undefined)
        expect(video.src).toBe(STREAM)
        expect(engine.loads()).toBe(0)
    })

    test('plays through hls.js in Chromium, which says it plays HLS itself too', async () => {
        vi.stubGlobal('navigator', { userAgent: CHROME })
        vi.stubGlobal('MediaSource', class {})
        FakeHls.made = []
        const engine = fake()
        const { video } = element(true)
        const source = hlsSource(STREAM, { load: engine.load })
        source.attach(video, () => undefined)
        await Promise.resolve()
        expect(engine.loads()).toBe(1)
        expect(video.src).toBe('')
        expect(source.stats?.(video)?.engine).toBe('hls.js')
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

    test('fetches the playlist again when it is the playlist that failed, then gives up', async () => {
        const { hls, reports } = await attached({ recoveries: 2 })
        hls.fail('networkError', true, 'manifestLoadError')
        hls.fail('networkError', true, 'manifestLoadTimeOut')
        expect(hls.calls.slice(2)).toEqual([`loadSource ${STREAM}`, `loadSource ${STREAM}`])
        hls.fail('networkError', true, 'manifestLoadError')
        expect(reports.map((report) => report.fatal)).toEqual([false, false, true])
        expect(hls.calls).not.toContain('startLoad')
    })

    test('gives up at once on a playlist it cannot parse', async () => {
        const { hls, reports } = await attached()
        hls.fail('networkError', true, 'manifestParsingError')
        expect(reports).toEqual([{ kind: 'network', message: 'manifestParsingError', fatal: true }])
        expect(hls.calls.slice(2)).toEqual([])
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

    test('starts hls.js loading where the player picks up, so the first fragment fetched is the one played', async () => {
        expect(given((await attached({}, 312.4)).hls)).toEqual({ startPosition: 312.4 })
        expect(given((await attached({ config: { lowLatencyMode: true } }, 40)).hls)).toEqual({ lowLatencyMode: true, startPosition: 40 })
    })

    test("keeps the app's own start position over the player's", async () => {
        expect(given((await attached({ config: { startPosition: -1 } }, 312.4)).hls)).toEqual({ startPosition: -1 })
    })

    test("tells hls.js's bandwidth estimate, the rendition playing and the buffer ahead while attached", async () => {
        const { source, video, detach } = await attached()
        expect(source.stats?.(video)).toEqual({
            engine: 'hls.js',
            bandwidth: 18_400_000,
            level: { index: 1, count: 2, bitrate: 4_200_000, width: 1280, height: 720 },
            bufferAhead: 11.5,
            live: true,
        })
        detach()
        expect(source.stats?.(video)).toBeNull()
    })

    test('weighs the fragments loaded for a bitrate where the playlist declares none', async () => {
        const { hls, source, video } = await attached()
        hls.levels = [{ bitrate: 0, width: 1280, height: 720 }]
        hls.currentLevel = 0
        hls.emit(FakeHls.Events.FRAG_LOADED, { frag: { duration: 2, stats: { loaded: 640_000 } } })
        hls.emit(FakeHls.Events.FRAG_LOADED, { frag: { duration: 2, stats: { loaded: 610_000 } } })
        expect(source.stats?.(video)?.level).toEqual({ index: 0, count: 1, bitrate: 2_500_000, width: 1280, height: 720 })
    })

    test('tells no rendition before hls.js has picked one, and no estimate it has not measured', () => {
        const stats = hlsStats({
            bandwidthEstimate: Number.NaN,
            currentLevel: -1,
            levels: [],
            mainForwardBufferInfo: null,
            latestLevelDetails: null,
        } as unknown as Parameters<typeof hlsStats>[0])
        expect(stats).toEqual({ engine: 'hls.js', bandwidth: undefined, level: undefined, bufferAhead: undefined, live: undefined })
    })

    test('tells that the browser plays it itself', () => {
        const { video } = element(true)
        const source = hlsSource(STREAM, { load: fake().load })
        expect(source.stats?.(video)).toBeNull()
        const detach = source.attach(video, () => undefined)
        expect(source.stats?.(video)).toEqual({ engine: 'native' })
        detach()
        expect(source.stats?.(video)).toBeNull()
    })

    test("tells Apple's WebKit from Chromium and WebKit elsewhere", () => {
        for (const agent of [SAFARI, WKWEBVIEW, IPHONE, IPHONE_CHROME]) expect(isAppleWebKit(agent)).toBe(true)
        for (const agent of [CHROME, HEADLESS_CHROME, ELECTRON, EDGE, ANDROID, FIREFOX, LINUX_WEBKIT])
            expect(isAppleWebKit(agent)).toBe(false)
    })

    test("plays HLS itself in Apple's WebKit, and elsewhere only without Media Source Extensions", () => {
        const says = (answer: CanPlayTypeResult) => ({ canPlayType: () => answer })
        const withMse = { MediaSource: class {} }
        expect(playsHlsNatively(says('maybe'), { userAgent: WKWEBVIEW, scope: withMse })).toBe(true)
        expect(playsHlsNatively(says('maybe'), { userAgent: CHROME, scope: withMse })).toBe(false)
        expect(playsHlsNatively(says('maybe'), { userAgent: ELECTRON, scope: withMse })).toBe(false)
        expect(playsHlsNatively(says('maybe'), { userAgent: ANDROID, scope: {} })).toBe(true)
        expect(playsHlsNatively(says(''), { userAgent: SAFARI, scope: {} })).toBe(false)
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

    test("waits on a live stream's missing segment, fetching it again rather than skipping past it", async () => {
        const { hls, reports } = await attached()
        // hls.js retries no 4xx itself, and skips such a fragment on a live stream.
        expect(hls.shouldRetry(0, 404)).toBe(true)
        expect(hls.shouldRetry(5, 404)).toBe(true)
        expect(hls.shouldRetry(0, 503, true)).toBe(true)
        hls.latestLevelDetails = { live: false }
        expect(hls.shouldRetry(0, 404)).toBe(false)
        expect(reports).toEqual([])
    })

    test("gives up for the player to try again once a missing segment's fetches are spent, rather than skip it", async () => {
        const { hls, reports } = await attached()
        expect(hls.shouldRetry(6, 404)).toBe(false)
        // hls.js then marks the fragment a gap and tells the error, recovered.
        hls.fail('networkError', false, 'fragLoadError')
        expect(hls.calls.at(-1)).toBe('stopLoad')
        expect(reports).toEqual([{ kind: 'network', message: 'fragLoadError', fatal: true }])
        hls.fail('networkError', false, 'fragLoadError')
        expect(reports).toHaveLength(1)
    })

    test('skips missing segments as hls.js does when told to', async () => {
        const { hls } = await attached({ skipMissing: true })
        expect(hls.config).toBeUndefined()
        expect(hls.shouldRetry(0, 404)).toBeUndefined()
    })

    test("keeps the app's own retry decision and a policy that never retries", () => {
        const own = () => false
        const policy = {
            ...FakeHls.DefaultConfig.fragLoadPolicy.default,
            errorRetry: { maxNumRetry: 2, retryDelayMs: 1, maxRetryDelayMs: 1, shouldRetry: own },
        }
        const config = { fragLoadPolicy: { default: policy } }
        expect(
            waitingConfig(
                config,
                FakeHls.DefaultConfig as never,
                () => true,
                () => undefined,
            ),
        ).toBe(config)
        const never = { fragLoadPolicy: { default: { ...policy, errorRetry: null } } }
        expect(
            waitingConfig(
                never,
                FakeHls.DefaultConfig as never,
                () => true,
                () => undefined,
            ),
        ).toBe(never)
    })

    test("builds on the app's own fragment policy", () => {
        const errorRetry = { maxNumRetry: 2, retryDelayMs: 500, maxRetryDelayMs: 4000 }
        const config = {
            lowLatencyMode: true,
            fragLoadPolicy: { default: { ...FakeHls.DefaultConfig.fragLoadPolicy.default, errorRetry } },
        }
        const made = waitingConfig(
            config,
            FakeHls.DefaultConfig as never,
            () => true,
            () => undefined,
        )
        expect(made?.lowLatencyMode).toBe(true)
        expect(made?.fragLoadPolicy?.default.errorRetry).toMatchObject(errorRetry)
        expect(made?.fragLoadPolicy?.default.errorRetry?.shouldRetry).toBeTypeOf('function')
    })
})

describe('a missing fragment fetched again', () => {
    const policy = { maxNumRetry: 6 }

    test('is any hls.js would fetch again itself', () => {
        expect(retriesMissing(true, 0, policy, { code: 503 }, false)).toBe(true)
    })

    test("is one a live stream's server answers missing, while the policy's tries last", () => {
        expect(retriesMissing(false, 0, policy, { code: 404 }, true)).toBe(true)
        expect(retriesMissing(false, 5, policy, { code: 410 }, true)).toBe(true)
        expect(retriesMissing(false, 6, policy, { code: 404 }, true)).toBe(false)
    })

    test('is none of a stream that is not live, nor an error that is no 4xx, nor without a policy', () => {
        expect(retriesMissing(false, 0, policy, { code: 404 }, false)).toBe(false)
        expect(retriesMissing(false, 0, policy, { code: 0 }, true)).toBe(false)
        expect(retriesMissing(false, 0, policy, undefined, true)).toBe(false)
        expect(retriesMissing(false, 0, null, { code: 404 }, true)).toBe(false)
    })
})
