/**
 * A WebM file written in memory from encoded frames: one VP8 video track and, when there is sound,
 * one Opus audio track, in clusters that each start at a key frame, with the length in its header
 * and a cue per cluster at its end, so a player knows the length at once and seeks straight to a
 * cluster.
 */

/** One encoded frame or packet, as WebCodecs hands it out, with its time in microseconds. */
export interface Packet {
    track: 'video' | 'audio'
    /** Microseconds from the start. */
    time: number
    key: boolean
    data: Uint8Array
}

export interface WebmTracks {
    width: number
    height: number
    /** The audio track's Opus identification header, and its rate and channels; none for a silent file. */
    audio?: { head: Uint8Array; rate: number; channels: number; delay: number }
}

type Bytes = Uint8Array

function concat(parts: readonly Bytes[]): Bytes {
    const total = parts.reduce((sum, part) => sum + part.length, 0)
    const out = new Uint8Array(total)
    let at = 0
    for (const part of parts) {
        out.set(part, at)
        at += part.length
    }
    return out
}

/** An element id's bytes: the id already carries its own length marker. */
function idBytes(id: number): Bytes {
    const bytes: number[] = []
    let rest = id
    while (rest > 0) {
        bytes.unshift(rest & 0xff)
        rest = Math.floor(rest / 256)
    }
    return new Uint8Array(bytes)
}

/** A size as EBML writes it: the fewest bytes that hold it, a marker bit before the number. */
function sizeBytes(size: number, length?: number): Bytes {
    let count = length ?? 1
    if (length === undefined) while (size >= 2 ** (7 * count) - 1) count += 1
    const out = new Uint8Array(count)
    let rest = size
    for (let index = count - 1; index >= 0; index -= 1) {
        out[index] = rest & 0xff
        rest = Math.floor(rest / 256)
    }
    out[0] |= 1 << (8 - count)
    return out
}

function element(id: number, ...children: Bytes[]): Bytes {
    const body = concat(children)
    return concat([idBytes(id), sizeBytes(body.length), body])
}

function uintBytes(value: number, length?: number): Bytes {
    let count = length ?? 1
    if (length === undefined) while (value >= 2 ** (8 * count)) count += 1
    const out = new Uint8Array(count)
    let rest = value
    for (let index = count - 1; index >= 0; index -= 1) {
        out[index] = rest & 0xff
        rest = Math.floor(rest / 256)
    }
    return out
}

const uint = (id: number, value: number, length?: number) => element(id, uintBytes(value, length))

function float(id: number, value: number): Bytes {
    const bytes = new Uint8Array(8)
    new DataView(bytes.buffer).setFloat64(0, value)
    return element(id, bytes)
}

const text = (id: number, value: string) => element(id, new TextEncoder().encode(value))

const ID = {
    ebml: 0x1a45dfa3,
    segment: 0x18538067,
    seekHead: 0x114d9b74,
    seek: 0x4dbb,
    seekId: 0x53ab,
    seekPosition: 0x53ac,
    info: 0x1549a966,
    tracks: 0x1654ae6b,
    cluster: 0x1f43b675,
    cues: 0x1c53bb6b,
} as const

/** The Opus identification header a WebM audio track carries, for an encoder that hands none. */
export function opusHead(channels: number, rate: number, preSkip: number): Uint8Array {
    const head = new Uint8Array(19)
    head.set(new TextEncoder().encode('OpusHead'), 0)
    const view = new DataView(head.buffer)
    view.setUint8(8, 1)
    view.setUint8(9, channels)
    view.setUint16(10, preSkip, true)
    view.setUint32(12, rate, true)
    view.setInt16(16, 0, true)
    view.setUint8(18, 0)
    return head
}

