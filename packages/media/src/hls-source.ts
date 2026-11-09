import type Hls from 'hls.js'
import type { ErrorData, FragLoadedData, HlsConfig } from 'hls.js'

import type { VideoErrorKind, VideoSource, VideoSourceStats } from '@winterop-com/sokkel-ui/media/video-source'

/** hls.js as its module hands it over. */
export interface HlsModule {
    default: typeof Hls
}

export interface HlsSourceOptions {
    /** hls.js's own settings, passed to it as given. */
    config?: Partial<HlsConfig>
    /**
     * Whether Apple's WebKit plays the stream with its own HLS, without hls.js (Safari, the WKWebView
     * a desktop shell draws on macOS, every browser on an iPhone or iPad), as does a browser that
     * plays HLS but has no Media Source Extensions for hls.js. Off, hls.js plays it wherever the
     * browser has Media Source Extensions. Chromium, which says it plays HLS too, plays it through
     * hls.js either way (`playsHlsNatively`).
     */
    native?: boolean
    /**
     * How many times hls.js recovers from a fatal network or media error before the source gives up
     * and leaves the next try to the player. Each kind counts its own, from zero again once a
     * fragment is buffered.
     */
    recoveries?: number
    /** Loads hls.js: by default a dynamic import of `hls.js`, fetched only when a stream needs it. */
    load?: () => Promise<HlsModule>
}

/** The type a browser that plays HLS itself answers to. */
export const HLS_TYPE = 'application/vnd.apple.mpegurl'

/** Whether the browser has Media Source Extensions, which hls.js plays through. */
export function hasMediaSource(scope: object = globalThis): boolean {
    return 'MediaSource' in scope || 'ManagedMediaSource' in scope || 'WebKitMediaSource' in scope
}

/**
 * Whether a user agent is Apple's WebKit, whose own HLS is Apple's media stack: Safari, a WKWebView
 * (whose user agent names no Safari), and every browser on an iPhone or iPad. Not Chromium, which
 * names AppleWebKit too, nor WebKit on Linux.
 */
export function isAppleWebKit(userAgent: string): boolean {
    return /AppleWebKit\//.test(userAgent) && /Macintosh|iPhone|iPad|iPod/.test(userAgent) && !/Chrome\/|Chromium\/|Android/.test(userAgent)
}

/** What decides whether a browser plays HLS itself, read from the page unless given. */
export interface NativeHlsContext {
    userAgent?: string
    /** Where Media Source Extensions would be: the window. */
    scope?: object
}

/**
 * Whether the element plays HLS itself rather than through hls.js: where it says it can, in Apple's
 * WebKit, and in a browser with no Media Source Extensions for hls.js. Chromium says it can too, but
 * its own player fails a live stream played after loading paused, so hls.js plays it there.
 */
export function playsHlsNatively(
    video: Pick<HTMLVideoElement, 'canPlayType'>,
    { userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent, scope = globalThis }: NativeHlsContext = {},
): boolean {
    return video.canPlayType(HLS_TYPE) !== '' && (isAppleWebKit(userAgent) || !hasMediaSource(scope))
}

function kindOf(type: string): VideoErrorKind {
    if (type === 'networkError') return 'network'
    if (type === 'mediaError' || type === 'muxError') return 'decode'
    return 'other'
}

const loadHls = () => import('hls.js')

/** A number hls.js reports, when it is one: its estimates are `NaN` until it has measured. */
const measured = (value: number | undefined): number | undefined =>
    value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined

/** What the fragments hls.js has loaded weigh and last, for a bitrate where the playlist declares none. */
export interface HlsLoaded {
    bytes: number
    /** Seconds of media. */
    duration: number
}

/**
 * What hls.js knows of the playback it drives, for a stats overlay. A rendition's bitrate is what
 * its playlist declares, or, for a lone media playlist that declares none (as an encoder writes
 * one), what the fragments loaded so far weigh per second.
 */
