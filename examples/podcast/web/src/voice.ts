/**
 * The sound of an episode, made in the page: each syllable of the script spoken by a small
 * formant voice (a glottal buzz at the host's pitch through three resonances shaped like the
 * vowel, with a hiss, a breath, a stop or a hum before it), and the show's jingle in bells at the
 * start, between chapters and at the end. No words are said, but the voices rise and fall as
 * speech does, line by line, in time with the transcript. Written out as a WAV file the page plays
 * from a blob address, so the audio element seeks, changes speed and reports its time as with any
 * file.
 */

import type { Host } from './catalog'
import { VOICES, type Cue, type Onset, type Script, type Vowel } from './script'

const RATE = 16000

/** Samples between updates of the voice's controls. */
const BLOCK = 32

/** The first three resonances of each vowel for a low voice, in hertz; a higher voice scales them up. */
const FORMANTS: Record<Vowel, readonly [number, number, number]> = {
    a: [730, 1190, 2440],
    e: [530, 1840, 2480],
    i: [300, 2200, 2950],
    o: [520, 900, 2380],
    u: [340, 870, 2240],
}

/** Where the mouth is during a consonant: the resonances it moves from into the vowel. */
const ONSET_FORMANTS: Record<Onset, readonly [number, number, number]> = {
    hiss: [400, 1700, 2600],
    breath: [500, 1500, 2500],
    stop: [350, 1600, 2500],
    hum: [260, 1100, 2400],
    glide: [320, 900, 2300],
    none: [500, 1400, 2500],
}

interface Controls {
    /** How loud the voiced part is, from 0. */
    voice: Float32Array
    /** How loud the noise is, and how bright (0 dull, 1 a hiss). */
    noise: Float32Array
    bright: Float32Array
    pitch: Float32Array
    f1: Float32Array
    f2: Float32Array
    f3: Float32Array
}

function controlsFor(script: Script, blocks: number): Controls {
    const controls: Controls = {
        voice: new Float32Array(blocks),
        noise: new Float32Array(blocks),
        bright: new Float32Array(blocks),
        pitch: new Float32Array(blocks).fill(150),
        f1: new Float32Array(blocks).fill(500),
        f2: new Float32Array(blocks).fill(1400),
        f3: new Float32Array(blocks).fill(2500),
    }
    const block = (seconds: number) => Math.min(blocks - 1, Math.max(0, Math.round((seconds * RATE) / BLOCK)))
    const set = (from: number, to: number, write: (index: number, share: number) => void) => {
        const start = block(from)
        const end = Math.max(start + 1, block(to))
        for (let index = start; index < end; index += 1) write(index, (index - start) / Math.max(1, end - start - 1))
    }
    for (const syllable of script.syllables) {
        const scale = VOICES[syllable.voice as Host].formant
        const target = FORMANTS[syllable.vowel]
        const from = ONSET_FORMANTS[syllable.onset]
        const { at, length, gain } = syllable
        // The consonant takes the first part of the syllable, the vowel the rest.
        const consonant = syllable.onset === 'none' ? 0.02 : syllable.onset === 'glide' ? 0.06 : syllable.onset === 'hum' ? 0.07 : 0.06
        const vowelStart = at + Math.min(consonant, length * 0.4)
        const end = at + length
        set(at, end, (index, share) => {
            controls.pitch[index] = syllable.pitch + (syllable.pitchEnd - syllable.pitch) * share
        })
        if (syllable.onset === 'hiss' || syllable.onset === 'breath') {
            set(at, vowelStart, (index) => {
                controls.noise[index] = (syllable.onset === 'hiss' ? 0.32 : 0.16) * gain
                controls.bright[index] = syllable.onset === 'hiss' ? 1 : 0.25
                controls.voice[index] = 0.05
            })
        } else if (syllable.onset === 'stop') {
            const burst = at + (vowelStart - at) * 0.55
            set(at, burst, (index) => {
                controls.voice[index] = 0
            })
            set(burst, vowelStart, (index) => {
                controls.noise[index] = 0.3 * gain
                controls.bright[index] = 0.7
            })
        } else if (syllable.onset === 'hum') {
            set(at, vowelStart, (index) => {
                controls.voice[index] = 0.45 * gain
            })
        } else {
            set(at, vowelStart, (index, share) => {
                controls.voice[index] = (0.3 + 0.6 * share) * gain
            })
        }
        set(at, vowelStart, (index) => {
            controls.f1[index] = from[0] * scale
            controls.f2[index] = from[1] * scale
            controls.f3[index] = from[2] * scale
        })
        set(vowelStart, end, (index, share) => {
            // A small dip between syllables of a word, and the voice let go at a word's end.
            const fade = share > 0.75 ? 1 - (share - 0.75) * (syllable.last ? 3.2 : 1.6) : 1
            controls.voice[index] = gain * Math.max(0, fade)
            controls.f1[index] = target[0] * scale
            controls.f2[index] = target[1] * scale
            controls.f3[index] = target[2] * scale
        })
    }
    return controls
}

