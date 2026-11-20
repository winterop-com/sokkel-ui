/**
 * The geodesy a tracking console needs: great-circle distance, bearing and destination on a sphere of
 * the Earth's mean radius, and positions as UTM and MGRS grid references on the WGS84 ellipsoid.
 * Points are `[lon, lat]` in degrees, as GeoJSON and the tracks' trails hold them.
 *
 * UTM is the transverse Mercator projection by Krüger's series to the sixth order (Karney 2011),
 * accurate to well under a millimeter within a zone. Zones follow the grid's exceptions: 32V is
 * widened over western Norway, and 31X, 33X, 35X and 37X stand in for the even zones over Svalbard.
 * The grids cover 80°S to 84°N; nearer the poles a reference is UPS, which this module does not give.
 */
import type { LonLat } from './track'

/** The Earth's mean radius in meters (IUGG), which the great-circle functions take as the sphere's. */
export const EARTH_RADIUS = 6371008.8

const RADIANS = Math.PI / 180
const DEGREES = 180 / Math.PI

/** Puts an angle in degrees into [0, 360). */
const circle = (degrees: number) => ((degrees % 360) + 360) % 360

/** The great-circle distance between two points, in meters. */
export function distance(from: LonLat, to: LonLat, radius = EARTH_RADIUS): number {
    const φ1 = from[1] * RADIANS
    const φ2 = to[1] * RADIANS
    const Δφ = φ2 - φ1
    const Δλ = (to[0] - from[0]) * RADIANS
    const h = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
    return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** The bearing to set out on from one point to reach another along a great circle, in degrees from true north. */
export function bearing(from: LonLat, to: LonLat): number {
    const φ1 = from[1] * RADIANS
    const φ2 = to[1] * RADIANS
    const Δλ = (to[0] - from[0]) * RADIANS
    const y = Math.sin(Δλ) * Math.cos(φ2)
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
    return circle(Math.atan2(y, x) * DEGREES)
}

/** Where a great circle leads from a point after a distance in meters on a bearing in degrees. */
export function destination(from: LonLat, bearingDegrees: number, meters: number, radius = EARTH_RADIUS): LonLat {
    const δ = meters / radius
    const θ = bearingDegrees * RADIANS
    const φ1 = from[1] * RADIANS
    const λ1 = from[0] * RADIANS
    const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
    const φ2 = Math.asin(Math.max(-1, Math.min(1, sinφ2)))
    const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * sinφ2)
    return [((((λ2 * DEGREES + 540) % 360) + 360) % 360) - 180, φ2 * DEGREES]
}

// WGS84, and the transverse Mercator series on it.
const A_AXIS = 6378137
const FLATTENING = 1 / 298.257223563
const K0 = 0.9996
const FALSE_EASTING = 500000
const FALSE_NORTHING = 10000000
const E = Math.sqrt(FLATTENING * (2 - FLATTENING))
const N = FLATTENING / (2 - FLATTENING)
const RECTIFYING = (A_AXIS / (1 + N)) * (1 + N ** 2 / 4 + N ** 4 / 64 + N ** 6 / 256)
const ALPHA = [
    N / 2 - (2 / 3) * N ** 2 + (5 / 16) * N ** 3 + (41 / 180) * N ** 4 - (127 / 288) * N ** 5 + (7891 / 37800) * N ** 6,
    (13 / 48) * N ** 2 - (3 / 5) * N ** 3 + (557 / 1440) * N ** 4 + (281 / 630) * N ** 5 - (1983433 / 1935360) * N ** 6,
    (61 / 240) * N ** 3 - (103 / 140) * N ** 4 + (15061 / 26880) * N ** 5 + (167603 / 181440) * N ** 6,
    (49561 / 161280) * N ** 4 - (179 / 168) * N ** 5 + (6601661 / 7257600) * N ** 6,
    (34729 / 80640) * N ** 5 - (3418889 / 1995840) * N ** 6,
    (212378941 / 319334400) * N ** 6,
]
const BETA = [
    N / 2 - (2 / 3) * N ** 2 + (37 / 96) * N ** 3 - (1 / 360) * N ** 4 - (81 / 512) * N ** 5 + (96199 / 604800) * N ** 6,
    (1 / 48) * N ** 2 + (1 / 15) * N ** 3 - (437 / 1440) * N ** 4 + (46 / 105) * N ** 5 - (1118711 / 3870720) * N ** 6,
    (17 / 480) * N ** 3 - (37 / 840) * N ** 4 - (209 / 4480) * N ** 5 + (5569 / 90720) * N ** 6,
    (4397 / 161280) * N ** 4 - (11 / 504) * N ** 5 - (830251 / 7257600) * N ** 6,
    (4583 / 161280) * N ** 5 - (108847 / 3991680) * N ** 6,
    (20648693 / 638668800) * N ** 6,
]

