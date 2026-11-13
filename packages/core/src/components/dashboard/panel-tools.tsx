import { createContext, useContext, type ReactNode } from 'react'

/**
 * What a dashboard panel's head draws at its end beside its own tools, handed down by the grid
 * around it: an arranged grid's grip, size and remove. A module apart from the arranged grid, so a
 * panel draws the slot without carrying the drag.
 */
const PanelToolsContext = createContext<ReactNode>(null)

export interface PanelToolsProviderProps {
    /** The tools every panel inside draws in its head. */
    tools: ReactNode
    children?: ReactNode
}

/** Hands the panels inside it the tools their heads draw. */
export function PanelToolsProvider({ tools, children }: PanelToolsProviderProps) {
    return <PanelToolsContext.Provider value={tools}>{children}</PanelToolsContext.Provider>
}

/** The tools the grid around a panel gives its head, or null outside an arranged grid. */
export function usePanelTools(): ReactNode {
    return useContext(PanelToolsContext)
}

/** The tools the grid around a panel gives its head; nothing outside an arranged grid. */
export function PanelTools() {
    return <>{useContext(PanelToolsContext)}</>
}
