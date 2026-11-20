import { describe, expect, it } from 'vitest'

import { distance } from './geo'
import {
    footprint,
    groundTrack,
    horizonRange,
    parseOmm,
    parseStationPosition,
    satellitePosition,
    satelliteTracks,
    splitAtAntimeridian,
    STATION_ID,
    type OmmRecord,
} from './orbits'
import type { LonLat } from './track'

// The International Space Station's elements of 19 November 2026, as CelesTrak writes OMM in JSON.
const STATION: OmmRecord = {
    OBJECT_NAME: 'ISS (ZARYA)',
    OBJECT_ID: '1998-067A',
    EPOCH: '2026-11-19T20:23:51.209664',
    MEAN_MOTION: 15.49496274,
    ECCENTRICITY: 0.0007427,
    INCLINATION: 51.6318,
    RA_OF_ASC_NODE: 249.7702,
    ARG_OF_PERICENTER: 44.2199,
    MEAN_ANOMALY: 315.9382,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 25544,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 59588,
    BSTAR: 0.00021862,
    MEAN_MOTION_DOT: 0.0001183,
    MEAN_MOTION_DDOT: 0,
}

// An invented satellite on a sun-synchronous orbit, its numbers as text, as Space-Track writes them.
const POLAR: OmmRecord = {
    OBJECT_NAME: 'TIDEVANN 1',
    OBJECT_ID: '2026-001A',
    EPOCH: '2026-11-20T00:00:00.000000',
    MEAN_MOTION: '14.19552000',
    ECCENTRICITY: '0.0001200',
    INCLINATION: '98.7400',
    RA_OF_ASC_NODE: '30.0000',
    ARG_OF_PERICENTER: '90.0000',
    MEAN_ANOMALY: '270.0000',
    EPHEMERIS_TYPE: '0',
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: '99001',
    ELEMENT_SET_NO: '999',
    REV_AT_EPOCH: '120',
    BSTAR: '0.00010000',
    MEAN_MOTION_DOT: '0.00000100',
    MEAN_MOTION_DDOT: '0',
}

// An invented geostationary satellite.
const GEO: OmmRecord = {
    OBJECT_NAME: 'TIDEVANN GEO',
    OBJECT_ID: '2026-002A',
    EPOCH: '2026-11-20T00:00:00.000000',
    MEAN_MOTION: 1.00273791,
    ECCENTRICITY: 0.0002,
    INCLINATION: 0.03,
    RA_OF_ASC_NODE: 80,
    ARG_OF_PERICENTER: 10,
    MEAN_ANOMALY: 200,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 99002,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 12,
    BSTAR: 0,
    MEAN_MOTION_DOT: 0,
    MEAN_MOTION_DDOT: 0,
}

/** 20 November 2026, 18:40:00 UTC. */
const AT = 1_795_200_000_000

/**
 * Where a public service placed the station at four times with the same elements: the time in seconds
 * since the epoch, the latitude, the longitude and the height in kilometers.
 */
const PLACED: [seconds: number, lat: number, lon: number, height: number][] = [
    [1_795_200_000, 30.648077634711, 57.575888571708, 419.94096921863],
    [1_795_201_800, -49.624987879677, 145.56026369161, 439.50925252096],
    [1_795_203_600, 9.3908367864496, -102.38380480833, 414.04256320259],
    [1_795_207_200, -45.298695406309, 107.59385854695, 438.13647582832],
]

const [station, polar, geo] = parseOmm([STATION, POLAR, GEO])

describe('elements', () => {
    it('reads a satellite and its orbit from OMM', () => {
        expect(station).toEqual({
            id: '25544',
            name: 'ISS (ZARYA)',
            designator: '1998-067A',
            epoch: Date.UTC(2026, 10, 19, 20, 23, 51, 209),
            period: 86_400 / 15.49496274,
            inclination: 51.6318,
            eccentricity: 0.0007427,
            omm: STATION,
        })
        expect(station.period / 60).toBeCloseTo(92.93, 2)
    })

    it('reads numbers written as text, and one record as well as a list', () => {
        expect(polar).toMatchObject({ id: '99001', name: 'TIDEVANN 1', inclination: 98.74, eccentricity: 0.00012 })
        expect(polar.period).toBeCloseTo(86_400 / 14.19552, 9)
        expect(parseOmm(GEO).map((satellite) => satellite.id)).toEqual(['99002'])
    })

    it('skips a record without a catalog number, an epoch or an element SGP4 needs', () => {
        const without = (field: string) => Object.fromEntries(Object.entries(STATION).filter(([key]) => key !== field))
        const rows = [
            without('NORAD_CAT_ID'),
            without('BSTAR'),
            { ...STATION, EPOCH: 'yesterday' },
            { ...STATION, MEAN_MOTION: 0 },
            { ...STATION, INCLINATION: 'steep' },
            null,
            'ISS',
        ]
        expect(parseOmm(rows as unknown as OmmRecord[])).toEqual([])
    })
})

