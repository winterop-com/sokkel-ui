// @vitest-environment happy-dom
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { roll, zoomedByHand, type Roll, type RollMap } from './globe'
import { useProjectedPoints, useRenderedPoints, type PlacedText } from './layer'

/** A map that keeps what a roll asks of it, and fires what the test has it fire. */
function fakeMap() {
    const handlers = new Map<string, Set<(event: object) => void>>()
    const told: string[] = []
    const eased: { zoom: number; duration: number }[] = []
    let moving = false
    let stopped = 0
    const map: RollMap = {
        easeTo: ({ zoom, duration }) => {
            eased.push({ zoom, duration })
            moving = true
        },
        stop: () => {
            stopped += 1
            moving = false
        },
        isMoving: () => moving,
        fire: (type) => told.push(type),
        on: (type, handler) => handlers.set(type, (handlers.get(type) ?? new Set()).add(handler)),
        off: (type, handler) => handlers.get(type)?.delete(handler),
    }
    return {
        map,
        told,
        eased,
        stops: () => stopped,
        setMoving: (value: boolean) => (moving = value),
        fire: (type: string, event: object = {}) => {
            for (const handler of Array.from(handlers.get(type) ?? [])) handler(event)
        },
        listening: () => [...handlers.values()].reduce((sum, set) => sum + set.size, 0),
    }
}

/** A roll that keeps what it was asked to draw. */
function rolling(overrides: Partial<Roll> = {}) {
    const bent: number[] = []
    const veiled: boolean[] = []
    let settled = 0
    const options: Roll = {
        from: 0,
        to: 1,
        length: 1000,
        zoom: null,
        easing: (share) => share,
        bend: (share) => bent.push(share),
        settle: () => (settled += 1),
        veil: (hidden) => veiled.push(hidden),
        ...overrides,
    }
    return { options, bent, veiled, settled: () => settled }
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
})
afterEach(() => {
    vi.useRealTimers()
})

describe('a roll between the flat map and the globe', () => {
    test('bends the map a frame at a time, telling each as a move, and ends settled with the end of a move', () => {
        const fake = fakeMap()
        const { options, bent, veiled, settled } = rolling()
        roll(fake.map, options)
        expect(veiled).toEqual([true])
        vi.advanceTimersByTime(500)
        expect(bent.length).toBeGreaterThan(10)
        expect(bent.at(-1)).toBeGreaterThan(0.4)
        expect(bent.at(-1)).toBeLessThan(0.6)
        expect(settled()).toBe(0)
        expect(fake.told).not.toContain('moveend')
        vi.advanceTimersByTime(600)
        expect(settled()).toBe(1)
        expect(fake.told.slice(-2)).toEqual(['move', 'moveend'])
        expect(veiled).toEqual([true, false])
        expect(fake.listening()).toBe(0)
    })

    test('eases the zoom along the way, and leaves the end of that movement for the map to tell', () => {
        const fake = fakeMap()
        const { options, settled } = rolling({ zoom: 1.5 })
        roll(fake.map, options)
        expect(fake.eased).toEqual([{ zoom: 1.5, duration: 1000 }])
        vi.advanceTimersByTime(1100)
        expect(settled()).toBe(1)
        expect(fake.told).not.toContain('moveend')
    })

    test('stops the zoom it was easing when it is called off, as a roll turned round is', () => {
        const fake = fakeMap()
        const { options, bent, settled } = rolling({ zoom: 1.5 })
        const cancel = roll(fake.map, options)
        vi.advanceTimersByTime(300)
        const drawn = bent.length
        cancel()
        expect(fake.stops()).toBe(1)
        vi.advanceTimersByTime(1000)
        expect(bent.length).toBe(drawn)
        expect(settled()).toBe(0)
        expect(fake.told).not.toContain('moveend')
        expect(fake.listening()).toBe(0)
    })

    test('stops nothing when its zoom has come to rest already, or it eased none', () => {
        const plain = fakeMap()
        roll(plain.map, rolling().options)()
        expect(plain.stops()).toBe(0)

        const fake = fakeMap()
        const cancel = roll(fake.map, rolling({ zoom: 1.5, length: 1000 }).options)
        vi.advanceTimersByTime(300)
        fake.setMoving(false)
        fake.fire('moveend')
        cancel()
        expect(fake.stops()).toBe(0)
    })

    test("ends at once in its final shape when the reader moves the map, without telling the end of the reader's move", () => {
        const fake = fakeMap()
        const { options, bent, veiled, settled } = rolling({ zoom: 1.5 })
        const cancel = roll(fake.map, options)
        vi.advanceTimersByTime(300)
        const drawn = bent.length
        // The reader's drag: the map is moving, and has stopped the easing itself.
        fake.setMoving(true)
        fake.fire('movestart', { originalEvent: { type: 'mousedown' } })
        expect(settled()).toBe(1)
        expect(veiled).toEqual([true, false])
        expect(fake.told.at(-1)).toBe('move')
        expect(fake.told).not.toContain('moveend')
        vi.advanceTimersByTime(1000)
        expect(bent.length).toBe(drawn)
        expect(settled()).toBe(1)
        cancel()
        expect(fake.stops()).toBe(0)
    })

    test('goes on through a movement no reader started, such as its own easing', () => {
        const fake = fakeMap()
        const { options, settled } = rolling({ zoom: 1.5 })
        roll(fake.map, options)
        fake.fire('movestart', {})
        vi.advanceTimersByTime(300)
        expect(settled()).toBe(0)
    })

    test('is done on the next frame when it takes no time, as under reduced motion', () => {
        const fake = fakeMap()
        const { options, bent, settled } = rolling({ length: 0 })
        roll(fake.map, options)
        expect(settled()).toBe(0)
        vi.advanceTimersByTime(20)
        expect(settled()).toBe(1)
        expect(bent).toEqual([])
        expect(fake.told).toEqual(['move', 'moveend'])
    })
})

