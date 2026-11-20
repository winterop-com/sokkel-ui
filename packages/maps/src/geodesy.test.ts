import { describe, expect, test } from 'vitest'

import {
    bearing,
    destination,
    distance,
    formatBearing,
    formatCoordinates,
    formatDistance,
    greatCircle,
    normalizeBearing,
    parseCoordinates,
    roundScale,
} from './geodesy'
import type { LngLat } from './geometry'

const HARBOR: LngLat = [5.32, 60.39]
const JUNIPER: LngLat = [5.73, 58.97]

describe('distance', () => {
    test('is zero from a position to itself', () => {
        expect(distance(HARBOR, HARBOR)).toBe(0)
    })

    test('is a degree of latitude at about 111.2 km', () => {
        expect(distance([0, 0], [0, 1]) / 1000).toBeCloseTo(111.195, 2)
    })

    test('is a quarter of the earth from the equator to a pole', () => {
        expect(distance([10, 0], [10, 90]) / 1000).toBeCloseTo(10_007.5, 0)
    })

    test('is the same either way', () => {
        expect(distance(HARBOR, JUNIPER)).toBeCloseTo(distance(JUNIPER, HARBOR), 6)
        expect(distance(HARBOR, JUNIPER) / 1000).toBeCloseTo(159.5, 0)
    })
})

describe('bearing', () => {
    test('reads the four quarters from the equator', () => {
        expect(bearing([0, 0], [0, 1])).toBeCloseTo(0, 6)
        expect(bearing([0, 0], [1, 0])).toBeCloseTo(90, 6)
        expect(bearing([0, 0], [0, -1])).toBeCloseTo(180, 6)
        expect(bearing([0, 0], [-1, 0])).toBeCloseTo(270, 6)
    })

    test('is never negative', () => {
        expect(bearing(HARBOR, JUNIPER)).toBeGreaterThan(160)
        expect(bearing(HARBOR, JUNIPER)).toBeLessThan(180)
        expect(bearing(JUNIPER, HARBOR)).toBeGreaterThan(340)
    })

    test('normalizes into 0 up to 360', () => {
        expect(normalizeBearing(-90)).toBe(270)
        expect(normalizeBearing(360)).toBe(0)
        expect(normalizeBearing(725)).toBe(5)
    })
})

describe('destination', () => {
    test('goes back where the bearing and the distance came from', () => {
        const there = destination(HARBOR, bearing(HARBOR, JUNIPER), distance(HARBOR, JUNIPER))
        expect(there[0]).toBeCloseTo(JUNIPER[0], 6)
        expect(there[1]).toBeCloseTo(JUNIPER[1], 6)
    })

    test('goes north a degree in 111.2 km', () => {
        const there = destination([0, 0], 0, 111_195)
        expect(there[0]).toBeCloseTo(0, 6)
        expect(there[1]).toBeCloseTo(1, 3)
    })

    test('wraps across the antimeridian', () => {
        expect(destination([179.5, 0], 90, 111_195)[0]).toBeCloseTo(-179.5, 3)
    })
})

describe('great circle', () => {
    test('runs from one end to the other in the steps asked for', () => {
        const line = greatCircle(HARBOR, JUNIPER, 8)
        expect(line).toHaveLength(9)
        expect(line[0]).toEqual(HARBOR)
        expect(line[8]).toEqual(JUNIPER)
    })

    test('keeps each step on the circle, at an even share of the distance', () => {
        const line = greatCircle([0, 0], [90, 0], 4)
        expect(line[2][0]).toBeCloseTo(45, 6)
        expect(line[2][1]).toBeCloseTo(0, 6)
    })

    test('runs past 180 rather than jump across the map', () => {
        const line = greatCircle([170, 10], [-170, 10], 4)
        for (const [lng] of line) expect(lng).toBeGreaterThanOrEqual(170)
        expect(line[4][0]).toBe(190)
    })

    test('is its two ends when they are the same', () => {
        expect(greatCircle(HARBOR, HARBOR)).toEqual([HARBOR, HARBOR])
    })
})

describe('writing', () => {
    test('writes distances in their unit, meters below a kilometer', () => {
        expect(formatDistance(420)).toBe('420 m')
        expect(formatDistance(4_270)).toBe('4.27 km')
        expect(formatDistance(38_140)).toBe('38.1 km')
        expect(formatDistance(412_400)).toBe('412 km')
        expect(formatDistance(1852 * 12.5, 'nmi')).toBe('12.5 NM')
        expect(formatDistance(1609.344, 'mi')).toBe('1.00 mi')
    })

    test('writes a bearing three digits wide', () => {
        expect(formatBearing(47.4)).toBe('047°')
        expect(formatBearing(359.7)).toBe('000°')
        expect(formatBearing(-10)).toBe('350°')
    })

    test('writes a position latitude first, with its hemispheres', () => {
        expect(formatCoordinates(HARBOR)).toBe('60.3900° N, 5.3200° E')
        expect(formatCoordinates([-70.25, -33.5])).toBe('33.5000° S, 70.2500° W')
        expect(formatCoordinates([5.3222, 60.3914], 'dms')).toBe('60° 23′ 29″ N, 5° 19′ 20″ E')
    })
})

describe('reading a position', () => {
    test('reads latitude, then longitude', () => {
        expect(parseCoordinates('60.39, 5.32')).toEqual([5.32, 60.39])
        expect(parseCoordinates(' -33.9  18.4 ')).toEqual([18.4, -33.9])
        expect(parseCoordinates('60.39;5.32')).toEqual([5.32, 60.39])
    })

    test('reads hemisphere letters', () => {
        expect(parseCoordinates('60.39 N, 5.32 E')).toEqual([5.32, 60.39])
        expect(parseCoordinates('33.9S 18.4W')).toEqual([-18.4, -33.9])
        expect(parseCoordinates('60.39° N, 5.32° E')).toEqual([5.32, 60.39])
    })

    test('refuses what is not a position', () => {
        expect(parseCoordinates('')).toBeNull()
        expect(parseCoordinates('harbor')).toBeNull()
        expect(parseCoordinates('60.39')).toBeNull()
        expect(parseCoordinates('91, 5')).toBeNull()
        expect(parseCoordinates('60, 181')).toBeNull()
        expect(parseCoordinates('60 E, 5 N')).toBeNull()
    })
})

describe('a scale bar', () => {
    test('takes 1, 2 or 5 times a power of ten that fits', () => {
        expect(roundScale(7_300)).toEqual({ meters: 5_000, value: 5, small: false })
        expect(roundScale(26_000)).toEqual({ meters: 20_000, value: 20, small: false })
        expect(roundScale(140)).toEqual({ meters: 100, value: 100, small: true })
        expect(roundScale(1852 * 3.4, 'nmi')).toEqual({ meters: 1852 * 2, value: 2, small: false })
    })

    test('is empty with no room', () => {
        expect(roundScale(0).meters).toBe(0)
    })
})
