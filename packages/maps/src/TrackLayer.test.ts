import { describe, expect, test } from 'vitest'

import { ID_PROPERTY } from './context'
import { distance, EARTH_RADIUS } from './geodesy'
import {
    courseAt,
    placeLabels,
    plotCourse,
    TRACK_KINDS,
    TRACK_WORDS,
    trackCounts,
    trackData,
    trackLegendEntries,
    trackScale,
    trailTone,
    turn,
    type Track,
    type TrackPace,
} from './TrackLayer'

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
            band: null,
        })
        expect(tracks.collection.features[1].properties?.heading).toBe(0)
        expect(tracks.collection.features[1].properties?.label).toBeNull()
        expect([...tracks.byId.keys()]).toEqual(['pilot', 'survey'])
    })

    test('draws each trail as one line through its past positions, under its track id', () => {
        const { trails } = trackData([HARBOR_PILOT, SURVEY])
        expect(trails.collection.features).toHaveLength(1)
        expect(trails.collection.features[0].properties).toEqual({
            [ID_PROPERTY]: 'pilot',
            affiliation: 'friend',
            band: null,
            tone: 'friend',
        })
        expect(trails.collection.features[0].geometry).toEqual({
            type: 'LineString',
            coordinates: [
                [5.0, 60.4],
                [5.1, 60.4],
            ],
        })
    })

    test("draws each trail's head on from its newest position to where the track is now", () => {
        const { heads } = trackData([HARBOR_PILOT, SURVEY])
        expect(heads.collection.features).toHaveLength(1)
        expect(heads.collection.features[0].properties).toEqual({ [ID_PROPERTY]: 'pilot', affiliation: 'friend', band: null })
        expect(heads.collection.features[0].geometry).toEqual({
            type: 'LineString',
            coordinates: [
                [5.1, 60.4],
                [5.2, 60.4],
            ],
        })
    })

    test('a trail of one position has a head and no line to fade', () => {
        const { trails, heads } = trackData([{ ...HARBOR_PILOT, trail: [[5.1, 60.4]] }])
        expect(trails.collection.features).toHaveLength(0)
        expect(heads.collection.features).toHaveLength(1)
    })

    test("carries each track's band on its point, its trail and its head, for the layer to paint by", () => {
        const { tracks, trails, heads } = trackData([{ ...HARBOR_PILOT, band: 'high' }], ['low', 'high'])
        expect(tracks.collection.features[0].properties?.band).toBe('high')
        expect(trails.collection.features[0].properties?.band).toBe('high')
        expect(trails.collection.features[0].properties?.tone).toBe('band-1')
        expect(heads.collection.features[0].properties?.band).toBe('high')
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

    test('draws the first of two tracks under one id, and counts neither as unreadable', () => {
        const { tracks, heads } = trackData([HARBOR_PILOT, { ...HARBOR_PILOT, position: [6, 61] }])
        expect(tracks.collection.features).toHaveLength(1)
        expect(tracks.collection.features[0].geometry).toEqual({ type: 'Point', coordinates: [5.2, 60.4] })
        expect(heads.collection.features).toHaveLength(1)
        expect(tracks.unreadable).toBe(0)
    })
})

describe("a trail's tone", () => {
    test("is the track's affiliation, or its band's place among the layer's first eight bands", () => {
        const bands = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
        expect(trailTone({ affiliation: 'hostile' })).toBe('hostile')
        expect(trailTone({ affiliation: 'hostile', band: 'c' }, bands)).toBe('band-2')
        expect(trailTone({ affiliation: 'hostile', band: 'i' }, bands)).toBe('hostile')
        expect(trailTone({ affiliation: 'hostile', band: 'unnamed' }, bands)).toBe('hostile')
    })
})

describe('the kinds', () => {
    test('include a satellite, with a word of its own', () => {
        expect(TRACK_KINDS).toContain('satellite')
        expect(TRACK_WORDS.satellite).toBe('Satellite')
    })
})