/** The file, from its packets in any order and the length of the video in microseconds. */
export function writeWebm(tracks: WebmTracks, packets: readonly Packet[], duration: number): Blob {
    const header = element(
        ID.ebml,
        uint(0x4286, 1),
        uint(0x42f7, 1),
        uint(0x42f2, 4),
        uint(0x42f3, 8),
        text(0x4282, 'webm'),
        uint(0x4287, 4),
        uint(0x4285, 2),
    )
    const info = element(
        ID.info,
        uint(0x2ad7b1, 1_000_000),
        float(0x4489, duration / 1000),
        text(0x4d80, 'tidevann'),
        text(0x5741, 'tidevann'),
    )
    const video = element(
        0xae,
        uint(0xd7, 1),
        uint(0x73c5, 1),
        uint(0x83, 1),
        uint(0x9c, 0),
        text(0x86, 'V_VP8'),
        element(0xe0, uint(0xb0, tracks.width), uint(0xba, tracks.height)),
    )
    const audio =
        tracks.audio === undefined
            ? undefined
            : element(
                  0xae,
                  uint(0xd7, 2),
                  uint(0x73c5, 2),
                  uint(0x83, 2),
                  uint(0x9c, 0),
                  text(0x86, 'A_OPUS'),
                  element(0x63a2, tracks.audio.head),
                  uint(0x56aa, tracks.audio.delay),
                  uint(0x56bb, 80_000_000),
                  element(0xe1, float(0xb5, tracks.audio.rate), uint(0x9f, tracks.audio.channels)),
              )
    const trackList = element(ID.tracks, ...(audio === undefined ? [video] : [video, audio]))

    // Clusters, each opened by a key frame, the sound between key frames in the cluster before.
    const sorted = [...packets].sort((left, right) => left.time - right.time || (left.track === 'video' ? -1 : 1))
    const clusters: { start: number; blocks: Bytes[] }[] = []
    for (const packet of sorted) {
        const ms = Math.round(packet.time / 1000)
        let current = clusters.at(-1)
        const opens = packet.track === 'video' && packet.key
        if (current === undefined || opens || ms - current.start > 30_000) {
            current = { start: Math.max(0, ms), blocks: [] }
            clusters.push(current)
        }
        const relative = Math.max(-32768, Math.min(32767, ms - current.start))
        const head = new Uint8Array(4)
        head[0] = 0x80 | (packet.track === 'video' ? 1 : 2)
        new DataView(head.buffer).setInt16(1, relative)
        head[3] = packet.key || packet.track === 'audio' ? 0x80 : 0
        current.blocks.push(element(0xa3, head, packet.data))
    }
    const clusterBytes = clusters.map((cluster) => element(ID.cluster, uint(0xe7, cluster.start), ...cluster.blocks))

    // Where each part starts inside the segment: the seek head is written with fixed-width positions, so its size is known first.
    const seekEntry = (id: number, position: number) =>
        element(ID.seek, element(ID.seekId, idBytes(id)), uint(ID.seekPosition, position, 8))
    const seekSize = (positions: number[]) =>
        element(ID.seekHead, seekEntry(ID.info, positions[0]), seekEntry(ID.tracks, positions[1]), seekEntry(ID.cues, positions[2])).length
    const seekLength = seekSize([0, 0, 0])
    const infoAt = seekLength
    const tracksAt = infoAt + info.length
    let at = tracksAt + trackList.length
    const clusterAt: number[] = []
    for (const bytes of clusterBytes) {
        clusterAt.push(at)
        at += bytes.length
    }
    const cuesAt = at
    const cues = element(
        ID.cues,
        ...clusters.map((cluster, index) =>
            element(0xbb, uint(0xb3, cluster.start), element(0xb7, uint(0xf7, 1), uint(0xf1, clusterAt[index] ?? 0))),
        ),
    )
    const seekHead = element(ID.seekHead, seekEntry(ID.info, infoAt), seekEntry(ID.tracks, tracksAt), seekEntry(ID.cues, cuesAt))
    const body = [seekHead, info, trackList, ...clusterBytes, cues]
    const bodyLength = body.reduce((sum, part) => sum + part.length, 0)
    const segment = concat([idBytes(ID.segment), sizeBytes(bodyLength, 8)])
    return new Blob([header, segment, ...body] as BlobPart[], {
        type: tracks.audio === undefined ? 'video/webm; codecs="vp8"' : 'video/webm; codecs="vp8, opus"',
    })
}
