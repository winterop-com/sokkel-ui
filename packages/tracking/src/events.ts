/**
 * Incidents: things that happen at a place and a time (an earthquake, a weather warning, a flood), as
 * plain, serializable records, where a `Track` is a thing that moves. The app fetches each feed; these
 * functions only read what it fetched. Three public feeds are read:
 *
 * - the USGS earthquake summary feeds, GeoJSON (`/earthquakes/feed/v1.0/summary/all_hour.geojson` and
 *   the like): a point per event with its magnitude, its time in milliseconds and its depth in
 *   kilometers;
 * - GDACS's event lists, GeoJSON (`/gdacsapi/api/events/geteventlist/SEARCH` and `EVENTS4APP`): a point
 *   per disaster with its type (`EQ`, `TC`, `FL`, `VO`, `DR`, `WF`), its alert level (`Green`,
 *   `Orange`, `Red`) and its dates, in UTC without a zone;
 * - MET Norway's MetAlerts, CAP as GeoJSON (`/weatherapi/metalerts/2.0/current.json`): a polygon or a
 *   multipolygon per warning with CAP's severity, the time it holds for and the area it names.
 *
 * Times are milliseconds since the epoch and depths meters. A row without a position or a time is
 * skipped.
 */
import type { WordsPart } from '@winterop-com/sokkel-ui/lib/words'

import type { LonLat, TrackProperties } from './track'

/** What happened. */
export type IncidentKind = 'earthquake' | 'tsunami' | 'cyclone' | 'flood' | 'volcano' | 'drought' | 'wildfire' | 'weather' | 'other'

/** How grave it is, in CAP's words; `unknown` when a feed does not say. */
export type IncidentSeverity = 'minor' | 'moderate' | 'severe' | 'extreme' | 'unknown'

/** An area as GeoJSON holds one: rings of positions, the first of each polygon its outline and the rest its holes. */
export type IncidentArea = { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] }

/** One thing that happened at a place and a time. */
export interface Incident {
    /** Stable across updates of its feed, and unique within it. */
    id: string
    /** Where it is; the middle of its area for one that covers an area. */
    lon: number
    lat: number
    /** When it happened, or when it takes effect, in milliseconds since the epoch. */
    at: number
    /** When it ends, for one that lasts: the last hour a warning holds for. */
    until?: number
    kind: IncidentKind
    severity: IncidentSeverity
    /** An earthquake's magnitude. */
    magnitude?: number
    /** What a map or a list writes for it. */
    label: string
    /** A page that says more. */
    url?: string
    /** The area it covers, for one that covers an area. */
    area?: IncidentArea
    /** When its feed last changed it, in milliseconds since the epoch. */
    updatedAt?: number
    /** Which feed it came from. */
    source?: string
    properties?: TrackProperties
}

/** Every kind, in the order the words list them. */
export const INCIDENT_KINDS: readonly IncidentKind[] = [
    'earthquake',
    'tsunami',
    'cyclone',
    'flood',
    'volcano',
    'drought',
    'wildfire',
    'weather',
    'other',
]

/** Every severity, from the least grave; `unknown` stands first, below `minor`. */
export const INCIDENT_SEVERITIES: readonly IncidentSeverity[] = ['unknown', 'minor', 'moderate', 'severe', 'extreme']

/** The order incidents are listed in, most pressing first. */
export const SEVERITY_ORDER: readonly IncidentSeverity[] = ['extreme', 'severe', 'moderate', 'minor', 'unknown']

export interface IncidentWords {
    kinds: Record<IncidentKind, string>
    severities: Record<IncidentSeverity, string>
}

export const INCIDENT_WORDS: IncidentWords = {
    kinds: {
        earthquake: 'Earthquake',
        tsunami: 'Tsunami',
        cyclone: 'Cyclone',
        flood: 'Flood',
        volcano: 'Volcano',
        drought: 'Drought',
        wildfire: 'Wildfire',
        weather: 'Weather',
        other: 'Other',
    },
    severities: { minor: 'Minor', moderate: 'Moderate', severe: 'Severe', extreme: 'Extreme', unknown: 'Unknown' },
}

export const INCIDENT_PART: WordsPart<IncidentWords> = { id: 'incident', words: INCIDENT_WORDS }

