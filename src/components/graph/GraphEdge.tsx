import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, Position, type Edge, type EdgeProps } from '@xyflow/react'

import { midpointOf, routedPath, type GraphPoint } from './layout'

/** What a graph edge carries: elk's route once it has one, and how the edge is drawn. */
export interface GraphEdgeData extends Record<string, unknown> {
    points?: GraphPoint[]
    labelAt?: GraphPoint
    label?: string
    /** `quiet` is dashed, for a way not taken yet; `strong` is drawn darker, for the way in use. */
    tone?: 'plain' | 'quiet' | 'strong'
    /** An arrowhead at the target end. */
    arrow?: boolean
    /** The edge leaves and returns to one node, drawn as a loop beside it. */
    loop?: boolean
}

/** The edge kind React Flow draws a graph edge for. */
export type GraphEdgeKind = Edge<GraphEdgeData, 'graph'>

const ARROW = 7

/** The arrowhead at `tip`, pointing the way the edge last ran. */
function arrowPath(tip: GraphPoint, from: GraphPoint): string {
    const length = Math.hypot(tip.x - from.x, tip.y - from.y) || 1
    const ux = (tip.x - from.x) / length
    const uy = (tip.y - from.y) / length
    const base = { x: tip.x - ux * ARROW, y: tip.y - uy * ARROW }
    const half = ARROW / 2
    return `M ${String(tip.x)} ${String(tip.y)} L ${String(base.x - uy * half)} ${String(base.y + ux * half)} L ${String(base.x + uy * half)} ${String(base.y - ux * half)} Z`
}

/** The point an edge arriving on a side of a box comes from, one arrow's length out. */
function behind(tip: GraphPoint, side: Position): GraphPoint {
    if (side === Position.Left) return { x: tip.x - ARROW, y: tip.y }
    if (side === Position.Right) return { x: tip.x + ARROW, y: tip.y }
    if (side === Position.Top) return { x: tip.x, y: tip.y - ARROW }
    return { x: tip.x, y: tip.y + ARROW }
}

const LOOP = 36

/** A loop from a node's source handle back to its target handle: over the top drawn right, round the right side drawn down. */
function loopOf(sx: number, sy: number, tx: number, ty: number, down: boolean): { path: string; from: GraphPoint; labelAt: GraphPoint } {
    if (down) {
        const side = Math.max(sx, tx) + LOOP * 2
        return {
            path: `M ${String(sx)} ${String(sy)} C ${String(side)} ${String(sy + LOOP)}, ${String(side)} ${String(ty - LOOP)}, ${String(tx)} ${String(ty)}`,
            from: { x: tx + 4, y: ty - ARROW },
            labelAt: { x: side - LOOP / 2, y: (sy + ty) / 2 },
        }
    }
    const top = Math.min(sy, ty) - LOOP * 1.6
    return {
        path: `M ${String(sx)} ${String(sy)} C ${String(sx + LOOP)} ${String(top)}, ${String(tx - LOOP)} ${String(top)}, ${String(tx)} ${String(ty)}`,
        from: { x: tx - ARROW, y: ty - 4 },
        labelAt: { x: (sx + tx) / 2, y: top + LOOP * 0.4 },
    }
}

/**
 * One edge, along the route elk gave it, or a stepped line between the two handles until elk has
 * answered. A label sits where elk made room for it, or at the middle of the line.
 */
export function GraphEdge({ id, data, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }: EdgeProps<GraphEdgeKind>) {
    const points = data?.points
    const routed = points !== undefined && points.length >= 2 && data?.loop !== true
    const [stepped, middleX, middleY] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 6,
    })
    const loop = data?.loop === true ? loopOf(sourceX, sourceY, targetX, targetY, sourcePosition === Position.Bottom) : null
    const path = loop?.path ?? (routed ? routedPath(points) : stepped)
    const tip = routed ? (points[points.length - 1] as GraphPoint) : { x: targetX, y: targetY }
    const from = loop?.from ?? (routed ? (points[points.length - 2] as GraphPoint) : behind(tip, targetPosition))
    const labelAt = loop?.labelAt ?? data?.labelAt ?? (routed ? midpointOf(points) : undefined) ?? { x: middleX, y: middleY }
    const tone = data?.tone ?? 'plain'
    const stroke = tone === 'strong' ? 'var(--muted-foreground)' : 'var(--xy-edge-stroke)'
    return (
        <>
            <BaseEdge
                id={id}
                path={path}
                style={{ stroke, strokeWidth: tone === 'strong' ? 1.75 : 1.4, strokeDasharray: tone === 'quiet' ? '4 4' : undefined }}
            />
            {data?.arrow === true && <path d={arrowPath(tip, from)} style={{ fill: stroke }} aria-hidden />}
            {data?.label !== undefined && (
                <EdgeLabelRenderer>
                    <span
                        className="nodrag nopan pointer-events-none absolute rounded-chip border border-border bg-card px-1 font-mono text-graph-small text-muted-foreground"
                        style={{ transform: `translate(-50%, -50%) translate(${String(labelAt.x)}px, ${String(labelAt.y)}px)` }}
                    >
                        {data.label}
                    </span>
                </EdgeLabelRenderer>
            )}
        </>
    )
}
