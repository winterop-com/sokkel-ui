/**
 * The synthesizer every song is made by: from a song's seed and its style it draws a tempo, a key,
 * two chord progressions, a bass line, an arpeggio, a melody and a drum pattern, and renders them
 * into samples in the page, so a song plays through a real media element with no network. The
 * same seed always makes the same song. A song is a few phrases of four bars, from about twenty
 * seconds to a minute.
 */

/** Samples a second. */
export const RATE = 22_050

/** How the music sounds: which voices play and how fast. */
export type Style = 'ambient' | 'folk' | 'pop' | 'electronic' | 'chamber' | 'choir' | 'band'

/** A small seeded generator, the same run for the same seed (mulberry32). */
export function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
        mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
    }
}

const TEMPO: Record<Style, [number, number]> = {
    ambient: [60, 76],
    folk: [84, 104],
    pop: [96, 118],
    electronic: [118, 128],
    chamber: [72, 92],
    choir: [58, 70],
    band: [104, 124],
}

/** Seconds of ring left after the last bar. */
const TAIL = 1.5

const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const MINOR = [0, 2, 3, 5, 7, 8, 10]
const DORIAN = [0, 2, 3, 5, 7, 9, 10]

const MAJOR_WAYS = [
    [0, 4, 5, 3],
    [0, 5, 3, 4],
    [5, 3, 0, 4],
    [0, 3, 0, 4],
    [3, 0, 4, 5],
    [0, 2, 3, 4],
]
const MINOR_WAYS = [
    [0, 5, 2, 6],
    [0, 3, 4, 0],
    [0, 6, 5, 6],
    [0, 5, 3, 4],
    [3, 4, 0, 0],
]

interface Plan {
    style: Style
    tempo: number
    bars: number
    /** The key's root, as a MIDI note in the bass's octave. */
    root: number
    scale: readonly number[]
    /** The verse's and the chorus's chords, as degrees of the scale, one a bar. */
    verse: readonly number[]
    chorus: readonly number[]
    random: () => number
}

function planOf(seed: number, style: Style): Plan {
    const random = seeded(seed)
    const [slow, fast] = TEMPO[style]
    const tempo = Math.round(slow + random() * (fast - slow))
    const bar = (4 * 60) / tempo
    const target = 22 + random() * 40
    const bars = Math.max(8, Math.round(target / bar / 4) * 4)
    const mode = random()
    const scale =
        style === 'choir' || style === 'ambient' ? (mode < 0.5 ? MINOR : DORIAN) : mode < 0.55 ? MAJOR : mode < 0.85 ? MINOR : DORIAN
    const ways = scale === MAJOR ? MAJOR_WAYS : MINOR_WAYS
    const verse = ways[Math.floor(random() * ways.length)]
    let chorus = ways[Math.floor(random() * ways.length)]
    if (chorus === verse) chorus = ways[(ways.indexOf(verse) + 1) % ways.length]
    const root = 38 + Math.floor(random() * 10)
    return { style, tempo, bars, root, scale, verse, chorus, random }
}

/** The song's bars: how long one lasts in seconds and how many there are, for words timed to them. */
export function barsOf(seed: number, style: Style): { bar: number; bars: number } {
    const plan = planOf(seed, style)
    return { bar: (4 * 60) / plan.tempo, bars: plan.bars }
}

/** How long the song made from `seed` in `style` lasts, in seconds, before a note of it is made. */
export function lengthOf(seed: number, style: Style): number {
    const plan = planOf(seed, style)
    return Math.ceil((plan.bars * ((4 * 60) / plan.tempo) + TAIL) * RATE) / RATE
}

const hz = (note: number) => 440 * 2 ** ((note - 69) / 12)

/** The MIDI note of `degree` in the scale over `root`, degrees past the scale climbing octaves. */
function noteOf(plan: Plan, degree: number, octave = 0): number {
    const steps = plan.scale.length
    const wrapped = ((degree % steps) + steps) % steps
    return plan.root + plan.scale[wrapped] + 12 * (octave + Math.floor(degree / steps))
}

const SIZE = 2048

/** One cycle of a wave made of the overtones given, its peak at 1. */
function table(overtones: readonly number[]): Float32Array {
    const out = new Float32Array(SIZE)
    let peak = 0
    for (let index = 0; index < SIZE; index += 1) {
        let sum = 0
        overtones.forEach((weight, overtone) => {
            sum += weight * Math.sin((2 * Math.PI * (overtone + 1) * index) / SIZE)
        })
        out[index] = sum
        peak = Math.max(peak, Math.abs(sum))
    }
    for (let index = 0; index < SIZE; index += 1) out[index] /= peak
    return out
}