describe('positions', () => {
    it('places the station where a public service placed it with the same elements', () => {
        for (const [seconds, lat, lon, height] of PLACED) {
            const place = satellitePosition(station, seconds * 1000)
            expect(place?.lat).toBeCloseTo(lat, 3)
            expect(place?.lon).toBeCloseTo(lon, 3)
            expect((place?.altitude ?? 0) / 1000).toBeCloseTo(height, 1)
            expect(place?.at).toBe(seconds * 1000)
        }
    })

    it('gives the speed along the orbit in meters per second', () => {
        expect(satellitePosition(station, AT)?.velocity).toBeCloseTo(7663.35, 1)
        expect(satellitePosition(geo, AT)?.velocity).toBeCloseTo(3074.4, 0)
    })

    it('places the same satellite again from elements that went through JSON', () => {
        const [copy] = parseOmm(JSON.parse(JSON.stringify([STATION])) as OmmRecord[])
        expect(satellitePosition(copy, AT)).toEqual(satellitePosition(station, AT))
        expect(satellitePosition(JSON.parse(JSON.stringify(station)) as typeof station, AT)).toEqual(satellitePosition(station, AT))
    })

    it('gives no position for an orbit SGP4 refuses, nor for a time that is none', () => {
        const [broken] = parseOmm([{ ...STATION, ECCENTRICITY: 1.5 }])
        expect(satellitePosition(broken, AT)).toBeUndefined()
        expect(satellitePosition(station, Number.NaN)).toBeUndefined()
    })
})

describe('tracks', () => {
    const tracks = satelliteTracks([station, polar, geo], AT)

    it('gives each satellite as a track of kind satellite, in SI units', () => {
        const [track] = tracks
        expect(track).toMatchObject({
            id: '25544',
            affiliation: 'unknown',
            kind: 'satellite',
            label: 'ISS (ZARYA)',
            updatedAt: AT,
            source: 'omm',
            properties: {
                catalogNumber: 25544,
                designator: '1998-067A',
                inclination: 51.6318,
                eccentricity: 0.0007427,
                epoch: station.epoch,
                period: station.period,
            },
        })
        expect(track.lon).toBeCloseTo(57.5759, 3)
        expect(track.lat).toBeCloseTo(30.6481, 3)
        expect(track.altitude).toBeCloseTo(419_939, -2)
        expect(track.properties?.velocity).toBeCloseTo(7663.35, 1)
        expect(tracks.map((each) => each.id)).toEqual(['25544', '99001', '99002'])
    })

    it('heads a track the way the point under the satellite moves over the ground', () => {
        const [iss, sunSynchronous] = tracks
        // South-east, on the way down from 30°N to 50°S half an hour later.
        expect(iss.heading).toBeCloseTo(136.4, 0)
        expect(iss.speed).toBeCloseTo(6910.6, 0)
        // A sun-synchronous orbit runs against the Earth's turn: north by west on its way up.
        expect(sunSynchronous.heading).toBeCloseTo(347.3, 0)
        expect(sunSynchronous.speed).toBeLessThan(sunSynchronous.properties?.velocity as number)
    })

    it('leaves a geostationary satellite without a heading, almost at rest over the equator', () => {
        const stationary = tracks[2]
        expect(stationary.heading).toBeUndefined()
        expect(stationary.speed).toBeLessThan(1)
        expect(Math.abs(stationary.lat)).toBeLessThan(0.05)
        expect(stationary.altitude).toBeCloseTo(35_790_000, -5)
    })

    it('classifies satellites as the app says, names its source and skips one it cannot place', () => {
        const [broken] = parseOmm([{ ...STATION, NORAD_CAT_ID: 99003, ECCENTRICITY: 1.5 }])
        const classified = satelliteTracks([station, broken, polar], AT, {
            source: 'celestrak',
            classify: (track) => (track.label?.startsWith('TIDEVANN') === true ? 'friend' : undefined),
        })
        expect(classified.map((track) => [track.id, track.affiliation, track.source])).toEqual([
            ['25544', 'unknown', 'celestrak'],
            ['99001', 'friend', 'celestrak'],
        ])
    })
})

