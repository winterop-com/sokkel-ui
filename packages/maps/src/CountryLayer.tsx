'use client'

import type { FeatureCollection } from 'geojson'
import { useMemo } from 'react'

import { BoundaryLayer, type BoundaryLayerProps } from './BoundaryLayer'
import { useWorld } from './world'

export interface CountryLayerProps extends Omit<BoundaryLayerProps, 'data' | 'value' | 'idProperty'> {
    /** Each country's value by its code, `NOR` or `BRA`, as the geometry's feature ids name it. */
    values?: Readonly<Record<string, number | string | null | undefined>>
    /**
     * The countries, each feature's id its code: the world the package carries by default (see
     * `loadWorld`), fetched the first time a layer draws it, or the app's own, such as a finer one.
     */
    data?: FeatureCollection
    /** Countries with no value drawn hatched as having none (`no-data`), or left out so the basemap shows (`hidden`). */
    unvalued?: 'no-data' | 'hidden'
}

/** The property a country's value is kept under, for the scale. */
const VALUE = '__value'

/** The countries the layer draws, each with its value: every country, or only those with one. */
export function countryFeatures(
    world: FeatureCollection,
    values: Readonly<Record<string, number | string | null | undefined>>,
    unvalued: 'no-data' | 'hidden',
): FeatureCollection {
    const features = world.features.flatMap((feature) => {
        const value = feature.id === undefined ? undefined : values[String(feature.id)]
        if (unvalued === 'hidden' && (value === undefined || value === null)) return []
        return [{ ...feature, properties: { ...feature.properties, [VALUE]: value } }]
    })
    return { type: 'FeatureCollection', features }
}

/**
 * Countries filled by their value from a world geometry: a choropleth of the world, read from a
 * record of values by country code, drawn as `BoundaryLayer` draws areas (hatched where a country
 * has no value, outlined on hover, the selected country's id its code). Without `data` it draws the
 * world the package carries, which loads the first time a layer draws it, so a page with no
 * countries carries none of it. Without a scale the countries are drawn as plain boundaries.
 */
export function CountryLayer({ values = {}, data, unvalued = 'no-data', scale, ...layer }: CountryLayerProps) {
    const bundled = useWorld(data === undefined)
    const world = data ?? bundled
    const drawn = useMemo(() => (world === null ? null : countryFeatures(world, values, unvalued)), [world, values, unvalued])
    if (drawn === null) return null
    return <BoundaryLayer {...layer} data={drawn} scale={scale} value={scale === undefined ? undefined : VALUE} />
}