const WAVES = {
    soft: table([1, 0.12, 0.04]),
    pad: table([1, 0.5, 0.33, 0.25, 0.2, 0.16]),
    pluck: table([1, 0.6, 0.35, 0.2, 0.12, 0.06]),
    hollow: table([1, 0, 0.33, 0, 0.2, 0, 0.14]),
    voice: table([1, 0.7, 0.9, 0.4, 0.15, 0.3, 0.1]),
    bass: table([1, 0.45, 0.12]),
}

interface Envelope {
    /** Seconds to rise. */
    attack: number
    /** Seconds over which a plucked note falls by e; none for a held one. */
    decay?: number
    /** Seconds to fall at the note's end. */
    release: number
}

/** Adds a note into `out`: a wave at `frequency` under an envelope, optionally wavering. */
function note(
    out: Float32Array,
    start: number,
    length: number,
    frequency: number,
    gain: number,
    wave: Float32Array,
    envelope: Envelope,
    vibrato = 0,
) {
    const from = Math.max(0, Math.floor(start * RATE))
    const end = Math.min(out.length, Math.floor((start + length + envelope.release) * RATE))
    const step = (frequency * SIZE) / RATE
    const held = length * RATE
    const attack = Math.max(1, envelope.attack * RATE)
    const release = Math.max(1, envelope.release * RATE)
    const fall = envelope.decay === undefined ? 0 : 1 / (envelope.decay * RATE)
    let phase = 0
    for (let index = from; index < end; index += 1) {
        const at = index - from
        let level = at < attack ? at / attack : 1
        if (fall > 0) level *= Math.exp(-at * fall)
        if (at > held) level *= Math.max(0, 1 - (at - held) / release)
        const wobble = vibrato === 0 ? 1 : 1 + vibrato * Math.sin((2 * Math.PI * 5.2 * at) / RATE)
        phase += step * wobble
        if (phase >= SIZE) phase -= SIZE
        out[index] += gain * level * wave[phase | 0]
    }
}

/** A kick: a sine falling from a thump to a boom. */
function kick(out: Float32Array, start: number, gain: number) {
    const from = Math.floor(start * RATE)
    const length = Math.floor(0.4 * RATE)
    let phase = 0
    for (let at = 0; at < length && from + at < out.length; at += 1) {
        const time = at / RATE
        const frequency = 45 + 75 * Math.exp(-time / 0.04)
        phase += (2 * Math.PI * frequency) / RATE
        out[from + at] += gain * Math.exp(-time / 0.16) * Math.sin(phase)
    }
}

/** A snare or a clap: a burst of noise over a short tone. */
function snare(out: Float32Array, start: number, gain: number, noise: () => number, clap = false) {
    const from = Math.floor(start * RATE)
    const length = Math.floor(0.3 * RATE)
    for (let at = 0; at < length && from + at < out.length; at += 1) {
        const time = at / RATE
        const burst = clap
            ? Math.exp(-((time % 0.012) / 0.004)) * (time < 0.036 ? 1 : 0) + Math.exp(-time / 0.07) * 0.6
            : Math.exp(-time / 0.09)
        const tone = clap ? 0 : 0.5 * Math.exp(-time / 0.05) * Math.sin(2 * Math.PI * 185 * time)
        out[from + at] += gain * (burst * (noise() * 2 - 1) * 0.7 + tone)
    }
}

/** A hat: bright noise, closed and short or open and long. */
function hat(out: Float32Array, start: number, gain: number, noise: () => number, open = false) {
    const from = Math.floor(start * RATE)
    const decay = open ? 0.14 : 0.025
    const length = Math.floor(decay * 6 * RATE)
    let last = 0
    for (let at = 0; at < length && from + at < out.length; at += 1) {
        const sample = noise() * 2 - 1
        out[from + at] += gain * Math.exp(-at / RATE / decay) * (sample - last)
        last = sample
    }
}

/** Repeats what is in `bus` after `delay` seconds, each echo `feedback` as loud as the last. */
function echo(bus: Float32Array, delay: number, feedback: number) {
    const lag = Math.floor(delay * RATE)
    for (let index = lag; index < bus.length; index += 1) bus[index] += bus[index - lag] * feedback
}

function mixInto(out: Float32Array, bus: Float32Array, gain: number) {
    for (let index = 0; index < out.length; index += 1) out[index] += bus[index] * gain
}

