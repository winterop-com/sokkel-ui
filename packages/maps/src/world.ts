import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { useEffect, useState } from 'react'

import type { Basemap } from './basemap'

/** Countries as polygons, each feature's id its code and its `name` among its properties. */
export type WorldGeometry = FeatureCollection<Polygon | MultiPolygon, { name: string }>

let pending: Promise<WorldGeometry> | undefined
let world: WorldGeometry | undefined

/**
 * The world's countries the package carries: Natural Earth's 1:110m Admin 0 countries (public
 * domain), each feature's id its ISO 3166-1 alpha-3 code (`NOR`, `BRA`), or Natural Earth's own
 * code for a country with none (`KOS`), with its English `name`. Fetched the first time it is asked
 * for and shared after, so a page that never draws countries carries none of it. At this scale the
 * smallest countries, such as Singapore, are left out, and so is Antarctica, which Mercator stretches across the map.
 */
export function loadWorld(): Promise<WorldGeometry> {
    pending ??= import('./data/countries-110m.json').then(
        (module) => {
            world = module.default as WorldGeometry
            return world
        },
        (error: unknown) => {
            pending = undefined
            throw error
        },
    )
    return pending
}

/**
 * The bundled countries once they have arrived, fetched the first time a component asks while
 * `wanted`; null until then, and while not wanted.
 */
export function useWorld(wanted = true): WorldGeometry | null {
    const [arrived, setArrived] = useState<WorldGeometry | null>(world ?? null)
    useEffect(() => {
        if (arrived !== null || !wanted) return
        let live = true
        loadWorld().then(
            (next) => {
                if (live) setArrived(next)
            },
            (reason: unknown) => console.error('The world geometry could not be loaded.', reason),
        )
        return () => {
            live = false
        }
    }, [arrived, wanted])
    return wanted ? arrived : null
}

/**
 * The world's countries drawn as land in the token colors, with their borders, from the geometry
 * the package carries: a basemap with no tile server, which works offline. Give it to `MapView` as
 * `fallbackBasemap`, to draw when the street map cannot be fetched, or offer it as a basemap.
 */
export const WORLD_BASEMAP: Basemap = { id: 'world', name: 'World', geometry: loadWorld }
