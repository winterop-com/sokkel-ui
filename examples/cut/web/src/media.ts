/**
 * The media bin: the source clips every project cuts from. A picture is a scene drawn at any
 * second, a sound is made sample by sample from the same kind of scene, both in the page, so a
 * clip plays, scrubs and steps frame by frame with no file behind it.
 */

import type { KindColor } from '@winterop-com/sokkel-ui/lib/kind'

import { drawFrame, type SceneKind, type SceneSpec } from 'tidevann-shared/clips/scenes'
import { SOUND_RATE, synthesize } from 'tidevann-shared/clips/sound'

export type SourceKind = 'video' | 'audio'

/** One clip in the bin: what it is called, what it is drawn or made from, and how long it runs. */
export interface Source {
    id: string
    name: string
    kind: SourceKind
    scene: SceneKind
    hue: number
    accent: number
    seed: number
    /** Its full length in seconds. */
    duration: number
    /** Where it was recorded, by plain geography. */
    place: string
    /** The color its clips wear on the timeline. */
    color: KindColor
}

export const SOURCES: readonly Source[] = [
    {
        id: 'harbor-dawn',
        name: 'Harbor at dawn',
        kind: 'video',
        scene: 'sea',
        hue: 212,
        accent: 28,
        seed: 11,
        duration: 24,
        place: 'A harbor town on the northern coast',
        color: 'blue',
    },
    {
        id: 'lighthouse',
        name: 'Lighthouse beam',
        kind: 'video',
        scene: 'lighthouse',
        hue: 225,
        accent: 48,
        seed: 23,
        duration: 18,
        place: 'A headland on the western coast',
        color: 'violet',
    },
    {
        id: 'coast-line',
        name: 'Coast line train',
        kind: 'video',
        scene: 'train',
        hue: 200,
        accent: 30,
        seed: 37,
        duration: 20,
        place: 'A valley line inland',
        color: 'teal',
    },
    {
        id: 'ridge-snow',
        name: 'Snow on the ridge',
        kind: 'video',
        scene: 'peaks',
        hue: 215,
        accent: 190,
        seed: 41,
        duration: 16,
        place: 'A mountain range in the north',
        color: 'jade',
    },
    {
        id: 'aurora',
        name: 'Aurora over the fjord',
        kind: 'video',
        scene: 'aurora',
        hue: 230,
        accent: 140,
        seed: 53,
        duration: 22,
        place: 'A fjord in the far north',
        color: 'green',
    },
    {
        id: 'city-rain',
        name: 'City in the rain',
        kind: 'video',
        scene: 'rain',
        hue: 220,
        accent: 38,
        seed: 67,
        duration: 14,
        place: 'A port city',
        color: 'pink',
    },
    {
        id: 'tide-chart',
        name: 'Tide chart',
        kind: 'video',
        scene: 'tide',
        hue: 205,
        accent: 185,
        seed: 71,
        duration: 12,
        place: 'The harbor office',
        color: 'blue',
    },
    {
        id: 'ferry-route',
        name: 'Ferry route',
        kind: 'video',
        scene: 'islands',
        hue: 196,
        accent: 95,
        seed: 83,
        duration: 20,
        place: 'An archipelago in the south',
        color: 'teal',
    },
    {
        id: 'wind-farm',
        name: 'Wind over the fields',
        kind: 'video',
        scene: 'fields',
        hue: 205,
        accent: 100,
        seed: 97,
        duration: 18,
        place: 'Farmland on the plains',
        color: 'jade',
    },
    {
        id: 'surf',
        name: 'Surf on the breakwater',
        kind: 'audio',
        scene: 'sea',
        hue: 0,
        accent: 0,
        seed: 4,
        duration: 30,
        place: 'A harbor town on the northern coast',
        color: 'teal',
    },
    {
        id: 'rails',
        name: 'Wheels on the rails',
        kind: 'audio',
        scene: 'train',
        hue: 0,
        accent: 0,
        seed: 5,
        duration: 24,
        place: 'A valley line inland',
        color: 'violet',
    },
    {
        id: 'roof-rain',
        name: 'Rain on the roof',
        kind: 'audio',
        scene: 'rain',
        hue: 0,
        accent: 0,
        seed: 2,
        duration: 20,
        place: 'A port city',
        color: 'pink',
    },
    {
        id: 'high-wind',
        name: 'Wind on the ridge',
        kind: 'audio',
        scene: 'peaks',
        hue: 0,
        accent: 0,
        seed: 3,
        duration: 26,
        place: 'A mountain range in the north',
        color: 'green',
    },
]

export const sourceOf = (id: string | undefined): Source | undefined => SOURCES.find((source) => source.id === id)

/** What a source's scene is drawn or its sound made from. */
export function specOf(source: Source): SceneSpec {
    return {
        kind: source.scene,
        hue: source.hue,
        accent: source.accent,
        seed: source.seed,
        title: source.name,
        channel: 'Tidevann',
        duration: source.duration,
    }
}

/** Draws a source's picture at second `t` of it, without the title card its scene can carry. */
export function drawSource(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    source: Source,
    t: number,
    width: number,
    height: number,
): void {
    drawFrame(context, specOf(source), Math.max(0, Math.min(source.duration, t)), width, height, false)
}

const posters = new Map<string, string>()

/** A still of a picture source a third of the way in, as a JPEG data address. */
export function posterOf(source: Source, at = source.duration * 0.35): string {
    const key = `${source.id}@${at.toFixed(2)}`
    const known = posters.get(key)
    if (known !== undefined) return known
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 180
    const context = canvas.getContext('2d')
    if (context === null) return ''
    drawSource(context, source, at, canvas.width, canvas.height)
    const url = canvas.toDataURL('image/jpeg', 0.8)
    posters.set(key, url)
    return url
}

export { SOUND_RATE }

const sounds = new Map<string, [Float32Array, Float32Array]>()

/** A sound source's two channels at `SOUND_RATE`, made once and kept for the visit. */
export function samplesOf(source: Source): [Float32Array, Float32Array] {
    const known = sounds.get(source.id)
    if (known !== undefined) return known
    const made = synthesize(specOf(source))
    sounds.set(source.id, made)
    return made
}

/** How many peaks a second of sound is drawn with. */
export const PEAKS_PER_SECOND = 8

const peaks = new Map<string, number[]>()

/** The loudest sample in each eighth of a second of a sound source, from 0 to 1, for its waveform. */
export function peaksOf(source: Source): number[] {
    const known = peaks.get(source.id)
    if (known !== undefined) return known
    const [left, right] = samplesOf(source)
    const step = Math.floor(SOUND_RATE / PEAKS_PER_SECOND)
    const out: number[] = []
    let loudest = 0
    for (let start = 0; start < left.length; start += step) {
        let peak = 0
        const end = Math.min(left.length, start + step)
        for (let index = start; index < end; index += 16) peak = Math.max(peak, Math.abs(left[index] ?? 0), Math.abs(right[index] ?? 0))
        out.push(peak)
        loudest = Math.max(loudest, peak)
    }
    const scaled = out.map((peak) => (loudest === 0 ? 0 : peak / loudest))
    peaks.set(source.id, scaled)
    return scaled
}

/** The peaks of the part of a sound source a clip plays, from `inPoint` for `duration` seconds. */
export function clipPeaks(source: Source, inPoint: number, duration: number): number[] {
    const all = peaksOf(source)
    const from = Math.max(0, Math.floor(inPoint * PEAKS_PER_SECOND))
    return all.slice(from, Math.max(from + 1, Math.ceil((inPoint + duration) * PEAKS_PER_SECOND)))
}
