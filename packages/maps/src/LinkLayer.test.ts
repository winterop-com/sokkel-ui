import { describe, expect, test } from 'vitest'

import { ID_PROPERTY } from './context'
import { distance, greatCircle } from './geodesy'
import type { LngLat } from './geometry'
import { placeClear } from './layer'
import { LINK_WORDS, linkData, linkLine, linkMeasure, measureBox, type MapLink } from './LinkLayer'

const HARBOR: LngLat = [5.27, 60.4]
const LARKSPUR: LngLat = [6.05, 62.48]
const FAR: LngLat = [-70, 42]
const SUPPLY: MapLink = { id: 'supply', from: HARBOR, to: LARKSPUR, tone: 'friend' }

describe('a link line', () => {
    test('is its two ends when straight', () => {
        expect(linkLine(HARBOR, FAR, 'straight')).toEqual([HARBOR, FAR])
    })

    test('follows the great circle in steps no longer than about 50 km, and no more than 64', () => {
        const near = linkLine(HARBOR, LARKSPUR)
        expect(near.length - 1).toBe(Math.ceil(distance(HARBOR, LARKSPUR) / 50_000))
        expect(linkLine(HARBOR, FAR)).toHaveLength(65)
        expect(linkLine(HARBOR, [5.28, 60.4])).toEqual([HARBOR, [5.28, 60.4]])
    })
})

describe('a link measure', () => {
    test('is the great circle and its first bearing, with the middle on it', () => {
        const measured = linkMeasure(HARBOR, FAR)
        expect(measured.meters).toBeCloseTo(distance(HARBOR, FAR), 3)
        expect(measured.middle).toEqual(greatCircle(HARBOR, FAR, 2)[1])
    })

    test('is the rhumb line for a straight link, longer than the great circle and halfway along the stroke', () => {
        const measured = linkMeasure(HARBOR, FAR, 'straight')
        expect(measured.meters).toBeGreaterThan(distance(HARBOR, FAR))
        expect(measured.bearing).toBeGreaterThan(180)
        expect(measured.middle[0]).toBeCloseTo((HARBOR[0] + FAR[0]) / 2, 6)
    })
})

describe('link data', () => {
    test('draws each link as one line carrying its tone and dash, the layer giving what it leaves out', () => {
        const { links } = linkData([SUPPLY, { id: 'watch', from: HARBOR, to: FAR, dashed: false }], { dashed: true })
        expect(links.collection.features.map((feature) => feature.properties)).toEqual([
            { [ID_PROPERTY]: 'supply', tone: 'friend', dashed: true },
            { [ID_PROPERTY]: 'watch', tone: 'plain', dashed: false },
        ])
        expect([...links.byId.keys()]).toEqual(['supply', 'watch'])
    })

    test('writes the measure midway of the links that show one', () => {
        const { measures } = linkData([SUPPLY, { ...SUPPLY, id: 'quiet', measure: false }], { measure: true })
        expect(measures).toHaveLength(1)
        expect(measures[0].key).toBe('supply')
        expect(measures[0].text).toBe('235 km · 010°')
        expect(measures[0].at).toEqual(greatCircle(HARBOR, LARKSPUR, 2)[1])
    })

    test('says the measure in the words and unit given', () => {
        const { measures } = linkData([{ ...SUPPLY, measure: true }], {
            unit: 'nmi',
            words: { measured: (meters, heading) => `${meters} on ${heading}` },
        })
        expect(measures[0].text).toBe('127 NM on 010°')
        expect(LINK_WORDS.measured('1 km', '090°')).toBe('1 km · 090°')
    })

    test('leaves out a link whose ends it cannot place, and counts it', () => {
        const { links } = linkData([SUPPLY, { id: 'lost', from: HARBOR, to: [Number.NaN, 0] }])
        expect(links.collection.features).toHaveLength(1)
        expect(links.unreadable).toBe(1)
    })

    test('frames the links along the lines they draw', () => {
        const [, , , north] = linkData([{ id: 'far', from: HARBOR, to: FAR }]).links.bounds ?? [0, 0, 0, 0]
        // The great circle from harbor to the far coast bends north of both its ends.
        expect(north).toBeGreaterThan(HARBOR[1])
    })

    test('keeps hundreds of links to one feature each', () => {
        const many: MapLink[] = Array.from({ length: 400 }, (_, index) => ({
            id: `host-${String(index)}`,
            from: HARBOR,
            to: [-120 + (index % 40) * 6, -40 + Math.floor(index / 40) * 9],
        }))
        const { links } = linkData(many)
        expect(links.collection.features).toHaveLength(400)
        expect(links.collection.features.every((feature) => feature.geometry.type === 'LineString')).toBe(true)
    })
})

describe('measure chips', () => {
    test('stand above their middles, and one that would cover another is left out', () => {
        expect(measureBox({ key: 'supply', x: 100, y: 100, text: '235 km · 010°' })).toEqual([48.5, 72, 151.5, 92])
        const chips = [
            { key: 'a', x: 100, y: 100, text: '235 km · 010°' },
            { key: 'b', x: 140, y: 110, text: '157 km · 173°' },
            { key: 'c', x: 100, y: 160, text: '29.7 km · 248°' },
        ]
        expect(placeClear(chips, measureBox).map((chip) => chip.key)).toEqual(['a', 'c'])
        expect(placeClear(chips, measureBox, 'b').map((chip) => chip.key)).toEqual(['b', 'c'])
    })
})
