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

/** The extent of the features whose ids are given, or null when none of them has coordinates. */
export function boundsOfIds(collection: FeatureCollection, ids: Iterable<string>): Bounds | null {
    const wanted = new Set(ids)
    const features = collection.features.filter((feature) => feature.id !== undefined && wanted.has(String(feature.id)))
    return boundsOf([{ type: 'FeatureCollection', features }])
}

function isPosition(value: unknown): boolean {
    if (!Array.isArray(value) || value.length < 2) return false
    const [lng, lat] = value as unknown[]
    return typeof lng === 'number' && typeof lat === 'number' && Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lat) <= 90
}

function isLine(value: unknown, least: number): boolean {
    return Array.isArray(value) && value.length >= least && value.every(isPosition)
}

function isPolygon(value: unknown): boolean {
    return Array.isArray(value) && value.length > 0 && value.every((ring) => isLine(ring, 4))
}

/**
 * Whether a geometry can be drawn: a known type whose positions are finite numbers with a latitude
 * a map has, whose lines have two positions and whose rings four. A missing geometry is a feature
 * with no place, not one that cannot be read.
 */
export function isReadable(geometry: Geometry | null | undefined): boolean {
    if (geometry === null || geometry === undefined) return true
    const shape = geometry as { type?: unknown; coordinates?: unknown; geometries?: unknown }
    const coordinates = shape.coordinates
    switch (shape.type) {
        case 'Point':
            return isPosition(coordinates)
        case 'MultiPoint':
            return isLine(coordinates, 1)
        case 'LineString':
            return isLine(coordinates, 2)
        case 'MultiLineString':
            return Array.isArray(coordinates) && coordinates.every((line) => isLine(line, 2))
        case 'Polygon':
            return isPolygon(coordinates)
        case 'MultiPolygon':
            return Array.isArray(coordinates) && coordinates.length > 0 && coordinates.every(isPolygon)
        case 'GeometryCollection':
            return Array.isArray(shape.geometries) && (shape.geometries as Geometry[]).every((part) => part !== null && isReadable(part))
        default:
            return false
    }
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

/** How long a line is, in degrees. */
function lineLength(line: Position[]): number {
    let length = 0
    for (let index = 1; index < line.length; index += 1) {
        length += Math.hypot(line[index][0] - line[index - 1][0], line[index][1] - line[index - 1][1])
    }
    return length
}

/** The spot halfway along a line. */
function lineMiddle(line: Position[]): LngLat {
    let left = lineLength(line) / 2
    for (let index = 1; index < line.length; index += 1) {
        const [ax, ay] = line[index - 1]
        const [bx, by] = line[index]
        const step = Math.hypot(bx - ax, by - ay)
        if (step >= left && step > 0) return [ax + ((bx - ax) * left) / step, ay + ((by - ay) * left) / step]
        left -= step
    }
    return [line[0][0], line[0][1]]
}

/**
 * Where a popup about a feature points: a point's own position, a spot inside the largest
 * part of a polygon, near its centroid, or halfway along the longest part of a line.
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
    if (geometry.type === 'LineString') return lineMiddle(geometry.coordinates)
    if (geometry.type === 'MultiLineString' && geometry.coordinates.length > 0) {
        return lineMiddle(geometry.coordinates.reduce((best, line) => (lineLength(line) > lineLength(best) ? line : best)))
    }
    const extent = boundsOf([{ type: 'FeatureCollection', features: [feature] }])
    return extent === null ? null : [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2]
}

/** What a geometry is drawn as: a filled and outlined area, a line, or a point. */
export type GeometryKind = 'area' | 'line' | 'point'

/** The order a map draws the kinds in, bottom first, so lines lie over areas and points over both. */
export const GEOMETRY_KINDS: readonly GeometryKind[] = ['area', 'line', 'point']

/** What a single geometry is drawn as, or null for no geometry and for a collection of several. */
export function kindOf(geometry: Geometry | null): GeometryKind | null {
    switch (geometry?.type) {
        case 'Polygon':
        case 'MultiPolygon':
            return 'area'
        case 'LineString':
        case 'MultiLineString':
            return 'line'
        case 'Point':
        case 'MultiPoint':
            return 'point'
        default:
            return null
    }
}

/** One kind's part of a geometry, as `splitByKind` gives it. */
export interface GeometryPart {
    kind: GeometryKind
    geometry: Geometry
}

/**
 * A geometry split by what it is drawn as, one part per kind, in drawing order. A single geometry is
 * its own one part. A collection's members, nested collections included, are gathered by kind, and
 * several of a kind are joined into one multi geometry: points into a MultiPoint, lines into a
 * MultiLineString, areas into a MultiPolygon. No geometry, or an empty collection, has no parts.
 */
export function splitByKind(geometry: Geometry | null): GeometryPart[] {
    if (geometry === null) return []
    const kind = kindOf(geometry)
    if (kind !== null) return [{ kind, geometry }]
    const members: Record<GeometryKind, Geometry[]> = { area: [], line: [], point: [] }
    const gather = (part: Geometry) => {
        if (part.type === 'GeometryCollection') part.geometries.forEach(gather)
        else {
            const each = kindOf(part)
            if (each !== null) members[each].push(part)
        }
    }
    gather(geometry)
    return GEOMETRY_KINDS.flatMap((each): GeometryPart[] => {
        const found = members[each]
        if (found.length === 0) return []
        if (found.length === 1) return [{ kind: each, geometry: found[0] }]
        return [{ kind: each, geometry: joined(each, found) }]
    })
}

/** Several geometries of one kind as one multi geometry. */
function joined(kind: GeometryKind, parts: Geometry[]): Geometry {
    if (kind === 'point') {
        return {
            type: 'MultiPoint',
            coordinates: parts.flatMap((part) =>
                part.type === 'Point' ? [part.coordinates] : part.type === 'MultiPoint' ? part.coordinates : [],
            ),
        }
    }
    if (kind === 'line') {
        return {
            type: 'MultiLineString',
            coordinates: parts.flatMap((part) =>
                part.type === 'LineString' ? [part.coordinates] : part.type === 'MultiLineString' ? part.coordinates : [],
            ),
        }
    }
    return {
        type: 'MultiPolygon',
        coordinates: parts.flatMap((part) =>
            part.type === 'Polygon' ? [part.coordinates] : part.type === 'MultiPolygon' ? part.coordinates : [],
        ),
    }
}

/** The area of a polygon's or multipolygon's outer rings, in square degrees; zero for anything else. */
export function areaOf(feature: Feature): number {
    const geometry = feature.geometry
    if (geometry === null) return 0
    if (geometry.type === 'Polygon') return ringArea(geometry.coordinates[0])
    if (geometry.type === 'MultiPolygon') return geometry.coordinates.reduce((sum, polygon) => sum + ringArea(polygon[0]), 0)
    return 0
}

/** How far a point lies from the segment between two others, squared. */
function segmentDistance([x, y]: Position, [ax, ay]: Position, [bx, by]: Position): number {
    const dx = bx - ax
    const dy = by - ay
    const length = dx * dx + dy * dy
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length))
    const px = ax + t * dx - x
    const py = ay + t * dy - y
    return px * px + py * py
}

