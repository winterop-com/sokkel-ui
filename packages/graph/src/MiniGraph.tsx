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
    /** The step fans out into many runs: a second box is drawn behind its own. */
    fanOut?: boolean
    /** The step is where the pipeline's data comes from: its box is drawn dashed and unfilled, apart from any state. */
    source?: boolean
    /** What pointing at the step says in place of its name, such as its code and what it runs. */
    hint?: string
}

/** The size every step of a mini graph is laid out at, before the drawing is scaled to its box. */
export const MINI_NODE = { width: 24, height: 12 }

/** How many pixels one unit of the drawing takes at its natural scale. */
export const MINI_SCALE = 0.6

/** How far the box behind a step that fans out stands from the step's own, in the drawing's units. */
const MINI_FAN = 3

/** The ground kept around the drawing, in the drawing's own units, so the strokes at its edges show whole. */
const MINI_PAD = 2

/** The states a run has not reached, drawn as an outline in their color rather than filled. */
const AHEAD: ReadonlySet<string> = new Set(['queued', 'pending', 'waiting', 'skipped', 'cancelled'])

/**
 * The shape of a mini graph: a box of one size per step, and an edge from each step a step needs, to
 * it. With `reduce`, an edge another path already implies is left out, so a step that waits for
 * everything before it draws one line rather than a fan.
 */
export function miniGraphShape(steps: readonly MiniGraphStep[], reduce = false): GraphShape {
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
    return { nodes: steps.map((step) => ({ id: step.code, ...MINI_NODE })), edges: reduce ? reduced(edges) : edges }
}

/** The edges whose target cannot be reached from their source by any other path. */
function reduced<Edge extends { source: string; target: string }>(edges: readonly Edge[]): Edge[] {
    const after = new Map<string, string[]>()
    for (const edge of edges) after.set(edge.source, [...(after.get(edge.source) ?? []), edge.target])
    const implied = (edge: Edge): boolean => {
        const seen = new Set<string>()
        const stack = (after.get(edge.source) ?? []).filter((next) => next !== edge.target)
        while (stack.length > 0) {
            const next = stack.pop() as string
            if (next === edge.target) return true
            if (seen.has(next)) continue
            seen.add(next)
            stack.push(...(after.get(next) ?? []))
        }
        return false
    }
    return edges.filter((edge) => !implied(edge))
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
    /**
     * `fill` (the default) scales the drawing to fill its box, small pipelines drawn large. `natural`
     * draws every pipeline at one scale, so a longer strip is a longer pipeline, and only shrinks one
     * too large for the box.
     */
    scale?: 'fill' | 'natural'
    /**
     * At the natural scale, the least a drawing is shrunk to along the way it reads, as a share of
     * its natural size: 0.5 when left out. A pipeline longer than that leaves its box with its end
     * cut off, rather than drawing boxes too small to see.
     */
    minScale?: number
    /** Where the drawing stands in its box across the direction it reads: `center` when left out, or `start`. */
    align?: 'center' | 'start'
    /** Leave out an edge another path already implies. */
    reduce?: boolean
    /** The drawing's accessible name, such as the pipeline's. */
    label?: string
    className?: string
}

/**
 * A pipeline drawn small, for a list row, a card or a preview: a box per step, filled in its state's
 * color, and the edges between them, laid out by elk as the full graph is and scaled to fit its box.
 * It is a still drawing in SVG with nothing to pan, zoom or press, so a list draws many at the cost
 * of one layout per shape; pointing at a step names it. It is a box as wide as its container and
 * `h-8` tall unless a class sizes it. Its root carries `data-slot="mini-graph"` and the class: the
 * drawing itself at the fill scale, and a box holding the drawing at the natural one.
 */
