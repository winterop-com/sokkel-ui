import { describe, expect, it } from 'vitest'

import { bearing, destination, distance, formatUtm, fromUtm, latitudeBand, parseMgrs, toMgrs, toUtm, utmZone } from './geo'
import type { LonLat } from './track'

/** References from the NGA's GEOTRANS method as the `mgrs` and PROJ libraries give it, at the meter. */
const MGRS: [LonLat, string][] = [
    [[0, 0], '31N AA 66021 00000'],
    [[3, 45], '31T EK 00000 82950'],
    [[10.7522, 59.9139], '32V NM 97979 43118'],
    [[5.3221, 60.3913], '32V KN 97353 00648'],
    [[15.6356, 78.2232], '33X WG 14481 83357'],
    [[-74.0445, 40.6892], '18T WL 80735 04695'],
    [[151.2153, -33.8568], '56H LH 34900 52288'],
    [[-43.2105, -22.9519], '23K PQ 83476 60687'],
    [[18.4241, -33.9249], '34H BH 61881 43182'],
    [[2.2945, 48.8584], '31U DQ 48252 11954'],
    [[139.7454, 35.6586], '54S UE 86437 46808'],
    [[-0.0014, 51.4778], '30U YC 08220 07224'],
    [[-122.3493, 47.6205], '10T ET 48894 74326'],
    [[23, 77], '35X LF 99627 50188'],
    [[37.6173, 55.7558], '37U DB 13224 79766'],
    [[-68.3, -54.8], '19F EV 45000 27239'],
]

/** References from PROJ, to the tenth of a millimeter. */
const UTM: [LonLat, number, 'N' | 'S', number, number][] = [
    [[0, 0], 31, 'N', 166021.4431, 0],
    [[3, 45], 31, 'N', 500000, 4982950.4002],
    [[10.7522, 59.9139], 32, 'N', 597979.9029, 6643118.9915],
    [[151.2153, -33.8568], 56, 'S', 334900.5697, 6252288.7529],
    [[15.6356, 78.2232], 33, 'N', 514481.4849, 8683357.6562],
    [[-68.3, -54.8], 19, 'S', 545000.0534, 3927239.3813],
]

describe('great circles', () => {
    it('measure a degree of the equator and of a meridian', () => {
        expect(distance([0, 0], [1, 0])).toBeCloseTo(111195.08, 1)
        expect(distance([0, 0], [0, 1])).toBeCloseTo(111195.08, 1)
        expect(distance([10, 50], [10, 50])).toBe(0)
    })

    it('measure between two cities as references give it on the mean sphere', () => {
        // Paris to London, about 343.9 km along the great circle.
        expect(distance([2.3522, 48.8566], [-0.1276, 51.5072]) / 1000).toBeCloseTo(343.9, 0)
        // Antipodes are half the circumference apart.
        expect(distance([0, 0], [180, 0])).toBeCloseTo(Math.PI * 6371008.8, 3)
    })

    it('measure the same both ways', () => {
        const a: LonLat = [-74.0445, 40.6892]
        const b: LonLat = [139.7454, 35.6586]
        expect(distance(a, b)).toBeCloseTo(distance(b, a), 6)
    })

    it('set out on the bearings of the compass', () => {
        expect(bearing([0, 0], [0, 1])).toBeCloseTo(0, 9)
        expect(bearing([0, 0], [1, 0])).toBeCloseTo(90, 9)
        expect(bearing([0, 1], [0, 0])).toBeCloseTo(180, 9)
        expect(bearing([1, 0], [0, 0])).toBeCloseTo(270, 9)
    })

    it('set out from Baghdad toward Osaka on the reference bearing', () => {
        // The common worked example of the great-circle formulas: 60.16° from 35°N 45°E to 35°N 135°E.
        expect(bearing([45, 35], [135, 35])).toBeCloseTo(60.16, 2)
    })

    it('find the destination a bearing and a distance lead to', () => {
        const [lon, lat] = destination([0, 0], 90, 111195.08)
        expect(lon).toBeCloseTo(1, 6)
        expect(lat).toBeCloseTo(0, 9)
        const north = destination([10, 80], 0, 2 * 111195.08)
        expect(north[1]).toBeCloseTo(82, 6)
    })

    it('find its way back: the destination is the distance away on the bearing', () => {
        const from: LonLat = [5.3221, 60.3913]
        const to = destination(from, 237, 54321)
        expect(distance(from, to)).toBeCloseTo(54321, 3)
        expect(bearing(from, to)).toBeCloseTo(237, 6)
    })

    it('wrap a destination across the antimeridian', () => {
        const [lon] = destination([179.5, 0], 90, 111195.08)
        expect(lon).toBeCloseTo(-179.5, 6)
    })
})

