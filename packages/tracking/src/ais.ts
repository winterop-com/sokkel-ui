/**
 * Vessels as tracks, decoded from AIS NMEA sentences (`!AIVDM` from other vessels, `!AIVDO` from the
 * receiving vessel itself). The app reads the lines from its feed; this module checks each line's
 * checksum, puts multi-sentence messages back together, decodes the six-bit payload and keeps a
 * registry of vessels by MMSI, so a name sent in a static report reaches the vessel's later positions.
 *
 * Decoded: position reports of class A (types 1, 2 and 3) and class B (type 18), and static data of
 * class A (type 5) and class B (type 24, parts A and B). Other types are read for their MMSI only.
 */
import { KNOT, type LonLat, type Track, type TrackClassifier, type TrackProperties } from './track'

/** One NMEA sentence, read but not yet put together with the other fragments of its message. */
export interface AisSentence {
    /** `AIVDM` for another vessel, `AIVDO` for the receiving vessel itself. */
    talker: 'AIVDM' | 'AIVDO'
    fragments: number
    fragment: number
    /** Ties the fragments of one message together; empty for a message of one sentence. */
    sequence: string
    /** The radio channel, `A` or `B`, or empty. */
    channel: string
    payload: string
    /** The bits of padding at the end of the payload. */
    fill: number
}

/** A position report: class A (types 1, 2, 3) or class B (type 18). */
export interface AisPosition {
    type: 1 | 2 | 3 | 18
    mmsi: number
    /** The navigation status (class A only): 0 under way using engine, 1 at anchor, 5 moored, 15 not defined. */
    status?: number
    /** Speed over ground in knots, when known. */
    speed?: number
    /** Course over ground in degrees, when known. */
    course?: number
    /** True heading in degrees, when known. */
    heading?: number
    /** The position, when known. */
    lon?: number
    lat?: number
    /** Whether the position is accurate to better than 10 m. */
    accurate: boolean
    /** The second of the minute the report was made, or 60 and above when not known. */
    second: number
}

/** Static and voyage data: class A (type 5) or class B (type 24, part A or B). */
export interface AisStatic {
    type: 5 | 24
    mmsi: number
    /** Type 24's part: 0 carries the name, 1 the ship type and callsign. */
    part?: 0 | 1
    name?: string
    callsign?: string
    /** The ship and cargo type, 0 to 99: 30 fishing, 36 sailing, 37 pleasure craft, 60s passenger, 70s cargo, 80s tanker. */
    shipType?: number
    imo?: number
    destination?: string
    /** Draught in meters. */
    draught?: number
    /** Length and beam in meters, from the reference point's distances to bow, stern, port and starboard. */
    length?: number
    beam?: number
}

/** Any other message, decoded for its type and MMSI. */
export interface AisOther {
    type: number
    mmsi: number
}

export type AisMessage = AisPosition | AisStatic | AisOther

/** The NMEA checksum of a sentence's body, the characters between `!` and `*`, as two hex digits. */
export function aisChecksum(body: string): string {
    let sum = 0
    for (let at = 0; at < body.length; at++) sum ^= body.charCodeAt(at)
    return sum.toString(16).toUpperCase().padStart(2, '0')
}

/**
 * One line read as an AIS sentence, or undefined when it is not one or its checksum is wrong. A tag
 * block (`\s:station,c:1700000000*5A\`) or anything else before the `!` is skipped.
 */
