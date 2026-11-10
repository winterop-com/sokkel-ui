import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { RUN_STATUS_MAP, resolveStatus, STATUS_CSS, STATUS_INK_CSS, type StatusColor, type StatusMap } from '../lib/status'

/** The app's states, over the run states, for every status part inside the provider. */
const StatusMapContext = createContext<StatusMap>(RUN_STATUS_MAP)

export interface StatusProviderProps {
    /** The app's own states, by the value its data holds; a run state named here takes the app's words or color. */
    statuses: StatusMap
    children: ReactNode
}

/**
 * Tells every status part inside it the app's own states, so a chip, a dot or a timeline says
 * `draft` or `published` in the app's words and colors without being told each time. The run states
 * stay known; naming one here changes its words or color. A provider inside another adds to it.
 */
export function StatusProvider({ statuses, children }: StatusProviderProps) {
    const outer = useContext(StatusMapContext)
    const merged = useMemo(() => ({ ...outer, ...statuses }), [outer, statuses])
    return <StatusMapContext.Provider value={merged}>{children}</StatusMapContext.Provider>
}

/** A state as the status parts draw it: its words, its color, and that color as a CSS color. */
export interface StatusLook {
    label: string
    color: StatusColor
    /** The color as the raw token, for a part that takes a CSS color (`Stat`'s and `Segmented`'s `dot`). */
    css: string
    /** The color's ink as the raw token, for words or an outline in the color. */
    ink: string
}

/**
 * A state looked up as the status parts look it up: in `statuses` when given, then the nearest
 * `StatusProvider`, then the run states. A state none of them knows is said by its name and drawn
 * neutral.
 */
export function useStatus(status: string, statuses?: StatusMap): StatusLook {
    const provided = useContext(StatusMapContext)
    const { label, color } = resolveStatus(status, statuses === undefined ? provided : { ...provided, ...statuses })
    return { label, color, css: STATUS_CSS[color], ink: STATUS_INK_CSS[color] }
}