describe('UTM', () => {
    it('gives the zones by 6° of longitude', () => {
        expect(utmZone([-180, 0])).toBe(1)
        expect(utmZone([-177.1, 0])).toBe(1)
        expect(utmZone([0, 0])).toBe(31)
        expect(utmZone([179.9, 0])).toBe(60)
        expect(utmZone([180, 0])).toBe(60)
    })

    it('widens zone 32V over western Norway', () => {
        expect(utmZone([2.9, 60])).toBe(31)
        expect(utmZone([3, 60])).toBe(32)
        expect(utmZone([5.3221, 60.3913])).toBe(32)
        expect(utmZone([11.9, 56])).toBe(32)
        // Only within band V: south of 56°N and from 64°N the zones are their usual width.
        expect(utmZone([5, 55.9])).toBe(31)
        expect(utmZone([5, 64])).toBe(31)
    })

    it('gives Svalbard the odd zones 31X, 33X, 35X and 37X', () => {
        expect(utmZone([8.9, 78])).toBe(31)
        expect(utmZone([9, 78])).toBe(33)
        expect(utmZone([20.9, 78])).toBe(33)
        expect(utmZone([21, 78])).toBe(35)
        expect(utmZone([32.9, 78])).toBe(35)
        expect(utmZone([33, 78])).toBe(37)
        expect(utmZone([41.9, 78])).toBe(37)
        expect(utmZone([42, 78])).toBe(38)
        // South of 72°N the even zones are back.
        expect(utmZone([10, 71.9])).toBe(32)
    })

    it('gives the latitude bands, X stretched to 84°N', () => {
        expect(latitudeBand(-80)).toBe('C')
        expect(latitudeBand(-0.1)).toBe('M')
        expect(latitudeBand(0)).toBe('N')
        expect(latitudeBand(59.9)).toBe('V')
        expect(latitudeBand(72)).toBe('X')
        expect(latitudeBand(84)).toBe('X')
        expect(latitudeBand(84.1)).toBeUndefined()
        expect(latitudeBand(-80.1)).toBeUndefined()
    })

    it.each(UTM)('places %j as PROJ does', (point, zone, hemisphere, easting, northing) => {
        const utm = toUtm(point)
        expect(utm?.zone).toBe(zone)
        expect(utm?.hemisphere).toBe(hemisphere)
        expect(utm?.easting).toBeCloseTo(easting, 3)
        expect(utm?.northing).toBeCloseTo(northing, 3)
    })

    it('reads its positions back to the point, to a ten-millionth of a degree', () => {
        for (let lat = -79.5; lat <= 83.5; lat += 6.5) {
            for (let lon = -179; lon < 180; lon += 13.7) {
                const utm = toUtm([lon, lat])
                if (utm === undefined) throw new Error('within the grid')
                const [backLon, backLat] = fromUtm(utm)
                expect(backLon).toBeCloseTo(lon, 7)
                expect(backLat).toBeCloseTo(lat, 7)
            }
        }
    })

    it('places a point in a zone it is given', () => {
        const utm = toUtm([2.9, 60], 32)
        expect(utm?.zone).toBe(32)
        expect(utm?.easting).toBeLessThan(500000)
        const [lon, lat] = fromUtm(utm!)
        expect(lon).toBeCloseTo(2.9, 8)
        expect(lat).toBeCloseTo(60, 8)
    })

    it('writes a position to the meter', () => {
        expect(formatUtm(toUtm([10.7522, 59.9139])!)).toBe('32V 597979 6643118')
    })

    it('gives nothing nearer the poles than the grid reaches', () => {
        expect(toUtm([0, 84.5])).toBeUndefined()
        expect(toUtm([0, -80.5])).toBeUndefined()
        expect(toMgrs([0, 89])).toBeUndefined()
    })
})

