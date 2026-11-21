/**
 * Simulated incidents: earthquakes round the world's seismic belts, a few lasting disasters and
 * weather warnings along a coast. What has happened by a moment follows from the moment and the
 * seed alone, so any moment can be drawn again. Each is written as its real feed answers: a USGS
 * summary feed (`parseUsgsQuakes`), a GDACS event list (`parseGdacs`) and MetAlerts (`parseMetAlerts`).
 */
import type { GdacsEvent, GdacsFeed, MetAlert, MetAlertsFeed, UsgsFeed, UsgsQuake } from '../events'
import type { LonLat } from '../track'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export interface IncidentSimOptions {
    /** What the incidents are drawn from. The same seed, the same events. 0 by default. */
    seed?: number
}

/** A number from 0 to 1 that is the same every time for the same key and seed. */
function hash(key: string, seed: number): number {
    let value = (2166136261 ^ seed) >>> 0
    for (let index = 0; index < key.length; index += 1) {
        value ^= key.charCodeAt(index)
        value = Math.imul(value, 16777619) >>> 0
    }
    // A last stir, so keys that differ in their last letter alone land far apart.
    value ^= value >>> 15
    value = Math.imul(value, 2246822519) >>> 0
    value ^= value >>> 13
    return (value >>> 0) / 4294967296
}

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places

/** A moment as GDACS writes one: UTC, without a zone. */
const plain = (at: number) => new Date(at).toISOString().slice(0, 19)

/** Where the ground shakes: a place by plain geography, and how far round it an event may fall, in degrees. */
const BELTS: readonly { name: string; at: LonLat; spread: number }[] = [
    { name: 'the Aleutian Islands', at: [-172, 52], spread: 6 },
    { name: 'southern Alaska', at: [-150, 61], spread: 4 },
    { name: 'the coast of central Chile', at: [-72, -33], spread: 5 },
    { name: 'northern Peru', at: [-78, -6], spread: 4 },
    { name: 'the coast of Oaxaca', at: [-97, 16], spread: 3 },
    { name: 'the east coast of Honshu', at: [142, 38], spread: 4 },
    { name: 'the Kuril Islands', at: [152, 47], spread: 4 },
    { name: 'the Philippine Sea', at: [127, 9], spread: 5 },
    { name: 'southern Sumatra', at: [101, -4], spread: 4 },
    { name: 'the Banda Sea', at: [129, -6], spread: 4 },
    { name: 'the Kermadec Islands', at: [-178, -30], spread: 5 },
    { name: 'the South Island', at: [171, -43], spread: 3 },
    { name: 'the Hindu Kush', at: [70.5, 36.5], spread: 3 },
    { name: 'eastern Anatolia', at: [40, 38.5], spread: 3 },
    { name: 'the Aegean Sea', at: [25.5, 37.5], spread: 3 },
    { name: 'central Italy', at: [13.2, 42.7], spread: 2 },
    { name: 'southern Iceland', at: [-21, 63.9], spread: 1.5 },
    { name: 'the Mid-Atlantic Ridge', at: [-33, 35], spread: 6 },
    { name: 'the Jan Mayen ridge', at: [-7, 71], spread: 3 },
    { name: 'the Norwegian Sea', at: [5, 67], spread: 3 },
]

/** How long one slot of the earthquake catalog is: each holds an event or none. */
const QUAKE_SLOT = 12 * MINUTE

/** The share of slots that hold an event. */
const QUAKE_SHARE = 0.42

