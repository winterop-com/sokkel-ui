import { describe, expect, it } from 'vitest'

import { aisChecksum, createAisDecoder, decodeAisPayload, parseAisSentence, type AisPosition, type AisStatic } from './ais'
import { KNOT } from './track'

// The sample sentences of the AIVDM/AIVDO protocol decoding reference that gpsd publishes.
const CLASS_A = '!AIVDM,1,1,,B,177KQJ5000G?tO`K>RA1wUbN0TKH,0*5C'
const CLASS_A_UNDER_WAY = '!AIVDM,1,1,,B,15NG6V0P01G?cFhE`R2IU?wn28R>,0*05'
const CLASS_B = '!AIVDM,1,1,,A,B52K>;h00Fc>jpUlNV@ikwpUoP06,0*4C'
const STATIC_A = ['!AIVDM,2,1,1,A,55?MbV02;H;s<HtKR20EHE:0@T4@Dn2222222216L961O5Gf0NSQEp6ClRp8,0*1C', '!AIVDM,2,2,1,A,88888888880,2*25']
const STATIC_B_NAME = '!AIVDM,1,1,,A,H42O55i18tMET00000000000000,2*6D'
const STATIC_B_TYPE = '!AIVDM,1,1,,A,H42O55lti4hhhilD3nink000?050,0*40'

/** A payload written from fields of given widths, as a transmitter packs them. */
function encode(fields: [value: number | string, width: number][]): { payload: string; fill: number } {
    let bits = ''
    for (const [value, width] of fields) {
        if (typeof value === 'string') {
            for (let at = 0; at < width / 6; at++) {
                const code = at < value.length ? value.charCodeAt(at) : 64
                bits += (code >= 64 ? code - 64 : code).toString(2).padStart(6, '0')
            }
        } else bits += (value < 0 ? 2 ** width + value : value).toString(2).padStart(width, '0')
    }
    const fill = (6 - (bits.length % 6)) % 6
    bits += '0'.repeat(fill)
    let payload = ''
    for (let at = 0; at < bits.length; at += 6) {
        const value = parseInt(bits.slice(at, at + 6), 2)
        payload += String.fromCharCode(value < 40 ? value + 48 : value + 56)
    }
    return { payload, fill }
}

/** A sentence of one fragment carrying a payload, with its checksum. */
function sentence(payload: string, fill: number, talker = 'AIVDM'): string {
    const body = `${talker},1,1,,A,${payload},${String(fill)}`
    return `!${body}*${aisChecksum(body)}`
}

/** A class A position report (type 1) for an MMSI at a point, speed in knots and course in degrees. */
function position(mmsi: number, lon: number, lat: number, speed = 10, course = 90, heading: number = 511): string {
    const { payload, fill } = encode([
        [1, 6],
        [0, 2],
        [mmsi, 30],
        [0, 4],
        [-128, 8],
        [Math.round(speed * 10), 10],
        [1, 1],
        [Math.round(lon * 600000), 28],
        [Math.round(lat * 600000), 27],
        [Math.round(course * 10), 12],
        [heading, 9],
        [30, 6],
        [0, 2],
        [0, 3],
        [0, 1],
        [0, 19],
    ])
    return sentence(payload, fill)
}

