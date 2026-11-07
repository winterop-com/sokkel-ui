import { describe, expect, it } from 'vitest'

import {
    ANALYSER,
    canRead,
    createSoundGraph,
    isAnalyser,
    isStream,
    readable,
    sounding,
    type SoundGraphHost,
    type SoundSource,
} from './sound-source'

/** A node that remembers what it is connected to. */
class FakeNode {
    readonly outputs = new Set<FakeNode>()
    connect(node: FakeNode) {
        this.outputs.add(node)
        return node
    }
    disconnect(node?: FakeNode) {
        if (node === undefined) this.outputs.clear()
        else this.outputs.delete(node)
    }
}

class FakeAnalyser extends FakeNode {
    fftSize = 2048
    smoothingTimeConstant = 0.8
    minDecibels = -100
    maxDecibels = -30
}

/** Stands in for an AudioContext: suspended until `allowed`, and refusing to wire an element twice. */
class FakeContext {
    state: AudioContextState
    allowed: boolean
    readonly sampleRate = 48_000
    readonly destination = new FakeNode()
    readonly elementSources: FakeNode[] = []
    readonly streamSources: FakeNode[] = []
    readonly analysers: FakeAnalyser[] = []
    private readonly listeners = new Set<() => void>()

    constructor(
        state: AudioContextState,
        private readonly wired: WeakSet<object>,
    ) {
        this.state = state
        this.allowed = state === 'running'
    }

    createMediaElementSource(element: object) {
        if (this.wired.has(element)) throw new Error('InvalidStateError: already connected')
        this.wired.add(element)
        const node = new FakeNode()
        this.elementSources.push(node)
        return node
    }

    createMediaStreamSource(stream: MediaStream) {
        if (stream.getAudioTracks().length === 0) throw new Error('InvalidStateError: no audio track')
        const node = new FakeNode()
        this.streamSources.push(node)
        return node
    }

    createAnalyser() {
        const node = new FakeAnalyser()
        this.analysers.push(node)
        return node
    }

    resume() {
        if (this.allowed && this.state !== 'running') {
            this.state = 'running'
            for (const listener of this.listeners) listener()
        }
        return Promise.resolve()
    }

    addEventListener(_name: string, listener: () => void) {
        this.listeners.add(listener)
    }

    removeEventListener(_name: string, listener: () => void) {
        this.listeners.delete(listener)
    }
}

const PAGE = 'https://example.org'

/** A graph over one fake context, with a gesture the test can make. */
function setup(state: AudioContextState = 'running', wired = new WeakSet<object>()) {
    const contexts: FakeContext[] = []
    const waking = new Set<() => void>()
    const host: SoundGraphHost = {
        makeContext: () => {
            const context = new FakeContext(state, wired)
            contexts.push(context)
            return context as unknown as AudioContext
        },
        onGesture: (wake) => {
            waking.add(wake)
            return () => waking.delete(wake)
        },
        origin: () => PAGE,
    }
    const gesture = () => {
        for (const context of contexts) context.allowed = true
        for (const wake of waking) wake()
    }
    return { graph: createSoundGraph(host), contexts, gesture, waking }
}

function element(src = `${PAGE}/music/harbor.ogg`, crossOrigin: string | null = null) {
    return {
        src,
        currentSrc: src,
        crossOrigin,
        paused: false,
        ended: false,
    } as unknown as HTMLMediaElement
}

function stream(tracks: { readyState: 'live' | 'ended'; enabled: boolean }[] = [{ readyState: 'live', enabled: true }]) {
    return { getAudioTracks: () => tracks } as unknown as MediaStream
}

