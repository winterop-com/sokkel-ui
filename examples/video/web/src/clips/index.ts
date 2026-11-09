/**
 * The site's media server, in the page: each video's clip at each rendition is made the first time
 * it is asked for (in a worker, through WebCodecs) and kept for the session, its posters drawn
 * from the same scene and its captions written as WebVTT. Nothing is fetched from a network.
 */

import { useEffect, useState, useSyncExternalStore } from 'react'

import { channelOf, seedOf, type Video } from '../catalog'
import { clearKept, keep, keptSize, pin, readKept, unpinAllBut } from './kept'
import { drawFrame, type SceneSpec } from './scenes'
import type { ClipJob, ClipReply } from './worker'

export type RenditionId = '720' | '480' | '360' | '240'

/** One rendition a clip is made at: its picture's size and the bitrate it is encoded at. */
export interface Rendition {
    id: RenditionId
    label: string
    width: number
    height: number
    bitrate: number
}

/** The renditions offered, best first. */
export const RENDITIONS: readonly Rendition[] = [
    { id: '720', label: '720p', width: 1280, height: 720, bitrate: 1_600_000 },
    { id: '480', label: '480p', width: 854, height: 480, bitrate: 850_000 },
    { id: '360', label: '360p', width: 640, height: 360, bitrate: 450_000 },
    { id: '240', label: '240p', width: 426, height: 240, bitrate: 220_000 },
]

export const renditionOf = (id: string): Rendition => RENDITIONS.find((one) => one.id === id) ?? (RENDITIONS[1] as Rendition)

/** How many frames each second of a clip has. */
const FPS = 24

/** A clip made and ready to play. */
export interface Clip {
    url: string
    blob: Blob
    rendition: Rendition
    /** The bits per second it came out at, from its size and length. */
    bitrate: number
    /** Whether it has a sound track; none where the browser has no Opus encoder. */
    sound: boolean
    /** How long it took to make, in milliseconds. */
    made: number
    /** Whether it was kept from an earlier visit rather than made now. */
    kept: boolean
}

/** What a clip's scene is drawn from. */
export function specOf(video: Video): SceneSpec {
    return {
        kind: video.scene,
        hue: video.hue,
        accent: video.accent,
        seed: seedOf(video.id),
        title: video.title,
        channel: channelOf(video).name,
        duration: video.duration,
    }
}

/** Whether this browser can make clips at all: WebCodecs' video encoder and an offscreen canvas. */
export const canMakeClips = typeof VideoEncoder !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined'

interface Pending {
    job: ClipJob
    key: string
    rendition: Rendition
    resolve: (clip: Clip) => void
    reject: (error: Error) => void
    started: number
    urgent: boolean
}

const clips = new Map<string, Promise<Clip>>()
const made = new Map<string, Clip>()
const shares = new Map<string, number>()
const listeners = new Set<() => void>()
const queue: Pending[] = []
let running: Pending | undefined
let worker: Worker | undefined
let jobs = 0

/** The clip being made now, by its video's title, and how far along it is; the same object until either changes. */
let makingNow: { title: string; share: number } | undefined

const tell = () => {
    const share = running === undefined ? undefined : (shares.get(running.key) ?? 0)
    if (running === undefined) makingNow = undefined
    else if (makingNow?.title !== running.job.spec.title || makingNow.share !== share)
        makingNow = { title: running.job.spec.title, share: share ?? 0 }
    for (const listener of Array.from(listeners)) listener()
}

function clipOf(blob: Blob, rendition: Rendition, duration: number, sound: boolean, took: number, kept: boolean): Clip {
    return { url: URL.createObjectURL(blob), blob, rendition, bitrate: Math.round((blob.size * 8) / duration), sound, made: took, kept }
}

function workerOf(): Worker {
    worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<ClipReply>) => {
        const reply = event.data
        const current = running
        if (current === undefined || reply.id !== current.job.id) return
        if (reply.kind === 'progress') {
            shares.set(current.key, reply.share)
            tell()
            return
        }
        running = undefined
        if (reply.kind === 'done') {
            const clip = clipOf(
                reply.blob,
                current.rendition,
                current.job.spec.duration,
                reply.sound,
                Math.round(performance.now() - current.started),
                false,
            )
            made.set(current.key, clip)
            void keep({ key: current.key, blob: reply.blob, sound: reply.sound, made: clip.made, used: Date.now() })
            shares.set(current.key, 1)
            current.resolve(clip)
        } else {
            clips.delete(current.key)
            shares.delete(current.key)
            current.reject(new Error(reply.message))
        }
        tell()
        next()
    }
    return worker
}

function next(): void {
    if (running !== undefined) return
    const index = queue.findIndex((one) => one.urgent)
    const [pending] = queue.splice(index < 0 ? 0 : index, 1)
    if (pending === undefined) return
    running = pending
    pending.started = performance.now()
    workerOf().postMessage(pending.job)
    tell()
}

const keyOf = (video: Video, rendition: Rendition) => `${video.id}:${rendition.id}`

/**
 * The clip of `video` at `rendition`, made now unless it is made or under way already. An urgent
 * ask (the video being watched) goes before the ones made ahead, such as what plays next.
 */