/** The earthquake of one slot, when it holds one. */
function quakeOf(slot: number, seed: number): UsgsQuake | undefined {
    const key = `quake-${String(slot)}`
    if (hash(key, seed) >= QUAKE_SHARE) return undefined
    const belt = BELTS[Math.floor(hash(`${key}-belt`, seed) * BELTS.length)]
    // Small events are common and great ones rare: the draw is cubed before it is stretched from 2.5 to 7.4.
    const magnitude = round(2.5 + hash(`${key}-mag`, seed) ** 3 * 4.9, 1)
    const lon = round(belt.at[0] + (hash(`${key}-lon`, seed) - 0.5) * 2 * belt.spread, 4)
    const lat = round(belt.at[1] + (hash(`${key}-lat`, seed) - 0.5) * 2 * belt.spread, 4)
    const depth = round(5 + hash(`${key}-depth`, seed) ** 2 * 120, 1)
    const time = slot * QUAKE_SLOT + Math.floor(hash(`${key}-time`, seed) * QUAKE_SLOT)
    const far = Math.round(10 + hash(`${key}-far`, seed) * 140)
    const place = `${String(far)} km off ${belt.name}`
    const properties: UsgsQuake['properties'] = {
        mag: magnitude,
        place,
        time,
        updated: time + 9 * MINUTE,
        status: 'reviewed',
        tsunami: magnitude >= 6.8 && depth < 60 ? 1 : 0,
        sig: Math.round(magnitude ** 2 * 15.4),
        magType: magnitude >= 5.5 ? 'mww' : 'mb',
        type: 'earthquake',
        title: `M ${magnitude.toFixed(1)} - ${place}`,
    }
    if (magnitude >= 6.5) properties.alert = magnitude >= 7 ? 'orange' : 'yellow'
    else if (magnitude >= 5.5) properties.alert = 'green'
    return {
        type: 'Feature',
        id: `sim${String(slot)}`,
        properties,
        geometry: { type: 'Point', coordinates: [lon > 180 ? lon - 360 : lon < -180 ? lon + 360 : lon, lat, depth] },
    }
}

/**
 * The earthquakes of the day before a moment, in milliseconds since the epoch, newest first, as a
 * USGS summary feed answers: magnitudes from 2.5, each with its place, depth and significance.
 */
export function simulateQuakes(at: number, options: IncidentSimOptions = {}): UsgsFeed {
    const seed = options.seed ?? 0
    const features: UsgsQuake[] = []
    const last = Math.floor(at / QUAKE_SLOT)
    for (let slot = last; slot > last - DAY / QUAKE_SLOT - 1; slot -= 1) {
        const quake = quakeOf(slot, seed)
        const time = quake?.properties.time ?? 0
        if (quake !== undefined && time <= at && time > at - DAY) features.push(quake)
    }
    return {
        type: 'FeatureCollection',
        metadata: { generated: at, title: 'Simulated earthquakes, M2.5+, past day', status: 200, count: features.length },
        features,
    }
}

/** A disaster the simulation repeats: what it is, where, and how it is measured. */
interface Disaster {
    type: 'TC' | 'FL' | 'VO' | 'WF' | 'DR'
    name: string
    country: string
    iso3: string
    at: LonLat
    level: 'Green' | 'Orange' | 'Red'
    measure: number
    unit: string
    text: string
    /** Days it lasts. */
    days: number
}