/** Compares two severities by `SEVERITY_ORDER`, for `sort`: the graver first. */
export function compareSeverity(a: IncidentSeverity, b: IncidentSeverity): number {
    return SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b)
}

/** Whether a severity is at least as grave as another; `unknown` is below every other. */
export function atLeast(severity: IncidentSeverity, floor: IncidentSeverity): boolean {
    return INCIDENT_SEVERITIES.indexOf(severity) >= INCIDENT_SEVERITIES.indexOf(floor)
}

export interface IncidentOptions {
    /** The incidents' `source`; `usgs`, `gdacs` and `metalerts` by default. */
    source?: string
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined)
const record = (value: unknown): Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/** A table's value for a word a feed wrote, or undefined for a word the table does not hold. */
const lookup = <T>(table: Readonly<Record<string, T>>, word: string | undefined): T | undefined =>
    word !== undefined && Object.hasOwn(table, word) ? table[word] : undefined

/** Drops the properties a feed left out, so an incident holds only what is known. */
function known(properties: Record<string, string | number | boolean | null | undefined>): TrackProperties {
    return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined)) as TrackProperties
}

/** A date and time as milliseconds since the epoch, read as UTC when it names no zone. */
function instant(value: unknown): number | undefined {
    const written = text(value)
    if (written === undefined) return undefined
    const at = Date.parse(/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(written) ? written : `${written}Z`)
    return Number.isFinite(at) ? at : undefined
}

/** A position that reads as longitude and latitude. */
const placed = (lon: unknown, lat: unknown): boolean => finite(lon) && finite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90

/** The features of a GeoJSON feature collection, as records. */
const features = (payload: unknown): Record<string, unknown>[] => list(record(payload).features).map(record)

/** One event of a USGS summary feed; only the fields read here are named. */
export interface UsgsQuake {
    id: string
    properties: {
        mag?: number | null
        place?: string | null
        /** When it happened, in milliseconds since the epoch. */
        time?: number | null
        updated?: number | null
        url?: string | null
        /** The PAGER alert level: `green`, `yellow`, `orange` or `red`. */
        alert?: string | null
        status?: string | null
        /** 1 when the event is in an oceanic region and large enough to raise a tsunami. */
        tsunami?: number | null
        /** How significant the event is, from 0 to 1000 and above. */
        sig?: number | null
        magType?: string | null
        /** `earthquake`, `quarry blast`, `explosion` and others. */
        type?: string | null
        title?: string | null
        [field: string]: unknown
    }
    /** Longitude, latitude and depth in kilometers. */
    geometry: { type: 'Point'; coordinates: number[] } | null
    [field: string]: unknown
}

/** A USGS earthquake summary feed. */
export interface UsgsFeed {
    features: UsgsQuake[]
    [field: string]: unknown
}

/** The severity each PAGER alert level, GDACS alert level and awareness color stands for. */
const BY_COLOR: Readonly<Record<string, IncidentSeverity>> = { green: 'minor', yellow: 'moderate', orange: 'severe', red: 'extreme' }

/**
 * How grave an earthquake is by its magnitude alone: `minor` below 5, `moderate` below 6, `severe`
 * below 7 and `extreme` from 7; `unknown` without a magnitude.
 */
export function quakeSeverity(magnitude: number | undefined): IncidentSeverity {
    if (!finite(magnitude)) return 'unknown'
    if (magnitude < 5) return 'minor'
    if (magnitude < 6) return 'moderate'
    return magnitude < 7 ? 'severe' : 'extreme'
}

/**
 * The events of a USGS earthquake summary feed as incidents. An event's severity is its PAGER alert
 * level where the USGS has given one (green, yellow, orange, red), and `quakeSeverity` of its
 * magnitude otherwise. An event that is not an earthquake (a quarry blast, an explosion) is `other`.
 */
