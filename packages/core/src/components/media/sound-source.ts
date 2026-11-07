/**
 * Listening to what plays, through Web Audio: an analyser tapped off a media element or a live
 * stream, for a visualizer to read.
 *
 * Web Audio's constraints, all handled here:
 * - A media element can be wired to only one `MediaElementAudioSourceNode`, ever, and that node
 *   belongs to the context that made it. So the page has one context, and each element's source
 *   node is made once and shared by every tap on it.
 * - Once wired, the element is heard only through the graph, so its source is routed on to the
 *   speakers when it is made, and never disconnected from them.
 * - A context starts suspended until the page has had a gesture, and a suspended graph is silent.
 *   An element is wired only once the context runs, so it is never silenced waiting for one.
 * - Cross-origin media without CORS reads as silence and, once wired, plays as silence. Such an
 *   element is never wired, and draws at rest.
 * - A stream (a microphone) is never routed to the speakers, which would echo it.
 */

/**
 * What a visualizer can listen to: a media element that plays, a live stream such as a microphone's,
 * or an analyser on an app's own audio graph, for an app that has wired its element itself (an
 * element can be wired to Web Audio only once).
 */
export type SoundSource = HTMLMediaElement | MediaStream | AnalyserNode

/** How the analyser reads: its transform's size, its own smoothing, and the decibels its bytes span. */
export interface AnalyserSettings {
    fftSize: number
    smoothing: number
    minDecibels: number
    maxDecibels: number
}

export const ANALYSER: AnalyserSettings = { fftSize: 2048, smoothing: 0.6, minDecibels: -90, maxDecibels: -22 }

/** An analyser listening to one source; `release` stops it listening and leaves the sound playing. */
export interface SoundTap {
    analyser: AnalyserNode
    sampleRate: number
    release: () => void
}

/** Whether a source is a stream rather than an element, told by its shape so it runs where neither global exists. */
export function isStream(source: SoundSource): source is MediaStream {
    return typeof (source as MediaStream).getAudioTracks === 'function'
}

/** Whether a source is an analyser an app hands over from its own graph, told by its shape. */
export function isAnalyser(source: SoundSource): source is AnalyserNode {
    return typeof (source as AnalyserNode).getByteFrequencyData === 'function'
}

/**
 * Whether Web Audio may read an element playing `src`: anything from the page's own origin, a
 * blob or data URL, a stream set as its `srcObject` (no `src` at all), or a cross-origin URL the
 * element asks for with CORS.
 */
export function canRead(src: string, crossOrigin: string | null, pageOrigin: string): boolean {
    if (src === '' || crossOrigin !== null) return true
    let url: URL
    try {
        url = new URL(src, pageOrigin)
    } catch {
        return false
    }
    if (url.protocol === 'blob:' || url.protocol === 'data:') return true
    return url.origin === pageOrigin
}

/** Whether a source can be listened to now: a stream with a live audio track, or a readable element. */
export function readable(source: SoundSource, pageOrigin: string): boolean {
    if (isAnalyser(source)) return true
    if (isStream(source)) return source.getAudioTracks().some((track) => track.readyState === 'live')
    return canRead(source.currentSrc || source.src, source.crossOrigin, pageOrigin)
}

/**
 * Whether a source is sounding: an element playing, or a stream with a live, enabled audio track.
 * An analyser cannot say, so the visualizer takes `playing` for one.
 */
export function sounding(source: SoundSource): boolean {
    if (isAnalyser(source)) return true
    if (isStream(source)) return source.getAudioTracks().some((track) => track.readyState === 'live' && track.enabled)
    return !source.paused && !source.ended
}

/** The parts of the page a sound graph needs, so tests can stand in for them. */
export interface SoundGraphHost {
    /** Makes the page's one context. */
    makeContext: () => AudioContext
    /** Calls `wake` on the page's next gestures, until the returned function is called. */
    onGesture: (wake: () => void) => () => void
    /** The page's origin, for telling cross-origin media. */
    origin: () => string
}

