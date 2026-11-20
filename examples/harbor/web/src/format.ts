import { formatCoordinates, formatDistance, parseCoordinates, type DistanceUnit } from '@winterop-com/sokkel-ui-maps/geodesy'
import type { LngLat } from '@winterop-com/sokkel-ui-maps/geometry'
import { parseMgrs, toMgrs } from '@winterop-com/sokkel-ui-tracking/geo'
import { KNOT, type Track } from '@winterop-com/sokkel-ui-tracking/track'

import type { Settings } from './settings'

const CLOCK = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
const STAMP = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
})

/** A simulated moment as the watch's clock says it, in UTC: `18:42:10`. */
export const formatClock = (at: number): string => `${CLOCK.format(at)} UTC`

/** A simulated moment with its day, for the log: `Nov 20, 18:42:10`. */
export const formatStamp = (at: number): string => STAMP.format(at)

/** A position as the settings write it: latitude and longitude, or an MGRS reference. */
export function formatPosition(position: LngLat, options: Pick<Settings, 'coordinates' | 'format'>): string {
    if (options.coordinates === 'mgrs') return toMgrs(position) ?? formatCoordinates(position, options.format)
    return formatCoordinates(position, options.format)
}

/** A position read as latitude, longitude or as an MGRS reference, whichever it is written as. */
export function readPosition(text: string): LngLat | null {
    return parseCoordinates(text) ?? parseMgrs(text, { center: true }) ?? null
}

/** A distance in the settings' unit. */
export const formatRange = (meters: number, unit: DistanceUnit): string => formatDistance(meters, unit)

/** A track's speed over ground in knots, rounded, as sea and air both say it. */
export function knotsOf(track: Pick<Track, 'speed'>): number | undefined {
    return track.speed === undefined ? undefined : Math.round(track.speed / KNOT)
}

/** A track's altitude as a flight level: `FL310`. */
export function flightLevel(meters: number | undefined): string | undefined {
    if (meters === undefined) return undefined
    return `FL${String(Math.round(meters / 0.3048 / 100)).padStart(3, '0')}`
}

/** A track's speed, heading and, for an aircraft, its flight level, as one quiet line. */
export function motionLine(track: Track): string | undefined {
    const knots = knotsOf(track)
    if (knots === undefined && track.altitude === undefined) return undefined
    const parts = [
        track.kind === 'aircraft' ? flightLevel(track.altitude) : undefined,
        knots === undefined ? undefined : `${String(knots)} kn`,
        track.heading === undefined ? undefined : `${String(Math.round(track.heading) % 360).padStart(3, '0')}°`,
    ]
    return parts.filter((part) => part !== undefined).join(' · ')
}