const PACE: TrackPace = { moving: true, coast: 60_000, blend: 1_000, transition: 600 }
/** A patrol reported at harbor, heading east at 100 meters a second. */
const PATROL: Track = { id: 'patrol', position: [5, 60], heading: 90, speed: 100, affiliation: 'friend', kind: 'vessel' }
const at = (drawn: { lng: number; lat: number }): [number, number] => [drawn.lng, drawn.lat]
/** How far east of the patrol's report a drawing of it is, in meters. */
const east = (drawn: { lng: number }) => (drawn.lng - 5) * ((Math.PI * EARTH_RADIUS) / 180) * Math.cos(Math.PI / 3)

describe('moving between reports', () => {
    test('turns the short way round', () => {
        expect(turn(350, 10)).toBe(20)
        expect(turn(10, 350)).toBe(-20)
        expect(turn(0, 180)).toBe(-180)
    })

    test('a track with a speed and a heading goes on along its heading at its speed', () => {
        const course = plotCourse(PATROL, null, PACE)
        expect(at(courseAt(course, 0))).toEqual([5, 60])
        const later = courseAt(course, 10_000)
        expect(distance([5, 60], at(later))).toBeCloseTo(1_000, 0)
        // East along the great circle, which bends a hair toward the equator.
        expect(later.lat).toBeCloseTo(60, 5)
        expect(later.heading).toBe(90)
        expect(later.past).toBe(true)
        expect(later.resting).toBe(false)
    })

    test('stops once it has gone on for as long as it may', () => {
        const course = plotCourse(PATROL, null, PACE)
        const stopped = courseAt(course, 60_000)
        expect(distance([5, 60], at(stopped))).toBeCloseTo(6_000, 0)
        expect(at(courseAt(course, 90_000))).toEqual(at(stopped))
        expect(stopped.resting).toBe(true)
        expect(distance([5, 60], at(courseAt(course, 90_000, 5_000)))).toBeCloseTo(500, 0)
    })

    test('a track with no speed, or with the motion off, stands where it was reported', () => {
        const still = plotCourse({ ...PATROL, speed: undefined }, null, PACE)
        expect(at(courseAt(still, 30_000))).toEqual([5, 60])
        expect(courseAt(still, 0).resting).toBe(true)
        const held = plotCourse(PATROL, null, { ...PACE, moving: false })
        expect(at(courseAt(held, 30_000))).toEqual([5, 60])
    })

    test('a track that is not moved on glides from where it was drawn, easing out, and turns the short way', () => {
        const course = plotCourse({ ...PATROL, speed: undefined, heading: 30 }, { lng: 5.2, lat: 60.4, heading: 350 }, PACE)
        expect(at(courseAt(course, 0))[0]).toBeCloseTo(5.2, 9)
        expect(at(courseAt(course, 0))[1]).toBeCloseTo(60.4, 9)
        const half = courseAt(course, 300)
        // A quarter of the way left, along the great circle between the two.
        expect(half.lng).toBeCloseTo(5 + 0.2 * 0.25, 2)
        expect(half.lat).toBeCloseTo(60 + 0.4 * 0.25, 2)
        expect(half.heading).toBe(20)
        expect(at(courseAt(course, 600))).toEqual([5, 60])
        expect(courseAt(course, 600).heading).toBe(30)
    })

    test('with no time to glide, it is drawn where it was reported at once', () => {
        const course = plotCourse({ ...PATROL, speed: undefined }, { lng: 5.2, lat: 60.4 }, { ...PACE, transition: 0 })
        expect(at(courseAt(course, 0))).toEqual([5, 60])
    })

    test('a moving track drawn behind its report catches up over the blend, on along its heading', () => {
        const behind = { lng: 5 - 300 / ((Math.PI * EARTH_RADIUS) / 180) / Math.cos(Math.PI / 3), lat: 60 }
        const course = plotCourse(PATROL, behind, PACE)
        expect(east(courseAt(course, 0))).toBeCloseTo(-300, 3)
        expect(east(courseAt(course, 500))).toBeCloseTo(50 - 300 * 0.25, 3)
        expect(east(courseAt(course, 1_000))).toBeCloseTo(100, 3)
        expect(courseAt(course, 500).past).toBe(false)
    })

    test('a moving track drawn ahead of its report waits for its course, and never goes back', () => {
        const ahead = { lng: 5 + 300 / ((Math.PI * EARTH_RADIUS) / 180) / Math.cos(Math.PI / 3), lat: 60, pace: 0.1 }
        const course = plotCourse(PATROL, ahead, PACE)
        expect(course.hold).toBe(true)
        let last = east(courseAt(course, 0))
        expect(last).toBeCloseTo(300, 3)
        for (let elapsed = 50; elapsed <= 6_000; elapsed += 50) {
            const now = east(courseAt(course, elapsed))
            expect(now).toBeGreaterThanOrEqual(last - 1e-6)
            last = now
        }
        expect(east(courseAt(course, 2_000))).toBeCloseTo(300, 3)
        expect(east(courseAt(course, 6_000))).toBeCloseTo(600, 3)
    })

    test('a track drawn off to one side comes onto its course over the blend', () => {
        const north = { lng: 5, lat: 60 + 200 / ((Math.PI * EARTH_RADIUS) / 180) }
        const course = plotCourse(PATROL, north, PACE)
        expect(course.aside).toBeCloseTo(-200, 3)
        expect(courseAt(course, 500).lat).toBeCloseTo(60 + (200 * 0.25) / ((Math.PI * EARTH_RADIUS) / 180), 7)
        expect(courseAt(course, 1_000).lat).toBeCloseTo(60, 6)
    })

    test('through a feed of reports that say it goes faster than it does, it never steps back', () => {
        // It makes 80 meters a second and reports 100, every two seconds: each report finds it drawn ahead.
        const report = (seconds: number): Track => ({
            ...PATROL,
            position: [5 + (80 * seconds) / (((Math.PI * EARTH_RADIUS) / 180) * Math.cos(Math.PI / 3)), 60],
        })
        let course = plotCourse(report(0), null, PACE)
        let since = 0
        let last = east(courseAt(course, 0))
        for (let ms = 50; ms <= 20_000; ms += 50) {
            if (ms % 2_000 === 0) {
                const drawn = courseAt(course, ms - since)
                course = plotCourse(report(ms / 1000), { ...drawn, pace: course.pace }, PACE)
                since = ms
            }
            const now = east(courseAt(course, ms - since))
            expect(now).toBeGreaterThanOrEqual(last - 1e-6)
            last = now
        }
        // It keeps within one report's overrun of where it is: 20 meters a second for two seconds.
        expect(last - 80 * 20).toBeLessThan(45)
        expect(last - 80 * 20).toBeGreaterThanOrEqual(-1e-6)
    })

    test('a track drawn further ahead than it could have run is a jump, which it eases back from', () => {
        const far = { lng: 6, lat: 60, pace: 0.1 }
        const course = plotCourse(PATROL, far, PACE)
        expect(course.hold).toBe(false)
        expect(east(courseAt(course, 1_000))).toBeCloseTo(100, 3)
    })
})

