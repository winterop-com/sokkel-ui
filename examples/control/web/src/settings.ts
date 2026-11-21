import { createStore } from '@winterop-com/sokkel-ui/hooks/use-store'

/** Whether a source is read at all, and whether its live read is wanted or its simulation alone. */
export interface SourceChoice {
    on: boolean
    live: boolean
}

/** What the control site keeps between visits: which sources are read, how the wall moves, and how the map draws. */
export interface Settings {
    /** Each source's choice, by its id; a source not named is on and live. */
    sources: Record<string, SourceChoice>
    /** Whether the wall's camera moves from one region to the next by itself. */
    cycle: boolean
    /** Seconds the wall's camera stays on a region. */
    dwell: 15 | 30 | 60
    /** Whether the wall draws the world as a globe. */
    globe: boolean
    /** Whether tracks are written with their names on the map. */
    labels: boolean
    /** Whether tracks draw their trails. */
    trails: boolean
    /** The zone times are written in. */
    zone: 'utc' | 'local'
}

export const DEFAULT_SETTINGS: Settings = {
    sources: {},
    cycle: true,
    dwell: 30,
    globe: true,
    labels: true,
    trails: true,
    zone: 'utc',
}

/** The control site's settings, kept in this browser and shared by every page. */
export const settings = createStore<Settings>(DEFAULT_SETTINGS, {
    key: 'settings',
    check: (value) => typeof value === 'object' && value !== null && 'sources' in value,
    normalize: (value) => ({ ...DEFAULT_SETTINGS, ...value }),
})

/** Changes some settings and keeps the rest. */
export function setSettings(patch: Partial<Settings>): void {
    settings.update((current) => ({ ...current, ...patch }))
}

/** Changes one source's choice and keeps the rest. */
export function chooseSource(id: string, patch: Partial<SourceChoice>): void {
    settings.update((current) => ({
        ...current,
        sources: { ...current.sources, [id]: { on: current.sources[id]?.on ?? true, live: current.sources[id]?.live ?? true, ...patch } },
    }))
}
