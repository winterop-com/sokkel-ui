import type { TreeNode } from '@winterop-com/sokkel-ui/Tree'
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson'

import placeData from './geo/sierra-leone-places.json'
import regionData from './geo/sierra-leone-regions.json'

/** The country's regions, each a boundary. */
export const regions = regionData as unknown as FeatureCollection<Polygon | MultiPolygon, { name: string }>

/** One site whose position came back unreadable, as data from the field sometimes does. */
const UNPLACED: Feature<Point, { name: string; region: string }> = {
    type: 'Feature',
    id: 'bo/gerihun',
    properties: { name: 'Gerihun', region: 'bo' },
    geometry: { type: 'Point', coordinates: [Number.NaN, 7.9] },
}

/** The sites records are made at, each in a region, one of them with no position that can be read. */
export const sites: FeatureCollection<Point, { name: string; region: string }> = {
    type: 'FeatureCollection',
    features: [...(placeData as unknown as FeatureCollection<Point, { name: string; region: string }>).features, UNPLACED],
}

export const COUNTRY = 'sierra-leone'
export const COUNTRY_NAME = 'Sierra Leone'

export type Level = 'country' | 'region' | 'site'

/** A place in the hierarchy: the country, a region or a site. */
export interface Place {
    id: string
    name: string
    level: Level
    /** The region a site is in, or the country a region is in. */
    parent: string | null
    /** A site's position as longitude and latitude, null where it cannot be read. */
    position: [number, number] | null
}

export const LEVEL_LABEL: Record<Level, string> = { country: 'Country', region: 'Region', site: 'Site' }

const regionName: Record<string, string> = Object.fromEntries(regions.features.map((region) => [String(region.id), region.properties.name]))

export const PLACES: Place[] = [
    { id: COUNTRY, name: COUNTRY_NAME, level: 'country', parent: null, position: null },
    ...regions.features
        .map((region): Place => ({ id: String(region.id), name: region.properties.name, level: 'region', parent: COUNTRY, position: null }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    ...sites.features
        .map((site): Place => ({
            id: String(site.id),
            name: site.properties.name,
            level: 'site',
            parent: site.properties.region,
            position: site.geometry.coordinates.every(Number.isFinite)
                ? [site.geometry.coordinates[0], site.geometry.coordinates[1]]
                : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
]

const BY_ID = new Map(PLACES.map((place) => [place.id, place]))

export function placeOf(id: string | null | undefined): Place | undefined {
    return id === null || id === undefined ? undefined : BY_ID.get(id)
}

/** A place's name, or its id when no place has it. */
export function placeName(id: string | null | undefined): string {
    return placeOf(id)?.name ?? id ?? ''
}

export function childrenOf(id: string): Place[] {
    return PLACES.filter((place) => place.parent === id)
}

/** The places from the country down to this one. */
export function pathOf(id: string): Place[] {
    const path: Place[] = []
    let at = placeOf(id)
    while (at !== undefined) {
        path.unshift(at)
        at = placeOf(at.parent)
    }
    return path
}

/** Every place under one, at any depth. */
export function under(id: string): Place[] {
    return childrenOf(id).flatMap((child) => [child, ...under(child.id)])
}

export function regionNameOf(id: string): string {
    return regionName[id] ?? id
}

/** The hierarchy as tree nodes, each with its level beside its name. */
export const PLACE_TREE: TreeNode[] = [
    {
        id: COUNTRY,
        label: COUNTRY_NAME,
        meta: LEVEL_LABEL.country,
        children: childrenOf(COUNTRY).map((region) => ({
            id: region.id,
            label: region.name,
            meta: LEVEL_LABEL.region,
            children: childrenOf(region.id).map((site) => ({ id: site.id, label: site.name, meta: LEVEL_LABEL.site })),
        })),
    },
]

/** Only the sites, under their regions, for a form reported from a site. */
export const SITE_TREE: TreeNode[] = PLACE_TREE[0].children?.map((region) => ({ ...region })) ?? []

/** A number from 0 to 1 that is always the same for the same text. */
export function hashed(text: string): number {
    let hash = 2166136261
    for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619) >>> 0
    return hash / 0xffffffff
}

/** The height of a site's bank above the gauge's zero, in meters, the same every time. */
export function bankHeight(siteId: string): number {
    return Math.round((2.4 + hashed(`${siteId}:bank`) * 2.2) * 100) / 100
}