describe('across the antimeridian and by the poles', () => {
    test('a report on the far side of the antimeridian is taken up beside where the track was drawn', () => {
        const course = plotCourse({ ...PATROL, speed: undefined, position: [-179.99, 0] }, { lng: 179.99, lat: 0 }, PACE)
        expect(course.from[0]).toBeCloseTo(180.01, 9)
        expect(courseAt(course, 0).lng).toBeCloseTo(179.99, 6)
        expect(courseAt(course, 300).lng).toBeGreaterThan(179.99)
        expect(courseAt(course, 300).lng).toBeLessThan(180.01)
        expect(courseAt(course, 600).lng).toBeCloseTo(180.01, 9)
    })

    test('a track moved on over the antimeridian keeps its longitude running on', () => {
        const course = plotCourse({ ...PATROL, position: [179.999, 0], speed: 1_000 }, null, PACE)
        expect(courseAt(course, 10_000).lng).toBeGreaterThan(180)
        expect(courseAt(course, 10_000).lng).toBeLessThan(180.2)
    })

    test('a trail and its head run on across the antimeridian without turning back round the world', () => {
        const { trails, heads } = trackData([
            {
                ...HARBOR_PILOT,
                position: [-179.7, 0],
                trail: [
                    [179.9, 0],
                    [-179.9, 0],
                    [-179.8, 0],
                ],
            },
        ])
        const longitudes = (feature: (typeof trails.collection.features)[number]) =>
            (feature.geometry as { coordinates: number[][] }).coordinates.map(([lng]) => Math.round(lng * 10) / 10)
        expect(longitudes(trails.collection.features[0])).toEqual([179.9, 180.1, 180.2])
        expect(longitudes(heads.collection.features[0])).toEqual([180.2, 180.3])
    })

    test('a track moved on by a pole goes over it, never past 90 degrees', () => {
        const course = plotCourse({ ...PATROL, position: [0, 89.99], heading: 0 }, null, PACE)
        const over = courseAt(course, 60_000)
        expect(over.lat).toBeLessThanOrEqual(90)
        expect(distance([0, 89.99], [over.lng, over.lat])).toBeCloseTo(6_000, 0)
        // Over the pole it comes down the far meridian.
        expect(Math.abs(over.lng)).toBeCloseTo(180, 6)
    })

    test('a satellite far north goes its distance along its heading', () => {
        const course = plotCourse({ ...PATROL, position: [20, 80], heading: 90, speed: 7_500 }, null, PACE)
        const on = courseAt(course, 60_000)
        expect(distance([20, 80], [on.lng, on.lat])).toBeCloseTo(450_000, 0)
    })
})

