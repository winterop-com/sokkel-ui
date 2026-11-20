import type { Feature, LineString, Polygon } from 'geojson'
import { describe, expect, test } from 'vitest'

import { coverageData, ringDistance, sweepMesh, type RangeRings, type SensorCone } from './CoverageLayer'
import { bearing, distance } from './geodesy'
import type { LngLat } from './geometry'

const RADAR: LngLat = [5.27, 60.4]
const WEST: SensorCone = { id: 'radar', position: RADAR, range: 60_000, bearing: 270, width: 90, tone: 'friend' }
const ROUND: SensorCone = { id: 'round', position: RADAR, range: 30_000 }
const RINGS: RangeRings = { id: 'rings', position: RADAR, distances: [10_000, 20_000, 500], tone: 'plain' }

/** A band's rings as positions. */
const ringsOf = (feature: Feature | undefined) => ((feature?.geometry as Polygon | undefined)?.coordinates ?? []) as LngLat[][]

const bands = (cone: SensorCone, count = 6) =>
    coverageData([cone], [], { bands: count }).shapes.collection.features.filter((feature) => feature.properties?.kind === 'band')

describe('a sensor cone', () => {
    test('is cut into bands from the sensor out, fading with distance', () => {
        const cut = bands(WEST, 4)
        expect(cut).toHaveLength(4)
        expect(cut.map((band) => band.properties?.fade)).toEqual([1, 0.75, 0.5, 0.25])
        expect(cut.every((band) => band.properties?.tone === 'friend')).toBe(true)
    })

    test('opens to its width round its bearing', () => {
        const outer = ringsOf(bands(WEST).at(-1))[0]
        const bearings = outer.filter((at) => distance(RADAR, at) > 59_000).map((at) => bearing(RADAR, at))
        expect(Math.min(...bearings)).toBeCloseTo(225, 3)
        expect(Math.max(...bearings)).toBeCloseTo(315, 3)
    })

    test('reaches its range, and its nearest band starts at the sensor', () => {
        const all = bands(WEST)
        const reach = Math.max(...all.flatMap((band) => ringsOf(band)[0].map((at) => distance(RADAR, at))))
        expect(reach).toBeCloseTo(60_000, 0)
        expect(ringsOf(all[0])[0]).toContainEqual(RADAR)
    })

    test('is a disc with ringed bands round holes when it opens all the way', () => {
        const [first, second] = bands(ROUND, 3)
        expect(ringsOf(first)).toHaveLength(1)
        expect(ringsOf(second)).toHaveLength(2)
        const [outside, hole] = ringsOf(second)
        expect(distance(RADAR, outside[0])).toBeCloseTo(20_000, 0)
        expect(distance(RADAR, hole[0])).toBeCloseTo(10_000, 0)
    })

    test('draws its edge from the sensor round the wedge and back', () => {
        const edge = coverageData([WEST], []).shapes.collection.features.find((feature) => feature.properties?.kind === 'edge')
        const line = (edge?.geometry as LineString | undefined)?.coordinates ?? []
        expect(line[0]).toEqual(RADAR)
        expect(line.at(-1)).toEqual(RADAR)
    })

    test('leaves out a cone it cannot place or that reaches nowhere', () => {
        const { shapes } = coverageData([WEST, { ...WEST, id: 'lost', position: [Number.NaN, 60] }, { ...WEST, id: 'none', range: 0 }], [])
        expect(shapes.unreadable).toBe(2)
        expect(new Set(shapes.collection.features.map((feature) => String(feature.properties?.__id).split('#')[0]))).toEqual(
            new Set(['radar']),
        )
    })
})

describe('range rings', () => {
    test('draw a circle at each distance, written with it on the north of the ring', () => {
        const { shapes, labels } = coverageData([], [RINGS])
        const circles = shapes.collection.features.filter((feature) => feature.properties?.kind === 'ring')
        expect(circles).toHaveLength(3)
        for (const [index, meters] of RINGS.distances.entries()) {
            for (const at of (circles[index].geometry as LineString).coordinates)
                expect(distance(RADAR, at as LngLat)).toBeCloseTo(meters, 0)
        }
        expect(labels.map((label) => label.text)).toEqual(['10 km', '20 km', '500 m'])
        expect(Math.round(bearing(RADAR, labels[0].at)) % 360).toBe(0)
    })

    test('write their distances in the unit given', () => {
        const { labels } = coverageData([], [{ ...RINGS, distances: [1852 * 5] }], { unit: 'nmi' })
        expect(labels[0].text).toBe('5 NM')
    })

    test('frame the coverage', () => {
        const [west, south, east, north] = coverageData([], [RINGS]).shapes.bounds ?? [0, 0, 0, 0]
        expect(distance(RADAR, [RADAR[0], north]) / 1000).toBeCloseTo(20, 1)
        expect(distance(RADAR, [RADAR[0], south]) / 1000).toBeCloseTo(20, 1)
        expect(west).toBeLessThan(RADAR[0])
        expect(east).toBeGreaterThan(RADAR[0])
        expect(coverageData([], []).shapes.bounds).toBeNull()
    })
})

describe('a sweep', () => {
    /** Each vertex's attributes: position on the square, angle, share of the range, turn, wrap, tone and start. */
    const vertexOf = (mesh: { vertices: Float32Array }, index: number) => Array.from(mesh.vertices.slice(index * 8, index * 8 + 8))

    test('fans a sector in two-degree steps from one edge, its turn crossing the sector and the trail', () => {
        const mesh = sweepMesh([WEST], 90)
        // 90 degrees in 45 steps, each 7 positions from the sensor out.
        expect(mesh.vertices.length / 8).toBe(46 * 7)
        expect(mesh.indices.length).toBe(45 * 6 * 6)
        const [, , angle, share, turn, wrap, tone] = vertexOf(mesh, 7 * 45 + 6)
        expect([angle, share, turn, tone]).toEqual([90, 1, 180, 0])
        expect(wrap).toBeGreaterThan(1000)
    })

    test('keeps a cone across the antimeridian whole, its far side running on past 180', () => {
        const mesh = sweepMesh([{ id: 'east', position: [179.8, 0], range: 100_000, bearing: 90, width: 90 }])
        const xs = Array.from({ length: mesh.vertices.length / 8 }, (_, index) => mesh.vertices[index * 8] + mesh.origin[0])
        // 100 km is under a degree of longitude at the equator, a little over a 400th of the square.
        expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.003)
        expect(Math.max(...xs)).toBeGreaterThan(1)
    })

    test('turns a disc round from north, wrapping at a whole turn', () => {
        const mesh = sweepMesh([ROUND])
        const [, , angle, , turn, wrap, tone] = vertexOf(mesh, 7 * 180 + 6)
        expect([angle, turn, wrap, tone]).toEqual([360, 360, 360, 5])
    })

    test('leaves out a cone it cannot read', () => {
        expect(
            sweepMesh([
                { ...WEST, range: 0 },
                { ...ROUND, position: [Number.NaN, 0] },
            ]).indices,
        ).toHaveLength(0)
    })
})

describe('a ring distance', () => {
    test('is written with no more figures than it has', () => {
        expect(ringDistance(20_000)).toBe('20 km')
        expect(ringDistance(2_500)).toBe('2.5 km')
        expect(ringDistance(750)).toBe('750 m')
        expect(ringDistance(1609.344 * 10, 'mi')).toBe('10 mi')
        expect(ringDistance(20_000, 'km', 'nb-NO')).toBe('20 km')
    })
})
