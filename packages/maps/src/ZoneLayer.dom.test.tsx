// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

import { MapContext, type MapContextValue } from './context'
import { labelRegistry } from './layer'
import { ZoneLayer } from './ZoneLayer'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

/** A map that keeps its images and its style layers, and calls back on what it is listened for. */
function fakeMap() {
    const heard = new Map<string, Set<() => void>>()
    const images = new Set<string>()
    const map = {
        on: (type: string, handler: () => void) => heard.set(type, (heard.get(type) ?? new Set()).add(handler)),
        off: (type: string, handler: () => void) => heard.get(type)?.delete(handler),
        hasImage: (name: string) => images.has(name),
        addImage: (name: string) => images.add(name),
        updateImage: () => undefined,
        removeImage: (name: string) => images.delete(name),
        addSource: () => undefined,
        getSource: () => ({ setData: () => undefined }),
        removeSource: () => undefined,
        addLayer: () => undefined,
        getLayer: () => undefined,
        removeLayer: () => undefined,
        getLayersOrder: () => [],
        setLayoutProperty: () => undefined,
        setPaintProperty: () => undefined,
        setFeatureState: () => undefined,
        getZoom: () => 4,
        getCenter: () => ({ lng: 0, lat: 0 }),
        project: ([lng, lat]: [number, number]) => ({ x: lng, y: lat }),
        unproject: ([x, y]: [number, number]) => ({ lng: x, lat: y }),
        getContainer: () => document.body,
        queryRenderedFeatures: () => [],
    }
    const fire = (type: string) => {
        for (const handler of heard.get(type) ?? []) handler()
    }
    return { map: map as unknown as MapContextValue['map'], images, fire }
}

describe('a zone layer on a map whose style keeps changing', () => {
    it('draws its hatches once, and again only for one the style lost', () => {
        globalThis.IS_REACT_ACT_ENVIRONMENT = true
        const fake = fakeMap()
        const host = document.createElement('div')
        document.body.append(host)
        const value: MapContextValue = {
            map: fake.map,
            scope: host,
            overlay: host,
            corners: {
                'top-left': host,
                'top-right': host,
                'bottom-left': host,
                'bottom-right': host,
            },
            dark: true,
            reading: 0,
            selected: null,
            select: () => undefined,
            register: () => () => undefined,
            holdCamera: () => undefined,
            takeClicks: () => undefined,
            labels: labelRegistry(),
        }
        const drawn = { count: 0 }
        const create = document.createElement.bind(document)
        document.createElement = ((name: string) => {
            if (name === 'canvas') drawn.count += 1
            return create(name)
        }) as typeof document.createElement
        const root = createRoot(host)
        try {
            act(() =>
                root.render(
                    <MapContext.Provider value={value}>
                        <ZoneLayer
                            id="warned"
                            fill="hatched"
                            zones={[
                                {
                                    id: 'a',
                                    area: [
                                        [0, 0],
                                        [1, 0],
                                        [1, 1],
                                    ],
                                    tone: 'hostile',
                                },
                            ]}
                        />
                    </MapContext.Provider>,
                ),
            )
            const first = drawn.count
            expect(first).toBeGreaterThan(0)
            for (let change = 0; change < 50; change += 1) fake.fire('styledata')
            expect(drawn.count).toBe(first)
            const [lost] = [...fake.images]
            fake.images.delete(lost)
            fake.fire('styledata')
            expect(fake.images.has(lost)).toBe(true)
        } finally {
            document.createElement = create
            act(() => root.unmount())
            host.remove()
        }
    })
})
