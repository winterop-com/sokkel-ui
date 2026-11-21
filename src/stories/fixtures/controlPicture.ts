/**
 * The picture the control site's stories draw: what every source read, at one moment, as the map's layers, the
 * roster's rows and the wall's counts. Every id is `source:id`, so a selection names its source and
 * means the same thing in every window.
 */
import type { TrackRosterItem } from '@winterop-com/sokkel-ui/TrackRoster'
import type { SensorCone } from '@winterop-com/sokkel-ui-maps/CoverageLayer'
import type { MapLink } from '@winterop-com/sokkel-ui-maps/LinkLayer'
import type { Track as MapTrack } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import type { Zone } from '@winterop-com/sokkel-ui-maps/ZoneLayer'
import { altitudeBand } from '@winterop-com/sokkel-ui-tracking/adsb'
import { compareSeverity, incidentsAt, type Incident, type IncidentSeverity } from '@winterop-com/sokkel-ui-tracking/events'
import { footprint, groundTrack, satelliteTracks, type Satellite } from '@winterop-com/sokkel-ui-tracking/orbits'
import { FOOT, KNOT, type LonLat, type Track } from '@winterop-com/sokkel-ui-tracking/track'
import type { FeatureCollection } from 'geojson'

import type { ControlData } from './control'

/** The tone each severity is drawn in on the map: the graver, the more it warns. */
export const SEVERITY_TONE: Record<IncidentSeverity, 'hostile' | 'unknown' | 'pending' | 'neutral' | 'plain'> = {
    extreme: 'hostile',
    severe: 'unknown',
    moderate: 'pending',
    minor: 'neutral',
    unknown: 'plain',
}

/** How long an earthquake stays in the picture after it happened. */
const QUAKE_SHOWN = 24 * 3_600_000

/** What is selected, found in the picture. */
export type Picked = { type: 'track'; source: string; track: Track } | { type: 'incident'; source: string; incident: Incident } | undefined

export interface Picture {
    at: number
    /** The moving things, by source, as the map draws them. */
    flights: MapTrack[]
    vessels: MapTrack[]
    satellites: MapTrack[]
    hosts: MapTrack[]
    /** The warned areas. */
    zones: Zone[]
    /** Each earthquake as a disc sized by its magnitude. */
    quakes: SensorCone[]
    /** What the station and the coast's radars cover. */
    cover: SensorCone[]
    /** The disasters as points. */
    disasters: FeatureCollection
    /** The machine's connections, from home to each host. */
    links: MapLink[]
    /** The selected satellite's path over the ground, behind and ahead. */
    path: FeatureCollection
    /** Every moving thing as a roster row. */
    roster: TrackRosterItem[]
    /** Every incident that holds, the gravest first. */
    incidents: (Incident & { key: string })[]
    counts: { vessels: number; aircraft: number; satellites: number; incidents: number; hosts: number }
    /** Finds what a selection names. */
    pick: (key: string | null) => Picked
}

const nameOf = (track: Track): string =>
    track.label ?? (typeof track.properties?.callsign === 'string' ? track.properties.callsign : track.id.toUpperCase())

const speedOf = (track: Track): string => (track.speed === undefined ? '' : `${String(Math.round(track.speed / KNOT))} kn`)
const headingOf = (track: Track): string => (track.heading === undefined ? '' : `${String(Math.round(track.heading)).padStart(3, '0')}°`)

/** A track's motion in a line: its speed, its heading and, in the air or in orbit, its height. */
export function motionOf(track: Track, kind: 'vessel' | 'aircraft' | 'satellite' | 'host'): string {
    if (kind === 'host') return String(track.properties?.place ?? track.properties?.address ?? '')
    const height =
        kind === 'satellite'
            ? track.altitude === undefined
                ? ''
                : `${String(Math.round(track.altitude / 1000))} km`
            : kind === 'aircraft'
              ? altitudeBand(track) === 'ground'
                  ? 'Ground'
                  : `${Math.round((track.altitude ?? 0) / FOOT).toLocaleString('en-US')} ft`
              : ''
    // A satellite's speed is the one along its orbit, in kilometers a second.
    const along = typeof track.properties?.velocity === 'number' ? `${(track.properties.velocity / 1000).toFixed(1)} km/s` : ''
    return [kind === 'satellite' ? along : speedOf(track), headingOf(track), height].filter((part) => part !== '').join(' · ')
}

