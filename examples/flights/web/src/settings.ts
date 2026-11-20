import { createStore } from '@winterop-com/sokkel-ui/hooks/use-store'

/** Where the aircraft come from: the simulation, or adsb.lol's public API. */
export type Source = 'simulated' | 'live'

/** What the watch keeps between visits: the feed, how the map paints, and the units it writes. */
export interface Settings {
    source: Source
    /** Seconds between two reads of the live feed: never under ten, to keep to the API's fair use. */
    interval: 15 | 30 | 60
    /** Whether the feed keeps coming; off holds the watch still. */
    running: boolean
    colorBy: 'altitude' | 'affiliation'
    /** Minutes of trail behind each aircraft; 0 draws none. */
    trail: 0 | 2 | 5 | 10
    labels: boolean
    /** Feet, knots and nautical miles, or meters, kilometers an hour and kilometers. */
    units: 'aviation' | 'metric'
    coordinates: 'decimal' | 'dms'
    /** The zone times are written in. */
    zone: 'utc' | 'local'
}

export const DEFAULT_SETTINGS: Settings = {
    source: 'simulated',
    interval: 30,
    running: true,
    colorBy: 'altitude',
    trail: 5,
    labels: true,
    units: 'aviation',
    coordinates: 'decimal',
    zone: 'utc',
}

/** The watch's settings, kept in this browser and shared by every page. */
export const settings = createStore<Settings>(DEFAULT_SETTINGS, {
    key: 'settings',
    check: (value) => typeof value === 'object' && value !== null && 'source' in value,
    normalize: (value) => ({ ...DEFAULT_SETTINGS, ...value }),
})

/** Changes some settings and keeps the rest. */
export function setSettings(patch: Partial<Settings>): void {
    settings.update((current) => ({ ...current, ...patch }))
}