/** A line with every point closer than `tolerance` to the line through its neighbors dropped (Douglas-Peucker). */
export function simplifyLine(line: Position[], tolerance: number): Position[] {
    if (line.length <= 2 || tolerance <= 0) return line
    const keep = new Uint8Array(line.length)
    keep[0] = 1
    keep[line.length - 1] = 1
    const squared = tolerance * tolerance
    const stack: [number, number][] = [[0, line.length - 1]]
    while (stack.length > 0) {
        const [first, last] = stack.pop() as [number, number]
        let farthest = -1
        let distance = squared
        for (let index = first + 1; index < last; index += 1) {
            const away = segmentDistance(line[index], line[first], line[last])
            if (away > distance) {
                farthest = index
                distance = away
            }
        }
        if (farthest === -1) continue
        keep[farthest] = 1
        stack.push([first, farthest], [farthest, last])
    }
    return line.filter((_, index) => keep[index] === 1)
}

/** A ring simplified, or as it was when simplifying would leave it no area. */
function simplifyRing(ring: Position[], tolerance: number): Position[] {
    const simpler = simplifyLine(ring, tolerance)
    return simpler.length < 4 ? ring : simpler
}

/** A geometry with its lines and rings simplified to `tolerance` degrees; points stay as they are. */
export function simplifyGeometry(geometry: Geometry | null, tolerance: number): Geometry | null {
    if (geometry === null || tolerance <= 0) return geometry
    switch (geometry.type) {
        case 'LineString':
            return { ...geometry, coordinates: simplifyLine(geometry.coordinates, tolerance) }
        case 'MultiLineString':
            return { ...geometry, coordinates: geometry.coordinates.map((line) => simplifyLine(line, tolerance)) }
        case 'Polygon':
            return { ...geometry, coordinates: geometry.coordinates.map((ring) => simplifyRing(ring, tolerance)) }
        case 'MultiPolygon':
            return {
                ...geometry,
                coordinates: geometry.coordinates.map((polygon) => polygon.map((ring) => simplifyRing(ring, tolerance))),
            }
        case 'GeometryCollection':
            return { ...geometry, geometries: geometry.geometries.map((part) => simplifyGeometry(part, tolerance) ?? part) }
        default:
            return geometry
    }
}

/**
 * The tolerance `simplify: true` uses for a collection: none while its geometry is light, and a
 * five-thousandth of its extent's larger side once it holds more positions than a map draws smoothly.
 */
export function autoTolerance(collection: FeatureCollection, budget = 200_000): number {
    let count = 0
    for (const feature of collection.features) visit(feature.geometry, () => (count += 1))
    if (count <= budget) return 0
    const extent = boundsOf([collection])
    return extent === null ? 0 : Math.max(extent[2] - extent[0], extent[3] - extent[1]) / 5000
}
