// @vitest-environment happy-dom
import type { Feature, FeatureCollection, LineString } from 'geojson'
import type { GeoJSONSourceDiff } from 'maplibre-gl'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ID_PROPERTY, MapContext, type MapContextValue } from './context'
import { labelRegistry } from './layer'
import { TrackLayer, type Track, type TrackLayerProps } from './TrackLayer'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

interface FakeLayer {
    id: string
    type: string
    source?: string
    paint?: Record<string, unknown>
    layout?: Record<string, unknown>
}

/**
 * A map that keeps what a layer gives it: its sources' data and every change to them, its style
 * layers and its feature states. It draws on the frame after it is told of a change, to its data,
 * its paint or a feature's state, and comes to rest, as a map does, unless `drawsItself` is turned
 * off, when it draws only as `draw` is called and rests only as `rest` is.
 */
function fakeMap() {
    const layers = new Map<string, FakeLayer>()
    const sources = new Map<string, FeatureCollection>()
    const told: Record<string, GeoJSONSourceDiff[]> = {}
    const states: { id: string; state: Record<string, number> }[] = []
    const heard = new Map<string, Set<() => void>>()
    const settings = { drawsItself: true, center: 0 }
    const forgotten: string[] = []
    const fire = (type: string) => {
        for (const handler of heard.get(type) ?? []) handler()
    }
    const draw = () => fire('render')
    const rest = () => fire('idle')
    let asked = false
    const repaint = () => {
        if (!settings.drawsItself || asked) return
        asked = true
        requestAnimationFrame(() => {
            asked = false
            draw()
            rest()
        })
    }
    const map = {
        on: (type: string, handler: () => void) => {
            heard.set(type, (heard.get(type) ?? new Set()).add(handler))
        },
        off: (type: string, handler: () => void) => heard.get(type)?.delete(handler),
        isSourceLoaded: () => true,
        isMoving: () => false,
        getCenter: () => ({ lng: settings.center, lat: 0 }),
        removeFeatureState: ({ id }: { id: string }) => forgotten.push(id),
        getZoom: () => 6,
        getContainer: () => document.body,
        project: ([lng, lat]: [number, number]) => ({ x: lng * 100, y: -lat * 100 }),
        unproject: ([x, y]: [number, number]) => ({ lng: x / 100, lat: -y / 100 }),
        addSource: (id: string, spec: { data: FeatureCollection }) => sources.set(id, spec.data),
        getSource: (id: string) =>
            sources.has(id)
                ? {
                      updateData: (diff: GeoJSONSourceDiff) => {
                          ;(told[id] ??= []).push(diff)
                          repaint()
                          return Promise.resolve()
                      },
                  }
                : undefined,
        removeSource: (id: string) => sources.delete(id),
        addLayer: (spec: FakeLayer) => layers.set(spec.id, spec),
        getLayer: (id: string) => layers.get(id),
        removeLayer: (id: string) => layers.delete(id),
        getLayersOrder: () => [...layers.keys()],
        setPaintProperty: (id: string, key: string, value: unknown) => {
            const layer = layers.get(id)
            if (layer !== undefined) layer.paint = { ...layer.paint, [key]: value }
            repaint()
        },
        setLayoutProperty: () => undefined,
        hasImage: () => true,
        updateImage: () => undefined,
        setFeatureState: ({ id }: { id: string }, state: Record<string, number>) => {
            states.push({ id, state })
            repaint()
        },
        queryRenderedFeatures: () => [],
    }
    return { map: map as unknown as MapContextValue['map'], layers, sources, told, states, forgotten, settings, draw, rest }
}

/** A patrol reported at 60 north, heading east at 100 meters a second: a pixel of this map every six seconds or so. */
const PATROL: Track = { id: 'patrol', position: [5, 60], heading: 90, speed: 100, affiliation: 'friend', kind: 'vessel', label: 'Patrol 7' }
const SURVEY: Track = { id: 'survey', position: [5.4, 60.2], affiliation: 'unknown', kind: 'aircraft' }

let root: Root | undefined
let host: HTMLElement | undefined
let fake = fakeMap()

/** Draws the layer over the fake map, or draws it again with other props. */
function draw(props: Partial<TrackLayerProps> & { tracks: readonly Track[] }, selected: string | null = null) {
    if (root === undefined) {
        host = document.createElement('div')
        document.body.append(host)
        root = createRoot(host)
    }
    const overlay = host as HTMLElement
    const value: MapContextValue = {
        map: fake.map,
        scope: overlay,
        overlay,
        corners: { 'top-left': overlay, 'top-right': overlay, 'bottom-left': overlay, 'bottom-right': overlay },
        dark: true,
        reading: 0,
        selected,
        select: () => undefined,
        register: () => () => undefined,
        holdCamera: () => undefined,
        takeClicks: () => undefined,
        labels: REGISTRY,
    }
    act(() =>
        root?.render(
            <MapContext.Provider value={value}>
                <TrackLayer id="watch" {...props} />
            </MapContext.Provider>,
        ),
    )
}
const REGISTRY = labelRegistry()

