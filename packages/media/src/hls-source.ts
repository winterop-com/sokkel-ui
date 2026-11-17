import type Hls from 'hls.js'
import type { ErrorData, FragLoadedData, HlsConfig, LoaderConfig, LoaderResponse, RetryConfig } from 'hls.js'

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
    /**
     * Whether hls.js skips a segment a live stream lists but its server answers missing (a 4xx), as
     * hls.js does by itself. Off by default: the segment is fetched again as hls.js backs off, the
     * player waits on it and its own tries take over when it stands too long, and playback goes on
     * from where it stood once the segment is there. An app's own `shouldRetry` in
     * `config.fragLoadPolicy` stands over this.
     */
    skipMissing?: boolean
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

/** The fatal network errors of the playlist itself, which `startLoad` cannot load again: only `loadSource` fetches it anew. */
const PLAYLIST_ERRORS: ReadonlySet<string> = new Set(['manifestLoadError', 'manifestLoadTimeOut'])

/**
 * What the source does about a fatal hls.js error, given the tries of each kind so far: fetch the
 * playlist again (`reload`), go on loading fragments (`load`), recover the decoder (`recover`), or
 * give up and tell the player. A playlist that cannot be parsed is given up on at once, as fetching
 * it again brings the same one.
 */
export function hlsRecovery(
    data: Pick<ErrorData, 'type' | 'details'>,
    tries: { network: number; media: number },
    recoveries: number,
): 'reload' | 'load' | 'recover' | 'give-up' {
    const kind = kindOf(data.type)
    if (data.details === 'manifestParsingError') return 'give-up'
    if (kind === 'network' && tries.network < recoveries) return PLAYLIST_ERRORS.has(data.details) ? 'reload' : 'load'
    if (kind === 'decode' && tries.media < recoveries) return 'recover'
    return 'give-up'
}

/**
 * Whether hls.js fetches a fragment again after an error: its own answer (`retry`), or, on a live
 * stream, yes for a fragment its server answers missing (a 4xx, as a segment listed before it is
 * written), while `retryCount` is under the policy's `maxNumRetry`. hls.js retries no 4xx and skips
 * such a fragment on a live stream, so playback jumps past what was not there yet.
 */
export function retriesMissing(
    retry: boolean,
    retryCount: number,
    retryConfig: Pick<RetryConfig, 'maxNumRetry'> | null | undefined,
    response: Pick<LoaderResponse, 'code'> | undefined,
    live: boolean,
): boolean {
    if (retry) return true
    return missingLive(response, live) && retryConfig !== null && retryConfig !== undefined && retryCount < retryConfig.maxNumRetry
}

/** Whether a fragment's answer says a live stream's server has it not: a 4xx. */
function missingLive(response: Pick<LoaderResponse, 'code'> | undefined, live: boolean): boolean {
    const code = response?.code ?? 0
    return live && code >= 400 && code < 500
}

/**
 * hls.js's settings with its fragment policy answering through `retriesMissing`, from the app's own
 * policy or hls.js's default. An app's own `shouldRetry`, or a policy that never retries, is kept.
 * `exhausted` hears of a missing live fragment whose tries are spent.
 */
export function waitingConfig(
    config: Partial<HlsConfig> | undefined,
    defaults: Pick<HlsConfig, 'fragLoadPolicy'>,
    live: () => boolean,
    exhausted: () => void,
): Partial<HlsConfig> | undefined {
    const policy: LoaderConfig = config?.fragLoadPolicy?.default ?? defaults.fragLoadPolicy.default
    const errorRetry = policy.errorRetry
    if (errorRetry === null || errorRetry.shouldRetry !== undefined) return config
    const shouldRetry: RetryConfig['shouldRetry'] = (retryConfig, retryCount, _isTimeout, response, retry) => {
        const again = retriesMissing(retry, retryCount, retryConfig, response, live())
        if (!again && missingLive(response, live())) exhausted()
        return again
    }
    return { ...config, fragLoadPolicy: { default: { ...policy, errorRetry: { ...errorRetry, shouldRetry } } } }
}

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
 * error loads again (the playlist itself when it was the playlist that failed) and a fatal media
 * error recovers the decoder, `recoveries` times each, before the source gives up and the player's
 * own tries take over; a playlist that cannot be parsed is given up on at once (`hlsRecovery`). A
 * live stream's segment its server answers missing is fetched again rather than skipped
 * (`retriesMissing`), so the player waits on it, as on any stall, and plays on from where it stood
 * once it is there; with its fetches spent the source gives up for the player to try again.
 * Every fatal error is told to the player's `onError`, and the errors hls.js recovers from by
 * itself are not. Its `stats` give the player's handle hls.js's bandwidth estimate, the rendition
 * playing and the buffer ahead.
 */
export function hlsSource(
    url: string,
    { config, native = true, recoveries = 3, skipMissing = false, load = loadHls }: HlsSourceOptions = {},
): VideoSource {
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
                    // Set once a missing live fragment's fetches are spent, so the error hls.js then skips it on is a give-up instead.
                    let spent = false
                    const given = skipMissing
                        ? config
                        : waitingConfig(
                              config,
                              Engine.DefaultConfig,
                              () => engine?.latestLevelDetails?.live === true,
                              () => {
                                  spent = true
                              },
                          )
                    const hls = new Engine(
                        startAt === undefined || given?.startPosition !== undefined ? given : { ...given, startPosition: startAt },
                    )
                    engine = hls
                    const loaded: HlsLoaded = { bytes: 0, duration: 0 }
                    engines.set(video, { hls, loaded })
                    const tries = { network: 0, media: 0 }
                    hls.on(Engine.Events.FRAG_LOADED, (_event: string, data: FragLoadedData) => {
                        loaded.bytes += data.frag.stats.loaded
                        loaded.duration += data.frag.duration
                    })
                    hls.on(Engine.Events.FRAG_BUFFERED, () => {
                        tries.network = 0
                        tries.media = 0
                    })
                    hls.on(Engine.Events.ERROR, (_event: string, data: ErrorData) => {
                        if (spent && !data.fatal) {
                            // hls.js has marked the missing fragment a gap to skip; stop before it loads past it.
                            spent = false
                            hls.stopLoad()
                            report({ kind: 'network', message: data.error?.message ?? data.details, fatal: true })
                            return
                        }
                        if (!data.fatal) return
                        const kind = kindOf(data.type)
                        const message = data.error?.message ?? data.details
                        const recovery = hlsRecovery(data, tries, recoveries)
                        report({ kind, message, fatal: recovery === 'give-up' })
                        if (recovery === 'reload' || recovery === 'load') {
                            tries.network += 1
                            if (recovery === 'reload') hls.loadSource(url)
                            else hls.startLoad()
                        } else if (recovery === 'recover') {
                            tries.media += 1
                            if (tries.media > 1) hls.swapAudioCodec()
                            hls.recoverMediaError()
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
