/**
 * What the network watch holds: the person's preferences, the alerts raised and what is already
 * known (the processes seen talking out and the countries reached), and the places home can be.
 */

/** Where the readings come from: the simulation, or this machine's own connections in the Electron shell. */
export type SourceKind = 'simulated' | 'machine'

/** What the map's links and hosts are colored by. */
export type ColorBy = 'state' | 'process'

/** What the connections table gathers its rows under. */
export type GroupBy = 'none' | 'process' | 'remote'

export interface Prefs {
    id: string
    /** Reads the source on every tick; off, every page holds still. */
    live: boolean
    source: SourceKind
    /** How often this machine's connections are read, in milliseconds. */
    interval: number
    /** The city this machine stands in on the map. */
    home: string
    colorBy: ColorBy
    groupBy: GroupBy
    /** How far back the traffic charts reach, in seconds. */
    span: number
    alertCountry: boolean
    alertProcess: boolean
    alertSpike: boolean
    /** A process receiving faster than this, in megabytes a second, raises a spike. */
    spikeIn: number
    /** A process sending faster than this, in megabytes a second, raises a spike. */
    spikeOut: number
}

export const DEFAULT_PREFS: Omit<Prefs, 'id'> = {
    live: true,
    source: 'simulated',
    interval: 5000,
    home: 'oslo',
    colorBy: 'state',
    groupBy: 'none',
    span: 300,
    alertCountry: true,
    alertProcess: true,
    alertSpike: true,
    spikeIn: 5,
    spikeOut: 2.5,
}

export const INTERVALS = [
    { value: 2000, label: '2 s' },
    { value: 5000, label: '5 s' },
    { value: 10_000, label: '10 s' },
] as const

export const SPANS = [
    { value: 60, label: '1 min' },
    { value: 300, label: '5 min' },
    { value: 900, label: '15 min' },
] as const

/** Where this machine may stand, plain cities with their positions. */
export const HOMES = [
    { value: 'oslo', label: 'Oslo', at: [10.75, 59.91] },
    { value: 'amsterdam', label: 'Amsterdam', at: [4.9, 52.37] },
    { value: 'chicago', label: 'Chicago', at: [-87.63, 41.88] },
    { value: 'singapore', label: 'Singapore', at: [103.82, 1.35] },
    { value: 'sydney', label: 'Sydney', at: [151.21, -33.87] },
] as const satisfies readonly { value: string; label: string; at: [number, number] }[]

export function homeOf(value: string): (typeof HOMES)[number] {
    return HOMES.find((home) => home.value === value) ?? HOMES[0]
}

export type AlertKind = 'country' | 'process' | 'spike'

export interface Alert {
    id: string
    kind: AlertKind
    title: string
    detail: string
    at: number
    acknowledged: boolean
    acknowledgedAt?: number
    process?: string
    address?: string
    country?: string
}

export const ALERT_KINDS: Record<AlertKind, string> = {
    country: 'New country',
    process: 'New process',
    spike: 'Rate spike',
}

/** Something already seen, so seeing it again raises nothing: a process that talked out, or a country reached. */
export interface Known {
    id: string
    kind: 'process' | 'country'
    value: string
    firstSeen: number
}