describe('a zoom by the reader', () => {
    test('is the wheel, a double press, a key or two fingers', () => {
        expect(zoomedByHand({ type: 'wheel' })).toBe(true)
        expect(zoomedByHand({ type: 'dblclick' })).toBe(true)
        expect(zoomedByHand({ type: 'keydown' })).toBe(true)
        expect(zoomedByHand({ type: 'touchmove', touches: { length: 2 } })).toBe(true)
    })

    test('is not a drag, one finger, or a zoom nothing the reader did started', () => {
        expect(zoomedByHand({ type: 'mousemove' })).toBe(false)
        expect(zoomedByHand({ type: 'touchmove', touches: { length: 1 } })).toBe(false)
        expect(zoomedByHand(undefined)).toBe(false)
    })
})

/** A map that draws two points where the test says, for the hooks that measure what an overlay writes. */
function drawnMap() {
    const handlers = new Map<string, Set<() => void>>()
    let shift = 0
    const map = {
        on: (type: string, handler: () => void) => handlers.set(type, (handlers.get(type) ?? new Set()).add(handler)),
        off: (type: string, handler: () => void) => handlers.get(type)?.delete(handler),
        getLayer: () => ({}),
        getContainer: () => ({ clientWidth: 1000, clientHeight: 800 }),
        getCenter: () => ({ lng: 0, lat: 0 }),
        project: ([lng, lat]: [number, number]) => ({ x: lng * 10 + shift, y: lat * 10 }),
        // The far side of a globe: a place east of 90 reads back as another place.
        unproject: ([x, y]: [number, number]) => ({ lng: (x - shift) / 10 > 90 ? 0 : (x - shift) / 10, lat: y / 10 }),
        queryRenderedFeatures: () => [
            { geometry: { type: 'Point', coordinates: [10, 20] }, properties: { name: 'Oslo' } },
            { geometry: { type: 'Point', coordinates: [120, 20] }, properties: { name: 'Tokyo' } },
        ],
    }
    return {
        map: map as unknown as MapLibreMap,
        pan: (by: number) => (shift = by),
        fire: (type: string) => {
            for (const handler of Array.from(handlers.get(type) ?? [])) handler()
        },
    }
}

const PLACES: PlacedText[] = [
    { key: 'oslo', at: [10, 20], text: 'Oslo' },
    { key: 'tokyo', at: [120, 20], text: 'Tokyo' },
]

function Drawn({ map }: { map: MapLibreMap }) {
    const points = useRenderedPoints(map, 'cities', true, (properties) => ({ key: String(properties.name), text: String(properties.name) }))
    return <p data-points="">{points.map((point) => `${point.text}@${String(point.x)}`).join(' ')}</p>
}

function Placed({ map }: { map: MapLibreMap }) {
    const points = useProjectedPoints(map, PLACES, true)
    return <p data-points="">{points.map((point) => `${point.text}@${String(point.x)}`).join(' ')}</p>
}

describe('what an overlay writes on the map', () => {
    /** A part drawn in the page; the first measure waits for a frame. */
    function draw(part: ReactElement) {
        const box = document.createElement('div')
        document.body.append(box)
        const root = createRoot(box)
        root.render(part)
        vi.advanceTimersByTime(0)
        return { text: () => box.querySelector('[data-points]')?.textContent ?? null, done: () => root.unmount() }
    }

    test.each([
        ['the points a layer draws', (map: MapLibreMap) => <Drawn map={map} />],
        ['the places a layer names', (map: MapLibreMap) => <Placed map={map} />],
    ])('is measured as the map draws a frame, and written out before the frame is over: %s', async (_, part) => {
        const fake = drawnMap()
        const drawn = draw(part(fake.map))
        await vi.waitFor(() => expect(drawn.text()).toBe(''))
        // Every frame of a flight: the map moves, draws, and what is written is on its place at once, no frame later.
        for (const shift of [5, 10, 15]) {
            fake.pan(shift)
            fake.fire('move')
            fake.fire('render')
            expect(drawn.text()).toBe(`Oslo@${String(100 + shift)}`)
        }
        drawn.done()
    })

    test('leaves out a place on the far side of a globe', async () => {
        const fake = drawnMap()
        const drawn = draw(<Placed map={fake.map} />)
        await vi.waitFor(() => expect(drawn.text()).toBe(''))
        fake.fire('render')
        expect(drawn.text()).toBe('Oslo@100')
        expect(drawn.text()).not.toContain('Tokyo')
        drawn.done()
    })
})
