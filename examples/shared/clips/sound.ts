/**
 * The sound under a clip, made sample by sample: a soft chord of its own for every video, and the
 * sound of its scene under it (surf, wind, rain, a train on its rails), the same every time.
 */

import { seeded, type SceneSpec } from './scenes'

export const SOUND_RATE = 48_000

/** The roots the chords are built on, in hertz, one picked per video. */
const ROOTS = [110, 123.47, 130.81, 146.83, 164.81, 174.61]

/** The two channels of the clip's sound, each `duration` seconds long. */
export function synthesize(spec: SceneSpec): [Float32Array, Float32Array] {
    const frames = Math.ceil(spec.duration * SOUND_RATE)
    const left = new Float32Array(frames)
    const right = new Float32Array(frames)
    const random = seeded(spec.seed * 31 + 7)
    const root = ROOTS[spec.seed % ROOTS.length] ?? 110
    const voices = [1, 1.5, 2, 2.52, 3].map((ratio, index) => ({
        frequency: root * ratio,
        rate: 0.07 + index * 0.031,
        level: index === 0 ? 0.05 : 0.03,
        pan: (index % 2 === 0 ? -1 : 1) * 0.3,
    }))
    let brown = 0
    let soft = 0
    let wind = 0
    const surf = spec.kind === 'sea' || spec.kind === 'lighthouse' || spec.kind === 'islands' || spec.kind === 'tide'
    const breeze = spec.kind === 'peaks' || spec.kind === 'aurora' || spec.kind === 'fields'
    const rails = spec.kind === 'train'
    const shower = spec.kind === 'rain'
    for (let index = 0; index < frames; index += 1) {
        const t = index / SOUND_RATE
        // Fade in over the first second and out over the last two.
        const envelope = Math.min(1, t, (spec.duration - t) / 2)
        let l = 0
        let r = 0
        for (const voice of voices) {
            const swell = 0.6 + 0.4 * Math.sin(Math.PI * 2 * voice.rate * t + voice.frequency)
            const sample = Math.sin(Math.PI * 2 * voice.frequency * t) * voice.level * swell
            l += sample * (1 - voice.pan)
            r += sample * (1 + voice.pan)
        }
        const white = random() * 2 - 1
        brown = (brown + 0.02 * white) / 1.02
        soft += 0.08 * (white - soft)
        if (surf) {
            const swell = Math.max(0, Math.sin((Math.PI * 2 * t) / 7.3)) ** 2
            const noise = brown * 3.2 * (0.25 + 0.75 * swell)
            l += noise
            r += noise * 0.9
        }
        if (breeze) {
            wind += 0.02 * (white - wind)
            const gust = 0.5 + 0.5 * Math.sin((Math.PI * 2 * t) / 9 + 1)
            l += wind * 0.9 * gust
            r += wind * 0.7 * gust
        }
        if (rails) {
            const beat = t % 0.62
            const clack = beat < 0.03 || (beat > 0.16 && beat < 0.19) ? white * 0.25 * (1 - (beat % 0.16) / 0.03) : 0
            const rumble = brown * 2.2
            l += clack + rumble
            r += clack * 0.8 + rumble
        }
        if (shower) {
            l += soft * 0.5
            r += soft * 0.5
            const drip = (t * 3.1) % 1
            if (drip < 0.04) {
                const plink = Math.sin(Math.PI * 2 * (1800 - drip * 9000) * t) * 0.05 * (1 - drip / 0.04)
                l += plink
                r += plink * 0.6
            }
        }
        left[index] = Math.max(-1, Math.min(1, l * envelope))
        right[index] = Math.max(-1, Math.min(1, r * envelope))
    }
    return [left, right]
}