/** A resonance: a two-pole band-pass filter whose center moves with its control. */
class Resonance {
    private x1 = 0
    private x2 = 0
    private y1 = 0
    private y2 = 0
    private b0 = 0
    private a1 = 0
    private a2 = 0

    tune(frequency: number, bandwidth: number): void {
        const w = (2 * Math.PI * Math.min(frequency, RATE * 0.45)) / RATE
        const alpha = Math.sin(w) / (2 * (frequency / bandwidth))
        const a0 = 1 + alpha
        this.b0 = alpha / a0
        this.a1 = (-2 * Math.cos(w)) / a0
        this.a2 = (1 - alpha) / a0
    }

    step(input: number): number {
        const output = this.b0 * input - this.b0 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2
        this.x2 = this.x1
        this.x1 = input
        this.y2 = this.y1
        this.y1 = output
        return output
    }
}

/** A bell for the jingle: a note with two partials, struck and left to ring. */
function ring(samples: Float32Array, at: number, semitones: number, loud: number): void {
    const frequency = 523.25 * 2 ** (semitones / 12)
    const start = Math.floor(at * RATE)
    const length = Math.floor(1.6 * RATE)
    for (let index = 0; index < length && start + index < samples.length; index += 1) {
        const time = index / RATE
        const decay = Math.exp(-time * 3.2) * Math.min(1, time * 400)
        const tone =
            Math.sin(2 * Math.PI * frequency * time) +
            0.35 * Math.sin(2 * Math.PI * frequency * 2 * time) * Math.exp(-time * 4) +
            0.12 * Math.sin(2 * Math.PI * frequency * 3.01 * time) * Math.exp(-time * 6)
        samples[start + index] = (samples[start + index] ?? 0) + tone * decay * loud
    }
}

function play(samples: Float32Array, cue: Cue): void {
    cue.notes.forEach((note, index) => ring(samples, cue.at + index * cue.step, note, index === cue.notes.length - 1 ? 0.2 : 0.16))
}

/** A tiny noise source, the same every time. */
function noiseFrom(seed: number): () => number {
    let state = seed || 1
    return () => {
        state ^= state << 13
        state ^= state >>> 17
        state ^= state << 5
        return ((state >>> 0) / 4294967296) * 2 - 1
    }
}

