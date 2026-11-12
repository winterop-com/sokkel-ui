import { Cog, Database } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { Status } from '@winterop-com/sokkel-ui/StatusChip'
import { fitDirection, GraphCanvas, wrapFor, type GraphViewProps } from './GraphCanvas'
import { FIT_MIN_ZOOM } from './layout'
import { useNodeGraph, type GraphItem, type GraphLink } from './use-node-graph'

/** One thing in a lineage: a dataset, or a job that reads datasets and writes others. */
export interface LineageNode {
    code: string
    name?: string
    /** Whether the node is a dataset or a job, drawn with a shape and glyph of its own. */
    role: 'dataset' | 'job'
    /** What sort of dataset or job it is, on the code line. */
    kind?: string
    status?: Status
}

/** One edge of a lineage: `from` feeds `to`, a dataset read by a job or a job writing a dataset. */
export interface LineageEdge {
    from: string
    to: string
}

export type DependencyGraphProps = GraphViewProps & { nodes: LineageNode[]; edges: LineageEdge[] }

/**
 * A lineage of datasets and jobs, each after what feeds it. A dataset is drawn with round corners and
 * a cylinder, a job as a plain box with a cog, so the two read apart without color.
 */
export function DependencyGraph({
    nodes,
    edges,
    selected = null,
    onSelect,
    direction: given,
    frame = 'stage',
    zoomOnDoubleClick,
    fitMinZoom,
    narrowFit,
    tallFit,
    onControls,
    fillFloor,
    wrapToCanvas,
    controls,
    wrapWidth,
    routing,
    spacing,
    minNodeWidth,
    maxNodeWidth,
    words,
    className,
}: DependencyGraphProps) {
    const [size, setSize] = useState<{ width: number; height: number }>()
    const direction = given ?? fitDirection(size?.width)
    const wrap = wrapFor(
        wrapWidth,
        wrapToCanvas,
        size === undefined ? undefined : { width: size.width, height: frame === 'fitted' ? 0 : size.height },
        Math.min(fitMinZoom ?? FIT_MIN_ZOOM, tallFit ?? Infinity),
    )
    const items = useMemo<GraphItem[]>(
        () =>
            nodes.map((node) => ({
                id: node.code,
                data: {
                    code: node.code,
                    name: node.name,
                    kind: node.kind,
                    status: node.status,
                    icon: node.role === 'dataset' ? Database : Cog,
                    shape: node.role === 'dataset' ? 'round' : 'box',
                },
            })),
        [nodes],
    )
    const links = useMemo<GraphLink[]>(() => edges.map((edge) => ({ source: edge.from, target: edge.to, arrow: true })), [edges])
    const graph = useNodeGraph(items, links, { direction, selected, routing, spacing, ...wrap, minNodeWidth, maxNodeWidth })
    return (
        <GraphCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            settled={graph.settled}
            direction={direction}
            onSize={setSize}
            frame={frame}
            zoomOnDoubleClick={zoomOnDoubleClick}
            narrowFit={narrowFit}
            tallFit={tallFit}
            onControls={onControls}
            fillFloor={fillFloor}
            controls={controls}
            fitMinZoom={fitMinZoom}
            layoutKey={`${String(routing)}|${String(spacing)}|${String(wrapWidth)}|${String(wrapToCanvas)}`}
            onSelect={onSelect}
            words={words}
            className={className}
        />
    )
}
