import { describe, expect, test } from 'vitest'

import { ID_PROPERTY } from './context'
import { between, placeLabels, trackCounts, trackData, trackLegendEntries, turn, type Track } from './TrackLayer'

const HARBOR_PILOT: Track = {
    id: 'pilot',
    position: [5.2, 60.4],
    heading: 90,
    affiliation: 'friend',
    kind: 'vessel',
    label: 'Pilot 4',
    trail: [
        [5.0, 60.4],
        [5.1, 60.4],
    ],
}
const SURVEY: Track = { id: 'survey', position: [4.8, 60.9], affiliation: 'unknown', kind: 'aircraft' }

describe('track data', () => {
    test('draws each track as a point carrying what its symbol reads', () => {
        const { tracks } = trackData([HARBOR_PILOT, SURVEY])
        expect(tracks.collection.features).toHaveLength(2)
        expect(tracks.collection.features[0].properties).toEqual({
            [ID_PROPERTY]: 'pilot',
            affiliation: 'friend',
            kind: 'vessel',
            heading: 90,
            label: 'Pilot 4',
        })
        expect(tracks.collection.features[1].properties?.heading).toBe(0)
        expect(tracks.collection.features[1].properties?.label).toBeNull()
        expect([...tracks.byId.keys()]).toEqual(['pilot', 'survey'])
    })

    test('cuts each trail into pieces up to where the track is now, fading into the past', () => {
        const { trails } = trackData([HARBOR_PILOT])
        expect(trails.collection.features).toHaveLength(2)
        expect(trails.collection.features.map((piece) => piece.properties?.fade)).toEqual([0.5, 1])
        expect(trails.collection.features[1].geometry).toEqual({
            type: 'LineString',
            coordinates: [
                [5.1, 60.4],
                [5.2, 60.4],
            ],
        })
    })

    test('frames the tracks and their trails', () => {
        expect(trackData([HARBOR_PILOT, SURVEY]).tracks.bounds).toEqual([4.8, 60.4, 5.2, 60.9])
        expect(trackData([]).tracks.bounds).toBeNull()
    })

    test('leaves out a track it cannot place, and counts it', () => {
        const lost: Track = { ...SURVEY, id: 'lost', position: [Number.NaN, 60] }
        const { tracks } = trackData([HARBOR_PILOT, lost])
        expect(tracks.collection.features).toHaveLength(1)
        expect(tracks.unreadable).toBe(1)
    })
})

describe('gliding between updates', () => {
    test('turns the short way round', () => {
        expect(turn(350, 10)).toBe(20)
        expect(turn(10, 350)).toBe(-20)
        expect(turn(0, 180)).toBe(-180)
    })

    test('moves each track part of the way, and stands a new one where it is', () => {
        const before = new Map([[HARBOR_PILOT.id, { ...HARBOR_PILOT, position: [5.0, 60.0] as [number, number], heading: 350 }]])
        const after = [{ ...HARBOR_PILOT, heading: 30 }, SURVEY]
        const half = between(before, after, 0.5)
        expect(half[0].position[0]).toBeCloseTo(5.1, 6)
        expect(half[0].position[1]).toBeCloseTo(60.2, 6)
        expect(half[0].heading).toBe(10)
        expect(half[1]).toBe(SURVEY)
        expect(between(before, after, 1)).toEqual(after)
    })
})

describe('a legend of the tracks', () => {
    test('keys each affiliation in its token, with the counts in the same order', () => {
        const entries = trackLegendEntries({ hostile: 'Other side' }, ['friend', 'hostile'])
        expect(entries).toEqual([
            { label: 'Friend', color: 'var(--track-friend)', shape: 'point' },
            { label: 'Other side', color: 'var(--track-hostile)', shape: 'point' },
        ])
        expect(trackCounts([HARBOR_PILOT, SURVEY])).toEqual([1, 0, 0, 1, 0])
    })
})

describe('placing labels', () => {
    const at = (key: string, x: number, y: number) => ({ key, x, y, text: 'Pilot 2' })

    test('keeps every label that stands clear', () => {
        expect(placeLabels([at('a', 0, 0), at('b', 0, 100)], null, 24).map((point) => point.key)).toEqual(['a', 'b'])
    })

    test('drops a label that would cover another, or another track', () => {
        expect(placeLabels([at('a', 0, 0), at('b', 10, 4)], null, 24).map((point) => point.key)).toEqual(['a'])
        expect(placeLabels([at('a', 0, 0), at('b', 40, 0)], null, 24).map((point) => point.key)).toEqual(['b'])
    })

    test('places the label of the selected track first, whatever it covers', () => {
        expect(placeLabels([at('a', 0, 0), at('b', 10, 4)], 'b', 24).map((point) => point.key)).toEqual(['b'])
    })
})
