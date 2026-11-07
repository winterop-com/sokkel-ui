import { createContext, useContext } from 'react'

import type { GraphEditing, GraphWords } from './GraphCanvas'
import type { GraphDirection } from './layout'

/** The direction the canvas a node stands on is laid out in. */
export const GraphDirectionContext = createContext<GraphDirection>('right')

/** Which way the graph a node stands on runs, which decides the sides its edges leave and arrive on. */
export function useGraphDirection(): GraphDirection {
    return useContext(GraphDirectionContext)
}

/** Whether the canvas a node stands on is editable, which shows its ports. */
export const GraphEditableContext = createContext(false)

/** What an editable canvas tells the nodes and edges on it. */
export interface GraphEditingState {
    editing: GraphEditing
    words: GraphWords
    /** The edge under the pointer, whose add button shows. */
    hovered: string | null
    /** The pointer came onto an edge or its add button, or left it (null). */
    hover: (edge: string | null) => void
}

/** The gestures of the editable canvas a node or edge stands on, or null on a view. */
export const GraphEditingContext = createContext<GraphEditingState | null>(null)

/** What moves the view of a canvas: what its zoom buttons do, for a toolbar of the app's. */
export interface GraphControls {
    zoomIn: () => void
    zoomOut: () => void
    /** Fits the whole graph, and keeps it fitted again as it changes. */
    fit: () => void
    /** The canvas has nothing on it to zoom or fit. */
    empty: boolean
}

export const GraphControlsContext = createContext<GraphControls | null>(null)

/** The view controls of the canvas this is drawn over, or null outside one. */
export function useGraphControls(): GraphControls | null {
    return useContext(GraphControlsContext)
}
