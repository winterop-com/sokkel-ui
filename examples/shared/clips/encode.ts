/**
 * Encoding through WebCodecs for the WebM writer: two channels of sound as Opus packets, and the
 * wait for an encoder to take some of its queue, on the page's thread or in a worker.
 */

import { opusHead, type Packet } from './webm'

/** Waits until the encoder has taken some of its queue. */
export function drained(encoder: VideoEncoder | AudioEncoder): Promise<void> {
    return new Promise((resolve) => {
        encoder.addEventListener('dequeue', () => resolve(), { once: true })
    })
}

/**
 * Two channels of sound at `rate` as Opus packets added to `packets`, and the header and delay its
 * track carries; undefined where this browser has no Opus encoder.
 */
export async function encodeOpus(
    left: Float32Array,
    right: Float32Array,
    rate: number,
    packets: Packet[],
): Promise<{ head: Uint8Array; delay: number } | undefined> {
    if (typeof AudioEncoder === 'undefined') return undefined
    const config: AudioEncoderConfig = { codec: 'opus', sampleRate: rate, numberOfChannels: 2, bitrate: 96_000 }
    const support = await AudioEncoder.isConfigSupported(config).catch(() => undefined)
    if (support?.supported !== true) return undefined
    let description: Uint8Array | undefined
    let failure: Error | undefined
    const encoder = new AudioEncoder({
        output: (chunk, metadata) => {
            const data = new Uint8Array(chunk.byteLength)
            chunk.copyTo(data)
            packets.push({ track: 'audio', time: chunk.timestamp, key: true, data })
            const given = metadata?.decoderConfig?.description
            if (description === undefined && given !== undefined) {
                description = ArrayBuffer.isView(given)
                    ? new Uint8Array(given.buffer, given.byteOffset, given.byteLength).slice()
                    : new Uint8Array(given).slice()
            }
        },
        error: (error) => {
            failure = error
        },
    })
    encoder.configure(config)
    const block = rate / 10
    for (let start = 0; start < left.length; start += block) {
        const count = Math.min(block, left.length - start)
        const planes = new Float32Array(count * 2)
        planes.set(left.subarray(start, start + count), 0)
        planes.set(right.subarray(start, start + count), count)
        const data = new AudioData({
            format: 'f32-planar',
            sampleRate: rate,
            numberOfFrames: count,
            numberOfChannels: 2,
            timestamp: Math.round((start / rate) * 1_000_000),
            data: planes,
        })
        encoder.encode(data)
        data.close()
        if (encoder.encodeQueueSize > 12) await drained(encoder)
    }
    await encoder.flush()
    encoder.close()
    if (failure !== undefined) throw failure
    // The encoder's lookahead, 312 samples for libopus at 48 kHz, skipped by the decoder.
    const preSkip = 312
    const head = description !== undefined && description.length >= 19 ? description : opusHead(2, rate, preSkip)
    return { head, delay: Math.round((preSkip / rate) * 1_000_000_000) }
}