/** Renders the song made from `seed` in `style` as samples at `RATE`, from -1 to 1. */
export function render(seed: number, style: Style): Float32Array {
    const plan = planOf(seed, style)
    const beat = 60 / plan.tempo
    const bar = 4 * beat
    const out = new Float32Array(Math.ceil((plan.bars * bar + TAIL) * RATE))
    const fx = new Float32Array(out.length)
    const noise = seeded(seed ^ 0x5bd1e995)
    const { random } = plan
    const phrases = plan.bars / 4
    const drums = style === 'folk' || style === 'pop' || style === 'electronic' || style === 'band'
    const melodic = style === 'folk' || style === 'pop' || style === 'chamber' || style === 'band'
    let melodyAt = 4 + Math.floor(random() * 3)

    for (let index = 0; index < plan.bars; index += 1) {
        const phrase = Math.floor(index / 4)
        const chorus = phrases > 2 && phrase % 2 === 1
        const intro = phrase === 0 && phrases > 2
        const last = phrase === phrases - 1
        const degree = (chorus ? plan.chorus : plan.verse)[index % 4]
        const start = index * bar
        const chord = [0, 2, 4].map((step) => noteOf(plan, degree + step, 1))

        // The pad: the chord held across the bar, two voices a hair apart.
        const padWave = style === 'choir' ? WAVES.voice : style === 'electronic' || style === 'band' ? WAVES.hollow : WAVES.pad
        const padGain = style === 'ambient' || style === 'choir' ? 0.16 : style === 'chamber' ? 0.11 : 0.07
        const swell: Envelope = { attack: style === 'ambient' || style === 'choir' ? bar * 0.45 : 0.08, release: bar * 0.35 }
        for (const tone of chord) {
            note(out, start, bar, hz(tone) * 1.003, padGain, padWave, swell, style === 'choir' ? 0.004 : 0)
            note(out, start, bar, hz(tone) * 0.997, padGain, padWave, swell)
        }

        // The bass.
        const low = hz(noteOf(plan, degree, 0))
        if (style === 'ambient' || style === 'choir') {
            note(out, start, bar, low, 0.22, WAVES.soft, { attack: 0.4, release: 0.8 })
        } else if (style === 'chamber' || style === 'folk') {
            note(out, start, bar / 2, low, 0.26, WAVES.bass, { attack: style === 'chamber' ? 0.12 : 0.005, decay: 0.9, release: 0.1 })
            note(out, start + bar / 2, bar / 2, hz(noteOf(plan, degree + 4, 0)), 0.22, WAVES.bass, {
                attack: style === 'chamber' ? 0.12 : 0.005,
                decay: 0.9,
                release: 0.1,
            })
        } else {
            for (let step = 0; step < 8; step += 1) {
                if (style === 'electronic' && step % 2 === 0) continue
                const octave = style === 'pop' && step % 2 === 1 ? 2 : 1
                note(out, start + (step * beat) / 2, beat / 2, low * octave, 0.24, WAVES.bass, {
                    attack: 0.004,
                    decay: 0.25,
                    release: 0.04,
                })
            }
        }

        // The arpeggio, into the echo's bus.
        if (style !== 'choir' && style !== 'band' && !(intro && style !== 'ambient')) {
            const tones = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24]
            const steps = style === 'electronic' ? 16 : style === 'ambient' ? 4 : 8
            const wave = style === 'electronic' ? WAVES.hollow : style === 'ambient' ? WAVES.soft : WAVES.pluck
            for (let step = 0; step < steps; step += 1) {
                if (style === 'ambient' && random() < 0.4) continue
                const pattern =
                    style === 'folk' ? [0, 2, 1, 2][step % 4] : style === 'chamber' ? [0, 1, 2, 3, 2, 1, 2, 1][step % 8] : step % 4
                const length = bar / steps
                note(fx, start + step * length, length, hz(tones[pattern]), style === 'ambient' ? 0.1 : 0.075, wave, {
                    attack: 0.003,
                    decay: style === 'ambient' ? 1.2 : 0.22,
                    release: 0.05,
                })
            }
        }

        // The melody: a walk over the scale, landing on the chord's tones.
        if (melodic && !intro && (chorus || random() < 0.6)) {
            const lead = style === 'band' ? WAVES.hollow : style === 'chamber' ? WAVES.soft : WAVES.pluck
            let at = 0
            while (at < 4) {
                const length = random() < 0.35 ? 1 : random() < 0.5 ? 0.5 : 2
                const span = Math.min(length, 4 - at)
                melodyAt += Math.floor(random() * 5) - 2
                melodyAt = Math.min(9, Math.max(0, melodyAt))
                const degreeNow = at === 0 ? degree + [0, 2, 4][Math.floor(random() * 3)] : melodyAt
                if (random() > 0.15)
                    note(
                        fx,
                        start + at * beat,
                        span * beat * 0.92,
                        hz(noteOf(plan, degreeNow, 2)),
                        style === 'band' ? 0.09 : 0.11,
                        lead,
                        {
                            attack: style === 'chamber' ? 0.06 : 0.01,
                            decay: style === 'chamber' ? undefined : 0.8,
                            release: 0.08,
                        },
                        style === 'chamber' ? 0.006 : 0.002,
                    )
                at += span
            }
        }

        // The drums, out of the intro, thinning in the last bar.
        if (drums && !intro) {
            const fill = last && index === plan.bars - 1
            for (let step = 0; step < 16; step += 1) {
                const time = start + (step * beat) / 4
                if (fill && step > 8) continue
                const onBeat = step % 4 === 0
                if (style === 'electronic') {
                    if (onBeat) kick(out, time, 0.55)
                    if (step === 4 || step === 12) snare(out, time, 0.32, noise, true)
                    if (step % 4 === 2) hat(out, time, 0.16, noise, true)
                    else hat(out, time, 0.07, noise)
                } else if (style === 'folk') {
                    if (step === 0 || step === 8) kick(out, time, 0.32)
                    if (step === 12 && random() < 0.6) snare(out, time, 0.1, noise)
                    if (step % 2 === 0) hat(out, time, step % 4 === 0 ? 0.05 : 0.08, noise)
                } else {
                    const loud = style === 'band' ? 1.25 : 1
                    if (step === 0 || step === 8 || (step === 6 && random() < 0.5) || (style === 'band' && step === 10))
                        kick(out, time, 0.5 * loud)
                    if (step === 4 || step === 12) snare(out, time, 0.26 * loud, noise)
                    if (step % 2 === 0) hat(out, time, 0.07 * loud, noise)
                }
            }
            if (style === 'band' && index % 4 === 0 && !intro) hat(out, start, 0.22, noise, true)
        }
    }

    echo(fx, beat * 0.75, style === 'ambient' ? 0.5 : 0.32)
    mixInto(out, fx, 1)

    // A little room: two short echoes of everything, quiet.
    const room = Float32Array.from(out)
    echo(room, 0.043, 0.45)
    echo(room, 0.061, 0.4)
    mixInto(out, room, style === 'ambient' || style === 'choir' ? 0.18 : 0.08)

    // Warmed, leveled, softly clipped, faded in and out.
    let warm = 0
    let peak = 0
    const smooth = style === 'electronic' || style === 'band' ? 0.85 : style === 'ambient' || style === 'choir' ? 0.6 : 0.75
    for (let index = 0; index < out.length; index += 1) {
        warm += smooth * (out[index] - warm)
        out[index] = warm
        peak = Math.max(peak, Math.abs(warm))
    }
    const scale = peak === 0 ? 1 : 1.1 / peak
    const fadeIn = Math.floor(0.03 * RATE)
    const fadeOut = Math.floor(2.5 * RATE)
    for (let index = 0; index < out.length; index += 1) {
        let level = Math.tanh(out[index] * scale) * 0.92
        if (index < fadeIn) level *= index / fadeIn
        const left = out.length - index
        if (left < fadeOut) level *= left / fadeOut
        out[index] = level
    }
    return out
}