describe('sentences', () => {
    it('computes the NMEA checksum', () => {
        expect(aisChecksum('AIVDM,1,1,,B,177KQJ5000G?tO`K>RA1wUbN0TKH,0')).toBe('5C')
    })

    it('reads the fields of a sentence', () => {
        expect(parseAisSentence(CLASS_A)).toEqual({
            talker: 'AIVDM',
            fragments: 1,
            fragment: 1,
            sequence: '',
            channel: 'B',
            payload: '177KQJ5000G?tO`K>RA1wUbN0TKH',
            fill: 0,
        })
        expect(parseAisSentence(STATIC_A[1])).toMatchObject({ fragments: 2, fragment: 2, sequence: '1', fill: 2 })
    })

    it('refuses a sentence whose checksum is wrong', () => {
        expect(parseAisSentence(CLASS_A.replace('*5C', '*5D'))).toBeUndefined()
        expect(parseAisSentence(CLASS_A.replace('177KQJ', '177KQK'))).toBeUndefined()
    })

    it('refuses what is not an AIS sentence', () => {
        expect(parseAisSentence('')).toBeUndefined()
        expect(parseAisSentence('$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47')).toBeUndefined()
        expect(parseAisSentence('!AIVDM,1,1,,B,177KQJ5000G?tO`K>RA1wUbN0TKH,0')).toBeUndefined()
        const body = 'GPGSV,1,1,,B,177KQJ,0'
        expect(parseAisSentence(`!${body}*${aisChecksum(body)}`)).toBeUndefined()
    })

    it('skips a tag block and other text before the sentence', () => {
        expect(parseAisSentence(`\\s:station,c:1700000000*00\\${CLASS_A}`)?.payload).toBe('177KQJ5000G?tO`K>RA1wUbN0TKH')
        expect(parseAisSentence(`2026-11-20T10:00:00Z ${CLASS_A}\r`)?.channel).toBe('B')
    })

    it('takes the receiving vessel own reports and other talker prefixes', () => {
        const own = `AIVDO${CLASS_A.slice(6, CLASS_A.indexOf('*'))}`
        expect(parseAisSentence(`!${own}*${aisChecksum(own)}`)?.talker).toBe('AIVDO')
        const base = `BSVDM${CLASS_A.slice(6, CLASS_A.indexOf('*'))}`
        expect(parseAisSentence(`!${base}*${aisChecksum(base)}`)).toBeUndefined()
    })
})

describe('payloads', () => {
    it('decodes a class A position report (type 1) moored in Seattle', () => {
        const { payload, fill } = parseAisSentence(CLASS_A)!
        expect(decodeAisPayload(payload, fill)).toEqual<AisPosition>({
            type: 1,
            mmsi: 477553000,
            status: 5,
            speed: 0,
            lon: -122.34583333333333,
            lat: 47.58283333333333,
            course: 51,
            heading: 181,
            accurate: false,
            second: 15,
        })
    })

    it('leaves out a heading that is not available', () => {
        const { payload, fill } = parseAisSentence(CLASS_A_UNDER_WAY)!
        const message = decodeAisPayload(payload, fill) as AisPosition
        expect(message).toMatchObject({ type: 1, mmsi: 367380120, status: 0, speed: 0.1, course: 245.2 })
        expect(message.heading).toBeUndefined()
        expect(message.lon).toBeCloseTo(-122.404333, 6)
        expect(message.lat).toBeCloseTo(37.806948, 6)
    })

    it('decodes a class B position report (type 18) off New York', () => {
        const { payload, fill } = parseAisSentence(CLASS_B)!
        const message = decodeAisPayload(payload, fill) as AisPosition
        expect(message).toMatchObject({ type: 18, mmsi: 338087471, speed: 0.1, course: 79.6, second: 49 })
        expect(message.status).toBeUndefined()
        expect(message.heading).toBeUndefined()
        expect(message.lon).toBeCloseTo(-74.072132, 6)
        expect(message.lat).toBeCloseTo(40.68454, 6)
    })

    it('decodes static and voyage data (type 5) put together from two fragments', () => {
        const [first, second] = STATIC_A.map((line) => parseAisSentence(line)!)
        expect(decodeAisPayload(first.payload + second.payload, second.fill)).toEqual<AisStatic>({
            type: 5,
            mmsi: 351759000,
            imo: 9134270,
            callsign: '3FOF8',
            name: 'EVER DIADEM',
            shipType: 70,
            length: 295,
            beam: 32,
            draught: 12.2,
            destination: 'NEW YORK',
        })
    })

    it('decodes both parts of class B static data (type 24)', () => {
        const name = parseAisSentence(STATIC_B_NAME)!
        expect(decodeAisPayload(name.payload, name.fill)).toEqual({ type: 24, mmsi: 271041815, part: 0, name: 'PROGUY' })
        const kind = parseAisSentence(STATIC_B_TYPE)!
        expect(decodeAisPayload(kind.payload, kind.fill)).toEqual({
            type: 24,
            mmsi: 271041815,
            part: 1,
            shipType: 60,
            callsign: 'TC6163',
            length: 15,
            beam: 5,
        })
    })

    it('decodes negative coordinates and positions not available', () => {
        const south = parseAisSentence(position(257000001, -43.21, -22.95))!
        expect(decodeAisPayload(south.payload, south.fill)).toMatchObject({ lon: -43.21, lat: -22.95, speed: 10, course: 90 })
        const nowhere = parseAisSentence(position(257000001, 181, 91, 102.3, 360))!
        const message = decodeAisPayload(nowhere.payload, nowhere.fill) as AisPosition
        expect(message.lon).toBeUndefined()
        expect(message.lat).toBeUndefined()
        expect(message.speed).toBeUndefined()
        expect(message.course).toBeUndefined()
    })

    it('reads other types for their MMSI, and refuses a payload too short for one', () => {
        const { payload, fill } = encode([
            [4, 6],
            [0, 2],
            [3669702, 30],
            [0, 130],
        ])
        expect(decodeAisPayload(payload, fill)).toEqual({ type: 4, mmsi: 3669702 })
        expect(decodeAisPayload('15M6', 0)).toBeUndefined()
    })
})