export function MiniGraph({
    steps,
    direction = 'right',
    routing = 'orthogonal',
    scale = 'fill',
    align = 'center',
    reduce = false,
    minScale = 0.5,
    label,
    className,
}: MiniGraphProps) {
    const shape = useMemo(() => miniGraphShape(steps, reduce), [steps, reduce])
    const placed = useMiniPlacement(shape, direction, routing)
    const byId = useMemo(() => new Map(placed.nodes.map((node) => [node.id, node])), [placed])
    const bounds = boundsOf(placed.nodes)
    const fan = steps.some((step) => step.fanOut === true) ? MINI_FAN : 0
    const width = bounds.width + MINI_PAD * 2 + fan
    const height = bounds.height + MINI_PAD * 2 + fan
    const natural = scale === 'natural'
    const viewBox =
        placed.nodes.length === 0
            ? undefined
            : `${String(bounds.x - MINI_PAD)} ${String(bounds.y - MINI_PAD)} ${String(width)} ${String(height)}`
    const sources = new Set(steps.filter((step) => step.source === true).map((step) => step.code))
    const start = align === 'start'
    const down = direction === 'down'
    const floor =
        natural && viewBox !== undefined
            ? down
                ? { minHeight: height * MINI_SCALE * minScale }
                : { minWidth: width * MINI_SCALE * minScale }
            : undefined
    const drawing = (
        <svg
            data-slot={natural ? undefined : 'mini-graph'}
            role="img"
            aria-label={label}
            viewBox={viewBox}
            width={natural && viewBox !== undefined ? width * MINI_SCALE : undefined}
            height={natural && viewBox !== undefined ? height * MINI_SCALE : undefined}
            preserveAspectRatio={start ? (down ? 'xMidYMin meet' : 'xMinYMid meet') : 'xMidYMid meet'}
            style={floor}
            className={natural ? 'block max-h-full max-w-full min-w-0 shrink-0' : cn('block h-8 w-full min-w-0', className)}
        >
            <g fill="none" style={EDGE}>
                {placed.edges.map((edge) => {
                    const source = byId.get(edge.source)
                    const target = byId.get(edge.target)
                    if (source === undefined || target === undefined) return null
                    const routed = edge.points ?? roughRoute(source, target, direction, routing)
                    const points = sources.has(edge.source) ? leaving(routed, MINI_PAD) : routed
                    return <path key={edge.id} d={edgePath(points, routing)} vectorEffect="non-scaling-stroke" />
                })}
            </g>
            {steps.map((step) => {
                const node = byId.get(step.code)
                return node === undefined ? null : <MiniStep key={step.code} step={step} node={node} />
            })}
        </svg>
    )
    if (!natural) return drawing
    return (
        <div
            data-slot="mini-graph"
            className={cn(
                'flex h-8 w-full min-w-0 overflow-hidden',
                down ? 'flex-col items-center' : 'items-center',
                start ? 'justify-start' : 'justify-center',
                className,
            )}
        >
            {drawing}
        </div>
    )
}

/** An edge's route with its first stretch drawn back from where it leaves its box, so no end shows through a dashed outline. */
function leaving(points: readonly { x: number; y: number }[], by: number): { x: number; y: number }[] {
    const [first, next] = points
    if (first === undefined || next === undefined) return [...points]
    const length = Math.hypot(next.x - first.x, next.y - first.y)
    if (length <= by * 2) return [...points]
    const share = by / length
    return [{ x: first.x + (next.x - first.x) * share, y: first.y + (next.y - first.y) * share }, ...points.slice(1)]
}

/** How a mini graph's edges are stroked, in the edge color the full graph draws them in. */
const EDGE: CSSProperties = {
    stroke: 'color-mix(in oklab, var(--graph-edge) 70%, var(--muted-foreground))',
    strokeWidth: 1,
}

/**
 * One step's box: filled in its state's color, outlined in it for a state not reached, plain without
 * one. A source is dashed and unfilled; a step that fans out has a second box behind it.
 */
function MiniStep({ step, node }: { step: MiniGraphStep; node: PlacedNode }) {
    const look = useStatus(step.status ?? '')
    const has = step.status !== undefined
    const ahead = has && AHEAD.has(step.status as string)
    const source = step.source === true
    const style = {
        fill: source ? 'var(--card)' : !has || ahead ? 'var(--node)' : look.css,
        stroke: !has ? 'var(--node-line)' : look.css,
        strokeWidth: 1,
        strokeDasharray: source ? '3 2' : step.status === 'skipped' ? '2 2' : undefined,
        rx: 'calc(var(--radius-node) / 2)',
    } as CSSProperties
    const name = step.hint ?? step.name ?? step.code
    return (
        <g data-status={step.status} data-source={source || undefined} data-fan-out={step.fanOut === true || undefined}>
            <title>{has ? `${name}: ${look.label}` : name}</title>
            {step.fanOut === true && (
                <rect
                    x={node.x + MINI_FAN}
                    y={node.y + MINI_FAN}
                    width={node.width}
                    height={node.height}
                    style={{ ...style, strokeDasharray: undefined }}
                    vectorEffect="non-scaling-stroke"
                />
            )}
            <rect x={node.x} y={node.y} width={node.width} height={node.height} style={style} vectorEffect="non-scaling-stroke" />
        </g>
    )
}
