import type { LngLat } from './geometry'

/** The earth's mean radius in meters, which the great-circle formulas here take as a sphere's. */
export const EARTH_RADIUS = 6_371_008.8

/** A unit distances are written in: kilometers, statute miles or nautical miles. */
export type DistanceUnit = 'km' | 'mi' | 'nmi'

/** How many meters one of each unit is. */
export const UNIT_METERS: Record<DistanceUnit, number> = { km: 1000, mi: 1609.344, nmi: 1852 }

const radians = (degrees: number) => (degrees * Math.PI) / 180
const degrees = (radians: number) => (radians * 180) / Math.PI

/** A bearing brought into 0 up to but not including 360 degrees. */
export function normalizeBearing(bearing: number): number {
    const turned = bearing % 360
    return turned < 0 ? turned + 360 : turned === 0 ? 0 : turned
}

/** A longitude brought into -180 to 180. */
function wrapLongitude(lng: number): number {
    return ((((lng + 180) % 360) + 360) % 360) - 180
}

/** The great-circle distance between two positions, in meters, by the haversine formula. */
export function distance(from: LngLat, to: LngLat): number {
    const [lng1, lat1] = [radians(from[0]), radians(from[1])]
    const [lng2, lat2] = [radians(to[0]), radians(to[1])]
    const h = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2
    return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** The initial bearing from one position toward another along the great circle, in degrees from north, 0 to 360. */
export function bearing(from: LngLat, to: LngLat): number {
    const [lng1, lat1] = [radians(from[0]), radians(from[1])]
    const [lng2, lat2] = [radians(to[0]), radians(to[1])]
    const y = Math.sin(lng2 - lng1) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1)
    return normalizeBearing(degrees(Math.atan2(y, x)))
}

/** The position reached by going a distance in meters from a position on a bearing in degrees, along the great circle. */
export function destination(from: LngLat, heading: number, meters: number): LngLat {
    const [lng1, lat1] = [radians(from[0]), radians(from[1])]
    const angle = meters / EARTH_RADIUS
    const theta = radians(heading)
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angle) + Math.cos(lat1) * Math.sin(angle) * Math.cos(theta))
    const lng2 = lng1 + Math.atan2(Math.sin(theta) * Math.sin(angle) * Math.cos(lat1), Math.cos(angle) - Math.sin(lat1) * Math.sin(lat2))
    return [wrapLongitude(degrees(lng2)), degrees(lat2)]
}

/**
 * The great circle between two positions as `steps` + 1 positions, both ends included, so a line
 * drawn through them follows the earth rather than the map's projection.
 */
export function greatCircle(from: LngLat, to: LngLat, steps = 32): LngLat[] {
    const meters = distance(from, to)
    if (meters === 0 || steps < 1) return [from, to]
    const [lng1, lat1] = [radians(from[0]), radians(from[1])]
    const [lng2, lat2] = [radians(to[0]), radians(to[1])]
    const angle = meters / EARTH_RADIUS
    const line: LngLat[] = [from]
    for (let step = 1; step < steps; step += 1) {
        const f = step / steps
        const a = Math.sin((1 - f) * angle) / Math.sin(angle)
        const b = Math.sin(f * angle) / Math.sin(angle)
        const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2)
        const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2)
        const z = a * Math.sin(lat1) + b * Math.sin(lat2)
        line.push([degrees(Math.atan2(y, x)), degrees(Math.atan2(z, Math.sqrt(x * x + y * y)))])
    }
    line.push(to)
    // Longitudes run on past 180 rather than jump back, so a line across the antimeridian stays whole.
    for (let index = 1; index < line.length; index += 1) {
        const previous = line[index - 1][0]
        let lng = line[index][0]
        while (lng - previous > 180) lng -= 360
        while (lng - previous < -180) lng += 360
        line[index] = [lng, line[index][1]]
    }
    return line
}

/** A distance in meters in a unit. */
export function inUnit(meters: number, unit: DistanceUnit): number {
    return meters / UNIT_METERS[unit]
}

/** How a unit is written after a number. */
export const UNIT_SYMBOLS: Record<DistanceUnit, string> = { km: 'km', mi: 'mi', nmi: 'NM' }