/** Lets pending promises settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('canRead', () => {
    it('reads media from the page itself, blobs and data, and a stream with no src', () => {
        expect(canRead(`${PAGE}/a.ogg`, null, PAGE)).toBe(true)
        expect(canRead('/a.ogg', null, PAGE)).toBe(true)
        expect(canRead('blob:https://example.org/5f1c', null, PAGE)).toBe(true)
        expect(canRead('data:audio/wav;base64,UklGRg==', null, PAGE)).toBe(true)
        expect(canRead('', null, PAGE)).toBe(true)
    })

    it('reads another origin only when the element asks for it with CORS', () => {
        expect(canRead('https://cdn.example.org/a.ogg', null, PAGE)).toBe(false)
        expect(canRead('https://cdn.example.org/a.ogg', 'anonymous', PAGE)).toBe(true)
        expect(canRead('https://cdn.example.org/a.ogg', 'use-credentials', PAGE)).toBe(true)
    })
})

describe('the source helpers', () => {
    it('tell a stream from an element by its shape', () => {
        expect(isStream(stream())).toBe(true)
        expect(isStream(element())).toBe(false)
    })

    it('say a stream sounds while it has a live, enabled audio track', () => {
        expect(sounding(stream())).toBe(true)
        expect(sounding(stream([{ readyState: 'live', enabled: false }]))).toBe(false)
        expect(sounding(stream([{ readyState: 'ended', enabled: true }]))).toBe(false)
        expect(readable(stream([]), PAGE)).toBe(false)
    })

    it('say an element sounds while it plays', () => {
        const playing = element()
        expect(sounding(playing)).toBe(true)
        const paused = { ...playing, paused: true } as unknown as SoundSource
        expect(sounding(paused)).toBe(false)
    })
})

describe('the sound graph', () => {
    it('wires an element once, however many taps listen to it, and routes it on to the speakers', async () => {
        const { graph, contexts } = setup()
        const audio = element()
        const first = await graph.listen(audio)
        const second = await graph.listen(audio)
        const [context] = contexts
        expect(contexts).toHaveLength(1)
        expect(context?.elementSources).toHaveLength(1)
        const source = context?.elementSources[0]
        expect(source?.outputs.has(context!.destination)).toBe(true)
        expect(first?.analyser).not.toBe(second?.analyser)
        expect(source?.outputs.has(first?.analyser as unknown as FakeNode)).toBe(true)
        expect(source?.outputs.has(second?.analyser as unknown as FakeNode)).toBe(true)
        expect(graph.wiredTo(audio)).toBe(source)
    })

    it('lets a tap go without silencing the element or the other taps', async () => {
        const { graph, contexts } = setup()
        const audio = element()
        const first = await graph.listen(audio)
        const second = await graph.listen(audio)
        first?.release()
        const source = contexts[0]?.elementSources[0]
        expect(source?.outputs.has(contexts[0]!.destination)).toBe(true)
        expect(source?.outputs.has(first?.analyser as unknown as FakeNode)).toBe(false)
        expect(source?.outputs.has(second?.analyser as unknown as FakeNode)).toBe(true)
        // A new tap after every other has gone still shares the one source.
        second?.release()
        await graph.listen(audio)
        expect(contexts[0]?.elementSources).toHaveLength(1)
    })

    it('wires each element on its own', async () => {
        const { graph, contexts } = setup()
        await graph.listen(element())
        await graph.listen(element())
        expect(contexts[0]?.elementSources).toHaveLength(2)
    })

    it('never routes a stream to the speakers', async () => {
        const { graph, contexts } = setup()
        const tap = await graph.listen(stream())
        const source = contexts[0]?.streamSources[0]
        expect(source?.outputs.has(contexts[0]!.destination)).toBe(false)
        expect(source?.outputs.has(tap?.analyser as unknown as FakeNode)).toBe(true)
        tap?.release()
        expect(source?.outputs.size).toBe(0)
    })

    it('never wires cross-origin media without CORS, which would play as silence', async () => {
        const { graph, contexts } = setup()
        const tap = await graph.listen(element('https://cdn.example.org/harbor.ogg'))
        expect(tap).toBeNull()
        expect(contexts[0]?.elementSources ?? []).toHaveLength(0)
    })

    it('waits for the context to run before wiring an element, so it is never silenced', async () => {
        const { graph, contexts, gesture, waking } = setup('suspended')
        const audio = element()
        let tap: Awaited<ReturnType<typeof graph.listen>> | undefined
        void graph.listen(audio).then((answer) => {
            tap = answer
        })
        await flush()
        expect(tap).toBeUndefined()
        expect(contexts[0]?.elementSources).toHaveLength(0)
        expect(waking.size).toBe(1)
        gesture()
        await flush()
        expect(tap?.analyser).toBeDefined()
        expect(contexts[0]?.elementSources).toHaveLength(1)
        expect(waking.size).toBe(0)
    })

    it('answers nothing for an element another graph has wired, or a stream without sound', async () => {
        const wired = new WeakSet<object>()
        const audio = element()
        wired.add(audio)
        const { graph } = setup('running', wired)
        expect(await graph.listen(audio)).toBeNull()
        expect(await graph.listen(stream([]))).toBeNull()
    })

    it('sets up the analyser as asked', async () => {
        const { graph } = setup()
        const tap = await graph.listen(element(), { fftSize: 512 })
        const analyser = tap?.analyser as unknown as FakeAnalyser
        expect(analyser.fftSize).toBe(512)
        expect(analyser.smoothingTimeConstant).toBe(ANALYSER.smoothing)
        expect(analyser.minDecibels).toBe(ANALYSER.minDecibels)
        expect(analyser.maxDecibels).toBe(ANALYSER.maxDecibels)
        expect(tap?.sampleRate).toBe(48_000)
    })
})

describe("an analyser from an app's own graph", () => {
    /** The app's analyser, on the app's context, already hearing its element. */
    function owned() {
        const context = new FakeContext('running', new WeakSet())
        const analyser = Object.assign(new FakeAnalyser(), { context, getByteFrequencyData: () => undefined })
        return { context, analyser: analyser as unknown as AnalyserNode }
    }

    it('is told by its shape, and is always readable', () => {
        const { analyser } = owned()
        expect(isAnalyser(analyser)).toBe(true)
        expect(isAnalyser(element())).toBe(false)
        expect(isAnalyser(stream())).toBe(false)
        expect(readable(analyser, PAGE)).toBe(true)
    })

    it('is listened to through an analyser of ours on its own context, never wiring an element or making a context', async () => {
        const { graph, contexts } = setup()
        const { context, analyser } = owned()
        const tap = await graph.listen(analyser)
        expect(contexts).toEqual([])
        expect(context.elementSources).toEqual([])
        expect(tap?.sampleRate).toBe(48_000)
        expect(tap?.analyser.fftSize).toBe(ANALYSER.fftSize)
        expect((analyser as unknown as FakeNode).outputs.has(tap?.analyser as unknown as FakeNode)).toBe(true)
        tap?.release()
        expect((analyser as unknown as FakeNode).outputs.size).toBe(0)
    })
})