describe('ground tracks', () => {
    it('splits a path where it crosses the antimeridian, either way', () => {
        expect(
            splitAtAntimeridian([
                [170, 10],
                [178, 12],
                [-178, 14],
                [-170, 16],
                [179, 20],
            ]),
        ).toEqual([
            [
                [170, 10],
                [178, 12],
                [180, 13],
            ],
            [
                [-180, 13],
                [-178, 14],
                [-170, 16],
                [-180, 16 + (4 * 10) / 11],
            ],
            [
                [180, 16 + (4 * 10) / 11],
                [179, 20],
            ],
        ])
        expect(splitAtAntimeridian([])).toEqual([])
        expect(
            splitAtAntimeridian([
                [10, 0],
                [20, 5],
            ]),
        ).toEqual([
            [
                [10, 0],
                [20, 5],
            ],
        ])
    })

    it('draws one revolution behind and one ahead, meeting where the satellite is', () => {
        const { id, past, future } = groundTrack(station, AT)
        const here = satellitePosition(station, AT)
        const last = past[past.length - 1]
        expect(id).toBe('25544')
        expect(last[last.length - 1]).toEqual([here?.lon, here?.lat])
        expect(future[0][0]).toEqual([here?.lon, here?.lat])
        const back = satellitePosition(station, AT - station.period * 1000)
        const ahead = satellitePosition(station, AT + station.period * 1000)
        const end = future[future.length - 1]
        expect(past[0][0]).toEqual([back?.lon, back?.lat])
        expect(end[end.length - 1]).toEqual([ahead?.lon, ahead?.lat])
        // A revolution in steps of a 180th, and the two ends a crossing adds.
        expect(past.flat()).toHaveLength(181 + 2 * (past.length - 1))
        expect(future.flat()).toHaveLength(181 + 2 * (future.length - 1))
    })

    it('never draws a line across the antimeridian', () => {
        const { future } = groundTrack(polar, AT, { before: 0, after: 3 * 3_600_000, step: 60_000 })
        expect(future.length).toBeGreaterThan(1)
        for (const line of future) {
            for (let index = 1; index < line.length; index += 1) expect(Math.abs(line[index][0] - line[index - 1][0])).toBeLessThan(180)
        }
        // Each line ends on the antimeridian where the next begins, at the same latitude.
        for (let index = 1; index < future.length; index += 1) {
            const end = future[index - 1][future[index - 1].length - 1]
            const start = future[index][0]
            expect(Math.abs(end[0])).toBe(180)
            expect(end[0]).toBe(-start[0])
            expect(start[1]).toBe(end[1])
        }
    })

    it('reaches as far as it is told, in the steps it is told', () => {
        const { past, future } = groundTrack(station, AT, { before: 0, after: 600_000, step: 60_000 })
        expect(past).toEqual([])
        expect(future.flat()).toHaveLength(11)
        // Steps too far to end on the last one still end there.
        const uneven = groundTrack(station, AT, { before: 0, after: 100_000, step: 60_000 }).future.flat()
        const end = satellitePosition(station, AT + 100_000)
        expect(uneven).toHaveLength(3)
        expect(uneven[2]).toEqual([end?.lon, end?.lat])
    })
})

