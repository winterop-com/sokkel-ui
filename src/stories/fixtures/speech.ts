import { tuneUrl } from '../media/fixtures/tune'

/** Waits `ms`, or rejects as soon as `signal` aborts, as a request to a server would. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms)
        signal.addEventListener('abort', () => {
            clearTimeout(timer)
            reject(signal.reason)
        })
    })
}

/** Stands in for a server that reads a text aloud: the page's own tune after a moment, so nothing is fetched. */
export async function speakLater({ signal }: { signal: AbortSignal }): Promise<string> {
    await wait(700, signal)
    return tuneUrl()
}

/** Stands in for a server that cannot read the text aloud: it refuses after a moment. */
export async function speakFails({ signal }: { signal: AbortSignal }): Promise<string> {
    await wait(700, signal)
    throw new Error('503 Service Unavailable')
}

/** Stands in for a server that turns a recording into text: the same sentence after a moment, whatever was said. */
export async function transcribeLater(_audio: Blob, { signal }: { signal: AbortSignal }): Promise<string> {
    await wait(1200, signal)
    return 'and rerun it with the locale fix once validate passes'
}

let hum: AudioContext | null = null

/**
 * Stands in for the microphone, so a story never asks for one: a voice-like hum made in the page,
 * rising and falling a few times a second, which a recorder and a level hear and the speakers do not.
 */
export async function fakeMicrophone(): Promise<MediaStream> {
    hum ??= new AudioContext()
    const context = hum
    const out = context.createMediaStreamDestination()
    const voice = context.createOscillator()
    voice.type = 'sawtooth'
    voice.frequency.value = 150
    const level = context.createGain()
    level.gain.value = 0.4
    const swell = context.createOscillator()
    swell.frequency.value = 2.5
    const depth = context.createGain()
    depth.gain.value = 0.35
    swell.connect(depth).connect(level.gain)
    voice.connect(level).connect(out)
    voice.start()
    swell.start()
    await context.resume()
    return out.stream
}
