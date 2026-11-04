import { createContext, useContext } from 'react'

import type { GraphDirection } from './layout'

/** The direction the canvas a node stands on is laid out in. */
export const GraphDirectionContext = createContext<GraphDirection>('right')

/** Which way the graph a node stands on runs, which decides the sides its edges leave and arrive on. */
export function useGraphDirection(): GraphDirection {
    return useContext(GraphDirectionContext)
}
