import { describe, expect, it } from 'vitest'

import { altitudeBand, parseFlights, parseOpenSky, parseReadsb, verticalTrend, type OpenSkyResponse, type ReadsbResponse } from './adsb'
import { FOOT, KNOT } from './track'

// Shaped as readsb's v2 APIs answer `/v2/point/{lat}/{lon}/{radius}`, with fictional identifiers.
const POINT: ReadsbResponse = {
    ac: [
        {
            hex: 'ABC123',
            type: 'adsb_icao',
            flight: 'TDV101  ',
            r: 'LN-TDV',
            t: 'B738',
            alt_baro: 36000,
            alt_geom: 36725,
            gs: 451.3,
            track: 213.47,
            baro_rate: -64,
            squawk: '2312',
            emergency: 'none',
            category: 'A3',
            nav_qnh: 1013.6,
            lat: 59.912345,
            lon: 10.745678,
            nic: 8,
            rc: 186,
            seen_pos: 0.4,
            version: 2,
            messages: 1834,
            seen: 0.1,
            rssi: -21.7,
        },
        {
            hex: '~2a0b1c',
            type: 'tisb_other',
            alt_baro: 'ground',
            gs: 12,
            true_heading: 92.5,
            lat: 59.2,
            lon: 10.9,
            seen_pos: 2,
            seen: 1,
        },
        {
            hex: 'abc456',
            type: 'mode_s',
            flight: 'TDV202  ',
            alt_baro: 12000,
            seen: 3.2,
            messages: 41,
        },
    ],
    msg: 'No error',
    now: 1_763_640_000_000,
    total: 3,
    ctime: 1_763_640_000_000,
    ptime: 12,
}

// Shaped as the aircraft.json file readsb writes: `aircraft`, and `now` in seconds.
const FILE: ReadsbResponse = {
    now: 1_763_640_000.5,
    messages: 912_345,
    aircraft: [{ hex: 'abc789', flight: 'TDV303 ', alt_geom: 1000, lat: 60.1, lon: 11.1, seen_pos: 1.5 }],
}

// Shaped as OpenSky answers `/api/states/all`, with fictional identifiers.
const STATES: OpenSkyResponse = {
    time: 1_763_640_000,
    states: [
        [
            'abc123',
            'TDV101  ',
            'Norway',
            1_763_639_998,
            1_763_639_999,
            10.7457,
            59.9123,
            10972.8,
            false,
            232.17,
            213.47,
            -0.33,
            null,
            11193.78,
            '2312',
            false,
            0,
        ],
        ['abc456', 'TDV202  ', 'Norway', null, 1_763_639_990, null, null, 3657.6, false, 150.1, 90, 0, null, null, null, false, 0],
        ['abc789', '', 'Sweden', 1_763_639_950, 1_763_639_951, 18.06, 59.33, null, true, 5.2, 180, null, null, null, null, false, 0, 17],
    ],
}

describe('readsb', () => {
    it('reads an aircraft as a track, in SI units', () => {
        const [track] = parseReadsb(POINT)
        expect(track).toEqual({
            id: 'abc123',
            lon: 10.745678,
            lat: 59.912345,
            heading: 213.47,
            speed: 451.3 * KNOT,
            altitude: 36000 * FOOT,
            affiliation: 'unknown',
            kind: 'aircraft',
            label: 'TDV101',
            updatedAt: 1_763_640_000_000 - 400,
            source: 'adsb',
            properties: {
                icao24: 'abc123',
                callsign: 'TDV101',
                registration: 'LN-TDV',
                aircraftType: 'B738',
                positionSource: 'adsb_icao',
                squawk: '2312',
                emergency: 'none',
                category: 'A3',
                onGround: false,
                verticalRate: (-64 * FOOT) / 60,
            },
        })
        expect(track.speed).toBeCloseTo(232.17, 2)
        expect(track.altitude).toBeCloseTo(10972.8, 6)
    })

    it('reads an aircraft on the ground at zero altitude, headed by its heading when it has no track', () => {
        const ground = parseReadsb(POINT)[1]
        expect(ground).toMatchObject({ id: '~2a0b1c', altitude: 0, heading: 92.5, label: '~2a0b1c', updatedAt: 1_763_640_000_000 - 2000 })
        expect(ground.properties).toMatchObject({ onGround: true, positionSource: 'tisb_other' })
    })

    it('skips an aircraft without a position', () => {
        expect(parseReadsb(POINT).map((track) => track.id)).toEqual(['abc123', '~2a0b1c'])
    })

    it('reads the file readsb writes, its time in seconds, falling back to the geometric altitude', () => {
        const [track] = parseReadsb(FILE)
        expect(track).toMatchObject({ id: 'abc789', label: 'TDV303', altitude: 1000 * FOOT, updatedAt: 1_763_640_000_500 - 1500 })
        expect(track.speed).toBeUndefined()
        expect(track.heading).toBeUndefined()
    })

    it('reads an empty answer, and one with no aircraft list', () => {
        expect(parseReadsb({ ac: [], now: 0 })).toEqual([])
        expect(parseReadsb({ ac: null })).toEqual([])
        expect(parseReadsb({})).toEqual([])
    })

    it('labels an aircraft by its registration when it gives no callsign', () => {
        const [track] = parseReadsb({ ac: [{ hex: 'abc000', r: 'LN-ABC', flight: '        ', lat: 0, lon: 0 }] })
        expect(track.label).toBe('LN-ABC')
        expect(track.updatedAt).toBeUndefined()
    })

    it('classifies aircraft as the app says, and names the source it is given', () => {
        const tracks = parseReadsb(POINT, {
            classify: (track) => (String(track.properties?.callsign ?? '').startsWith('TDV') ? 'friend' : undefined),
            source: 'harbor-feed',
        })
        expect(tracks.map((track) => track.affiliation)).toEqual(['friend', 'unknown'])
        expect(tracks[0].source).toBe('harbor-feed')
    })

    it('gives plain data that survives JSON', () => {
        const tracks = parseReadsb(POINT)
        expect(JSON.parse(JSON.stringify(tracks))).toEqual(tracks)
    })
})