export function hlsStats(
    hls: Pick<Hls, 'bandwidthEstimate' | 'currentLevel' | 'levels' | 'mainForwardBufferInfo' | 'latestLevelDetails'>,
    loaded?: HlsLoaded,
): VideoSourceStats {
    const index = hls.currentLevel
    const level = index >= 0 ? hls.levels[index] : undefined
    const weighed = loaded !== undefined && loaded.duration > 0 ? (loaded.bytes * 8) / loaded.duration : undefined
    return {
        engine: 'hls.js',
        bandwidth: measured(hls.bandwidthEstimate),
        level:
            level === undefined
                ? undefined
                : {
                      index,
                      count: hls.levels.length,
                      bitrate: measured(level.bitrate) ?? measured(weighed),
                      width: measured(level.width),
                      height: measured(level.height),
                  },
        bufferAhead: hls.mainForwardBufferInfo?.len,
        live: hls.latestLevelDetails?.live,
    }
}

/**
 * An HTTP live stream (HLS) for `VideoPlayer`'s `source`, from the URL of its playlist.
 *
 * Apple's WebKit, and a browser with no Media Source Extensions that plays HLS itself, is given the
 * URL (`playsHlsNatively`); any other browser, Chromium included, loads hls.js the first time a
 * stream plays, by a dynamic import, and plays it through Media Source Extensions. hls.js is an
 * optional peer dependency of this package, installed by the app that plays streams. hls.js starts
 * loading where the player picks up (`startAt`, or where a try resumes), so the first fragment fetched is
 * the one played, and a live stream with no such point starts at its live edge. A fatal network
 * error loads again and a fatal media error recovers the decoder, `recoveries` times each, before
 * the source gives up and the player's own tries take over; every error is told to the player's
 * `onError`. Its `stats` give the player's handle hls.js's bandwidth estimate, the rendition
 * playing and the buffer ahead.
 */
export function hlsSource(url: string, { config, native = true, recoveries = 3, load = loadHls }: HlsSourceOptions = {}): VideoSource {
    // The engine playing each element this source is attached to, with what it has loaded, for its stats; `native` where the browser plays it.
    const engines = new WeakMap<HTMLVideoElement, { hls: Hls; loaded: HlsLoaded } | 'native'>()
    return {
        id: url,
        canPlay: (video) => (native && playsHlsNatively(video)) || hasMediaSource(),
        stats: (video) => {
            const engine = engines.get(video)
            if (engine === undefined) return null
            return engine === 'native' ? { engine: 'native' } : hlsStats(engine.hls, engine.loaded)
        },
        attach: (video, report, { startAt } = {}) => {
            if (native && playsHlsNatively(video)) {
                video.src = url
                engines.set(video, 'native')
                return () => {
                    if (engines.get(video) === 'native') engines.delete(video)
                    video.removeAttribute('src')
                    video.load()
                }
            }
            let gone = false
            let engine: Hls | null = null
            void load().then(
                ({ default: Engine }) => {
                    if (gone) return
                    const hls = new Engine(
                        startAt === undefined || config?.startPosition !== undefined ? config : { ...config, startPosition: startAt },
                    )
                    engine = hls
                    const loaded: HlsLoaded = { bytes: 0, duration: 0 }
                    engines.set(video, { hls, loaded })
                    let network = 0
                    let media = 0
                    hls.on(Engine.Events.FRAG_LOADED, (_event: string, data: FragLoadedData) => {
                        loaded.bytes += data.frag.stats.loaded
                        loaded.duration += data.frag.duration
                    })
                    hls.on(Engine.Events.FRAG_BUFFERED, () => {
                        network = 0
                        media = 0
                    })
                    hls.on(Engine.Events.ERROR, (_event: string, data: ErrorData) => {
                        if (!data.fatal) return
                        const kind = kindOf(data.type)
                        const message = data.error?.message ?? data.details
                        if (kind === 'network' && network < recoveries) {
                            network += 1
                            report({ kind, message, fatal: false })
                            hls.startLoad()
                        } else if (kind === 'decode' && media < recoveries) {
                            media += 1
                            report({ kind, message, fatal: false })
                            if (media > 1) hls.swapAudioCodec()
                            hls.recoverMediaError()
                        } else {
                            report({ kind, message, fatal: true })
                        }
                    })
                    hls.loadSource(url)
                    hls.attachMedia(video)
                },
                (error: unknown) => {
                    if (gone) return
                    report({ kind: 'other', message: error instanceof Error ? error.message : 'hls.js could not be loaded', fatal: true })
                },
            )
            return () => {
                gone = true
                const held = engines.get(video)
                if (held !== undefined && held !== 'native' && held.hls === engine) engines.delete(video)
                engine?.destroy()
                engine = null
            }
        },
    }
}
