/** Aircraft as the watch reads and writes them: who is whose, their altitude bands, and their values in the chosen units. */
import type { Track as MapTrack } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import {
    ALTITUDE_BANDS,
    altitudeBand,
    parseReadsb,
    verticalTrend,
    type AltitudeBand,
    type ReadsbResponse,
    type VerticalTrend,
} from '@winterop-com/sokkel-ui-tracking/adsb'
import { FOOT, KNOT, type Track, type TrackAffiliation } from '@winterop-com/sokkel-ui-tracking/track'

import type { Settings } from './settings'

/** One aircraft: a track read from the feed, its trail kept by the watch. */
export type Flight = Track

/** Tidevann's own flights are friends, an aircraft that gives no callsign is unknown, and everyone else is neutral. */
export function classify(track: Track): TrackAffiliation {
    const callsign = track.properties?.callsign
    if (typeof callsign !== 'string') return 'unknown'
    return callsign.startsWith('TDV') ? 'friend' : 'neutral'
}

/** The aircraft in a readsb answer, each given its side. */
export function readFlights(response: ReadsbResponse, source: string): Flight[] {
    return parseReadsb(response, { classify, source })
}

export const callsignOf = (flight: Flight): string | undefined => {
    const callsign = flight.properties?.callsign
    return typeof callsign === 'string' ? callsign : undefined
}

export const nameOf = (flight: Flight): string => callsignOf(flight) ?? flight.id.toUpperCase()

export const onGround = (flight: Flight): boolean => altitudeBand(flight) === 'ground'

export { ALTITUDE_BANDS, altitudeBand, verticalTrend, type AltitudeBand, type VerticalTrend }

/** Each altitude band's color on the map, from the theme's chart colors. */
export const BAND_COLORS: Record<AltitudeBand, string> = {
    ground: 'var(--muted-foreground)',
    low: 'var(--chart-3)',
    medium: 'var(--chart-2)',
    high: 'var(--chart-4)',
}

type Units = Settings['units']

const number = (value: number, digits = 0) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value)

/** Each altitude band's name in the units chosen. */
export function bandName(band: AltitudeBand, units: Units): string {
    const [medium, high] = units === 'aviation' ? ['10,000 ft', '25,000 ft'] : ['3,000 m', '7,600 m']
    if (band === 'ground') return 'On the ground'
    if (band === 'low') return `Below ${medium}`
    return band === 'medium' ? `${medium} to ${high}` : `Above ${high}`
}

/** What an aircraft is doing: on the ground, climbing, cruising or descending. */
export type Phase = 'ground' | VerticalTrend

export function phaseOf(flight: Flight): Phase | undefined {
    if (onGround(flight)) return 'ground'
    return verticalTrend(flight)
}

export const PHASE_NAMES: Record<Phase, string> = {
    ground: 'On the ground',
    climbing: 'Climbing',
    level: 'Cruising',
    descending: 'Descending',
}

/** An altitude in feet or meters, from meters; on the ground says so. */
export function formatAltitude(flight: Flight, units: Units): string {
    if (onGround(flight)) return 'Ground'
    if (flight.altitude === undefined) return ''
    return units === 'aviation' ? `${number(Math.round(flight.altitude / FOOT / 25) * 25)} ft` : `${number(flight.altitude)} m`
}

/** A speed in knots or kilometers an hour, from meters a second. */
export function formatSpeed(speed: number | undefined, units: Units): string {
    if (speed === undefined) return ''
    return units === 'aviation' ? `${number(speed / KNOT)} kn` : `${number(speed * 3.6)} km/h`
}

/** A vertical rate in feet a minute or meters a second, from meters a second, signed. */
export function formatRate(flight: Flight, units: Units): string {
    const rate = flight.properties?.verticalRate
    if (typeof rate !== 'number' || onGround(flight)) return ''
    const value = units === 'aviation' ? Math.round((rate / FOOT) * 60) : Math.round(rate * 10) / 10
    const sign = value > 0 ? '+' : value < 0 ? '−' : ''
    return `${sign}${number(Math.abs(value), 1)} ${units === 'aviation' ? 'ft/min' : 'm/s'}`
}

/** A heading as three digits and a degree sign. */
export function formatHeading(heading: number | undefined): string {
    return heading === undefined ? '' : `${String(Math.round(heading) % 360).padStart(3, '0')}°`
}

/** Speed, heading and altitude as one quiet line. */
export function motionOf(flight: Flight, units: Units): string {
    return [formatSpeed(flight.speed, units), formatHeading(flight.heading), formatAltitude(flight, units)]
        .filter((part) => part !== '')
        .join(' · ')
}

/** An aircraft as the map draws it, painted by its altitude band or by its side. */
export function toMapTrack(flight: Flight, options: Pick<Settings, 'colorBy' | 'trail'>): MapTrack {
    return {
        id: flight.id,
        position: [flight.lon, flight.lat],
        heading: flight.heading,
        affiliation: flight.affiliation,
        kind: flight.kind,
        label: nameOf(flight),
        trail: options.trail === 0 ? undefined : flight.trail,
        band: options.colorBy === 'altitude' ? altitudeBand(flight) : undefined,
    }
}

/** Whether a flight's callsign or address holds what is searched for. */
export function matches(flight: Flight, query: string): boolean {
    const wanted = query.trim().toLowerCase()
    if (wanted === '') return true
    return `${callsignOf(flight) ?? ''} ${flight.id}`.toLowerCase().includes(wanted)
}