/** The latitude bands, 8° each from 80°S, X stretched to 84°N. */
const BANDS = 'CDEFGHJKLMNPQRSTUVWX'

/** A position on the UTM grid. */
export interface Utm {
    /** 1 to 60, each 6° of longitude from 180°W, save the exceptions over Norway and Svalbard. */
    zone: number
    /** The latitude band, C to X. */
    band: string
    hemisphere: 'N' | 'S'
    /** Meters east, 500 000 on the zone's central meridian. */
    easting: number
    /** Meters north of the equator, or of 10 000 km south of it in the southern hemisphere. */
    northing: number
}

/** The latitude band of a latitude, or undefined outside 80°S to 84°N. */
export function latitudeBand(lat: number): string | undefined {
    if (!(lat >= -80 && lat <= 84)) return undefined
    return BANDS[Math.min(19, Math.floor((lat + 80) / 8))]
}

/** The UTM zone of a point, with the exceptions over western Norway and Svalbard. */
export function utmZone(point: LonLat): number {
    const [lon, lat] = point
    const wrapped = lon === 180 ? 180 : ((((lon + 180) % 360) + 360) % 360) - 180
    let zone = Math.min(60, Math.floor((wrapped + 180) / 6) + 1)
    if (lat >= 56 && lat < 64 && wrapped >= 3 && wrapped < 12) zone = 32
    if (lat >= 72 && lat <= 84 && wrapped >= 0 && wrapped < 42) {
        if (wrapped < 9) zone = 31
        else if (wrapped < 21) zone = 33
        else if (wrapped < 33) zone = 35
        else zone = 37
    }
    return zone
}

/** A point on the UTM grid, in its own zone or the one given; undefined outside 80°S to 84°N. */
export function toUtm(point: LonLat, zone = utmZone(point)): Utm | undefined {
    const [lon, lat] = point
    const band = latitudeBand(lat)
    if (band === undefined || !Number.isFinite(lon)) return undefined
    const λ0 = ((zone - 1) * 6 - 180 + 3) * RADIANS
    let Δλ = lon * RADIANS - λ0
    Δλ = Math.atan2(Math.sin(Δλ), Math.cos(Δλ))
    const φ = lat * RADIANS
    const τ = Math.tan(φ)
    const σ = Math.sinh(E * Math.atanh((E * τ) / Math.sqrt(1 + τ * τ)))
    const τʹ = τ * Math.sqrt(1 + σ * σ) - σ * Math.sqrt(1 + τ * τ)
    const ξʹ = Math.atan2(τʹ, Math.cos(Δλ))
    const ηʹ = Math.asinh(Math.sin(Δλ) / Math.sqrt(τʹ * τʹ + Math.cos(Δλ) ** 2))
    let ξ = ξʹ
    let η = ηʹ
    ALPHA.forEach((α, index) => {
        const j = 2 * (index + 1)
        ξ += α * Math.sin(j * ξʹ) * Math.cosh(j * ηʹ)
        η += α * Math.cos(j * ξʹ) * Math.sinh(j * ηʹ)
    })
    const hemisphere = lat >= 0 ? 'N' : 'S'
    return {
        zone,
        band,
        hemisphere,
        easting: K0 * RECTIFYING * η + FALSE_EASTING,
        northing: K0 * RECTIFYING * ξ + (hemisphere === 'S' ? FALSE_NORTHING : 0),
    }
}

/** A UTM position as a point; the band is not needed, only the zone and the hemisphere. */
export function fromUtm(utm: Pick<Utm, 'zone' | 'hemisphere' | 'easting' | 'northing'>): LonLat {
    const ξ = (utm.northing - (utm.hemisphere === 'S' ? FALSE_NORTHING : 0)) / (K0 * RECTIFYING)
    const η = (utm.easting - FALSE_EASTING) / (K0 * RECTIFYING)
    let ξʹ = ξ
    let ηʹ = η
    BETA.forEach((β, index) => {
        const j = 2 * (index + 1)
        ξʹ -= β * Math.sin(j * ξ) * Math.cosh(j * η)
        ηʹ -= β * Math.cos(j * ξ) * Math.sinh(j * η)
    })
    const τʹ = Math.sin(ξʹ) / Math.sqrt(Math.sinh(ηʹ) ** 2 + Math.cos(ξʹ) ** 2)
    let τ = τʹ
    for (let round = 0; round < 10; round++) {
        const σ = Math.sinh(E * Math.atanh((E * τ) / Math.sqrt(1 + τ * τ)))
        const τi = τ * Math.sqrt(1 + σ * σ) - σ * Math.sqrt(1 + τ * τ)
        const δ = ((τʹ - τi) / Math.sqrt(1 + τi * τi)) * ((1 + (1 - E * E) * τ * τ) / ((1 - E * E) * Math.sqrt(1 + τ * τ)))
        τ += δ
        if (Math.abs(δ) < 1e-12) break
    }
    const λ0 = (utm.zone - 1) * 6 - 180 + 3
    const lon = λ0 + Math.atan2(Math.sinh(ηʹ), Math.cos(ξʹ)) * DEGREES
    return [((((lon + 540) % 360) + 360) % 360) - 180, Math.atan(τ) * DEGREES]
}