/**
 * A distance written in a unit and a locale: three significant figures below 100, whole above
 * (`4.27 km`, `38.1 km`, `412 km`), and whole meters for less than a kilometer.
 */
export function formatDistance(meters: number, unit: DistanceUnit = 'km', locale = 'en-US'): string {
    if (unit === 'km' && meters < 1000) {
        return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(meters)} m`
    }
    const value = inUnit(meters, unit)
    const digits = value < 10 ? 2 : value < 100 ? 1 : 0
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)} ${UNIT_SYMBOLS[unit]}`
}

/** A bearing written as whole degrees, three digits wide: `047°`. */
export function formatBearing(value: number): string {
    return `${String(Math.round(normalizeBearing(value)) % 360).padStart(3, '0')}°`
}

/** How a position is written: decimal degrees, or degrees, minutes and seconds. */
export type CoordinateFormat = 'decimal' | 'dms'

/** The letters a position's hemispheres are written with. */
export interface Hemispheres {
    north: string
    south: string
    east: string
    west: string
}

export const HEMISPHERES: Hemispheres = { north: 'N', south: 'S', east: 'E', west: 'W' }

function dms(value: number): string {
    const whole = Math.abs(value)
    let deg = Math.floor(whole)
    let min = Math.floor((whole - deg) * 60)
    let sec = Math.round(((whole - deg) * 60 - min) * 60)
    if (sec === 60) {
        sec = 0
        min += 1
    }
    if (min === 60) {
        min = 0
        deg += 1
    }
    return `${String(deg)}° ${String(min).padStart(2, '0')}′ ${String(sec).padStart(2, '0')}″`
}

/**
 * A position written latitude first, each with its hemisphere: `60.3913° N, 5.3221° E`, or in
 * degrees, minutes and seconds: `60° 23′ 29″ N, 5° 19′ 20″ E`.
 */
export function formatCoordinates(
    [lng, lat]: LngLat,
    format: CoordinateFormat = 'decimal',
    hemispheres: Hemispheres = HEMISPHERES,
    locale = 'en-US',
): string {
    const latLetter = lat < 0 ? hemispheres.south : hemispheres.north
    const lngLetter = lng < 0 ? hemispheres.west : hemispheres.east
    if (format === 'dms') return `${dms(lat)} ${latLetter}, ${dms(lng)} ${lngLetter}`
    const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
    return `${number.format(Math.abs(lat))}° ${latLetter}, ${number.format(Math.abs(lng))}° ${lngLetter}`
}

/**
 * The position written as "lat, lon" in decimal degrees (`60.39, 5.32`, `-33.9 18.4`), each part
 * optionally carrying its hemisphere letter (`60.39 N, 5.32 E`); null when it does not read as one.
 */
export function parseCoordinates(text: string): LngLat | null {
    const parts = text
        .trim()
        .split(/\s*[,;]\s*|\s+(?=[-+]?\d)/)
        .filter((part) => part !== '')
    if (parts.length !== 2) return null
    const read = (part: string, positive: string, negative: string): number | null => {
        const match = /^([-+]?\d+(?:\.\d+)?)\s*°?\s*([A-Za-z])?$/.exec(part)
        if (match === null) return null
        const value = Number(match[1])
        const letter = match[2]?.toUpperCase()
        if (letter === undefined) return value
        if (letter === positive) return value
        if (letter === negative) return -Math.abs(value)
        return null
    }
    const lat = read(parts[0], 'N', 'S')
    const lng = read(parts[1], 'E', 'W')
    if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
    return [lng, lat]
}

/**
 * A round length for a scale bar no longer than `maxMeters`: 1, 2 or 5 times a power of ten, in
 * the unit's own measure, given back in meters with what it is in the unit.
 */
export function roundScale(maxMeters: number, unit: DistanceUnit = 'km'): { meters: number; value: number; small: boolean } {
    const small = unit === 'km' && maxMeters < 1000
    const per = small ? 1 : UNIT_METERS[unit]
    const most = maxMeters / per
    if (!(most > 0) || !Number.isFinite(most)) return { meters: 0, value: 0, small }
    const power = 10 ** Math.floor(Math.log10(most))
    const step = [5, 2, 1].map((each) => each * power).find((each) => each <= most) ?? power
    return { meters: step * per, value: step, small }
}