export function parseUsgsQuakes(feed: UsgsFeed, options: IncidentOptions = {}): Incident[] {
    const incidents: Incident[] = []
    for (const feature of features(feed)) {
        const properties = record(feature.properties)
        const [lon, lat, depth] = list(record(feature.geometry).coordinates)
        const id = text(feature.id)
        if (id === undefined || !placed(lon, lat) || !finite(properties.time)) continue
        const magnitude = finite(properties.mag) ? properties.mag : undefined
        const alert = text(properties.alert)?.toLowerCase()
        const type = text(properties.type)
        const place = text(properties.place)
        const incident: Incident = {
            id,
            lon: lon as number,
            lat: lat as number,
            at: properties.time,
            kind: type === undefined || type === 'earthquake' ? 'earthquake' : 'other',
            severity: lookup(BY_COLOR, alert) ?? quakeSeverity(magnitude),
            label: text(properties.title) ?? place ?? id,
            source: options.source ?? 'usgs',
            properties: known({
                place,
                type,
                // Kilometers in the feed.
                depth: finite(depth) ? depth * 1000 : undefined,
                magnitudeType: text(properties.magType),
                alert,
                status: text(properties.status),
                tsunami: finite(properties.tsunami) ? properties.tsunami === 1 : undefined,
                significance: finite(properties.sig) ? properties.sig : undefined,
                felt: finite(properties.felt) ? properties.felt : undefined,
            }),
        }
        if (magnitude !== undefined) incident.magnitude = magnitude
        const url = text(properties.url)
        if (url !== undefined) incident.url = url
        if (finite(properties.updated)) incident.updatedAt = properties.updated
        incidents.push(incident)
    }
    return incidents
}

/** One event of a GDACS event list; only the fields read here are named. */
export interface GdacsEvent {
    geometry: { type: string; coordinates: unknown } | null
    properties: {
        /** `EQ`, `TC`, `FL`, `VO`, `DR`, `WF` or `TS`. */
        eventtype?: string
        eventid?: number
        episodeid?: number
        eventname?: string
        name?: string
        description?: string
        url?: { report?: string; details?: string; geometry?: string }
        /** `Green`, `Orange` or `Red`. */
        alertlevel?: string
        alertscore?: number
        iscurrent?: string
        country?: string
        iso3?: string
        /** In UTC, written without a zone. */
        fromdate?: string
        todate?: string
        datemodified?: string
        glide?: string
        source?: string
        severitydata?: { severity?: number; severitytext?: string; severityunit?: string }
        [field: string]: unknown
    }
    [field: string]: unknown
}

/** A GDACS event list. */
export interface GdacsFeed {
    features: GdacsEvent[]
    [field: string]: unknown
}

const GDACS_KINDS: Readonly<Record<string, IncidentKind>> = {
    EQ: 'earthquake',
    TS: 'tsunami',
    TC: 'cyclone',
    FL: 'flood',
    VO: 'volcano',
    DR: 'drought',
    WF: 'wildfire',
}

/**
 * The events of a GDACS event list as incidents, one for each event: its type gives the kind and its
 * alert level the severity (Green `minor`, Orange `severe`, Red `extreme`). An event's own measure
 * (a cyclone's wind, a drought's area) is kept in `properties` as `measure`, `unit` and
 * `measureText`; an earthquake's is its `magnitude` as well. Only an event's point is read: a list
 * that also draws each event's area gives the event once.
 */
export function parseGdacs(feed: GdacsFeed, options: IncidentOptions = {}): Incident[] {
    const incidents = new Map<string, Incident>()
    for (const feature of features(feed)) {
        const geometry = record(feature.geometry)
        const properties = record(feature.properties)
        const [lon, lat] = list(geometry.coordinates)
        const type = text(properties.eventtype)?.toUpperCase()
        const at = instant(properties.fromdate)
        if (geometry.type !== 'Point' || !placed(lon, lat) || type === undefined || !finite(properties.eventid) || at === undefined)
            continue
        const id = `${type}${String(properties.eventid)}`
        if (incidents.has(id)) continue
        const measure = record(properties.severitydata)
        const unit = text(measure.severityunit)
        const level = text(properties.alertlevel)
        const kind = lookup(GDACS_KINDS, type) ?? 'other'
        const incident: Incident = {
            id,
            lon: lon as number,
            lat: lat as number,
            at,
            kind,
            severity: lookup(BY_COLOR, level?.toLowerCase()) ?? 'unknown',
            label: text(properties.name) ?? text(properties.description) ?? text(properties.eventname) ?? id,
            source: options.source ?? 'gdacs',
            properties: known({
                eventType: type,
                eventId: properties.eventid,
                episodeId: finite(properties.episodeid) ? properties.episodeid : undefined,
                eventName: text(properties.eventname),
                alertLevel: level,
                alertScore: finite(properties.alertscore) ? properties.alertscore : undefined,
                country: text(properties.country),
                iso3: text(properties.iso3),
                glide: text(properties.glide),
                reportedBy: text(properties.source),
                current: text(properties.iscurrent) === undefined ? undefined : text(properties.iscurrent) === 'true',
                measure: finite(measure.severity) ? measure.severity : undefined,
                unit,
                measureText: text(measure.severitytext),
            }),
        }
        if (kind === 'earthquake' && unit === 'M' && finite(measure.severity)) incident.magnitude = measure.severity
        const until = instant(properties.todate)
        if (until !== undefined && until > at) incident.until = until
        const url = text(record(properties.url).report)
        if (url !== undefined) incident.url = url
        const updatedAt = instant(properties.datemodified)
        if (updatedAt !== undefined) incident.updatedAt = updatedAt
        incidents.set(id, incident)
    }
    return [...incidents.values()]
}

