import { describe, expect, it } from 'vitest'

import { BORDER_LAYER_ID, LAND_LAYER_ID, basemapKey, composeStyle, geometryStyle, hasTiles, LIGHT_BASEMAP } from './basemap'
import { countryFeatures } from './CountryLayer'
import { loadWorld, WORLD_BASEMAP } from './world'

describe('the world the package carries', () => {
    it('holds each country once, by its code and with its name', async () => {
        const world = await loadWorld()
        const ids = world.features.map((feature) => String(feature.id))
        expect(ids.length).toBeGreaterThan(170)
        expect(new Set(ids).size).toBe(ids.length)
        for (const id of ids) expect(id).toMatch(/^[A-Z]{3}$/)
        const byId = new Map(world.features.map((feature) => [String(feature.id), feature]))
        expect(byId.get('NOR')?.properties.name).toBe('Norway')
        expect(byId.get('FRA')?.properties.name).toBe('France')
        expect(byId.get('BRA')?.geometry.type).toMatch(/Polygon/)
    })

    it('is loaded once and shared', async () => {
        expect(await loadWorld()).toBe(await loadWorld())
    })
})

describe('countries with values', () => {
    const world = {
        type: 'FeatureCollection' as const,
        features: ['NOR', 'SWE', 'FIN'].map((id) => ({
            type: 'Feature' as const,
            id,
            properties: { name: id },
            geometry: { type: 'Point' as const, coordinates: [0, 0] },
        })),
    }

    it('carries each value to its country, and keeps the rest as no data', () => {
        const drawn = countryFeatures(world, { NOR: 4, SWE: null }, 'no-data')
        expect(drawn.features.map((feature) => [feature.id, feature.properties?.__value])).toEqual([
            ['NOR', 4],
            ['SWE', null],
            ['FIN', undefined],
        ])
    })

    it('leaves out the countries with no value when they are hidden', () => {
        expect(countryFeatures(world, { NOR: 4, SWE: null }, 'hidden').features.map((feature) => feature.id)).toEqual(['NOR'])
    })
})

describe('a basemap drawn from geometry', () => {
    it('reaches no network and is told apart from the others by its key', () => {
        expect(hasTiles(WORLD_BASEMAP)).toBe(false)
        expect(basemapKey(WORLD_BASEMAP)).toBe('geometry:world')
        expect(basemapKey(LIGHT_BASEMAP)).toBe(LIGHT_BASEMAP.style)
    })

    it('draws land and borders under the map, replaced by the next basemap rather than carried', () => {
        const land = geometryStyle({ type: 'FeatureCollection', features: [] }, { land: 'rgb(1, 1, 1)', border: 'rgb(2, 2, 2)' })
        const options = { ground: 'white', ink: 'black', opacity: 1, visible: true }
        const drawn = composeStyle(land, undefined, options)
        expect(drawn.layers.map((layer) => layer.id)).toEqual(['wui-ground', LAND_LAYER_ID, BORDER_LAYER_ID, 'wui-veil'])
        const next = composeStyle({ version: 8, sources: {}, layers: [] }, drawn, options)
        expect(next.layers.map((layer) => layer.id)).toEqual(['wui-ground', 'wui-veil'])
        expect(Object.keys(next.sources)).toEqual([])
    })
})
