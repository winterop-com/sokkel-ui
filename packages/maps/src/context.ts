import type { Feature } from 'geojson'
import type { Map as MapLibreMap, MapGeoJSONFeature } from 'maplibre-gl'
import { createContext, useContext } from 'react'

import type { Bounds } from './geometry'

/** A corner of the map, where controls, legends and other overlays stack. */
export type MapCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/** The feature property a layer stores each feature's id under, for feature state and hits. */
export const ID_PROPERTY = '__id'

/** What a layer tells the map about itself: what to query for hits, and what it draws. */
export interface MapLayerEntry {
    /** The source the layer's features live in, which hover and selection state is set on. */
    source: string
    /** The style layers a click or a hover is tested against. */
    hitLayers: string[]
    /** How far around the cursor a feature still counts as hit, in pixels. */
    tolerance: number
    /** The layer's own features by id, which is what selection reports back. */
    features: ReadonlyMap<string, Feature>
    /** The extent of what the layer draws, which the map fits to. */
    bounds: Bounds | null
    /** Takes a click on a feature the layer handles itself; true when it did. */
    click?: (feature: MapGeoJSONFeature) => boolean
}

export interface MapContextValue {
    map: MapLibreMap
    /** The element the map lives in: tokens are read in its scope, and overlays portal into it. */
    scope: HTMLElement
    /** The element popups and labels are positioned in, over the canvas. */
    overlay: HTMLElement
    corners: Record<MapCorner, HTMLElement>
    dark: boolean
    /** Advances whenever the theme changes, so a layer knows to resolve its colors again. */
    reading: number
    selected: string | null
    select: (id: string | null) => void
    register: (key: string, entry: MapLayerEntry) => () => void
}

export const MapContext = createContext<MapContextValue | null>(null)

/** The map a layer or overlay is inside; throws outside a `MapView`. */
export function useMapContext(): MapContextValue {
    const value = useContext(MapContext)
    if (value === null) throw new Error('A map layer or overlay must be rendered inside a MapView.')
    return value
}

/** The map an overlay is inside, or null outside a `MapView`. */
export function useOptionalMapContext(): MapContextValue | null {
    return useContext(MapContext)
}