const DISASTERS: readonly Disaster[] = [
    {
        type: 'TC',
        name: 'Tropical cyclone in the Philippine Sea',
        country: 'Philippines',
        iso3: 'PHL',
        at: [128.4, 15.2],
        level: 'Red',
        measure: 185,
        unit: 'km/h',
        text: 'Winds of 185 km/h',
        days: 6,
    },
    {
        type: 'FL',
        name: 'Flood in Bangladesh',
        country: 'Bangladesh',
        iso3: 'BGD',
        at: [90.3, 24.1],
        level: 'Orange',
        measure: 0,
        unit: '',
        text: 'Rivers over their banks',
        days: 9,
    },
    {
        type: 'VO',
        name: 'Eruption in southern Iceland',
        country: 'Iceland',
        iso3: 'ISL',
        at: [-22.2, 63.88],
        level: 'Orange',
        measure: 0,
        unit: '',
        text: 'Lava and ash',
        days: 12,
    },
    {
        type: 'WF',
        name: 'Forest fire in Portugal',
        country: 'Portugal',
        iso3: 'PRT',
        at: [-7.9, 40.2],
        level: 'Green',
        measure: 5400,
        unit: 'ha',
        text: '5,400 ha burned',
        days: 5,
    },
    {
        type: 'DR',
        name: 'Drought in the Horn of Africa',
        country: 'Somalia',
        iso3: 'SOM',
        at: [45.3, 5.2],
        level: 'Orange',
        measure: 412_000,
        unit: 'km2',
        text: '412,000 km2 affected',
        days: 60,
    },
    {
        type: 'TC',
        name: 'Tropical cyclone in the Coral Sea',
        country: 'Australia',
        iso3: 'AUS',
        at: [152.6, -17.4],
        level: 'Orange',
        measure: 140,
        unit: 'km/h',
        text: 'Winds of 140 km/h',
        days: 5,
    },
    {
        type: 'FL',
        name: 'Flood in northern Italy',
        country: 'Italy',
        iso3: 'ITA',
        at: [11.6, 44.6],
        level: 'Green',
        measure: 0,
        unit: '',
        text: 'Rivers over their banks',
        days: 4,
    },
    {
        type: 'WF',
        name: 'Forest fire in British Columbia',
        country: 'Canada',
        iso3: 'CAN',
        at: [-122.8, 53.4],
        level: 'Orange',
        measure: 38_000,
        unit: 'ha',
        text: '38,000 ha burned',
        days: 14,
    },
]

/** How many days the disasters' calendar runs before it repeats, each starting on a day of its own. */
const DISASTER_CYCLE = 16

/**
 * The disasters that hold at a moment, in milliseconds since the epoch, as a GDACS event list
 * answers: cyclones, floods, an eruption, fires and a drought, each lasting days, with its alert
 * level and its own measure.
 */
export function simulateDisasters(at: number, options: IncidentSimOptions = {}): GdacsFeed {
    const seed = options.seed ?? 0
    const features: GdacsEvent[] = []
    DISASTERS.forEach((disaster, index) => {
        const offset = Math.floor(hash(`disaster-${String(index)}`, seed) * DISASTER_CYCLE)
        const hour = Math.floor(hash(`disaster-hour-${String(index)}`, seed) * 24)
        // The latest start on or before the moment, on the event's day of the calendar.
        const cycle = Math.floor((at - offset * DAY - hour * HOUR) / (DISASTER_CYCLE * DAY))
        const from = (cycle * DISASTER_CYCLE + offset) * DAY + hour * HOUR
        const to = from + disaster.days * DAY
        if (at < from || at > to) return
        const eventid = 1_000_000 + index * 1000 + (((cycle % 1000) + 1000) % 1000)
        features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [disaster.at[0], disaster.at[1]] },
            properties: {
                eventtype: disaster.type,
                eventid,
                episodeid: 1 + Math.floor((at - from) / DAY),
                name: disaster.name,
                description: disaster.name,
                alertlevel: disaster.level,
                alertscore: disaster.level === 'Red' ? 2.5 : disaster.level === 'Orange' ? 1.5 : 0.5,
                iscurrent: 'true',
                country: disaster.country,
                iso3: disaster.iso3,
                fromdate: plain(from),
                todate: plain(to),
                datemodified: plain(Math.min(at, from + Math.floor((at - from) / (6 * HOUR)) * 6 * HOUR)),
                source: 'simulated',
                severitydata: { severity: disaster.measure, severitytext: disaster.text, severityunit: disaster.unit },
            },
        })
    })
    return { type: 'FeatureCollection', features }
}

/** An area a simulated warning covers: its name and its outline, closed. */
interface WarnedArea {
    name: string
    outline: LonLat[]
}

/** A box as a closed outline, counterclockwise from its south-west corner. */
const box = (west: number, south: number, east: number, north: number): LonLat[] => [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
]