/** Lets the page's clock and its animation frames run on. */
const pass = (ms: number) => act(() => vi.advanceTimersByTime(ms))

const told = (source: string) => fake.told[`wui-${source}`] ?? []
const moved = (source: string) => told(source).flatMap((diff) => diff.update ?? [])
/** Where the map was last told a track's point is. */
function point(source: string, index = -1): number[] {
    const geometry = moved(source).at(index)?.newGeometry
    if (geometry?.type !== 'Point') throw new Error(`${source} was told of no point`)
    return geometry.coordinates
}
/** The line the map was last told of in a source. */
function line(source: string): number[][] {
    const geometry = moved(source).at(-1)?.newGeometry
    if (geometry?.type !== 'LineString') throw new Error(`${source} was told of no line`)
    return geometry.coordinates
}
/** The feature states the layer's light has set: a halo's breath and a ripple's spread. */
const lit = () => fake.states.filter((entry) => 'breath' in entry.state || 'ripple' in entry.state)

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    fake = fakeMap()
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
    document.documentElement.removeAttribute('data-motion')
    vi.useRealTimers()
})

describe('a track layer on a map', () => {
    it('fills its sources with the tracks as reported, and tells them nothing while the tracks stand', () => {
        draw({ tracks: [SURVEY, { ...PATROL, speed: undefined }] })
        pass(3_000)
        expect(fake.sources.get('wui-watch')?.features).toHaveLength(2)
        expect(told('watch')).toEqual([])
    })

    it('moves a track with a speed on along its heading, telling the map only once it has moved far enough to see', () => {
        draw({ tracks: [PATROL, SURVEY] })
        pass(1_000)
        expect(told('watch')).toEqual([])
        pass(1_000)
        const changes = moved('watch')
        expect(changes).toHaveLength(1)
        expect(changes[0].id).toBe('patrol')
        const [lng, lat] = point('watch')
        expect(lng).toBeGreaterThan(5.002)
        expect(lng).toBeLessThan(5.004)
        expect(lat).toBeCloseTo(60, 6)
    })

    /** A track fast enough to move far enough to see on every frame. */
    const RACER: Track = { ...PATROL, speed: 30_000 }

    it('tells the map of the next moves only once it has drawn the last', () => {
        fake.settings.drawsItself = false
        draw({ tracks: [RACER] })
        pass(100)
        expect(told('watch')).toHaveLength(1)
        act(() => fake.draw())
        pass(16)
        expect(told('watch')).toHaveLength(2)
        // A map that never draws does not hold the tracks for good: the layer goes on after a second.
        pass(900)
        expect(told('watch')).toHaveLength(2)
        pass(200)
        expect(told('watch')).toHaveLength(3)
    })

    it('lets a map whose tracks never stop come to rest, and stay so for a frame, before it tells it more', () => {
        fake.settings.drawsItself = false
        draw({ tracks: [RACER] })
        // A quarter of a second on, the map has not rested since the layer began: it is let rest once it has drawn.
        pass(300)
        expect(told('watch')).toHaveLength(1)
        act(() => fake.draw())
        pass(48)
        expect(told('watch')).toHaveLength(1)
        act(() => fake.rest())
        pass(16)
        expect(told('watch')).toHaveLength(1)
        pass(16)
        expect(told('watch')).toHaveLength(2)
        // It has just rested, so the next moves follow its drawing at once.
        act(() => fake.draw())
        pass(16)
        expect(told('watch')).toHaveLength(3)
    })

    it('goes on when the map draws on without coming to rest, or neither draws nor rests', () => {
        fake.settings.drawsItself = false
        draw({ tracks: [RACER] })
        pass(300)
        act(() => fake.draw())
        // Six frames drawn and no rest yet: it waits. A seventh, and it goes on.
        for (let frame = 0; frame < 6; frame += 1) act(() => fake.draw())
        pass(16)
        expect(told('watch')).toHaveLength(1)
        act(() => fake.draw())
        pass(16)
        expect(told('watch')).toHaveLength(2)
        // It does not ask the map to rest again at once: the next moves follow its drawing.
        act(() => fake.draw())
        pass(16)
        expect(told('watch')).toHaveLength(3)
        // A second later it asks again, and goes on after half a second in which the map does nothing.
        pass(980)
        act(() => fake.draw())
        pass(480)
        expect(told('watch')).toHaveLength(3)
        pass(48)
        expect(told('watch')).toHaveLength(4)
    })

    it('tells the map what a report changed at once, whatever it has yet to draw', () => {
        fake.settings.drawsItself = false
        draw({ tracks: [RACER] })
        pass(100)
        expect(told('watch')).toHaveLength(1)
        draw({ tracks: [RACER, SURVEY] })
        expect(told('watch').flatMap((diff) => diff.add ?? [])).toHaveLength(1)
    })

    it('leaves every track where it was reported with the motion off', () => {
        draw({ tracks: [PATROL], motion: false })
        pass(5_000)
        expect(told('watch')).toEqual([])
    })

    it('stops a track once it has gone on for as long as it may', () => {
        draw({ tracks: [PATROL], motion: { coast: 3_000 } })
        pass(10_000)
        // Three seconds at 100 meters a second, where a degree of longitude is some 55.6 km.
        expect(point('watch')[0]).toBeCloseTo(5 + 300 / 55_597, 4)
    })

    it('adds a track that turns up, in a ripple, and takes away one that is gone', () => {
        draw({ tracks: [SURVEY] })
        draw({ tracks: [SURVEY, PATROL] })
        const added = told('watch').flatMap((diff) => diff.add ?? [])
        expect(added.map((feature) => feature.properties?.[ID_PROPERTY])).toEqual(['patrol'])
        pass(100)
        const ripples = fake.states.filter((entry) => entry.id === 'patrol' && 'ripple' in entry.state)
        expect(ripples.length).toBeGreaterThan(0)
        expect(ripples[0].state.ripple).toBeLessThan(0.2)
        pass(2_000)
        expect(fake.states.filter((entry) => 'ripple' in entry.state).at(-1)?.state.ripple).toBe(1)
        draw({ tracks: [SURVEY] })
        expect(told('watch').flatMap((diff) => diff.remove ?? [])).toEqual(['patrol'])
    })

    it('draws the tracks it starts with without a ripple, and none with the ripple off', () => {
        draw({ tracks: [SURVEY], effects: { ripple: false } })
        draw({ tracks: [SURVEY, PATROL], effects: { ripple: false } })
        pass(500)
        expect(fake.states.filter((entry) => 'ripple' in entry.state)).toEqual([])
    })

    it('tells a change of what a track is as a change of its properties alone', () => {
        const still = { ...PATROL, speed: undefined }
        draw({ tracks: [still] })
        draw({ tracks: [{ ...still, affiliation: 'hostile', label: 'Contact 14' }] })
        expect(moved('watch')).toEqual([
            {
                id: 'patrol',
                addOrUpdateProperties: [
                    { key: 'affiliation', value: 'hostile' },
                    { key: 'label', value: 'Contact 14' },
                ],
            },
        ])
    })

    it('glides a track that is not moved on to where it is reported, and at once with no time to glide', () => {
        const still: Track = { ...PATROL, speed: undefined }
        draw({ tracks: [still] })
        draw({ tracks: [{ ...still, position: [5.2, 60] }] })
        pass(300)
        expect(point('watch')[0]).toBeGreaterThan(5.1)
        expect(point('watch')[0]).toBeLessThan(5.2)
        pass(400)
        expect(point('watch')[0]).toBeCloseTo(5.2, 9)

        draw({ tracks: [{ ...still, position: [5.6, 60] }], transition: 0 })
        expect(point('watch')).toEqual([5.6, 60])
    })

    it('with motion reduced, draws each report where it says at once and never moves a track on', () => {
        document.documentElement.setAttribute('data-motion', 'off')
        draw({ tracks: [PATROL] }, 'patrol')
        pass(3_000)
        expect(told('watch')).toEqual([])
        expect(lit()).toEqual([])
        draw(
            {
                tracks: [
                    { ...PATROL, position: [5.3, 60.1] },
                    { ...SURVEY, affiliation: 'hostile' },
                ],
            },
            'patrol',
        )
        expect(point('watch', 0)).toEqual([5.3, 60.1])
        pass(3_000)
        expect(moved('watch')).toHaveLength(1)
        expect(lit()).toEqual([])
        expect(fake.layers.get('wui-watch-pulse')?.paint?.['circle-opacity']).toBe(0)
    })

    it('breathes a halo round the selected track, and pulses under a hostile one', () => {
        const still = { ...PATROL, speed: undefined }
        draw({ tracks: [still, { ...SURVEY, affiliation: 'hostile' }] }, 'patrol')
        pass(800)
        const breaths = fake.states.filter((entry) => entry.id === 'patrol' && 'breath' in entry.state).map((entry) => entry.state.breath)
        expect(breaths.length).toBeGreaterThan(10)
        expect(Math.max(...breaths)).toBeGreaterThan(Math.min(...breaths))
        expect(Number(fake.layers.get('wui-watch-pulse')?.paint?.['circle-opacity'])).toBeGreaterThan(0)
        // The halo and the pulse are light alone: the sources are told nothing.
        expect(told('watch')).toEqual([])
    })

    it('steps the pulse only once the map has drawn two frames since its last step, so a frame between two steps is clean', () => {
        fake.settings.drawsItself = false
        draw({ tracks: [{ ...SURVEY, affiliation: 'hostile' }] })
        const opacity = () => fake.layers.get('wui-watch-pulse')?.paint?.['circle-opacity']
        // The pulse starts from nothing as the layer does; two frames drawn, and it takes its first step up.
        expect(opacity()).toBe(0)
        act(() => fake.draw())
        act(() => fake.draw())
        pass(100)
        const first = opacity()
        expect(Number(first)).toBeGreaterThan(0)
        // The map draws nothing: the pulse waits. One frame is not enough either.
        pass(200)
        expect(opacity()).toBe(first)
        act(() => fake.draw())
        pass(48)
        expect(opacity()).toBe(first)
        act(() => fake.draw())
        pass(48)
        expect(opacity()).not.toBe(first)
    })

    it("moves a trail's head with its track and leaves the trail itself until the next report", () => {
        const trail: [number, number][] = [
            [4.8, 60],
            [4.9, 60],
        ]
        draw({ tracks: [{ ...PATROL, trail }] })
        const lines = (source: string) =>
            (fake.sources.get(`wui-${source}`)?.features ?? []).map((feature: Feature) => (feature.geometry as LineString).coordinates)
        expect(lines('watch-trail')).toEqual([trail])
        expect(lines('watch-head')).toEqual([
            [
                [4.9, 60],
                [5, 60],
            ],
        ])
        pass(2_000)
        expect(told('watch-trail')).toEqual([])
        const head = line('watch-head')
        expect(head.slice(0, 2)).toEqual([
            [4.9, 60],
            [5, 60],
        ])
        expect(head[2][0]).toBeGreaterThan(5.002)

        // The next report has the trail run on through where the track was: the trail takes it, and the head starts there.
        draw({ tracks: [{ ...PATROL, position: [5.01, 60], trail: [...trail, [5, 60]] }] })
        expect(line('watch-trail')).toEqual([...trail, [5, 60]])
        expect(line('watch-head')[0]).toEqual([5, 60])
    })

    it('sets a trail again when it lost its oldest positions or one of them was corrected, though its end is the same', () => {
        const [a, b, c]: [number, number][] = [
            [4.7, 60],
            [4.8, 60],
            [4.9, 60],
        ]
        const still: Track = { ...PATROL, speed: undefined }
        draw({ tracks: [{ ...still, trail: [a, b, c] }] })
        draw({ tracks: [{ ...still, trail: [b, c] }] })
        expect(line('watch-trail')).toEqual([b, c])
        // A correction is set when the trails next take their positions, a frame or two on.
        draw({ tracks: [{ ...still, trail: [[4.75, 60.1], c] }] })
        pass(48)
        expect(line('watch-trail')).toEqual([[4.75, 60.1], c])
        // The same trail given again is the line the map holds, and is left alone.
        const told = moved('watch-trail').length
        draw({ tracks: [{ ...still, trail: [[4.75, 60.1], c] }] })
        pass(48)
        expect(moved('watch-trail')).toHaveLength(told)
    })

    it('forgets the feature state of a track that is gone, so one that comes back under its id starts clean', () => {
        draw({ tracks: [SURVEY] })
        draw({ tracks: [SURVEY, PATROL] })
        pass(100)
        expect(fake.forgotten).toEqual([])
        draw({ tracks: [SURVEY] })
        expect(fake.forgotten).toEqual(['patrol'])
    })

    it('writes a label in the copy of the world the camera looks at', () => {
        fake.settings.center = -179
        draw({ tracks: [{ ...PATROL, speed: undefined, position: [179.9, 0] }] })
        pass(100)
        const label = [...(host?.querySelectorAll('span') ?? [])].find((span) => span.textContent === 'Patrol 7')
        // 179.9 east is 180.1 west of the camera's world: a hundred pixels a degree, and the label 22 right of its track.
        expect(label?.style.left).toBe('-17988px')
    })
})
