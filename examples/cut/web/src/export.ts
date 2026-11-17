/**
 * The export: every frame of the edit drawn on a canvas as the preview draws it, encoded as VP8
 * through WebCodecs with the mixed sound as Opus, and written into a WebM file. Where the browser
 * has no video encoder, every frame is still drawn and counted, and no file is made.
 */

import { drained, encodeOpus } from 'tidevann-shared/clips/encode'
import { writeWebm, type Packet } from 'tidevann-shared/clips/webm'

import { SOUND_RATE } from './media'
import { EXPORT_SIZES, FPS, lengthOf, type Edit, type ExportSize } from './model'
import { drawEditFrame } from './render'
import { mixdown } from './sound'

export interface Exported {
    /** The file, or undefined where the browser cannot encode video. */
    file: Blob | undefined
    frames: number
    /** How long it took, in milliseconds. */
    took: number
}

/** Whether this browser can encode the export: WebCodecs' video encoder. */
export const canEncode = typeof VideoEncoder !== 'undefined'

/** Lets the page draw between batches of frames. */
const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/**
 * Exports the edit at `size`, telling `progress` the share done (0 to 1) and the frames drawn as
 * it goes. `signal` stops it, rejecting with an AbortError.
 */
export async function exportEdit(
    edit: Edit,
    size: ExportSize,
    progress: (share: number, frames: number) => void,
    signal: AbortSignal,
): Promise<Exported> {
    const started = performance.now()
    const { width, height, bitrate } = EXPORT_SIZES[size]
    const length = lengthOf(edit)
    const total = Math.max(1, Math.round(length * FPS))
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('No 2D canvas in this browser.')
    const stop = () => {
        if (signal.aborted) throw new DOMException('The export was stopped.', 'AbortError')
    }

    const packets: Packet[] = []
    let failure: Error | undefined
    let encoder: VideoEncoder | undefined
    if (canEncode) {
        const config: VideoEncoderConfig = { codec: 'vp8', width, height, bitrate, framerate: FPS, latencyMode: 'quality' }
        const support = await VideoEncoder.isConfigSupported(config).catch(() => undefined)
        if (support?.supported === true) {
            encoder = new VideoEncoder({
                output: (chunk) => {
                    const data = new Uint8Array(chunk.byteLength)
                    chunk.copyTo(data)
                    packets.push({ track: 'video', time: chunk.timestamp, key: chunk.type === 'key', data })
                },
                error: (error) => {
                    failure = error
                },
            })
            encoder.configure(config)
        }
    }

    const step = 1_000_000 / FPS
    try {
        for (let index = 0; index < total; index += 1) {
            stop()
            if (failure !== undefined) throw failure
            drawEditFrame(context, edit, index / FPS, width, height)
            if (encoder !== undefined) {
                const frame = new VideoFrame(canvas, { timestamp: Math.round(index * step), duration: Math.round(step) })
                // A key frame every two seconds, where a seek lands.
                encoder.encode(frame, { keyFrame: index % (FPS * 2) === 0 })
                frame.close()
                if (encoder.encodeQueueSize > 6) await drained(encoder)
            }
            if (index % 10 === 0) {
                progress((index / total) * (encoder === undefined ? 1 : 0.9), index)
                await breathe()
            }
        }
        if (encoder === undefined) {
            progress(1, total)
            return { file: undefined, frames: total, took: Math.round(performance.now() - started) }
        }
        await encoder.flush()
        if (failure !== undefined) throw failure
    } finally {
        if (encoder !== undefined && encoder.state !== 'closed') encoder.close()
    }
    stop()
    progress(0.93, total)
    const [left, right] = mixdown(edit, length)
    const sound = await encodeOpus(left, right, SOUND_RATE, packets).catch(() => undefined)
    stop()
    const file = writeWebm(
        { width, height, audio: sound === undefined ? undefined : { head: sound.head, rate: SOUND_RATE, channels: 2, delay: sound.delay } },
        sound === undefined ? packets.filter((packet) => packet.track === 'video') : packets,
        length * 1_000_000,
    )
    progress(1, total)
    return { file, frames: total, took: Math.round(performance.now() - started) }
}
