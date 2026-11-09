import { createStore } from '@winterop-com/sokkel-ui/hooks/use-store'

/** How often the simulation makes something go wrong. */
export type Weather = 'calm' | 'normal' | 'stormy'

/** What the board keeps between visits: how it updates, what it tells and what the status page shows. */
export interface Settings {
    /** How often the board takes a reading, in milliseconds. */
    interval: 1000 | 2000 | 5000
    /** Whether the readings keep coming; off holds the board still. */
    live: boolean
    weather: Weather
    /** Whether a service going wrong opens an incident by itself. */
    autoIncidents: boolean
    /** Whether the on-call person's updates move an incident the board opened along, until a person posts. */
    responder: boolean
    /** Which changes of state a notice tells: every one, only outages, or none. */
    notify: 'all' | 'outages' | 'off'
    clock: 12 | 24
    /** The status page's title. */
    pageTitle: string
    /** Whether the status page shows each service's last ninety days. */
    showUptime: boolean
    /** How many days of past incidents the status page lists. */
    historyDays: 7 | 14
}

export const DEFAULT_SETTINGS: Settings = {
    interval: 2000,
    live: true,
    weather: 'normal',
    autoIncidents: true,
    responder: true,
    notify: 'all',
    clock: 24,
    pageTitle: 'Tidevann status',
    showUptime: true,
    historyDays: 7,
}

/** The board's settings, kept in this browser and shared by every page. */
export const settings = createStore<Settings>(DEFAULT_SETTINGS, {
    key: 'settings',
    prefix: 'tidevann-status.',
    check: (value) => typeof value === 'object' && value !== null && 'interval' in value,
})

/** Changes some settings and keeps the rest. */
export function setSettings(patch: Partial<Settings>): void {
    settings.update((current) => ({ ...current, ...patch }))
}