export function requestClip(video: Video, rendition: Rendition, urgent = true): Promise<Clip> {
    const key = keyOf(video, rendition)
    const known = clips.get(key)
    if (known !== undefined) {
        const waiting = queue.find((one) => one.key === key)
        if (waiting !== undefined && urgent) waiting.urgent = true
        return known
    }
    const promise = readKept(key).then((kept) => {
        if (kept !== undefined) {
            const clip = clipOf(kept.blob, rendition, video.duration, kept.sound, kept.made, true)
            made.set(key, clip)
            shares.set(key, 1)
            tell()
            return clip
        }
        if (!canMakeClips) throw new Error('This browser cannot make the clips: it has no WebCodecs video encoder.')
        jobs += 1
        const job: ClipJob = {
            id: jobs,
            spec: specOf(video),
            width: rendition.width,
            height: rendition.height,
            bitrate: rendition.bitrate,
            fps: FPS,
        }
        return new Promise<Clip>((resolve, reject) => {
            queue.push({ job, key, rendition, resolve, reject, started: 0, urgent })
            next()
        })
    })
    promise.catch(() => {
        clips.delete(key)
        shares.delete(key)
        tell()
    })
    clips.set(key, promise)
    shares.set(key, 0)
    tell()
    return promise
}

const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

/** The clip of a video at a rendition, asked for when this mounts: made, or how far along it is. */
export function useClip(
    video: Video | undefined,
    rendition: Rendition,
): { clip: Clip | undefined; share: number; error: string | undefined } {
    const key = video === undefined ? '' : keyOf(video, rendition)
    const clip = useSyncExternalStore(subscribe, () => made.get(key))
    const share = useSyncExternalStore(subscribe, () => shares.get(key) ?? 0)
    const [error, setError] = useState<{ key: string; message: string } | undefined>(undefined)
    useEffect(() => {
        if (video === undefined) return
        requestClip(video, rendition).catch((failure: unknown) => {
            setError({ key: keyOf(video, rendition), message: failure instanceof Error ? failure.message : String(failure) })
        })
    }, [video, rendition])
    return { clip, share, error: error?.key === key ? error.message : undefined }
}

/** The clip being made now and how far along it is, or undefined while none is. */
export function useMaking(): { title: string; share: number } | undefined {
    return useSyncExternalStore(subscribe, () => makingNow)
}

/** How many clips this visit holds and how many bytes they take, for the settings. */
export function useClipCache(): { count: number; bytes: number } {
    const count = useSyncExternalStore(subscribe, () => made.size)
    const bytes = useSyncExternalStore(subscribe, () => Array.from(made.values()).reduce((sum, clip) => sum + clip.blob.size, 0))
    return { count, bytes }
}

/** Lets every made clip go, here and kept between visits, so each is made again when next watched; downloads stay. */
export async function forgetClips({ downloads = false }: { downloads?: boolean } = {}): Promise<void> {
    await clearKept(downloads)
    for (const clip of made.values()) URL.revokeObjectURL(clip.url)
    made.clear()
    for (const key of Array.from(clips.keys())) if (!queue.some((one) => one.key === key) && running?.key !== key) clips.delete(key)
    for (const key of Array.from(shares.keys())) if (!clips.has(key)) shares.delete(key)
    tell()
}

const posters = new Map<string, string>()

/** A still of the video a third of the way in, without its title card, as a JPEG data address. */
export function posterOf(video: Video): string {
    const known = posters.get(video.id)
    if (known !== undefined) return known
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 270
    const context = canvas.getContext('2d')
    if (context === null) return ''
    drawFrame(context, specOf(video), video.duration * 0.35, canvas.width, canvas.height, false)
    const url = canvas.toDataURL('image/jpeg', 0.82)
    posters.set(video.id, url)
    return url
}

const captions = new Map<string, string>()

const stamp = (seconds: number) => {
    const whole = Math.floor(seconds)
    const millis = Math.round((seconds - whole) * 1000)
    return `00:${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

/** The video's captions as a WebVTT file in memory: its lines spread evenly after the title card. */
export function captionsOf(video: Video): string {
    const known = captions.get(video.id)
    if (known !== undefined) return known
    const start = 3
    const each = (video.duration - start - 1) / video.captions.length
    const cues = video.captions.map(
        (line, index) => `${stamp(start + index * each)} --> ${stamp(start + (index + 1) * each - 0.4)}\n${line}`,
    )
    const url = URL.createObjectURL(new Blob([`WEBVTT\n\n${cues.join('\n\n')}\n`], { type: 'text/vtt' }))
    captions.set(video.id, url)
    return url
}

/** Keeps a video's clip on this device as a download: pinned, so making room never lets it go. */
export async function keepDownload(video: Video, clip: Clip): Promise<void> {
    await keep({ key: keyOf(video, clip.rendition), blob: clip.blob, sound: clip.sound, made: clip.made, used: Date.now(), pinned: true })
}

/** Takes a video's download away: its clips go like any other again. */
export async function letDownloadGo(video: Video): Promise<void> {
    for (const rendition of RENDITIONS) await pin(keyOf(video, rendition), false)
}

/** The downloaded clip's file, read from this device, or undefined once it is gone. */
export async function downloadedFile(video: Video, rendition: Rendition): Promise<Blob | undefined> {
    return made.get(keyOf(video, rendition))?.blob ?? (await readKept(keyOf(video, rendition)))?.blob
}

/** How many clips are kept between visits, and how many bytes they take. */
export const keptClipsSize = keptSize

/** Lets the kept clips of videos no longer downloaded go like any other, as after a reset of the demo data. */
export const settleDownloads = (videos: readonly string[]) => unpinAllBut(new Set(videos))
