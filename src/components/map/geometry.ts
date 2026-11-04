import type { Feature, FeatureCollection, Geometry, Position } from 'geojson'

/** West, south, east and north, in degrees. */
export type Bounds = [number, number, number, number]

/** A longitude and a latitude. */
export type LngLat = [number, number]

function visit(geometry: Geometry | null, each: (position: Position) => void): void {
    if (geometry === null) return
    switch (geometry.type) {
        case 'Point':
            each(geometry.coordinates)
            return
        case 'MultiPoint':
        case 'LineString':
            geometry.coordinates.forEach(each)
            return
        case 'MultiLineString':
        case 'Polygon':
            geometry.coordinates.forEach((line) => line.forEach(each))
            return
        case 'MultiPolygon':
            geometry.coordinates.forEach((polygon) => polygon.forEach((ring) => ring.forEach(each)))
            return
        case 'GeometryCollection':
            geometry.geometries.forEach((part) => visit(part, each))
    }
}

/** The extent of every feature in the collections, or null when none has coordinates. */
export function boundsOf(collections: readonly FeatureCollection[]): Bounds | null {
    let west = Infinity
    let south = Infinity
    let east = -Infinity
    let north = -Infinity
    for (const collection of collections) {
        for (const feature of collection.features) {
            visit(feature.geometry, ([lng, lat]) => {
                if (lng < west) west = lng
                if (lng > east) east = lng
                if (lat < south) south = lat
                if (lat > north) north = lat
            })
        }
    }
    return west === Infinity ? null : [west, south, east, north]
}

/** The union of extents, or null when there are none. */
export function unionBounds(extents: readonly (Bounds | null)[]): Bounds | null {
    const present = extents.filter((extent): extent is Bounds => extent !== null)
    if (present.length === 0) return null
    return [
        Math.min(...present.map((extent) => extent[0])),
        Math.min(...present.map((extent) => extent[1])),
        Math.max(...present.map((extent) => extent[2])),
        Math.max(...present.map((extent) => extent[3])),
    ]
}

function ringArea(ring: Position[]): number {
    let sum = 0
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
        sum += (ring[previous][0] - ring[index][0]) * (ring[previous][1] + ring[index][1])
    }
    return Math.abs(sum / 2)
}

function inside([x, y]: LngLat, polygon: Position[][]): boolean {
    let within = false
    for (const ring of polygon) {
        for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
            const [xi, yi] = ring[index]
            const [xj, yj] = ring[previous]
            if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) within = !within
        }
    }
    return within
}

/** The midpoint of the widest stretch of a polygon along one latitude, or null if it misses. */
function widestAcross(polygon: Position[][], y: number): LngLat | null {
    const crossings: number[] = []
    for (const ring of polygon) {
        for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
            const [xi, yi] = ring[index]
            const [xj, yj] = ring[previous]
            if (yi > y !== yj > y) crossings.push(((xj - xi) * (y - yi)) / (yj - yi) + xi)
        }
    }
    crossings.sort((a, b) => a - b)
    let best: LngLat | null = null
    let width = 0
    for (let index = 0; index + 1 < crossings.length; index += 2) {
        const span = crossings[index + 1] - crossings[index]
        if (span > width) {
            width = span
            best = [(crossings[index] + crossings[index + 1]) / 2, y]
        }
    }
    return best
}

function polygonAnchor(polygon: Position[][]): LngLat {
    const outer = polygon[0]
    let area = 0
    let cx = 0
    let cy = 0
    for (let index = 0, previous = outer.length - 1; index < outer.length; previous = index, index += 1) {
        const cross = outer[previous][0] * outer[index][1] - outer[index][0] * outer[previous][1]
        area += cross
        cx += (outer[previous][0] + outer[index][0]) * cross
        cy += (outer[previous][1] + outer[index][1]) * cross
    }
    const centroid: LngLat = area === 0 ? [outer[0][0], outer[0][1]] : [cx / (3 * area), cy / (3 * area)]
    if (inside(centroid, polygon)) return centroid
    return widestAcross(polygon, centroid[1]) ?? centroid
}

/**
 * Where a popup about a feature points: a point's own position, or a spot inside the largest
 * part of a polygon, near its centroid.
 */
export function anchorOf(feature: Feature): LngLat | null {
    const geometry = feature.geometry
    if (geometry === null) return null
    if (geometry.type === 'Point') return [geometry.coordinates[0], geometry.coordinates[1]]
    if (geometry.type === 'Polygon') return polygonAnchor(geometry.coordinates)
    if (geometry.type === 'MultiPolygon') {
        const largest = geometry.coordinates.reduce((best, polygon) => (ringArea(polygon[0]) > ringArea(best[0]) ? polygon : best))
        return polygonAnchor(largest)
    }
    const extent = boundsOf([{ type: 'FeatureCollection', features: [feature] }])
    return extent === null ? null : [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2]
}