describe('MGRS', () => {
    it.each(MGRS)('writes %j as %s', (point, reference) => {
        expect(toMgrs(point)).toBe(reference)
    })

    it.each(MGRS)('reads %j back from %s, to the meter', (point, reference) => {
        const corner = parseMgrs(reference)
        if (corner === undefined) throw new Error(`${reference} is a reference`)
        // A reference names its square's south-west corner, under a meter from the point.
        expect(distance(corner, point)).toBeLessThan(1.5)
        // The square's center is in it, where a corner on a zone's edge may fall in the zone beside it.
        expect(toMgrs(parseMgrs(reference, { center: true })!)).toBe(reference)
    })

    it('writes fewer digits for a larger square, cutting rather than rounding', () => {
        const oslo: LonLat = [10.7522, 59.9139]
        expect(toMgrs(oslo, 4)).toBe('32V NM 9797 4311')
        expect(toMgrs(oslo, 3)).toBe('32V NM 979 431')
        expect(toMgrs(oslo, 1)).toBe('32V NM 9 4')
        expect(toMgrs(oslo, 0)).toBe('32V NM')
    })

    it('reads a reference without spaces and in lower case', () => {
        expect(parseMgrs('32vnm9797943118')).toEqual(parseMgrs('32V NM 97979 43118'))
    })

    it('reads the center of the square when asked', () => {
        const corner = parseMgrs('32V NM 979 431')!
        const center = parseMgrs('32V NM 979 431', { center: true })!
        // A 100 m square's center is about 71 m from its corner, north-east.
        expect(distance(corner, center)).toBeCloseTo(70.7, 0)
        expect(bearing(corner, center)).toBeGreaterThan(30)
        expect(bearing(corner, center)).toBeLessThan(60)
    })

    it('reads a square on the southern hemisphere into the right 2 000 km repeat', () => {
        const [lon, lat] = parseMgrs('56H LH 34900 52288')!
        expect(lon).toBeCloseTo(151.2153, 4)
        expect(lat).toBeCloseTo(-33.8568, 4)
        const [, south] = parseMgrs('19F EV 45000 27239')!
        expect(south).toBeCloseTo(-54.8, 4)
    })

    it('reads squares round the world back to their points', () => {
        for (let lat = -79.5; lat <= 83.5; lat += 4.9) {
            for (let lon = -179.5; lon < 180; lon += 9.1) {
                const reference = toMgrs([lon, lat])
                if (reference === undefined) throw new Error('within the grid')
                const corner = parseMgrs(reference)
                if (corner === undefined) throw new Error(`${reference} is a reference`)
                expect(distance(corner, [lon, lat])).toBeLessThan(1.5)
            }
        }
    })

    it('refuses what is not a reference', () => {
        expect(parseMgrs('')).toBeUndefined()
        expect(parseMgrs('hello')).toBeUndefined()
        expect(parseMgrs('32V NM 979 43')).toBeUndefined()
        expect(parseMgrs('61V NM 979 431')).toBeUndefined()
        // I and O are no band, column or row letter.
        expect(parseMgrs('32I NM 979 431')).toBeUndefined()
        expect(parseMgrs('32V NO 979 431')).toBeUndefined()
        // Zone 32's columns are J to R.
        expect(parseMgrs('32V AM 979 431')).toBeUndefined()
    })
})