/** The samples as a WAV file: 16-bit, one channel, at `RATE`. */
export function wav(samples: Float32Array): Blob {
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
    for (let index = 0; index < samples.length; index += 1) {
        view.setInt16(44 + index * 2, Math.round(Math.max(-1, Math.min(1, samples[index])) * 32_767), true)
    }
    return new Blob([buffer], { type: 'audio/wav' })
}

/** The song's loudness in `bins` steps from start to end, each from 0 to 1, for the player's waveform. */
export function waveformOf(samples: Float32Array, bins = 180): number[] {
    const size = Math.max(1, Math.floor(samples.length / bins))
    const levels: number[] = []
    for (let bin = 0; bin < bins; bin += 1) {
        let sum = 0
        for (let index = bin * size; index < (bin + 1) * size && index < samples.length; index += 1) sum += samples[index] * samples[index]
        levels.push(Math.sqrt(sum / size))
    }
    // Stretched between the quietest step and the loudest, so the verses, choruses and fades show.
    const loudest = Math.max(...levels, 1e-6)
    const quietest = Math.min(...levels.slice(Math.floor(bins * 0.05), Math.floor(bins * 0.9)))
    const floor = Math.min(quietest, loudest) * 0.85
    return levels.map((level) => Math.min(1, Math.max(0.04, 0.2 + (0.8 * (level - floor)) / Math.max(1e-6, loudest - floor))))
}
