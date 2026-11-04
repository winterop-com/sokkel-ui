import type { Edge, Node } from '@xyflow/react'
import { useMemo } from 'react'

import type { GraphEdgeData } from './GraphEdge'
import { graphNodeSize, type GraphNodeData } from './GraphNode'
import type { GraphDirection, GraphShape } from './layout'
import { useMeasure } from './measure'
import { useGraphLayout } from './use-graph-layout'

/** One node of a graph given as data: a node box by default, or a node kind of the canvas's with its own size. */
export interface GraphItem {
    id: string
    data: GraphNodeData
    /** A node kind the canvas was given; `box` when left out. */
    type?: string
    /** The size a node of another kind is drawn at; a box is measured from its words. */
    size?: { width: number; height: number }
    /** False for a node that cannot be chosen, such as a marker. */
    selectable?: boolean
}

/** One edge of a graph given as data. */
export interface GraphLink {
    source: string
    target: string
    label?: string
    tone?: GraphEdgeData['tone']
    arrow?: boolean
}

/** The room a label's chip takes around its words. */
const LABEL_CHROME = { width: 10, height: 17 }

/**
 * A graph given as data, measured, placed and turned into React Flow's nodes and edges for
 * `GraphCanvas`, with `selected` marked. Nodes are measured in the page's fonts once they load, and
 * `settled` turns true once elk has placed the measured shape.
 */
export function useNodeGraph(
    items: readonly GraphItem[],
    links: readonly GraphLink[],
    { direction = 'right', selected = null }: { direction?: GraphDirection; selected?: string | null } = {},
): { nodes: Node[]; edges: Edge[]; settled: boolean } {
    const { measure, ready } = useMeasure()

    const ids = useMemo(() => {
        const seen = new Map<string, number>()
        return links.map((link) => {
            const base = `${link.source}->${link.target}`
            const count = seen.get(base) ?? 0
            seen.set(base, count + 1)
            return count === 0 ? base : `${base}#${String(count)}`
        })
    }, [links])

    const shape = useMemo<GraphShape>(
        () => ({
            nodes: items.map((item) => ({ id: item.id, ...(item.size ?? graphNodeSize(item.data, measure)) })),
            edges: links.map((link, index) => ({
                id: ids[index] as string,
                source: link.source,
                target: link.target,
                ...(link.label === undefined
                    ? {}
                    : {
                          label: {
                              text: link.label,
                              width: Math.ceil(measure(link.label, 'small-mono') + LABEL_CHROME.width),
                              height: LABEL_CHROME.height,
                          },
                      }),
            })),
        }),
        [items, links, ids, measure],
    )

    const placed = useGraphLayout(shape, direction, ready)

    const nodes = useMemo<Node[]>(() => {
        const byId = new Map(items.map((item) => [item.id, item]))
        return placed.nodes.flatMap((node) => {
            const item = byId.get(node.id)
            if (item === undefined) return []
            return [
                {
                    id: node.id,
                    type: item.type ?? 'box',
                    position: { x: node.x, y: node.y },
                    width: node.width,
                    height: node.height,
                    measured: { width: node.width, height: node.height },
                    selected: node.id === selected,
                    selectable: item.selectable ?? true,
                    focusable: item.selectable ?? true,
                    draggable: false,
                    connectable: false,
                    className:
                        'rounded-node outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
                    data: item.data,
                },
            ]
        })
    }, [items, placed, selected])

    const edges = useMemo<Edge[]>(() => {
        const byId = new Map(placed.edges.map((edge) => [edge.id, edge]))
        return links.flatMap((link, index) => {
            const id = ids[index] as string
            // A link from a node to itself is not placed; it is drawn as a loop beside its node.
            const edge = link.source === link.target ? { id, source: link.source, target: link.target } : byId.get(id)
            if (edge === undefined) return []
            const data: GraphEdgeData = {
                ...(edge.points === undefined ? {} : { points: edge.points }),
                ...(edge.labelAt === undefined ? {} : { labelAt: edge.labelAt }),
                ...(link.label === undefined ? {} : { label: link.label }),
                ...(link.tone === undefined ? {} : { tone: link.tone }),
                ...(link.arrow === undefined ? {} : { arrow: link.arrow }),
                ...(link.source === link.target ? { loop: true } : {}),
            }
            return [{ id: edge.id, source: edge.source, target: edge.target, type: 'graph', data }]
        })
    }, [links, ids, placed])

    return { nodes, edges, settled: placed.settled }
}
