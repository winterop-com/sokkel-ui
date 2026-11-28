import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { RUN_STATUS_MAP, resolveStatus, STATUS_CSS, STATUS_INK_CSS, type StatusColor, type StatusMap } from '../lib/status'

/** The app's states, over the run states, for every status part inside the provider. */
const StatusMapContext = createContext<StatusMap>(RUN_STATUS_MAP)

/** How the status parts inside a provider draw by default. */
interface StatusDefaults {
    dot: boolean
    fallback: StatusColor
}

const StatusDefaultsContext = createContext<StatusDefaults>({ dot: false, fallback: 'neutral' })

/** Whether a `StatusChip` inside the nearest provider draws its dot when not told. */
export function useStatusDot(): boolean {
    return useContext(StatusDefaultsContext).dot
}

export interface StatusProviderProps {
    /** The app's own states, by the value its data holds; a run state named here takes the app's words or color. */
    statuses?: StatusMap
    /** Every `StatusChip` inside draws its dot unless told otherwise. */
    dot?: boolean
    /** The color a state none of the maps knows is drawn in; neutral by default. */
    fallback?: StatusColor
    children: ReactNode
}

/**
 * Tells every status part inside it the app's own states, so a chip, a dot or a timeline says
 * `draft` or `published` in the app's words and colors without being told each time. The run states
 * stay known; naming one here changes its words or color. `dot` gives every `StatusChip` inside its
 * dot, and `fallback` colors a state no map knows. A provider inside another adds to it.
 */
export function StatusProvider({ statuses, dot, fallback, children }: StatusProviderProps) {
    const outer = useContext(StatusMapContext)
    const outerDefaults = useContext(StatusDefaultsContext)
    const merged = useMemo(() => (statuses === undefined ? outer : { ...outer, ...statuses }), [outer, statuses])
    const defaults = useMemo(
        () => ({ dot: dot ?? outerDefaults.dot, fallback: fallback ?? outerDefaults.fallback }),
        [dot, fallback, outerDefaults],
    )
    return (
        <StatusDefaultsContext.Provider value={defaults}>
            <StatusMapContext.Provider value={merged}>{children}</StatusMapContext.Provider>
        </StatusDefaultsContext.Provider>
    )
}

/** A state as the status parts draw it: its words, its color, and that color as a CSS color. */
export interface StatusLook {
    label: string
    color: StatusColor
    /** The color as the raw token, for a part that takes a CSS color (`Stat`'s and `Segmented`'s `dot`). */
    css: string
    /** The color's ink as the raw token, for words or an outline in the color. */
    ink: string
    /** Whether the state is happening now, so its dot pulses. */
    live: boolean
}

/**
 * A state looked up as the status parts look it up: in `statuses` when given, then the nearest
 * `StatusProvider`, then the run states. A state none of them knows is said by its name and drawn
 * neutral.
 */
export function useStatus(status: string, statuses?: StatusMap): StatusLook {
    const provided = useContext(StatusMapContext)
    const { fallback } = useContext(StatusDefaultsContext)
    const { label, color, live } = resolveStatus(status, statuses === undefined ? provided : { ...provided, ...statuses }, fallback)
    return { label, color, css: STATUS_CSS[color], ink: STATUS_INK_CSS[color], live }
}