const WARNED: readonly WarnedArea[] = [
    { name: 'The coast off harbor', outline: box(3.6, 60.1, 5.4, 61.0) },
    { name: 'The fjords north of juniper', outline: box(5.0, 61.0, 7.4, 62.2) },
    { name: 'The banks west of larkspur', outline: box(1.8, 58.6, 4.2, 59.9) },
    { name: 'The mountains inland', outline: box(6.6, 59.6, 9.2, 61.2) },
    { name: 'The outer coast to the north', outline: box(8.6, 63.4, 12.4, 65.2) },
    { name: 'The southern tip', outline: box(6.2, 57.8, 9.0, 58.8) },
]

const WARNINGS: readonly { event: string; name: string }[] = [
    { event: 'gale', name: 'Gale' },
    { event: 'rain', name: 'Heavy rain' },
    { event: 'snow', name: 'Heavy snow' },
    { event: 'ice', name: 'Ice' },
    { event: 'stormSurge', name: 'High water' },
    { event: 'wind', name: 'Strong gusts' },
]

const LEVELS: readonly { level: string; severity: string; color: string }[] = [
    { level: '2; yellow; Moderate', severity: 'Moderate', color: 'Yellow' },
    { level: '2; yellow; Moderate', severity: 'Moderate', color: 'Yellow' },
    { level: '3; orange; Severe', severity: 'Severe', color: 'Orange' },
    { level: '4; red; Extreme', severity: 'Extreme', color: 'Red' },
]

/** How long one slot of the warnings' calendar is: each area is warned for a slot or not. */
const WARNING_SLOT = 6 * HOUR

/** The share of an area's slots a warning starts in. */
const WARNING_SHARE = 0.3

/** The warning that starts in an area's slot, when one does. */
function warningOf(area: number, slot: number, seed: number): MetAlert | undefined {
    const key = `warning-${String(area)}-${String(slot)}`
    if (hash(key, seed) >= WARNING_SHARE) return undefined
    const warned = WARNED[area]
    const what = WARNINGS[Math.floor(hash(`${key}-what`, seed) * WARNINGS.length)]
    const level = LEVELS[Math.floor(hash(`${key}-level`, seed) * LEVELS.length)]
    const from = slot * WARNING_SLOT + Math.floor(hash(`${key}-from`, seed) * 3) * HOUR
    const to = from + (6 + Math.floor(hash(`${key}-hours`, seed) * 13)) * HOUR
    return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [warned.outline] },
        properties: {
            id: `sim.${String(area)}.${String(slot)}`,
            area: warned.name,
            awareness_level: level.level,
            certainty: 'Likely',
            description: `${what.name} is expected in ${warned.name.toLowerCase()}.`,
            event: what.event,
            eventAwarenessName: what.name,
            geographicDomain: area === 3 ? 'land' : 'marine',
            instruction: 'Follow the forecast.',
            riskMatrixColor: level.color,
            severity: level.severity,
            status: 'Actual',
            title: `${what.name}, ${level.color.toLowerCase()} level, ${warned.name}`,
            type: 'Alert',
        },
        when: { interval: [new Date(from).toISOString(), new Date(to).toISOString()] },
    }
}

/**
 * The weather warnings issued by a moment, in milliseconds since the epoch, as MetAlerts answers:
 * those that hold and those issued for the hours ahead, each with the area it covers.
 */
export function simulateWarnings(at: number, options: IncidentSimOptions = {}): MetAlertsFeed {
    const seed = options.seed ?? 0
    const features: MetAlert[] = []
    const now = Math.floor(at / WARNING_SLOT)
    // A warning lasts at most 20 hours from its slot's start, and is issued a slot ahead.
    for (let slot = now - 4; slot <= now + 1; slot += 1) {
        for (let area = 0; area < WARNED.length; area += 1) {
            const warning = warningOf(area, slot, seed)
            const until = Date.parse(warning?.when?.interval?.[1] ?? '')
            if (warning !== undefined && until >= at) features.push(warning)
        }
    }
    return { type: 'FeatureCollection', lang: 'en', lastChange: new Date(now * WARNING_SLOT).toISOString(), features }
}