describe('the decoder', () => {
    it('gives a vessel track for a position report, in SI units', () => {
        const decoder = createAisDecoder()
        const [track] = decoder.push(CLASS_A, 1_000)
        expect(track).toEqual({
            id: '477553000',
            lon: -122.34583333333333,
            lat: 47.58283333333333,
            heading: 181,
            speed: 0,
            affiliation: 'unknown',
            kind: 'vessel',
            label: '477553000',
            updatedAt: 1_000,
            source: 'ais',
            properties: { mmsi: 477553000, class: 'A', course: 51, status: 5 },
        })
    })

    it('heads a vessel by its course when its heading is not available', () => {
        const [track] = createAisDecoder().push(CLASS_B, 0)
        expect(track.heading).toBeCloseTo(79.6, 6)
        expect(track.speed).toBeCloseTo(0.1 * KNOT, 9)
        expect(track.properties?.class).toBe('B')
    })

    it('puts fragments together, and gives no track for a vessel not yet placed', () => {
        const decoder = createAisDecoder()
        expect(decoder.push(STATIC_A[0], 0)).toEqual([])
        expect(decoder.push(STATIC_A[1], 0)).toEqual([])
        expect(decoder.vessels().get(351759000)).toMatchObject({ name: 'EVER DIADEM', callsign: '3FOF8', shipType: 70, class: 'A' })
        expect(decoder.tracks()).toEqual([])
    })

    it('names a vessel by static data that came before its position', () => {
        const decoder = createAisDecoder()
        decoder.push(STATIC_A.join('\n'), 0)
        const [track] = decoder.push(position(351759000, -74.02, 40.6, 12.3, 10), 5_000)
        expect(track.label).toBe('EVER DIADEM')
        expect(track.properties).toMatchObject({
            name: 'EVER DIADEM',
            callsign: '3FOF8',
            shipType: 70,
            imo: 9134270,
            destination: 'NEW YORK',
        })
    })

    it('renames a placed vessel when its static data comes after', () => {
        const decoder = createAisDecoder()
        decoder.push(position(271041815, 28.98, 41.01), 0)
        const [named] = decoder.push(STATIC_B_NAME, 1)
        expect(named.label).toBe('PROGUY')
        const [typed] = decoder.push(STATIC_B_TYPE, 2)
        expect(typed.properties).toMatchObject({ name: 'PROGUY', callsign: 'TC6163', shipType: 60 })
        // Static data does not move the vessel or make its report newer.
        expect(typed.updatedAt).toBe(0)
    })

    it('drops a fragment whose start it missed, and fragments out of order', () => {
        const decoder = createAisDecoder()
        expect(decoder.push(STATIC_A[1], 0)).toEqual([])
        decoder.push([STATIC_A[1], STATIC_A[0]].join('\n'), 0)
        expect(decoder.vessels().size).toBe(0)
    })

    it('drops fragments that waited too long for the rest', () => {
        const decoder = createAisDecoder({ fragmentTimeout: 1_000 })
        decoder.push(STATIC_A[0], 0)
        decoder.push(STATIC_A[1], 5_000)
        expect(decoder.vessels().size).toBe(0)
    })

    it('keeps the fragments of messages on two channels apart', () => {
        const other = (line: string) => {
            const body = line.slice(1, line.indexOf('*')).replace(',1,A,', ',1,B,')
            return `!${body}*${aisChecksum(body)}`
        }
        const decoder = createAisDecoder()
        decoder.push([STATIC_A[0], other(STATIC_A[0]), STATIC_A[1], other(STATIC_A[1])].join('\n'), 0)
        expect(decoder.vessels().get(351759000)?.name).toBe('EVER DIADEM')
    })

    it('keeps a trail of past positions, oldest first, as long as it is told', () => {
        const decoder = createAisDecoder({ trail: 2 })
        for (let step = 0; step < 4; step++) decoder.push(position(257000001, 5 + step / 100, 60), step * 1000)
        const [track] = decoder.tracks()
        expect(track.lon).toBeCloseTo(5.03, 6)
        expect(track.trail?.map(([lon]) => Math.round(lon * 100))).toEqual([501, 502])
        expect(track.updatedAt).toBe(3000)
    })

    it('keeps no trail when told none', () => {
        const decoder = createAisDecoder({ trail: 0 })
        decoder.push(position(257000001, 5, 60), 0)
        decoder.push(position(257000001, 5.01, 60), 1)
        expect(decoder.tracks()[0].trail).toBeUndefined()
    })

    it('gives each vessel once for a batch of lines, as it last stood', () => {
        const decoder = createAisDecoder()
        const changed = decoder.push([position(257000001, 5, 60), position(257000001, 5.5, 60), position(257000002, 6, 61)].join('\r\n'), 0)
        expect(changed.map((track) => track.id)).toEqual(['257000001', '257000002'])
        expect(changed[0].lon).toBeCloseTo(5.5, 6)
    })

    it('marks the receiving vessel own reports', () => {
        const { payload, fill } = parseAisSentence(position(257000003, 10.7, 59.9))!
        const [track] = createAisDecoder().push(sentence(payload, fill, 'AIVDO'), 0)
        expect(track.properties?.own).toBe(true)
    })

    it('classifies vessels as the app says', () => {
        const decoder = createAisDecoder({ classify: (track) => (track.properties?.shipType === 70 ? 'neutral' : undefined) })
        decoder.push(STATIC_A.join('\n'), 0)
        const [cargo] = decoder.push(position(351759000, -74, 40.6), 0)
        const [other] = decoder.push(position(257000001, 5, 60), 0)
        expect(cargo.affiliation).toBe('neutral')
        expect(other.affiliation).toBe('unknown')
    })

    it('skips lines it cannot read, and forgets everything when cleared', () => {
        const decoder = createAisDecoder({ source: 'harbor-receiver' })
        const changed = decoder.push(['garbage', '', CLASS_A.replace('*5C', '*00'), CLASS_A_UNDER_WAY].join('\n'), 0)
        expect(changed).toHaveLength(1)
        expect(changed[0].source).toBe('harbor-receiver')
        decoder.clear()
        expect(decoder.vessels().size).toBe(0)
        expect(decoder.tracks()).toEqual([])
    })
})
