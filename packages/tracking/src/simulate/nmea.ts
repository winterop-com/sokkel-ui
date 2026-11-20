/**
 * AIS as a transponder sends it: the fields packed into bits, armored six to a character, and
 * wrapped in `!AIVDM` sentences with their NMEA checksums. The simulated coast writes its vessels
 * this way, so they are read through `createAisDecoder` as a real feed is.
 */
import { aisChecksum } from '../ais'

type Field = [value: number | string, width: number]

/** Six-bit ASCII: `@` to `_` are 0 to 31, space to `?` are 32 to 63; anything else is written as a space. */
function sixBit(char: string): number {
    const code = char.toUpperCase().charCodeAt(0)
    if (code >= 64 && code <= 95) return code - 64
    if (code >= 32 && code <= 63) return code
    return 32
}

/** The fields as bits, a text padded with `@` to its width, a negative number in two's complement. */
function bitsOf(fields: readonly Field[]): string {
    let bits = ''
    for (const [value, width] of fields) {
        if (typeof value === 'string') {
            for (let at = 0; at < width / 6; at += 1) bits += (at < value.length ? sixBit(value[at]) : 0).toString(2).padStart(6, '0')
        } else {
            const whole = Math.round(value)
            bits += (whole < 0 ? 2 ** width + whole : whole).toString(2).padStart(width, '0').slice(-width)
        }
    }
    return bits
}

/** Bits armored as a payload, six to a character, with the count of fill bits padding the last. */
function armor(bits: string): { payload: string; fill: number } {
    const fill = (6 - (bits.length % 6)) % 6
    const padded = bits + '0'.repeat(fill)
    let payload = ''
    for (let at = 0; at < padded.length; at += 6) {
        const value = parseInt(padded.slice(at, at + 6), 2)
        payload += String.fromCharCode(value < 40 ? value + 48 : value + 56)
    }
    return { payload, fill }
}

/** The most payload characters one sentence carries. */
const PER_SENTENCE = 60

/** A payload as one sentence, or as several fragments under the sequence id when it is long. */
function sentences(payload: string, fill: number, sequence: number, channel = 'A'): string[] {
    const parts: string[] = []
    for (let at = 0; at < payload.length; at += PER_SENTENCE) parts.push(payload.slice(at, at + PER_SENTENCE))
    const id = parts.length > 1 ? String(((sequence % 10) + 10) % 10) : ''
    return parts.map((part, index) => {
        const last = index === parts.length - 1
        const body = `AIVDM,${String(parts.length)},${String(index + 1)},${id},${channel},${part},${String(last ? fill : 0)}`
        return `!${body}*${aisChecksum(body)}`
    })
}

/** What a vessel reports of where it is and how it goes. */
export interface AisPositionReport {
    mmsi: number
    lon: number
    lat: number
    /** Knots over ground. */
    speed: number
    /** Degrees true over ground. */
    course: number
    /** Degrees true the bow points; not known when left out. */
    heading?: number
    /** The navigational status: 0 under way, 1 at anchor, 5 moored, 15 not defined. */
    status?: number
    /** The second of the minute the position was taken. */
    second: number
}

/** A class A position report (message type 1) as one `!AIVDM` sentence. */
export function encodeAisPosition(report: AisPositionReport): string {
    const { payload, fill } = armor(
        bitsOf([
            [1, 6],
            [0, 2],
            [report.mmsi, 30],
            [report.status ?? 0, 4],
            [-128, 8],
            [Math.min(1022, report.speed * 10), 10],
            [1, 1],
            [report.lon * 600000, 28],
            [report.lat * 600000, 27],
            [Math.min(3599, ((report.course % 360) + 360) % 360) * 10, 12],
            [report.heading === undefined ? 511 : Math.round(((report.heading % 360) + 360) % 360) % 360, 9],
            [report.second % 60, 6],
            [0, 2],
            [0, 3],
            [0, 1],
            [0, 19],
        ]),
    )
    return sentences(payload, fill, 0)[0]
}

/** What a vessel says of itself: its name, callsign, type, size and where it is bound. */
export interface AisStaticReport {
    mmsi: number
    imo?: number
    callsign: string
    name: string
    /** The ITU ship type: 30 fishing, 52 tug, 50 pilot, 55 law enforcement, 60 passenger, 70 cargo. */
    shipType: number
    /** Meters. */
    length: number
    beam: number
    /** Meters. */
    draught?: number
    destination?: string
}

/**
 * Static and voyage data (message type 5) as two `!AIVDM` sentences under one sequence id, 0 to 9,
 * which tells a receiver the fragments of one message from another's sent at the same time.
 */
export function encodeAisStatic(report: AisStaticReport, sequence = 0): string[] {
    const bow = Math.round(report.length * 0.6)
    const port = Math.round(report.beam / 2)
    const { payload, fill } = armor(
        bitsOf([
            [5, 6],
            [0, 2],
            [report.mmsi, 30],
            [0, 2],
            [report.imo ?? 0, 30],
            [report.callsign, 42],
            [report.name, 120],
            [report.shipType, 8],
            [bow, 9],
            [report.length - bow, 9],
            [port, 6],
            [report.beam - port, 6],
            [1, 4],
            [0, 4],
            [0, 5],
            [24, 5],
            [60, 6],
            [Math.round((report.draught ?? 0) * 10), 8],
            [report.destination ?? '', 120],
            [0, 1],
            [0, 1],
        ]),
    )
    return sentences(payload, fill, sequence)
}
