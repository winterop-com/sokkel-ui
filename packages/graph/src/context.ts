import { createContext, useContext } from 'react'

import type { GraphEditing, GraphWords } from './GraphCanvas'
import type { GraphDirection, GraphPoint } from './layout'

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

/** A box in the graph's own pixels: its top-left corner and its size. */
export interface GraphBox {
    x: number
    y: number
    width: number
    height: number
}

/**
 * What moves the view of a canvas: what its zoom buttons do, for a toolbar of the app's, and where
 * things stand on it, for placing what the app adds.
 */
export interface GraphControls {
    zoomIn: () => void
    zoomOut: () => void
    /** Fits the whole graph, and keeps it fitted again as it changes. */
    fit: () => void
    /** The canvas has nothing on it to zoom or fit. */
    empty: boolean
    /** Where a node's box stands as drawn, in the graph's pixels, or null for a node not on the canvas. */
    nodeBox: (id: string) => GraphBox | null
    /** A point on the screen, such as a pointer's, as a point in the graph's coordinates. */
    toGraph: (point: { clientX: number; clientY: number }) => GraphPoint
}

export const GraphControlsContext = createContext<GraphControls | null>(null)

/** The view controls of the canvas this is drawn over, or null outside one. */
export function useGraphControls(): GraphControls | null {
    return useContext(GraphControlsContext)
}
