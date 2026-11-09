import { useEffect, useMemo, useState, type CSSProperties } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import type { Status } from '@winterop-com/sokkel-ui/StatusChip'
import { useStatus } from '@winterop-com/sokkel-ui/StatusProvider'
import {
    boundsOf,
    edgePath,
    layoutGraph,
    rankLayout,
    roughRoute,
    shapeSignature,
    type ElkEngine,
    type GraphDirection,
    type GraphRouting,
    type GraphShape,
    type PlacedGraph,
    type PlacedNode,
} from './layout'

/** One step of a mini graph: its code, an optional name, the steps it needs and its state. A `RunStep` or a `PipelineStep` is one. */
export interface MiniGraphStep {
    code: string
    name?: string
    needs: readonly string[]
    /** A run state, or a state the app names in the status map, filling the step's box in its color. */
    status?: Status | (string & {})
}

/** The size every step of a mini graph is laid out at, before the drawing is scaled to its box. */
export const MINI_NODE = { width: 24, height: 12 }

/** The ground kept around the drawing, in the drawing's own units, so the strokes at its edges show whole. */
const MINI_PAD = 2

/** The states a run has not reached, drawn as an outline in their color rather than filled. */
const AHEAD: ReadonlySet<string> = new Set(['queued', 'pending', 'waiting', 'skipped', 'cancelled'])

/** The shape of a mini graph: a box of one size per step, and an edge from each step a step needs, to it. */
export function miniGraphShape(steps: readonly MiniGraphStep[]): GraphShape {
    const known = new Set(steps.map((step) => step.code))
    const seen = new Set<string>()
    const edges = steps.flatMap((step) =>
        step.needs.flatMap((need) => {
            const id = `${need}->${step.code}`
            if (!known.has(need) || need === step.code || seen.has(id)) return []
            seen.add(id)
            return [{ id, source: need, target: step.code }]
        }),
    )
    return { nodes: steps.map((step) => ({ id: step.code, ...MINI_NODE })), edges }
}

/** The most placements kept; a list of many pipelines of one shape asks elk once. */
const KEPT = 400
const placements = new Map<string, PlacedGraph>()
const asking = new Map<string, Promise<PlacedGraph>>()

/** A placement elk already gave for a signature, if one is kept. */
function heldPlacement(signature: string): PlacedGraph | undefined {
    return placements.get(signature)
}

/**
 * A mini graph's shape placed by elk, compact, in the routing given. Placements are kept by
 * signature, so many rows drawing the same pipeline ask elk once between them.
 */
export function placeMiniGraph(
    shape: GraphShape,
    direction: GraphDirection = 'right',
    routing: GraphRouting = 'orthogonal',
    elk?: ElkEngine,
): Promise<PlacedGraph> {
    const signature = shapeSignature(shape, direction, { routing, spacing: 'compact' })
    const held = placements.get(signature)
    if (held !== undefined) return Promise.resolve(held)
    const pending = asking.get(signature)
    if (pending !== undefined) return pending
    const asked = layoutGraph(shape, direction, elk, { routing, spacing: 'compact' }).then(
        (placed) => {
            asking.delete(signature)
            if (placements.size >= KEPT) placements.delete(placements.keys().next().value as string)
            placements.set(signature, placed)
            return placed
        },
        (reason: unknown) => {
            asking.delete(signature)
            throw reason
        },
    )
    asking.set(signature, asked)
    return asked
}

/** The placement a mini graph draws: elk's when it has one for the shape, else the rank layout until it answers. */
function useMiniPlacement(shape: GraphShape, direction: GraphDirection, routing: GraphRouting): PlacedGraph {
    const signature = shapeSignature(shape, direction, { routing, spacing: 'compact' })
    const [answer, setAnswer] = useState<{ signature: string; placed: PlacedGraph } | null>(null)
    useEffect(() => {
        if (heldPlacement(signature) !== undefined) return
        let current = true
        placeMiniGraph(shape, direction, routing).then(
            (placed) => {
                if (current) setAnswer({ signature, placed })
            },
            () => undefined,
        )
        return () => {
            current = false
        }
        // The placement is a function of the signature alone.
        // oxlint-disable-next-line react/exhaustive-deps
    }, [signature])
    // oxlint-disable-next-line react/exhaustive-deps
    const rough = useMemo(() => rankLayout(shape, direction, 'compact'), [signature])
    return heldPlacement(signature) ?? (answer?.signature === signature ? answer.placed : rough)
}