/** A UTM position as people write it, to the meter: `32V 597190 6643097`. */
export function formatUtm(utm: Utm): string {
    return `${String(utm.zone)}${utm.band} ${String(Math.floor(utm.easting))} ${String(Math.floor(utm.northing))}`
}

/** The column letters of the 100 km squares, repeating every three zones. */
const COLUMNS = ['STUVWXYZ', 'ABCDEFGH', 'JKLMNPQR']
/** The row letters of the 100 km squares, starting five letters on in even zones. */
const ROWS = 'ABCDEFGHJKLMNPQRSTUV'
/** Less than a millimeter, so a point on a square's edge is not read into the square below it. */
const EDGE = 1e-6

/**
 * A point as an MGRS reference, `32V NM 97190 43097` at the meter, or with fewer digits for a larger
 * square (`digits` per axis, 0 to 5; a reference names the square's south-west corner, so digits are
 * cut, never rounded). Undefined outside 80°S to 84°N.
 */
export function toMgrs(point: LonLat, digits = 5): string | undefined {
    const utm = toUtm(point)
    if (utm === undefined) return undefined
    const places = Math.max(0, Math.min(5, Math.floor(digits)))
    const easting = utm.easting + EDGE
    const northing = utm.northing + EDGE
    const column = COLUMNS[utm.zone % 3][Math.floor(easting / 100000) - 1]
    const row = ROWS[(Math.floor(northing / 100000) + (utm.zone % 2 === 0 ? 5 : 0)) % 20]
    const within = (meters: number) =>
        String(Math.floor((meters % 100000) / 10 ** (5 - places)))
            .padStart(places, '0')
            .slice(0, places)
    const square = `${String(utm.zone)}${utm.band} ${column}${row}`
    return places === 0 ? square : `${square} ${within(easting)} ${within(northing)}`
}

export interface MgrsOptions {
    /** Gives the square's center rather than its south-west corner, which a reference names. */
    center?: boolean
}

/**
 * An MGRS reference read as a point, with or without spaces and in either case (`32VNM9719043097`):
 * the south-west corner of the square it names, or its center with `center`. Undefined when the text
 * is not a reference, or names a square that does not exist.
 */
export function parseMgrs(text: string, options: MgrsOptions = {}): LonLat | undefined {
    const match = /^(\d{1,2})([C-HJ-NP-X])([A-HJ-NP-Z])([A-HJ-NP-V])(\d*)$/.exec(text.replace(/\s+/g, '').toUpperCase())
    if (match === null) return undefined
    const [, zoneText, band, column, row, numbers] = match
    const zone = Number(zoneText)
    if (zone < 1 || zone > 60 || numbers.length % 2 !== 0 || numbers.length > 10) return undefined
    const columnIndex = COLUMNS[zone % 3].indexOf(column)
    if (columnIndex < 0) return undefined
    const places = numbers.length / 2
    const unit = 10 ** (5 - places)
    const offset = options.center === true ? unit / 2 : 0
    const easting = (columnIndex + 1) * 100000 + (places > 0 ? Number(numbers.slice(0, places)) * unit : 0) + offset
    const rowIndex = (ROWS.indexOf(row) - (zone % 2 === 0 ? 5 : 0) + 20) % 20
    const within = rowIndex * 100000 + (places > 0 ? Number(numbers.slice(places)) * unit : 0) + offset
    // The row letters repeat every 2 000 km: the band's southern edge says which repeat it is.
    const bandIndex = BANDS.indexOf(band)
    const south = -80 + bandIndex * 8
    const hemisphere = south >= 0 ? 'N' : 'S'
    const edge = toUtm([(zone - 1) * 6 - 180 + 3, south], zone)
    if (edge === undefined) return undefined
    const floor = Math.floor(edge.northing / 100000) * 100000 - 100000
    let northing = within
    while (northing < floor) northing += 2000000
    const point = fromUtm({ zone, hemisphere, easting, northing })
    // A square on a band's edge reaches a little past it; one far outside names no place in the band.
    const north = band === 'X' ? 84 : south + 8
    return point[1] >= south - 1 && point[1] <= north + 1 ? point : undefined
}