describe('scaling with the zoom', () => {
    test('draws a symbol at its size at zoom 6, smaller far out and larger close in, never past its ends', () => {
        expect(trackScale(6)).toBe(1)
        expect(trackScale(0)).toBe(0.72)
        expect(trackScale(3)).toBe(0.72)
        expect(trackScale(4.5)).toBeCloseTo(0.86, 9)
        expect(trackScale(8.5)).toBeCloseTo(1.125, 9)
        expect(trackScale(11)).toBe(1.25)
        expect(trackScale(18)).toBe(1.25)
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
    const point = (key: string, x: number, y: number) => ({ key, x, y, text: 'Pilot 2' })

    test('keeps every label that stands clear', () => {
        expect(placeLabels([point('a', 0, 0), point('b', 0, 100)], null, 24).map((each) => each.key)).toEqual(['a', 'b'])
    })

    test('drops a label that would cover another, or another track', () => {
        expect(placeLabels([point('a', 0, 0), point('b', 10, 4)], null, 24).map((each) => each.key)).toEqual(['a'])
        expect(placeLabels([point('a', 0, 0), point('b', 40, 0)], null, 24).map((each) => each.key)).toEqual(['b'])
    })

    test('places the label of the selected track first, whatever it covers', () => {
        expect(placeLabels([point('a', 0, 0), point('b', 10, 4)], 'b', 24).map((each) => each.key)).toEqual(['b'])
    })

    test("leaves out a label whose far end is off the ground, past a globe's rim, the selected track's excepted", () => {
        const onGround = (x: number) => x < 300
        const points = [point('a', 0, 0), point('b', 280, 100)]
        expect(placeLabels(points, null, 24, onGround).map((point) => point.key)).toEqual(['a'])
        expect(placeLabels(points, 'b', 24, onGround).map((point) => point.key)).toEqual(['b', 'a'])
    })
})