describe('footprints', () => {
    it('reaches the horizon, and less far for a satellite that must stand over it', () => {
        // The service that placed the station gave its footprint as 4507 km across.
        expect(2 * horizonRange(419_940)).toBeCloseTo(4_507_163, -4)
        expect(horizonRange(419_940, 10)).toBeLessThan(horizonRange(419_940))
        expect(horizonRange(419_940, 90)).toBe(0)
        expect(horizonRange(0)).toBe(0)
        expect(horizonRange(Number.NaN)).toBe(0)
    })

    it('gives the circle a satellite is in view from, round the point under it', () => {
        const [track] = satelliteTracks([station], AT)
        const circle = footprint(track)
        expect(circle).toEqual({ id: '25544', position: [track.lon, track.lat], range: horizonRange(track.altitude as number) })
        // A place on the edge sees the satellite on its horizon: the line of sight just clears the Earth.
        const edge: LonLat = [track.lon, track.lat + ((circle?.range ?? 0) / 6_371_008.8) * (180 / Math.PI)]
        expect(distance(circle?.position as LonLat, edge)).toBeCloseTo(circle?.range ?? 0, 0)
        expect(footprint(track, { elevation: 25 })?.range).toBeLessThan(circle?.range ?? 0)
    })

    it('gives none for a track without an altitude over the ground', () => {
        expect(footprint({ id: 'a', lon: 0, lat: 0 })).toBeUndefined()
        expect(footprint({ id: 'a', lon: 0, lat: 0, altitude: 0 })).toBeUndefined()
    })
})

describe('the station position services', () => {
    // As wheretheiss.at answered `/v1/satellites/25544` for the first of the times above.
    const WHERE = {
        name: 'iss',
        id: 25544,
        latitude: 30.648077634711,
        longitude: 57.575888571708,
        altitude: 419.94096921863,
        velocity: 27588.058247887,
        visibility: 'eclipsed',
        footprint: 4507.1631262402,
        timestamp: 1_795_200_000,
        daynum: 2461365.2777778,
        solar_lat: -19.813405240566,
        solar_lon: 256.41670599798,
        units: 'kilometers',
    }

    it('reads wheretheiss.at, turning kilometers and kilometers an hour to SI', () => {
        const track = parseStationPosition(WHERE)
        expect(track).toMatchObject({
            id: STATION_ID,
            lon: 57.575888571708,
            lat: 30.648077634711,
            affiliation: 'unknown',
            kind: 'satellite',
            label: 'ISS',
            updatedAt: AT,
            source: 'wheretheiss',
            properties: { catalogNumber: 25544, visibility: 'eclipsed' },
        })
        expect(track?.altitude).toBeCloseTo(419_940.97, 1)
        expect(track?.properties?.velocity).toBeCloseTo(7663.35, 1)
        // The service and the propagation agree on where the station is.
        const here = satellitePosition(station, AT)
        expect(distance([track?.lon ?? 0, track?.lat ?? 0], [here?.lon ?? 0, here?.lat ?? 0])).toBeLessThan(50)
    })

    it('reads miles and miles an hour', () => {
        const track = parseStationPosition({ ...WHERE, altitude: 260.94, velocity: 17_142.4, units: 'miles' })
        expect(track?.altitude).toBeCloseTo(419_942, -1)
        expect(track?.properties?.velocity).toBeCloseTo(7663.3, 0)
    })

    it('keeps the point and leaves out the height and the speed for units it does not know', () => {
        for (const units of ['leagues', 'constructor']) {
            const track = parseStationPosition({ ...WHERE, units })
            expect(track).toMatchObject({ lon: WHERE.longitude, lat: WHERE.latitude })
            expect(track?.altitude).toBeUndefined()
            expect(track?.properties?.velocity).toBeUndefined()
        }
    })

    it('reads Open Notify, which gives the point alone, as text', () => {
        const track = parseStationPosition(
            { message: 'success', iss_position: { latitude: '-48.5856', longitude: '151.1073' }, timestamp: 1_795_199_042 },
            { classify: () => 'neutral', source: 'station' },
        )
        expect(track).toEqual({
            id: '25544',
            lon: 151.1073,
            lat: -48.5856,
            affiliation: 'neutral',
            kind: 'satellite',
            label: 'ISS',
            updatedAt: 1_795_199_042_000,
            source: 'station',
            properties: { catalogNumber: 25544 },
        })
        expect(parseStationPosition({ message: 'success', iss_position: { latitude: '1', longitude: '2' } })?.source).toBe('open-notify')
    })

    it('gives nothing for an answer without a position', () => {
        expect(parseStationPosition({ message: 'failure' })).toBeUndefined()
        expect(parseStationPosition({ latitude: 95, longitude: 10 })).toBeUndefined()
        expect(parseStationPosition({ iss_position: { latitude: 'north', longitude: '10' } })).toBeUndefined()
    })
})