/** A property's name as a list writes it: `catalogNumber` is `Catalog number`. */
const termOf = (name: string): string => {
    const words = name
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .toLowerCase()
    return words.charAt(0).toUpperCase() + words.slice(1)
}

/** What a feed says of a track beyond where it is, as terms and values: its first few properties, numbers rounded. */
export function factsOf(track: Track): { term: string; value: string; code: boolean }[] {
    return Object.entries(track.properties ?? {})
        .filter(([name, value]) => value !== null && value !== '' && name !== 'epoch' && name !== 'velocity')
        .slice(0, 7)
        .map(([name, value]) => ({
            term: termOf(name),
            value: typeof value === 'number' ? String(Math.round(value * 100) / 100) : String(value),
            code: true,
        }))
}

const mapKind = (track: Track): MapTrack['kind'] =>
    track.kind === 'vessel' || track.kind === 'aircraft' || track.kind === 'sensor' ? track.kind : 'other'

const drawn = (source: string, track: Track, band?: string): MapTrack => ({
    id: `${source}:${track.id}`,
    position: [track.lon, track.lat],
    heading: track.heading,
    affiliation: track.affiliation,
    kind: mapKind(track),
    // A track with no name of its own is drawn without one: its number says little on a map.
    label: track.label ?? (typeof track.properties?.callsign === 'string' ? track.properties.callsign : undefined),
    trail: track.trail,
    band,
})

const row = (source: string, track: Track, kind: 'vessel' | 'aircraft' | 'satellite' | 'host', state: string): TrackRosterItem => ({
    id: `${source}:${track.id}`,
    name: nameOf(track),
    code: track.id,
    kind: mapKind(track),
    affiliation: track.affiliation,
    heading: track.heading,
    states: [state],
    detail: motionOf(track, kind),
    updatedAt: track.updatedAt ?? null,
})

/** How far an earthquake's disc reaches, in meters: it nearly doubles with each magnitude, from 50 km at 2.5. */
const quakeReach = (magnitude: number | undefined): number => 50_000 * 1.9 ** ((magnitude ?? 2.5) - 2.5)

const lines = (paths: readonly LonLat[][], part: string): FeatureCollection['features'] =>
    paths
        .filter((path) => path.length > 1)
        .map((path, index) => ({
            type: 'Feature' as const,
            id: `${part}-${String(index)}`,
            properties: { part },
            geometry: { type: 'LineString' as const, coordinates: path },
        }))

