import type { Polygon } from 'geojson'
import { describe, expect, test } from 'vitest'

import { ID_PROPERTY } from './context'
import type { LngLat } from './geometry'
import { placeClear } from './layer'
import { MAP_TONE_COLORS } from './tone'
import { zoneCenter, zoneData, zoneGeometry, zoneLabelBox, zoneLegendEntry, zoneOutward, type Zone } from './ZoneLayer'

const BOX: LngLat[] = [
    [4, 60],
    [5, 60],
    [5, 61],
    [4, 61],
]
const ANCHORAGE: Zone = { id: 'anchorage', area: BOX, tone: 'neutral', label: 'Anchorage' }

describe('zone geometry', () => {
    test('closes an outline on its first position', () => {
        expect(zoneGeometry(BOX)).toEqual({ type: 'Polygon', coordinates: [[...BOX, BOX[0]]] })
        expect(zoneGeometry([...BOX, BOX[0]])).toEqual({ type: 'Polygon', coordinates: [[...BOX, BOX[0]]] })
    })

    test('takes a polygon with a hole, and a multipolygon', () => {
        const hole: LngLat[] = [
            [4.4, 60.4],
            [4.6, 60.4],
            [4.6, 60.6],
        ]
        const polygon: Polygon = { type: 'Polygon', coordinates: [BOX, hole] }
        expect(zoneGeometry(polygon)).toEqual({
            type: 'Polygon',
            coordinates: [
                [...BOX, BOX[0]],
                [...hole, hole[0]],
            ],
        })
        const shifted = BOX.map(([lng, lat]): LngLat => [lng + 2, lat])
        expect(zoneGeometry({ type: 'MultiPolygon', coordinates: [[BOX], [shifted]] })?.type).toBe('MultiPolygon')
    })

    test('reads nothing from fewer than three positions it can place', () => {
        expect(zoneGeometry(BOX.slice(0, 2))).toBeNull()
        expect(zoneGeometry([...BOX.slice(0, 2), [Number.NaN, 60]])).toBeNull()
        expect(zoneGeometry({ type: 'Polygon', coordinates: [] })).toBeNull()
    })
})

describe('a zone center', () => {
    test('is the middle of its area', () => {
        const [lng, lat] = zoneCenter({ type: 'Polygon', coordinates: [[...BOX, BOX[0]]] })
        expect(lng).toBeCloseTo(4.5, 9)
        expect(lat).toBeCloseTo(60.5, 9)
    })

    test('weighs the area, not the corners', () => {
        // An L: a wide foot and a narrow upright, whose middle leans to the foot.
        const ell: LngLat[] = [
            [0, 0],
            [4, 0],
            [4, 1],
            [1, 1],
            [1, 4],
            [0, 4],
            [0, 0],
        ]
        const [lng, lat] = zoneCenter({ type: 'Polygon', coordinates: [ell] })
        expect(lng).toBeCloseTo(19 / 14, 9)
        expect(lat).toBeCloseTo(19 / 14, 9)
    })

    test('stands in the largest part of a multipolygon', () => {
        const small: LngLat[] = [
            [10, 0],
            [10.5, 0],
            [10.5, 0.5],
            [10, 0],
        ]
        const center = zoneCenter({ type: 'MultiPolygon', coordinates: [[small], [[...BOX, BOX[0]]]] })
        expect(center[0]).toBeCloseTo(4.5, 9)
    })
})

describe('zone data', () => {
    test('draws each zone as one feature carrying its tone, fill and edge, the layer giving what it leaves out', () => {
        const { zones, labels } = zoneData([ANCHORAGE, { id: 'box', area: BOX, fill: 'hatched', edge: 'dashed' }], 'none', 'solid')
        expect(zones.collection.features.map((feature) => feature.properties)).toEqual([
            { [ID_PROPERTY]: 'anchorage', tone: 'neutral', fill: 'none', edge: 'solid', label: 'Anchorage', outward: -1 },
            { [ID_PROPERTY]: 'box', tone: 'plain', fill: 'hatched', edge: 'dashed', label: null, outward: -1 },
        ])
        expect([...zones.byId.keys()]).toEqual(['anchorage', 'box'])
        expect(labels).toEqual([{ key: 'anchorage', at: [4.5, 60.5], text: 'Anchorage' }])
    })

    test('frames the zones', () => {
        expect(zoneData([ANCHORAGE]).zones.bounds).toEqual([4, 60, 5, 61])
        expect(zoneData([]).zones.bounds).toBeNull()
    })

    test('leaves out a zone it cannot draw, and counts it', () => {
        const { zones } = zoneData([ANCHORAGE, { id: 'lost', area: BOX.slice(0, 2) }])
        expect(zones.collection.features).toHaveLength(1)
        expect(zones.unreadable).toBe(1)
    })

    test('draws a tone it does not know as plain', () => {
        const odd = { id: 'odd', area: BOX, tone: 'teal' } as unknown as Zone
        expect(zoneData([odd]).zones.collection.features[0].properties?.tone).toBe('plain')
    })
})

describe('a zone legend entry', () => {
    test('keys each fill as the map draws it, inside an edge of the tone', () => {
        const color = MAP_TONE_COLORS.hostile
        expect(zoneLegendEntry('Exclusion', 'hostile', 'solid')).toEqual({
            label: 'Exclusion',
            color: `color-mix(in oklab, ${color} 18%, var(--card))`,
            edge: color,
            shape: 'area',
        })
        expect(zoneLegendEntry('Exclusion', 'hostile', 'hatched').color).toContain('repeating-linear-gradient')
        expect(zoneLegendEntry('Exclusion', 'hostile', 'none').color).toBe('transparent')
    })
})

describe('zone labels', () => {
    const near = [
        { key: 'anchorage', x: 100, y: 100, text: 'Anchorage' },
        { key: 'boarding', x: 120, y: 104, text: 'Pilot boarding' },
        { key: 'patrol-box', x: 400, y: 100, text: 'Patrol box' },
    ]

    test('leaves out a label that would cover one placed before it', () => {
        expect(placeClear(near, zoneLabelBox).map((label) => label.key)).toEqual(['anchorage', 'patrol-box'])
    })

    test("places the selected zone's label first, and always", () => {
        expect(placeClear(near, zoneLabelBox, 'boarding').map((label) => label.key)).toEqual(['boarding', 'patrol-box'])
    })
})

describe('a zone glow', () => {
    test('stands outside the edge whichever way the outline runs', () => {
        expect(zoneOutward({ type: 'Polygon', coordinates: [[...BOX, BOX[0]]] })).toBe(-1)
        expect(zoneOutward({ type: 'Polygon', coordinates: [[...BOX, BOX[0]].reverse()] })).toBe(1)
    })
})
