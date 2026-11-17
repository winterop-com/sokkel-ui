/**
 * Makes one clip off the page's thread: draws each frame of its scene on an offscreen canvas,
 * encodes the frames as VP8 and the sound as Opus through WebCodecs, faster than the clip plays,
 * and writes them into a WebM file the page plays from memory.
 */

import { drained, encodeOpus } from 'tidevann-shared/clips/encode'
import { drawFrame, type SceneSpec } from 'tidevann-shared/clips/scenes'
import { SOUND_RATE, synthesize } from 'tidevann-shared/clips/sound'
import { writeWebm, type Packet } from 'tidevann-shared/clips/webm'

export interface ClipJob {
    id: number
    spec: SceneSpec
    width: number
    height: number
    bitrate: number
    fps: number
}

export type ClipReply =
    | { id: number; kind: 'progress'; share: number }
    | { id: number; kind: 'done'; blob: Blob; sound: boolean }
    | { id: number; kind: 'failed'; message: string }

/** The worker's own scope, as far as this file speaks to it. */
const scope = self as unknown as { postMessage: (reply: ClipReply) => void; onmessage: ((event: MessageEvent<ClipJob>) => void) | null }

async function encodeVideo(job: ClipJob, packets: Packet[], tell: (share: number) => void): Promise<void> {
    const canvas = new OffscreenCanvas(job.width, job.height)
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('No 2D canvas in this browser')
    let failure: Error | undefined
    const encoder = new VideoEncoder({
        output: (chunk) => {
            const data = new Uint8Array(chunk.byteLength)
            chunk.copyTo(data)
            packets.push({ track: 'video', time: chunk.timestamp, key: chunk.type === 'key', data })
        },
        error: (error) => {
            failure = error
        },
    })
    const config: VideoEncoderConfig = {
        codec: 'vp8',
        width: job.width,
        height: job.height,
        bitrate: job.bitrate,
        framerate: job.fps,
        latencyMode: 'quality',
    }
    const support = await VideoEncoder.isConfigSupported(config).catch(() => undefined)
    if (support?.supported !== true) throw new Error('This browser has no VP8 encoder in WebCodecs, which the clips are made with.')
    encoder.configure(config)
    const frames = Math.round(job.spec.duration * job.fps)
    const step = 1_000_000 / job.fps
    for (let index = 0; index < frames; index += 1) {
        if (failure !== undefined) throw failure
        drawFrame(context, job.spec, index / job.fps, job.width, job.height)
        const frame = new VideoFrame(canvas, { timestamp: Math.round(index * step), duration: Math.round(step) })
        // A key frame every two seconds, where a seek lands.
        encoder.encode(frame, { keyFrame: index % (job.fps * 2) === 0 })
        frame.close()
        if (encoder.encodeQueueSize > 6) await drained(encoder)
        if (index % job.fps === 0) tell((index / frames) * 0.85)
    }
    await encoder.flush()
    encoder.close()
    if (failure !== undefined) throw failure
}

/** The sound as Opus packets, and the header its track carries; none where this browser has no Opus encoder. */
function encodeSound(spec: SceneSpec, packets: Packet[]): Promise<{ head: Uint8Array; delay: number } | undefined> {
    const [left, right] = synthesize(spec)
    return encodeOpus(left, right, SOUND_RATE, packets)
}

scope.onmessage = (event: MessageEvent<ClipJob>) => {
    const job = event.data
    const tell = (share: number) => scope.postMessage({ id: job.id, kind: 'progress', share } satisfies ClipReply)
    const packets: Packet[] = []
    void (async () => {
        try {
            await encodeVideo(job, packets, tell)
            const sound = await encodeSound(job.spec, packets).catch(() => undefined)
            tell(0.97)
            const blob = writeWebm(
                {
                    width: job.width,
                    height: job.height,
                    audio: sound === undefined ? undefined : { head: sound.head, rate: SOUND_RATE, channels: 2, delay: sound.delay },
                },
                sound === undefined ? packets.filter((packet) => packet.track === 'video') : packets,
                job.spec.duration * 1_000_000,
            )
            scope.postMessage({ id: job.id, kind: 'done', blob, sound: sound !== undefined } satisfies ClipReply)
        } catch (error) {
            scope.postMessage({
                id: job.id,
                kind: 'failed',
                message: error instanceof Error ? error.message : String(error),
            } satisfies ClipReply)
        }
    })()
}
