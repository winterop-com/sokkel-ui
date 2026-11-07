/**
 * Eight seconds of music made in the page and handed out as a WAV file's blob URL, for a story
 * to play through a media element: four chords with a bass line, an arpeggio, a kick, a snare and
 * hats, at 120 beats a minute. Nothing is fetched, and it loops cleanly.
 */

const RATE = 44_100
const SECONDS = 8
const BEAT = 0.5
/** A minor, F, C and G, one bar each, as MIDI notes. */
const CHORDS = [
    [57, 60, 64],
    [53, 57, 60],
    [48, 52, 55],
    [55, 59, 62],
]

const hz = (note: number) => 440 * 2 ** ((note - 69) / 12)

/** A small seeded generator, so the noise is the same every time. */
function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
        mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
    }
}

/** Adds a note to the buffer: a sum of overtones under an envelope. */
function note(
    out: Float32Array,
    start: number,
    length: number,
    frequency: number,
    gain: number,
    overtones: readonly number[],
    envelope: (time: number) => number,
) {
    const from = Math.floor(start * RATE)
    const to = Math.min(out.length, Math.floor((start + length) * RATE))
    for (let index = from; index < to; index += 1) {
        const time = (index - from) / RATE
        let sum = 0
        for (let overtone = 0; overtone < overtones.length; overtone += 1) {
            const weight = overtones[overtone] ?? 0
            if (weight !== 0) sum += weight * Math.sin(2 * Math.PI * frequency * (overtone + 1) * time)
        }
        out[index] = (out[index] ?? 0) + gain * envelope(time) * sum
    }
}

function render(): Float32Array {
    const out = new Float32Array(RATE * SECONDS)
    const noise = seeded(7)
    CHORDS.forEach((chord, bar) => {
        const start = bar * 4 * BEAT
        // A pad of the chord an octave up, swelling in and out over the bar.
        for (const tone of chord) {
            note(out, start, 4 * BEAT, hz(tone + 12), 0.05, [1, 0.5, 0.33, 0.25, 0.2], (time) =>
                Math.min(1, time / 0.15, (4 * BEAT - time) / 0.2),
            )
        }
        // The bass on every eighth.
        for (let eighth = 0; eighth < 8; eighth += 1) {
            note(out, start + eighth * (BEAT / 2), BEAT / 2, hz((chord[0] ?? 57) - 24), 0.32, [1, 0.45, 0.15], (time) =>
                Math.exp(-time * 7),
            )
        }
        // An arpeggio two octaves up on every sixteenth.
        for (let sixteenth = 0; sixteenth < 16; sixteenth += 1) {
            const tone = (chord[sixteenth % chord.length] ?? 60) + (sixteenth % 6 < 3 ? 12 : 24)
            note(out, start + sixteenth * (BEAT / 4), BEAT / 4, hz(tone), 0.1, [1, 0, 0.11, 0, 0.04], (time) => Math.exp(-time * 16))
        }
    })
    for (let beat = 0; beat < SECONDS / BEAT; beat += 1) {
        const at = Math.floor(beat * BEAT * RATE)
        // The kick: a falling sine.
        let phase = 0
        for (let index = 0; index < 0.35 * RATE && at + index < out.length; index += 1) {
            const time = index / RATE
            phase += (2 * Math.PI * (45 + 75 * Math.exp(-time * 30))) / RATE
            out[at + index] = (out[at + index] ?? 0) + 0.75 * Math.exp(-time * 9) * Math.sin(phase)
        }
        // The snare on two and four: noise and a body tone.
        if (beat % 2 === 1) {
            for (let index = 0; index < 0.2 * RATE && at + index < out.length; index += 1) {
                const time = index / RATE
                const body = Math.sin(2 * Math.PI * 190 * time)
                out[at + index] = (out[at + index] ?? 0) + Math.exp(-time * 20) * (0.22 * (noise() * 2 - 1) + 0.18 * body)
            }
        }
        // Hats on the off-beat: bright noise, its low end taken off by a difference.
        const off = at + Math.floor((BEAT / 2) * RATE)
        let before = 0
        for (let index = 0; index < 0.06 * RATE && off + index < out.length; index += 1) {
            const sample = noise() * 2 - 1
            out[off + index] = (out[off + index] ?? 0) + 0.16 * Math.exp(-(index / RATE) * 70) * (sample - before)
            before = sample
        }
    }
    let peak = 0
    for (const sample of out) peak = Math.max(peak, Math.abs(sample))
    const scale = peak > 0 ? 0.85 / peak : 1
    for (let index = 0; index < out.length; index += 1) out[index] = (out[index] ?? 0) * scale
    return out
}

/** The samples as a 16-bit mono WAV file. */
function wav(samples: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)
    const text = (at: number, value: string) => {
        for (let index = 0; index < value.length; index += 1) view.setUint8(at + index, value.charCodeAt(index))
    }
    text(0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    text(8, 'WAVE')
    text(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, RATE, true)
    view.setUint32(28, RATE * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    text(36, 'data')
    view.setUint32(40, samples.length * 2, true)
    samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.round(Math.max(-1, Math.min(1, sample)) * 32_767), true))
    return buffer
}

let made: string | null = null

/** The tune's blob URL, made on first use and kept for the page's life. */
export function tuneUrl(): string {
    made ??= URL.createObjectURL(new Blob([wav(render())], { type: 'audio/wav' }))
    return made
}