const BROWSER: SoundGraphHost = {
    makeContext: () => new AudioContext(),
    onGesture: (wake) => {
        const events = ['pointerdown', 'keydown', 'touchend'] as const
        for (const name of events) document.addEventListener(name, wake, { capture: true })
        return () => {
            for (const name of events) document.removeEventListener(name, wake, { capture: true })
        }
    },
    origin: () => window.location.origin,
}

/** The page's sound graph: one context, one source node per element, and an analyser per tap. */
export interface SoundGraph {
    /** An analyser on the source, once the context runs; null when the source cannot be read. */
    listen: (source: SoundSource, settings?: Partial<AnalyserSettings>) => Promise<SoundTap | null>
    /** Resumes the context if it was suspended, as a play after an interruption needs. */
    wake: () => void
    /** The source node an element is wired through, if it has been wired. */
    wiredTo: (element: HTMLMediaElement) => MediaElementAudioSourceNode | undefined
}

export function createSoundGraph(host: SoundGraphHost = BROWSER): SoundGraph {
    let context: AudioContext | null = null
    let running: Promise<AudioContext> | null = null
    const elements = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>()

    function ensureContext(): AudioContext {
        if (context === null || context.state === 'closed') {
            context = host.makeContext()
            running = null
        }
        return context
    }

    /** Resolves once the context runs, resuming it now and again on each gesture until it does. */
    function whenRunning(): Promise<AudioContext> {
        const graph = ensureContext()
        if (graph.state === 'running') return Promise.resolve(graph)
        running ??= new Promise<AudioContext>((resolve) => {
            const done = () => {
                if (graph.state !== 'running') return
                stopWaking()
                graph.removeEventListener('statechange', done)
                running = null
                resolve(graph)
            }
            const wake = () => {
                void graph.resume().then(done, () => undefined)
            }
            const stopWaking = host.onGesture(wake)
            graph.addEventListener('statechange', done)
            wake()
        })
        return running
    }

    function elementSource(graph: AudioContext, element: HTMLMediaElement): MediaElementAudioSourceNode {
        let source = elements.get(element)
        if (source === undefined) {
            source = graph.createMediaElementSource(element)
            source.connect(graph.destination)
            elements.set(element, source)
        }
        return source
    }

    function analyserOn(graph: BaseAudioContext, settings: Partial<AnalyserSettings>): AnalyserNode {
        const chosen = { ...ANALYSER, ...settings }
        const analyser = graph.createAnalyser()
        analyser.fftSize = chosen.fftSize
        analyser.smoothingTimeConstant = chosen.smoothing
        analyser.minDecibels = chosen.minDecibels
        analyser.maxDecibels = chosen.maxDecibels
        return analyser
    }

    return {
        async listen(source, settings = {}) {
            if (isAnalyser(source)) {
                // The app's own graph and context: an analyser of ours hangs off its analyser, with our settings.
                const analyser = analyserOn(source.context, settings)
                source.connect(analyser)
                return { analyser, sampleRate: source.context.sampleRate, release: () => source.disconnect(analyser) }
            }
            if (!readable(source, host.origin())) return null
            const graph = await whenRunning()
            // Read again: the element may have moved to a source it cannot read while the context woke.
            if (!readable(source, host.origin())) return null
            try {
                const analyser = analyserOn(graph, settings)
                if (isStream(source)) {
                    const input = graph.createMediaStreamSource(source)
                    input.connect(analyser)
                    return { analyser, sampleRate: graph.sampleRate, release: () => input.disconnect() }
                }
                const input = elementSource(graph, source)
                input.connect(analyser)
                return { analyser, sampleRate: graph.sampleRate, release: () => input.disconnect(analyser) }
            } catch {
                // A stream with no audio track, or an element another graph already wired: nothing to read.
                return null
            }
        },
        wake() {
            if (context !== null && context.state !== 'running' && context.state !== 'closed') void whenRunning()
        },
        wiredTo: (element) => elements.get(element),
    }
}

let shared: SoundGraph | null = null

/** The page's one sound graph, made on first use. */
export function soundGraph(): SoundGraph {
    shared ??= createSoundGraph()
    return shared
}
