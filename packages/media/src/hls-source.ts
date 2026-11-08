import type Hls from 'hls.js'
import type { ErrorData, HlsConfig } from 'hls.js'

import type { VideoErrorKind, VideoSource } from '@winterop-com/sokkel-ui/media/video-source'

/** hls.js as its module hands it over. */
export interface HlsModule {
    default: typeof Hls
}

export interface HlsSourceOptions {
    /** hls.js's own settings, passed to it as given. */
    config?: Partial<HlsConfig>
    /**
     * Whether a browser that plays HLS itself, as Safari does, plays it so, without hls.js. Off,
     * hls.js plays it wherever the browser has Media Source Extensions.
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

/** Whether the element plays HLS without hls.js. */
export function playsHlsNatively(video: HTMLVideoElement): boolean {
    return video.canPlayType(HLS_TYPE) !== ''
}

/** Whether the browser has Media Source Extensions, which hls.js plays through. */
export function hasMediaSource(scope: object = globalThis): boolean {
    return 'MediaSource' in scope || 'ManagedMediaSource' in scope || 'WebKitMediaSource' in scope
}

function kindOf(type: string): VideoErrorKind {
    if (type === 'networkError') return 'network'
    if (type === 'mediaError' || type === 'muxError') return 'decode'
    return 'other'
}

const loadHls = () => import('hls.js')

/**
 * An HTTP live stream (HLS) for `VideoPlayer`'s `source`, from the URL of its playlist.
 *
 * A browser that plays HLS itself is given the URL; any other loads hls.js the first time a stream
 * plays, by a dynamic import, and plays it through Media Source Extensions. hls.js is an optional
 * peer dependency of this package, installed by the app that plays streams. A fatal network error
 * loads again and a fatal media error recovers the decoder, `recoveries` times each, before the
 * source gives up and the player's own tries take over; every error is told to the player's
 * `onError`.
 */
export function hlsSource(url: string, { config, native = true, recoveries = 3, load = loadHls }: HlsSourceOptions = {}): VideoSource {
    return {
        id: url,
        canPlay: (video) => (native && playsHlsNatively(video)) || hasMediaSource(),
        attach: (video, report) => {
            if (native && playsHlsNatively(video)) {
                video.src = url
                return () => {
                    video.removeAttribute('src')
                    video.load()
                }
            }
            let gone = false
            let engine: Hls | null = null
            void load().then(
                ({ default: Engine }) => {
                    if (gone) return
                    const hls = new Engine(config)
                    engine = hls
                    let network = 0
                    let media = 0
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
                engine?.destroy()
                engine = null
            }
        },
    }
}
