/**
 * An edit: tracks of clips laid along one time axis in seconds. A picture or sound clip plays its
 * source from `inPoint` for `duration` seconds, starting at `start` on the timeline; a title clip
 * writes its text over the picture for its time. Every edit is a pure function from one edit to
 * the next, so undo and redo hold whole edits.
 */

import { sourceOf, type Source } from './media'

export type TrackKind = 'video' | 'audio' | 'title'

export interface Track {
    id: string
    name: string
    kind: TrackKind
    muted?: boolean
    locked?: boolean
    hidden?: boolean
}

export interface Clip {
    id: string
    track: string
    /** Where it starts on the timeline, in seconds. */
    start: number
    /** How long it plays, in seconds. */
    duration: number
    /** Where in its source it starts, in seconds; 0 for a title. */
    inPoint: number
    /** The bin's source a picture or sound clip plays; none for a title. */
    source?: string
    /** Its own name; the source's when not given. */
    name?: string
    /** The words a title clip writes over the picture. */
    text?: string
    /** How loud a sound clip plays, from 0 to 1. */
    volume?: number
}

/** What undo and redo step between: the tracks and their clips. */
export interface Edit {
    tracks: Track[]
    clips: Clip[]
}

export interface Project extends Edit {
    id: string
    name: string
    /** Who made it. */
    owner: string
    created: number
    updated: number
}

export const FPS = 30

/** A frame's length in seconds. */
export const FRAME = 1 / FPS

/** The tracks a new project starts with, from the top: a title over the picture, the picture, and two of sound. */
export function defaultTracks(): Track[] {
    return [
        { id: 'T1', name: 'Titles', kind: 'title' },
        { id: 'V1', name: 'Picture', kind: 'video' },
        { id: 'A1', name: 'Sound 1', kind: 'audio' },
        { id: 'A2', name: 'Sound 2', kind: 'audio' },
    ]
}

/** Rounds a time to the nearest frame, so every edit lands on one. */
export const onFrame = (seconds: number) => Math.max(0, Math.round(seconds * FPS) / FPS)

/** How long the edit runs: to the end of its last clip. */
export function lengthOf(edit: Edit): number {
    return edit.clips.reduce((end, clip) => Math.max(end, clip.start + clip.duration), 0)
}

export const end = (clip: Clip) => clip.start + clip.duration

export function trackOf(edit: Edit, id: string): Track | undefined {
    return edit.tracks.find((track) => track.id === id)
}

/** A clip's name: its own, the title's words, or its source's. */
export function nameOf(clip: Clip): string {
    if (clip.name !== undefined && clip.name !== '') return clip.name
    if (clip.text !== undefined) return clip.text === '' ? 'Title' : clip.text
    return sourceOf(clip.source)?.name ?? 'Clip'
}

/** The clip on `track` that plays at second `t`, if any. */
export function clipAt(edit: Edit, track: string, t: number): Clip | undefined {
    return edit.clips.find((clip) => clip.track === track && clip.start <= t + 1e-6 && t < end(clip) - 1e-6)
}

/** The first track of a kind, where a clip of that kind goes when none is named. */
export function firstTrack(edit: Edit, kind: TrackKind): Track | undefined {
    return edit.tracks.find((track) => track.kind === kind && track.locked !== true)
}

let made = 0

/** A new clip's id, unique within the visit and across reloads. */
export function clipId(): string {
    made += 1
    return `clip-${Date.now().toString(36)}-${String(made)}`
}

/** Where on `track` a clip of `duration` can start at or after `at` without covering another. */
export function freeStart(edit: Edit, track: string, at: number, duration: number, ignore?: string): number {
    const others = edit.clips.filter((clip) => clip.track === track && clip.id !== ignore).sort((a, b) => a.start - b.start)
    let start = onFrame(at)
    for (const clip of others) {
        if (start + duration <= clip.start + 1e-6) break
        if (start < end(clip) - 1e-6) start = onFrame(end(clip))
    }
    return start
}

/** Places a source on its kind's first track at `at`, or after what is there; the new clip's id with the edit. */
export function addSource(edit: Edit, source: Source, at: number): { edit: Edit; id: string } | undefined {
    const track = firstTrack(edit, source.kind)
    if (track === undefined) return undefined
    const duration = source.kind === 'video' ? Math.min(source.duration, 8) : Math.min(source.duration, 16)
    const id = clipId()
    const clip: Clip = {
        id,
        track: track.id,
        start: freeStart(edit, track.id, at, duration),
        duration,
        inPoint: 0,
        source: source.id,
        ...(source.kind === 'audio' ? { volume: 0.8 } : {}),
    }
    return { edit: { ...edit, clips: [...edit.clips, clip] }, id }
}

/** Adds a title of `duration` seconds at `at` on the first title track. */
export function addTitle(edit: Edit, at: number, text: string, duration: number): { edit: Edit; id: string } | undefined {
    const track = firstTrack(edit, 'title')
    if (track === undefined) return undefined
    const id = clipId()
    const clip: Clip = { id, track: track.id, start: freeStart(edit, track.id, at, duration), duration, inPoint: 0, text }
    return { edit: { ...edit, clips: [...edit.clips, clip] }, id }
}

/** The longest a clip may run from `inPoint`: to its source's end, or without limit for a title. */
export function maxDuration(clip: Clip, inPoint = clip.inPoint): number {
    const source = sourceOf(clip.source)
    return source === undefined ? Number.POSITIVE_INFINITY : source.duration - inPoint
}