export function parseAisSentence(line: string): AisSentence | undefined {
    const start = line.indexOf('!')
    if (start < 0) return undefined
    const sentence = line.slice(start).trim()
    const star = sentence.lastIndexOf('*')
    if (star < 0) return undefined
    const body = sentence.slice(1, star)
    if (sentence.slice(star + 1, star + 3).toUpperCase() !== aisChecksum(body)) return undefined
    const fields = body.split(',')
    if (fields.length !== 7) return undefined
    const [head, fragments, fragment, sequence, channel, payload, fill] = fields
    const talker = head.slice(-5)
    if (talker !== 'AIVDM' && talker !== 'AIVDO') return undefined
    const parsed = { fragments: Number(fragments), fragment: Number(fragment), fill: Number(fill) }
    if (!Number.isInteger(parsed.fragments) || !Number.isInteger(parsed.fragment) || !Number.isInteger(parsed.fill)) return undefined
    if (parsed.fragment < 1 || parsed.fragment > parsed.fragments || parsed.fill < 0 || parsed.fill > 5) return undefined
    if (!/^[0-W`-w]*$/.test(payload)) return undefined
    return { talker, sequence, channel, payload, ...parsed }
}

/** A payload's bits, six to a character, without the padding at its end. */
function bitsOf(payload: string, fill: number): Uint8Array {
    const bits = new Uint8Array(payload.length * 6)
    for (let index = 0; index < payload.length; index++) {
        let value = payload.charCodeAt(index) - 48
        if (value > 40) value -= 8
        for (let bit = 0; bit < 6; bit++) bits[index * 6 + bit] = (value >> (5 - bit)) & 1
    }
    return bits.subarray(0, Math.max(0, bits.length - fill))
}

/** Reads fields out of a payload's bits; a field running past the end reads the bits that are there. */
class Bits {
    constructor(readonly bits: Uint8Array) {}

    get length(): number {
        return this.bits.length
    }

    unsigned(start: number, width: number): number {
        let value = 0
        for (let at = start; at < start + width; at++) value = value * 2 + (this.bits[at] ?? 0)
        return value
    }

    signed(start: number, width: number): number {
        const value = this.unsigned(start, width)
        return value >= 2 ** (width - 1) ? value - 2 ** width : value
    }

    /** Six-bit text, with the `@` padding and trailing spaces dropped. */
    text(start: number, width: number): string {
        let out = ''
        for (let at = start; at + 6 <= Math.min(start + width, this.bits.length); at += 6) {
            const code = this.unsigned(at, 6)
            out += String.fromCharCode(code < 32 ? code + 64 : code)
        }
        return out.replace(/@.*$/, '').trimEnd()
    }
}

/** The speed, course and heading of a report, each undefined at its "not available" value. */
function motion(bits: Bits, speedAt: number, positionAt: number, courseAt: number, headingAt: number) {
    const speed = bits.unsigned(speedAt, 10)
    const lon = bits.signed(positionAt, 28) / 600000
    const lat = bits.signed(positionAt + 28, 27) / 600000
    const course = bits.unsigned(courseAt, 12)
    const heading = bits.unsigned(headingAt, 9)
    const located = Math.abs(lon) <= 180 && Math.abs(lat) <= 90
    return {
        speed: speed === 1023 ? undefined : speed / 10,
        lon: located ? lon : undefined,
        lat: located ? lat : undefined,
        course: course >= 3600 ? undefined : course / 10,
        heading: heading >= 360 ? undefined : heading,
    }
}

const defined = <T extends object>(value: T): T =>
    Object.fromEntries(Object.entries(value).filter(([, inner]) => inner !== undefined && inner !== '')) as T

/** A whole message's payload decoded, or undefined when it is too short to hold its type and MMSI. */
export function decodeAisPayload(payload: string, fill = 0): AisMessage | undefined {
    const bits = new Bits(bitsOf(payload, fill))
    if (bits.length < 38) return undefined
    const type = bits.unsigned(0, 6)
    const mmsi = bits.unsigned(8, 30)
    if ((type === 1 || type === 2 || type === 3) && bits.length >= 149) {
        return defined<AisPosition>({
            type,
            mmsi,
            status: bits.unsigned(38, 4),
            ...motion(bits, 50, 61, 116, 128),
            accurate: bits.unsigned(60, 1) === 1,
            second: bits.unsigned(137, 6),
        })
    }
    if (type === 18 && bits.length >= 139) {
        return defined<AisPosition>({
            type,
            mmsi,
            ...motion(bits, 46, 57, 112, 124),
            accurate: bits.unsigned(56, 1) === 1,
            second: bits.unsigned(133, 6),
        })
    }
    if (type === 5 && bits.length >= 420) {
        const imo = bits.unsigned(40, 30)
        const draught = bits.unsigned(294, 8)
        return defined<AisStatic>({
            type,
            mmsi,
            imo: imo === 0 ? undefined : imo,
            callsign: bits.text(70, 42),
            name: bits.text(112, 120),
            shipType: bits.unsigned(232, 8),
            ...dimensions(bits, 240),
            draught: draught === 0 ? undefined : draught / 10,
            destination: bits.text(302, 120),
        })
    }
    if (type === 24 && bits.length >= 40) {
        const part = bits.unsigned(38, 2)
        if (part === 0) return defined<AisStatic>({ type, mmsi, part, name: bits.text(40, 120) })
        if (part === 1) {
            // An auxiliary craft (MMSI 98XXXYYYY) gives its mother ship's MMSI where others give their size.
            const auxiliary = Math.floor(mmsi / 10000000) === 98
            return defined<AisStatic>({
                type,
                mmsi,
                part,
                shipType: bits.unsigned(40, 8),
                callsign: bits.text(90, 42),
                ...(auxiliary ? {} : dimensions(bits, 132)),
            })
        }
    }
    return { type, mmsi }
}

/** Length and beam from the distances to bow, stern, port and starboard, each zero when not known. */
function dimensions(bits: Bits, at: number): { length?: number; beam?: number } {
    const bow = bits.unsigned(at, 9)
    const stern = bits.unsigned(at + 9, 9)
    const port = bits.unsigned(at + 18, 6)
    const starboard = bits.unsigned(at + 24, 6)
    return { length: bow + stern || undefined, beam: port + starboard || undefined }
}

const isPosition = (message: AisMessage): message is AisPosition => [1, 2, 3, 18].includes(message.type)
const isStatic = (message: AisMessage): message is AisStatic => message.type === 5 || message.type === 24

/** What the decoder knows of one vessel, from every message it has read for its MMSI. */
export interface AisVessel {
    mmsi: number
    name?: string
    callsign?: string
    shipType?: number
    imo?: number
    destination?: string
    draught?: number
    length?: number
    beam?: number
    /** The class of its transponder, from the messages it sends. */
    class?: 'A' | 'B'
    /** Whether it is the receiving vessel itself, from `!AIVDO`. */
    own?: boolean
    lon?: number
    lat?: number
    speed?: number
    course?: number
    heading?: number
    status?: number
    trail: LonLat[]
    updatedAt?: number
}

export interface AisDecoderOptions {
    /** Gives each vessel its affiliation from its MMSI, name, ship type and the rest; `unknown` when it gives none. */
    classify?: TrackClassifier
    /** How many past positions a track's trail keeps; 0 keeps none. 20 by default. */
    trail?: number
    /** How long the fragments of a message wait for the rest, in milliseconds. 10 seconds by default. */
    fragmentTimeout?: number
    /** The tracks' `source`; `ais` by default. */
    source?: string
}

export interface AisDecoder {
    /**
     * Reads one line, or many apart by newlines, and gives the tracks it changed: a position moves a
     * vessel, and static data renames one already placed. `at` is when the line was received, in
     * milliseconds since the epoch, now by default.
     */
    push(lines: string, at?: number): Track[]
    /** Every vessel the decoder knows, placed or not, by MMSI. */
    vessels(): ReadonlyMap<number, AisVessel>
    /** Every placed vessel as a track. */
    tracks(): Track[]
    /** Forgets every vessel and every fragment waiting for the rest of its message. */
    clear(): void
}

/** The track of a placed vessel. */
function trackOf(vessel: AisVessel, options: AisDecoderOptions): Track | undefined {
    if (vessel.lon === undefined || vessel.lat === undefined) return undefined
    const heading = vessel.heading ?? vessel.course
    const properties: Record<string, string | number | boolean | undefined> = {
        mmsi: vessel.mmsi,
        name: vessel.name,
        callsign: vessel.callsign,
        shipType: vessel.shipType,
        imo: vessel.imo,
        destination: vessel.destination,
        draught: vessel.draught,
        length: vessel.length,
        beam: vessel.beam,
        class: vessel.class,
        own: vessel.own,
        course: vessel.course,
        status: vessel.status,
    }
    const track: Track = {
        id: String(vessel.mmsi),
        lon: vessel.lon,
        lat: vessel.lat,
        affiliation: 'unknown',
        kind: 'vessel',
        label: vessel.name ?? vessel.callsign ?? String(vessel.mmsi),
        source: options.source ?? 'ais',
        properties: Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined)) as TrackProperties,
    }
    if (heading !== undefined) track.heading = heading
    if (vessel.speed !== undefined) track.speed = vessel.speed * KNOT
    if (vessel.trail.length > 0) track.trail = vessel.trail.map(([lon, lat]) => [lon, lat])
    if (vessel.updatedAt !== undefined) track.updatedAt = vessel.updatedAt
    const affiliation = options.classify?.(track)
    return affiliation === undefined ? track : { ...track, affiliation }
}

/**
 * A decoder that reads AIS lines as they come and keeps every vessel it has heard of by MMSI, giving
 * the tracks each line changes. It holds what it has read, so one decoder serves one feed.
 */
export function createAisDecoder(options: AisDecoderOptions = {}): AisDecoder {
    const keep = Math.max(0, options.trail ?? 20)
    const timeout = options.fragmentTimeout ?? 10_000
    const registry = new Map<number, AisVessel>()
    const pending = new Map<string, { parts: string[]; fill: number; started: number }>()

    const vesselOf = (mmsi: number): AisVessel => {
        let vessel = registry.get(mmsi)
        if (vessel === undefined) {
            vessel = { mmsi, trail: [] }
            registry.set(mmsi, vessel)
        }
        return vessel
    }

    /** The message a sentence completes, or undefined while its message waits for more fragments. */
    const assemble = (sentence: AisSentence, at: number): { payload: string; fill: number } | undefined => {
        for (const [key, waiting] of pending) if (at - waiting.started > timeout) pending.delete(key)
        if (sentence.fragments === 1) return { payload: sentence.payload, fill: sentence.fill }
        const key = `${sentence.talker}:${sentence.channel}:${sentence.sequence}:${String(sentence.fragments)}`
        if (sentence.fragment === 1) {
            pending.set(key, { parts: [sentence.payload], fill: sentence.fill, started: at })
            return undefined
        }
        const waiting = pending.get(key)
        // A fragment out of order, or one whose start was missed, drops the message.
        if (waiting === undefined || waiting.parts.length !== sentence.fragment - 1) {
            pending.delete(key)
            return undefined
        }
        waiting.parts.push(sentence.payload)
        waiting.fill = sentence.fill
        if (sentence.fragment < sentence.fragments) return undefined
        pending.delete(key)
        return { payload: waiting.parts.join(''), fill: waiting.fill }
    }

    const read = (line: string, at: number): Track | undefined => {
        const sentence = parseAisSentence(line)
        if (sentence === undefined) return undefined
        const whole = assemble(sentence, at)
        if (whole === undefined) return undefined
        const message = decodeAisPayload(whole.payload, whole.fill)
        if (message === undefined || message.mmsi === 0) return undefined
        const vessel = vesselOf(message.mmsi)
        if (sentence.talker === 'AIVDO') vessel.own = true
        if (isPosition(message)) {
            vessel.class = message.type === 18 ? 'B' : 'A'
            vessel.speed = message.speed
            vessel.course = message.course
            vessel.heading = message.heading
            if (message.status !== undefined) vessel.status = message.status
            if (message.lon !== undefined && message.lat !== undefined) {
                if (vessel.lon !== undefined && vessel.lat !== undefined && keep > 0) {
                    vessel.trail.push([vessel.lon, vessel.lat])
                    if (vessel.trail.length > keep) vessel.trail.splice(0, vessel.trail.length - keep)
                }
                vessel.lon = message.lon
                vessel.lat = message.lat
                vessel.updatedAt = at
            }
            return trackOf(vessel, options)
        }
        if (isStatic(message)) {
            vessel.class = message.type === 5 ? 'A' : 'B'
            for (const key of ['name', 'callsign', 'shipType', 'imo', 'destination', 'draught', 'length', 'beam'] as const) {
                const value = message[key]
                if (value !== undefined) (vessel as unknown as Record<string, unknown>)[key] = value
            }
            return trackOf(vessel, options)
        }
        return undefined
    }

    return {
        push(lines, at = Date.now()) {
            const changed = new Map<string, Track>()
            for (const line of lines.split(/\r?\n/)) {
                if (line.trim() === '') continue
                const track = read(line, at)
                if (track !== undefined) changed.set(track.id, track)
            }
            return [...changed.values()]
        },
        vessels: () => registry,
        tracks: () => [...registry.values()].flatMap((vessel) => trackOf(vessel, options) ?? []),
        clear() {
            registry.clear()
            pending.clear()
        },
    }
}