/** The samples of a script, at 16 kHz. */
export function render(script: Script): Float32Array {
    const total = Math.ceil(script.duration * RATE)
    const blocks = Math.ceil(total / BLOCK) + 1
    const controls = controlsFor(script, blocks)
    const samples = new Float32Array(total)
    const resonances = [new Resonance(), new Resonance(), new Resonance()]
    const noise = noiseFrom(script.syllables.length * 7919)
    let phase = 0
    // Smoothed controls, so the mouth moves rather than jumps.
    let voice = 0
    let hiss = 0
    let bright = 0
    let pitch = 150
    let f1 = 500
    let f2 = 1400
    let f3 = 2500
    let previousNoise = 0
    let low = 0
    for (let block = 0; block < blocks - 1; block += 1) {
        f1 += (controls.f1[block] - f1) * 0.35
        f2 += (controls.f2[block] - f2) * 0.35
        f3 += (controls.f3[block] - f3) * 0.35
        resonances[0].tune(f1, 90)
        resonances[1].tune(f2, 110)
        resonances[2].tune(f3, 170)
        const end = Math.min(total, (block + 1) * BLOCK)
        for (let index = block * BLOCK; index < end; index += 1) {
            voice += (controls.voice[block] - voice) * 0.012
            hiss += (controls.noise[block] - hiss) * 0.02
            bright += (controls.bright[block] - bright) * 0.02
            pitch += (controls.pitch[block] - pitch) * 0.004
            // A falling saw at the pitch, with its corner smoothed so it does not alias.
            const increment = pitch / RATE
            phase += increment
            if (phase >= 1) phase -= 1
            let saw = 1 - 2 * phase
            if (phase < increment) {
                const t = phase / increment
                saw += t + t - t * t - 1
            } else if (phase > 1 - increment) {
                const t = (phase - 1) / increment
                saw += t * t + t + t + 1
            }
            const breath = noise()
            const source = saw * voice + breath * 0.04 * voice
            const voiced = resonances[0].step(source) + 0.6 * resonances[1].step(source) + 0.28 * resonances[2].step(source)
            const raw = noise()
            const sharp = raw - previousNoise
            previousNoise = raw
            const consonant = (sharp * bright + raw * (1 - bright) * 0.6) * hiss
            low += (voiced * 1.6 + consonant - low) * 0.7
            samples[index] = low
        }
    }
    for (const cue of script.cues) play(samples, cue)
    let peak = 0
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
    const gain = peak > 0 ? 0.88 / peak : 1
    for (let index = 0; index < samples.length; index += 1) samples[index] *= gain
    return samples
}

/** The loudness across the samples, `count` levels from 0 to 1, for the player's waveform. */
export function levelsOf(samples: Float32Array, count = 180): number[] {
    const size = Math.max(1, Math.floor(samples.length / count))
    const levels: number[] = []
    for (let bucket = 0; bucket < count; bucket += 1) {
        let sum = 0
        const from = bucket * size
        for (let index = from; index < from + size && index < samples.length; index += 1) sum += samples[index] * samples[index]
        levels.push(Math.sqrt(sum / size))
    }
    const top = Math.max(...levels, 1e-6)
    return levels.map((level) => Math.min(1, level / top))
}

/** The samples as a 16-bit mono WAV file. */
export function wavOf(samples: Float32Array): Blob {
    const bytes = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(bytes)
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
    for (let index = 0; index < samples.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, samples[index] ?? 0))
        view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    }
    return new Blob([bytes], { type: 'audio/wav' })
}

export interface Sound {
    url: string
    waveform: number[]
}

const made = new Map<string, Sound>()

/** How many episodes' sound is kept at once; the oldest is let go past it. */
const KEEP = 4

/** An episode's sound, made the first time it is asked for and kept for a while. */
export function soundOf(id: string, script: Script): Sound {
    const kept = made.get(id)
    if (kept !== undefined) {
        made.delete(id)
        made.set(id, kept)
        return kept
    }
    const samples = render(script)
    const sound = { url: URL.createObjectURL(wavOf(samples)), waveform: levelsOf(samples) }
    made.set(id, sound)
    while (made.size > KEEP) {
        const [oldest] = made.keys()
        if (oldest === undefined || oldest === id) break
        URL.revokeObjectURL(made.get(oldest)?.url ?? '')
        made.delete(oldest)
    }
    return sound
}