export interface MiniGraphProps {
    steps: readonly MiniGraphStep[]
    /** `right` when left out. */
    direction?: GraphDirection
    /** How the edges are routed, as on the full graph: `orthogonal` when left out. */
    routing?: GraphRouting
    /** The drawing's accessible name, such as the pipeline's. */
    label?: string
    className?: string
}

/**
 * A pipeline drawn small, for a list row, a card or a preview: a box per step, filled in its state's
 * color, and the edges between them, laid out by elk as the full graph is and scaled to fit its box.
 * It is a still drawing in SVG with nothing to pan, zoom or press, so a list draws many at the cost
 * of one layout per shape; pointing at a step names it. It is a box as wide as its container and
 * `h-8` tall unless a class sizes it.
 */
export function MiniGraph({ steps, direction = 'right', routing = 'orthogonal', label, className }: MiniGraphProps) {
    const shape = useMemo(() => miniGraphShape(steps), [steps])
    const placed = useMiniPlacement(shape, direction, routing)
    const byId = useMemo(() => new Map(placed.nodes.map((node) => [node.id, node])), [placed])
    const bounds = boundsOf(placed.nodes)
    const viewBox =
        placed.nodes.length === 0
            ? undefined
            : `${String(bounds.x - MINI_PAD)} ${String(bounds.y - MINI_PAD)} ${String(bounds.width + MINI_PAD * 2)} ${String(bounds.height + MINI_PAD * 2)}`
    return (
        <svg
            data-slot="mini-graph"
            role="img"
            aria-label={label}
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            className={cn('block h-8 w-full min-w-0', className)}
        >
            <g fill="none" style={EDGE}>
                {placed.edges.map((edge) => {
                    const source = byId.get(edge.source)
                    const target = byId.get(edge.target)
                    if (source === undefined || target === undefined) return null
                    const points = edge.points ?? roughRoute(source, target, direction, routing)
                    return <path key={edge.id} d={edgePath(points, routing)} vectorEffect="non-scaling-stroke" />
                })}
            </g>
            {steps.map((step) => {
                const node = byId.get(step.code)
                return node === undefined ? null : <MiniStep key={step.code} step={step} node={node} />
            })}
        </svg>
    )
}

/** How a mini graph's edges are stroked, in the edge color the full graph draws them in. */
const EDGE: CSSProperties = {
    stroke: 'color-mix(in oklab, var(--graph-edge) 70%, var(--muted-foreground))',
    strokeWidth: 1,
}

/** One step's box: filled in its state's color, outlined in it for a state not reached, plain without one. */
function MiniStep({ step, node }: { step: MiniGraphStep; node: PlacedNode }) {
    const look = useStatus(step.status ?? '')
    const has = step.status !== undefined
    const ahead = has && AHEAD.has(step.status as string)
    const style = {
        fill: !has || ahead ? 'var(--node)' : look.css,
        stroke: !has ? 'var(--node-line)' : look.css,
        strokeWidth: 1,
        strokeDasharray: step.status === 'skipped' ? '2 2' : undefined,
        rx: 'calc(var(--radius-node) / 2)',
    } as CSSProperties
    return (
        <g data-status={step.status}>
            <title>{has ? `${step.name ?? step.code}: ${look.label}` : (step.name ?? step.code)}</title>
            <rect x={node.x} y={node.y} width={node.width} height={node.height} style={style} vectorEffect="non-scaling-stroke" />
        </g>
    )
}