/** The picture of what the sources hold at a moment, with the selected thing's extras drawn. */
export function pictureOf(data: Partial<ControlData>, at: number, selected: string | null = null): Picture {
    const aircraft = data.flights ?? []
    const afloat = (data.vessels ?? []).filter((track) => track.kind !== 'sensor')
    const sensors = (data.vessels ?? []).filter((track) => track.kind === 'sensor')
    const catalog: readonly Satellite[] = data.satellites ?? []
    // The station as its position service says it, over where its elements would place it.
    const stationed = data.station
    const inOrbit: Track[] = [
        ...satelliteTracks(catalog, at)
            .filter((track) => stationed === undefined || track.id !== stationed.id)
            .map((track) => ({ ...track, kind: 'other' as const, affiliation: 'neutral' as const })),
        ...(stationed === undefined ? [] : [{ ...stationed, kind: 'other' as const, affiliation: 'friend' as const, label: 'Station' }]),
    ]
    const hosts = data.machine?.tracks ?? []
    const busiest = Math.max(1, ...(data.machine?.links ?? []).map((link) => link.rateIn + link.rateOut))

    const held = [
        ...incidentsAt(data.quakes ?? [], at, QUAKE_SHOWN).map((incident) => ({ ...incident, key: `quakes:${incident.id}` })),
        ...incidentsAt(data.disasters ?? [], at).map((incident) => ({ ...incident, key: `disasters:${incident.id}` })),
        ...incidentsAt(data.warnings ?? [], at).map((incident) => ({ ...incident, key: `warnings:${incident.id}` })),
    ].sort((a, b) => compareSeverity(a.severity, b.severity) || b.at - a.at)

    const [pickedSource, ...rest] = (selected ?? '').split(':')
    const pickedId = rest.join(':')
    const satellite = pickedSource === 'satellites' ? catalog.find((each) => each.id === pickedId) : undefined
    const trail = satellite === undefined ? undefined : groundTrack(satellite, at)

    const station = inOrbit.find((track) => track.id === stationed?.id) ?? inOrbit[0]
    const covered: SensorCone[] = [
        ...sensors.map((sensor) => ({
            id: `radar:${sensor.id}`,
            position: [sensor.lon, sensor.lat] as LonLat,
            range: 55_000,
            tone: 'friend' as const,
        })),
        ...inOrbit
            .filter((track) => track === station || `satellites:${track.id}` === selected)
            .flatMap((track) => {
                const circle = footprint(track)
                return circle === undefined
                    ? []
                    : [{ id: `view:${track.id}`, position: circle.position, range: circle.range, tone: 'friend' as const }]
            }),
    ]

    const tracksOf: Record<string, readonly Track[]> = {
        flights: aircraft,
        vessels: [...afloat, ...sensors],
        satellites: inOrbit,
        machine: hosts,
    }

    return {
        at,
        flights: aircraft.map((track) => drawn('flights', track, altitudeBand(track))),
        vessels: [...afloat, ...sensors].map((track) => drawn('vessels', track)),
        satellites: inOrbit.map((track) => ({ ...drawn('satellites', track), trail: undefined })),
        hosts: hosts.map((track) => ({ ...drawn('machine', track), kind: 'sensor' as const })),
        zones: held.flatMap((incident) =>
            incident.area === undefined
                ? []
                : [{ id: incident.key, area: incident.area, label: incident.label, tone: SEVERITY_TONE[incident.severity] }],
        ),
        quakes: held
            .filter((incident) => incident.kind === 'earthquake' && incident.key.startsWith('quakes:'))
            .map((incident) => ({
                id: incident.key,
                position: [incident.lon, incident.lat] as LonLat,
                range: quakeReach(incident.magnitude),
                tone: SEVERITY_TONE[incident.severity],
            })),
        cover: covered,
        disasters: {
            type: 'FeatureCollection',
            features: held
                .filter((incident) => incident.key.startsWith('disasters:'))
                .map((incident) => ({
                    type: 'Feature' as const,
                    id: incident.key,
                    properties: { name: incident.label, severity: incident.severity, kind: incident.kind },
                    geometry: { type: 'Point' as const, coordinates: [incident.lon, incident.lat] },
                })),
        },
        links: (data.machine?.links ?? []).map((link) => ({
            id: `link:${link.id}`,
            from: link.from,
            to: link.to,
            tone: 'friend' as const,
            rate: (link.rateIn + link.rateOut) / busiest,
        })),
        path: {
            type: 'FeatureCollection',
            features: trail === undefined ? [] : [...lines(trail.past, 'past'), ...lines(trail.future, 'future')],
        },
        roster: [
            ...afloat.map((track) => row('vessels', track, 'vessel', 'Vessel')),
            ...aircraft.map((track) => row('flights', track, 'aircraft', 'Aircraft')),
            ...inOrbit.map((track) => row('satellites', track, 'satellite', 'Satellite')),
        ],
        incidents: held,
        counts: {
            vessels: afloat.length,
            aircraft: aircraft.length,
            satellites: inOrbit.length,
            incidents: held.length,
            hosts: hosts.length,
        },
        pick: (key) => {
            if (key === null) return undefined
            const [source, ...parts] = key.split(':')
            const id = parts.join(':')
            const track = tracksOf[source]?.find((each) => each.id === id)
            if (track !== undefined) return { type: 'track', source, track }
            const incident = held.find((each) => each.key === key)
            return incident === undefined ? undefined : { type: 'incident', source, incident }
        },
    }
}

/** A box round a position, as west, south, east and north, `reach` degrees each way and wider toward the poles. */
export function boxRound([lon, lat]: LonLat, reach: number): [number, number, number, number] {
    const wide = reach / Math.max(0.3, Math.cos((lat * Math.PI) / 180))
    return [lon - wide, Math.max(-80, lat - reach), lon + wide, Math.min(84, lat + reach)]
}