describe('OpenSky', () => {
    it('reads a state vector as a track, already in SI units', () => {
        const [track] = parseOpenSky(STATES)
        expect(track).toEqual({
            id: 'abc123',
            lon: 10.7457,
            lat: 59.9123,
            heading: 213.47,
            speed: 232.17,
            altitude: 10972.8,
            affiliation: 'unknown',
            kind: 'aircraft',
            label: 'TDV101',
            updatedAt: 1_763_639_998_000,
            source: 'opensky',
            properties: {
                icao24: 'abc123',
                callsign: 'TDV101',
                originCountry: 'Norway',
                squawk: '2312',
                onGround: false,
                verticalRate: -0.33,
                positionSource: 0,
            },
        })
    })

    it('skips a state without a position', () => {
        expect(parseOpenSky(STATES).map((track) => track.id)).toEqual(['abc123', 'abc789'])
    })

    it('reads an aircraft on the ground, with its category, labeled by its address when it has no callsign', () => {
        const ground = parseOpenSky(STATES)[1]
        expect(ground).toMatchObject({ id: 'abc789', label: 'abc789', altitude: 0, speed: 5.2, heading: 180 })
        expect(ground.properties).toMatchObject({ onGround: true, category: 17 })
    })

    it('reads an answer with no states', () => {
        expect(parseOpenSky({ time: 1_763_640_000, states: null })).toEqual([])
    })

    it('times a state by its last contact, then by the answer, when its position time is missing', () => {
        const [track] = parseOpenSky({
            time: 100,
            states: [['abc999', null, 'Norway', null, 90, 10, 60, null, false, null, null, null, null, 500, null, false, 0]],
        })
        expect(track).toMatchObject({ updatedAt: 90_000, altitude: 500 })
    })
})

describe('either shape', () => {
    it('tells the two shapes apart', () => {
        expect(parseFlights(STATES).map((track) => track.source)).toEqual(['opensky', 'opensky'])
        expect(parseFlights(POINT).map((track) => track.source)).toEqual(['adsb', 'adsb'])
    })
})

describe('altitude bands and vertical trends', () => {
    it('bands aircraft by altitude, the ground by what the feed says', () => {
        expect(altitudeBand({ altitude: 36_000 * FOOT })).toBe('high')
        expect(altitudeBand({ altitude: 25_000 * FOOT })).toBe('high')
        expect(altitudeBand({ altitude: 12_000 * FOOT })).toBe('medium')
        expect(altitudeBand({ altitude: 3_000 * FOOT })).toBe('low')
        expect(altitudeBand({ altitude: 0 })).toBe('ground')
        expect(altitudeBand({ altitude: 900, properties: { onGround: true } })).toBe('ground')
        expect(altitudeBand({})).toBeUndefined()
    })

    it('tells a climb and a descent from holding level by the vertical rate', () => {
        const [cruising] = parseReadsb(POINT)
        expect(verticalTrend(cruising)).toBe('level')
        expect(verticalTrend({ properties: { verticalRate: 8 } })).toBe('climbing')
        expect(verticalTrend({ properties: { verticalRate: -6 } })).toBe('descending')
        expect(verticalTrend({ properties: { verticalRate: 8, onGround: true } })).toBeUndefined()
        expect(verticalTrend({})).toBeUndefined()
    })
})