/** One warning of MetAlerts; only the fields read here are named. */
export interface MetAlert {
    geometry: IncidentArea | null
    properties: {
        /** The CAP identifier. */
        id?: string
        /** The area warned, by name. */
        area?: string
        /** A level, a color and CAP's severity: `2; yellow; Moderate`. */
        awareness_level?: string
        awareness_type?: string
        certainty?: string
        description?: string
        /** What is warned of: `gale`, `rain`, `snow`, `ice`, `forestFire` and others. */
        event?: string
        /** The event as the warning's language says it. */
        eventAwarenessName?: string
        geographicDomain?: string
        instruction?: string
        consequences?: string
        riskMatrixColor?: string
        /** CAP's severity: `Minor`, `Moderate`, `Severe` or `Extreme`. */
        severity?: string
        /** `Actual` for a real warning; `Test`, `Exercise` and others for the rest. */
        status?: string
        title?: string
        /** `Alert`, `Update` or `Cancel`. */
        type?: string
        web?: string
        [field: string]: unknown
    }
    /** When the warning holds: its first and last instants. */
    when?: { interval?: string[] }
    [field: string]: unknown
}

/** MetAlerts' answer: a GeoJSON feature collection of warnings. */
export interface MetAlertsFeed {
    features: MetAlert[]
    /** The language the warnings are written in. */
    lang?: string
    lastChange?: string
    [field: string]: unknown
}

const CAP_SEVERITIES: Readonly<Record<string, IncidentSeverity>> = {
    minor: 'minor',
    moderate: 'moderate',
    severe: 'severe',
    extreme: 'extreme',
}

/** A ring's positions that read as longitude and latitude. */
const ring = (positions: unknown): LonLat[] =>
    list(positions)
        .map(list)
        .filter(([lon, lat]) => placed(lon, lat))
        .map(([lon, lat]): LonLat => [lon as number, lat as number])

/** The polygons of an area, each as its rings, leaving out a polygon whose outline has fewer than three positions. */
function polygons(geometry: Record<string, unknown>): LonLat[][][] {
    const parts = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? list(geometry.coordinates) : []
    return parts.map((rings) => list(rings).map(ring)).filter((rings) => rings.length > 0 && rings[0].length >= 3)
}

/** A ring's area in square degrees, and its middle, by the shoelace formula. */
function ringMiddle(positions: readonly LonLat[]): { size: number; middle: LonLat } {
    let twice = 0
    let x = 0
    let y = 0
    for (let index = 0; index < positions.length; index += 1) {
        const [x0, y0] = positions[index]
        const [x1, y1] = positions[(index + 1) % positions.length]
        const cross = x0 * y1 - x1 * y0
        twice += cross
        x += (x0 + x1) * cross
        y += (y0 + y1) * cross
    }
    if (Math.abs(twice) < 1e-12) {
        const sum = positions.reduce<LonLat>((total, [lon, lat]) => [total[0] + lon, total[1] + lat], [0, 0])
        return { size: 0, middle: [sum[0] / positions.length, sum[1] / positions.length] }
    }
    return { size: Math.abs(twice / 2), middle: [x / (3 * twice), y / (3 * twice)] }
}

