/**
 * The edit's sound: while it plays forward at its own speed, every sound clip on a track that is
 * not muted is scheduled through Web Audio from where the playhead stands, at the clip's volume
 * under the master level. The export mixes the same clips into two channels.
 */

import { samplesOf, SOUND_RATE, sourceOf } from './media'
import { end, type Clip, type Edit } from './model'

let context: AudioContext | undefined
let master: GainNode | undefined
let level = 1
const buffers = new Map<string, AudioBuffer>()
let playing: AudioBufferSourceNode[] = []

function contextOf(): AudioContext | undefined {
    if (typeof AudioContext === 'undefined') return undefined
    if (context === undefined) {
        context = new AudioContext()
        master = context.createGain()
        master.gain.value = level
        master.connect(context.destination)
    }
    return context
}

function bufferOf(audio: AudioContext, sourceId: string): AudioBuffer | undefined {
    const known = buffers.get(sourceId)
    if (known !== undefined) return known
    const source = sourceOf(sourceId)
    if (source === undefined) return undefined
    const [left, right] = samplesOf(source)
    const buffer = audio.createBuffer(2, left.length, SOUND_RATE)
    buffer.copyToChannel(new Float32Array(left), 0)
    buffer.copyToChannel(new Float32Array(right), 1)
    buffers.set(sourceId, buffer)
    return buffer
}

/** The sound clips that play: on a sound track that is not muted. */
function heard(edit: Edit): Clip[] {
    const open = new Set(edit.tracks.filter((track) => track.kind === 'audio' && track.muted !== true).map((track) => track.id))
    return edit.clips.filter((clip) => open.has(clip.track) && clip.source !== undefined)
}

/** Stops every sound scheduled. */
export function stopSound(): void {
    for (const node of playing) {
        try {
            node.stop()
        } catch {
            // Already ended.
        }
        node.disconnect()
    }
    playing = []
}

/** Plays the edit's sound from second `from`, as the picture plays from there. */
export function playSound(edit: Edit, from: number): void {
    stopSound()
    const audio = contextOf()
    if (audio === undefined || master === undefined) return
    void audio.resume()
    const now = audio.currentTime + 0.03
    for (const clip of heard(edit)) {
        if (end(clip) <= from) continue
        const buffer = bufferOf(audio, clip.source ?? '')
        if (buffer === undefined) continue
        const skipped = Math.max(0, from - clip.start)
        const node = audio.createBufferSource()
        node.buffer = buffer
        const gain = audio.createGain()
        gain.gain.value = clip.volume ?? 1
        node.connect(gain)
        gain.connect(master)
        node.start(now + Math.max(0, clip.start - from), clip.inPoint + skipped, clip.duration - skipped)
        playing.push(node)
    }
}

/** Sets the master level, from 0 to 1. */
export function setSoundLevel(next: number): void {
    level = next
    if (master !== undefined) master.gain.value = next
}

/** The edit's sound mixed into two channels at `SOUND_RATE`, `length` seconds long, for the export. */
export function mixdown(edit: Edit, length: number): [Float32Array, Float32Array] {
    const frames = Math.ceil(length * SOUND_RATE)
    const left = new Float32Array(frames)
    const right = new Float32Array(frames)
    for (const clip of heard(edit)) {
        const source = sourceOf(clip.source)
        if (source === undefined) continue
        const [fromLeft, fromRight] = samplesOf(source)
        const volume = clip.volume ?? 1
        const at = Math.round(clip.start * SOUND_RATE)
        const from = Math.round(clip.inPoint * SOUND_RATE)
        const count = Math.min(Math.round(clip.duration * SOUND_RATE), fromLeft.length - from, frames - at)
        for (let index = 0; index < count; index += 1) {
            left[at + index] = (left[at + index] ?? 0) + (fromLeft[from + index] ?? 0) * volume
            right[at + index] = (right[at + index] ?? 0) + (fromRight[from + index] ?? 0) * volume
        }
    }
    for (let index = 0; index < frames; index += 1) {
        left[index] = Math.max(-1, Math.min(1, left[index] ?? 0))
        right[index] = Math.max(-1, Math.min(1, right[index] ?? 0))
    }
    return [left, right]
}