/** Changes one clip, held to its source and to the frames. */
export function patchClip(edit: Edit, id: string, patch: Partial<Omit<Clip, 'id'>>): Edit {
    return {
        ...edit,
        clips: edit.clips.map((clip) => {
            if (clip.id !== id) return clip
            const next = { ...clip, ...patch }
            const source = sourceOf(next.source)
            next.start = onFrame(next.start)
            next.inPoint = source === undefined ? 0 : Math.min(onFrame(next.inPoint), source.duration - FRAME)
            next.duration = Math.max(FRAME, Math.min(onFrame(next.duration), maxDuration(next)))
            return next
        }),
    }
}

/** Cuts a clip in two at second `at` of the timeline; nothing when `at` is not inside it. */
export function splitClip(edit: Edit, id: string, at: number): { edit: Edit; id: string } | undefined {
    const clip = edit.clips.find((one) => one.id === id)
    const cut = onFrame(at)
    if (clip === undefined || cut <= clip.start + FRAME / 2 || cut >= end(clip) - FRAME / 2) return undefined
    const head = cut - clip.start
    const tail: Clip = {
        ...clip,
        id: clipId(),
        start: cut,
        duration: onFrame(clip.duration - head),
        inPoint: clip.source === undefined ? 0 : onFrame(clip.inPoint + head),
    }
    return {
        edit: { ...edit, clips: edit.clips.flatMap((one) => (one.id === id ? [{ ...one, duration: onFrame(head) }, tail] : [one])) },
        id: tail.id,
    }
}

/** Cuts every clip under the playhead on an unlocked track; the edit, or undefined when nothing was under it. */
export function splitAll(edit: Edit, at: number, only?: readonly string[]): Edit | undefined {
    let next = edit
    let cut = false
    for (const clip of edit.clips) {
        if (only !== undefined && only.length > 0 && !only.includes(clip.id)) continue
        if (trackOf(edit, clip.track)?.locked === true) continue
        const done = splitClip(next, clip.id, at)
        if (done !== undefined) {
            next = done.edit
            cut = true
        }
    }
    return cut ? next : undefined
}

/**
 * Takes clips off; with `ripple`, what follows each on its track moves left by the gap it leaves,
 * so the track closes up.
 */
export function deleteClips(edit: Edit, ids: readonly string[], ripple: boolean): Edit {
    const gone = edit.clips.filter((clip) => ids.includes(clip.id) && trackOf(edit, clip.track)?.locked !== true)
    let clips = edit.clips.filter((clip) => !gone.includes(clip))
    if (ripple) {
        // Latest first, so each shift is measured on the track as it stood.
        for (const removed of [...gone].sort((a, b) => b.start - a.start)) {
            clips = clips.map((clip) =>
                clip.track === removed.track && clip.start >= end(removed) - 1e-6
                    ? { ...clip, start: onFrame(clip.start - removed.duration) }
                    : clip,
            )
        }
    }
    return { ...edit, clips }
}

/** Moves or trims clips as a timeline hands the changes over, each held to its source and to the frames. */
export function applyChanges(
    edit: Edit,
    changes: readonly { id: string; start?: number; duration?: number; inPoint?: number; track?: string }[],
): Edit {
    let next = edit
    for (const change of changes) {
        const { id, ...patch } = change
        const clip = next.clips.find((one) => one.id === id)
        if (clip === undefined) continue
        // A clip only moves onto a track of its own kind.
        if (patch.track !== undefined) {
            const from = trackOf(next, clip.track)
            const to = trackOf(next, patch.track)
            if (to === undefined || to.kind !== from?.kind || to.locked === true) delete patch.track
        }
        next = patchClip(next, id, patch)
    }
    return next
}

/** A copy of an edit with new clip ids, for a duplicated project. */
export function copyEdit(edit: Edit): Edit {
    return { tracks: edit.tracks.map((track) => ({ ...track })), clips: edit.clips.map((clip) => ({ ...clip, id: clipId() })) }
}

/** A time as an editor writes it: hours, minutes, seconds and frames, 00:01:24:12. */
export function timecode(seconds: number, fps = FPS): string {
    const frames = Math.round(Math.max(0, seconds) * fps)
    const whole = Math.floor(frames / fps)
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${pad(Math.floor(whole / 3600))}:${pad(Math.floor((whole % 3600) / 60))}:${pad(whole % 60)}:${pad(frames % fps)}`
}

/** A length in words a person reads: 1:24, or 0:08. */
export function lengthText(seconds: number): string {
    const whole = Math.round(seconds)
    return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, '0')}`
}

/** The person's settings, kept by the backend. */
export interface Prefs {
    id: string
    /** Clips snap to each other's edges and to the playhead while dragged. */
    snap: boolean
    /** Plays from the start again at the end. */
    loop: boolean
    /** How long a new title runs, in seconds. */
    titleLength: number
    /** The resolution an export is made at. */
    exportSize: ExportSize
    /** The preview draws at half size, for a slow machine. */
    lightPreview: boolean
    /** Delete closes the gap a clip leaves, as Ripple delete does. */
    rippleByDefault: boolean
}

export type ExportSize = '720' | '480' | '360'

export const EXPORT_SIZES: Record<ExportSize, { label: string; width: number; height: number; bitrate: number }> = {
    '720': { label: '720p', width: 1280, height: 720, bitrate: 2_500_000 },
    '480': { label: '480p', width: 854, height: 480, bitrate: 1_200_000 },
    '360': { label: '360p', width: 640, height: 360, bitrate: 700_000 },
}

export const DEFAULT_PREFS: Omit<Prefs, 'id'> = {
    snap: true,
    loop: false,
    titleLength: 4,
    exportSize: '480',
    lightPreview: false,
    rippleByDefault: false,
}