/** Where an area's marker stands: the middle of its outline, or of its largest part's. */
export function areaMiddle(area: IncidentArea): LonLat | undefined {
    const outlines = polygons(area).map((rings) => ringMiddle(rings[0]))
    if (outlines.length === 0) return undefined
    return outlines.reduce((largest, each) => (each.size > largest.size ? each : largest)).middle
}

/**
 * The warnings of MetAlerts as incidents of kind `weather`, each with the area it warns as `area` and
 * standing at that area's middle. A warning's severity is CAP's (`Moderate` for yellow, `Severe` for
 * orange, `Extreme` for red), `at` is when it starts to hold and `until` when it stops. What it warns
 * of is `properties.event`. A warning that is not `Actual` (a test, an exercise) is left out.
 */
export function parseMetAlerts(feed: MetAlertsFeed, options: IncidentOptions = {}): Incident[] {
    const incidents: Incident[] = []
    for (const feature of features(feed)) {
        const properties = record(feature.properties)
        const geometry = record(feature.geometry)
        const parts = polygons(geometry)
        const id = text(properties.id)
        const [from, to] = list(record(feature.when).interval)
        const at = instant(from)
        const status = text(properties.status)
        if (id === undefined || at === undefined || parts.length === 0) continue
        if (status !== undefined && status !== 'Actual') continue
        const area: IncidentArea =
            parts.length === 1 ? { type: 'Polygon', coordinates: parts[0] } : { type: 'MultiPolygon', coordinates: parts }
        const middle = areaMiddle(area) as LonLat
        const [level, color] = (text(properties.awareness_level) ?? '').split(';').map((part) => part.trim())
        const severity =
            lookup(CAP_SEVERITIES, text(properties.severity)?.toLowerCase()) ?? lookup(BY_COLOR, color?.toLowerCase()) ?? 'unknown'
        const named = text(properties.area)
        const event = text(properties.eventAwarenessName)
        const incident: Incident = {
            id,
            lon: middle[0],
            lat: middle[1],
            at,
            kind: 'weather',
            severity,
            label: event !== undefined && named !== undefined ? `${event}, ${named}` : (text(properties.title) ?? event ?? named ?? id),
            area,
            source: options.source ?? 'metalerts',
            properties: known({
                event: text(properties.event),
                eventName: event,
                area: named,
                awarenessLevel: level === undefined || level === '' || !Number.isFinite(Number(level)) ? undefined : Number(level),
                color: color === undefined || color === '' ? text(properties.riskMatrixColor)?.toLowerCase() : color.toLowerCase(),
                awarenessType: text(properties.awareness_type),
                certainty: text(properties.certainty),
                domain: text(properties.geographicDomain),
                type: text(properties.type),
                title: text(properties.title),
                description: text(properties.description),
                instruction: text(properties.instruction),
                consequences: text(properties.consequences),
            }),
        }
        const until = instant(to)
        if (until !== undefined && until > at) incident.until = until
        const url = text(properties.web)
        if (url !== undefined) incident.url = url
        incidents.push(incident)
    }
    return incidents
}

/** An incident's area as a map's zone layer takes one: an id, the area and a label. */
export interface IncidentZone {
    /** The incident's id, so a selection on the map names the incident. */
    id: string
    area: IncidentArea
    label: string
    kind: IncidentKind
    severity: IncidentSeverity
}

/** The incidents that cover an area, as zones for a map; an incident without an area gives none. */
export function incidentZones(incidents: readonly Incident[]): IncidentZone[] {
    return incidents.flatMap((incident) =>
        incident.area === undefined
            ? []
            : [{ id: incident.id, area: incident.area, label: incident.label, kind: incident.kind, severity: incident.severity }],
    )
}

/**
 * The incidents that hold at a time: those that have started and, for one that lasts, not yet ended.
 * One without an end holds for `lasting` milliseconds after it happened, and for good without it.
 */
export function incidentsAt(incidents: readonly Incident[], now: number, lasting?: number): Incident[] {
    return incidents.filter((incident) => {
        if (incident.at > now) return false
        const until = incident.until ?? (lasting === undefined ? undefined : incident.at + lasting)
        return until === undefined || until >= now
    })
}
