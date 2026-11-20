import { createStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import type { DistanceUnit } from '@winterop-com/sokkel-ui-maps/geodesy'

/** How positions are written: latitude and longitude, or an MGRS grid reference. */
export type CoordinateSystem = 'latlon' | 'mgrs'

/** What the watch keeps between visits: its units, and how the simulated feed runs. */
export interface Settings {
    /** The unit distances are written in: on the ruler, the links, the range rings and the facts. */
    unit: DistanceUnit
    /** How positions are written, under the map and in a track's facts, and what go to takes. */
    coordinates: CoordinateSystem
    /** How latitude and longitude are written: decimal degrees, or degrees, minutes and seconds. */
    format: 'decimal' | 'dms'
    /** How many simulated seconds pass each second. */
    speed: 1 | 10 | 30 | 60
    /** Whether the feed holds still. */
    paused: boolean
    /** The seed the simulated waters are drawn from: the same seed, the same contacts. */
    seed: number
    /** Whether each track draws where it has been. */
    trails: boolean
    /** Whether each track's name is written beside it. */
    labels: boolean
    /** Whether the radars' cover and the rings round harbor are drawn. */
    coverage: boolean
    /** Whether a line joins each running task's unit to its target. */
    links: boolean
}

export const DEFAULT_SETTINGS: Settings = {
    unit: 'nmi',
    coordinates: 'latlon',
    format: 'decimal',
    speed: 30,
    paused: false,
    seed: 1,
    trails: true,
    labels: true,
    coverage: true,
    links: true,
}

/** The watch's settings, kept in this browser and shared by every page. */
export const settings = createStore<Settings>(DEFAULT_SETTINGS, {
    key: 'settings',
    check: (value) => typeof value === 'object' && value !== null && 'unit' in value,
})

/** Changes some settings and keeps the rest. */
export function setSettings(patch: Partial<Settings>): void {
    settings.update((current) => ({ ...current, ...patch }))
}
