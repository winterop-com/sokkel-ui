/** Which way a graph's ranks run: left to right, or top to bottom. */
export type GraphDirection = 'right' | 'down'

/** One node to place, at the size it is drawn. */
export interface LayoutNode {
    id: string
    width: number
    height: number
}

/** One edge to place, from `source` to `target`, with its label's words and size when it carries one. */
export interface LayoutEdge {
    id: string
    source: string
    target: string
    label?: { text: string; width: number; height: number }
}

/** A graph reduced to what placing it needs. */
export interface GraphShape {
    nodes: LayoutNode[]
    edges: LayoutEdge[]
}

/** A point in the graph's own coordinates. */
export interface GraphPoint {
    x: number
    y: number
}

/** One node, placed by its top-left corner. */
export interface PlacedNode extends LayoutNode {
    x: number
    y: number
}

/** One edge, with the route and label center elk gave it once it has answered. */
export interface PlacedEdge {
    id: string
    source: string
    target: string
    points?: GraphPoint[]
    labelAt?: GraphPoint
}

/** A whole graph, placed. */
export interface PlacedGraph {
    nodes: PlacedNode[]
    edges: PlacedEdge[]
}

/** The gap between two ranks, and between two nodes of one rank. */
export const RANK_GAP = 40
export const NODE_GAP = 20

/** The edges whose two ends are both in the shape, which are the only ones that can be placed. */
function knownEdges(shape: GraphShape): LayoutEdge[] {
    const known = new Set(shape.nodes.map((node) => node.id))
    return shape.edges.filter((edge) => known.has(edge.source) && known.has(edge.target) && edge.source !== edge.target)
}

/**
 * How deep each node stands: one rank past the deepest node it comes after, by the longest path.
 * An edge that closes a cycle, found walking the nodes in the order given, is left out of the count.
 */
export function ranksOf(shape: GraphShape): Map<string, number> {
    const edges = knownEdges(shape)
    const after = new Map<string, string[]>()
    for (const edge of edges) after.set(edge.source, [...(after.get(edge.source) ?? []), edge.target])

    const back = new Set<string>()
    const state = new Map<string, 'open' | 'done'>()
    const visit = (id: string) => {
        state.set(id, 'open')
        for (const next of after.get(id) ?? []) {
            const seen = state.get(next)
            if (seen === 'open') back.add(`${id}\u0000${next}`)
            else if (seen === undefined) visit(next)
        }
        state.set(id, 'done')
    }
    for (const node of shape.nodes) if (!state.has(node.id)) visit(node.id)

    const before = new Map<string, string[]>()
    for (const edge of edges) {
        if (back.has(`${edge.source}\u0000${edge.target}`)) continue
        before.set(edge.target, [...(before.get(edge.target) ?? []), edge.source])
    }
    const ranks = new Map<string, number>()
    const rankOf = (id: string): number => {
        const held = ranks.get(id)
        if (held !== undefined) return held
        const rank = (before.get(id) ?? []).reduce((most, from) => Math.max(most, rankOf(from) + 1), 0)
        ranks.set(id, rank)
        return rank
    }
    for (const node of shape.nodes) rankOf(node.id)
    return ranks
}

/** The widest label on any edge, along the axis the ranks run on, which the gap between ranks makes room for. */
function labelRoom(shape: GraphShape, direction: GraphDirection): number {
    return shape.edges.reduce((most, edge) => {
        if (edge.label === undefined) return most
        return Math.max(most, direction === 'right' ? edge.label.width : edge.label.height)
    }, 0)
}

/**
 * The shape placed without elk, by longest path: one rank per column (or row, drawn down), the nodes
 * of a rank stacked in the order given and centered on the widest rank. It crosses whatever edges
 * cross; it is what a canvas draws until elk answers.
 */
export function rankLayout(shape: GraphShape, direction: GraphDirection = 'right'): PlacedGraph {
    const ranks = ranksOf(shape)
    const down = direction === 'down'
    const along = (node: LayoutNode) => (down ? node.height : node.width)
    const across = (node: LayoutNode) => (down ? node.width : node.height)
    const gap = RANK_GAP + labelRoom(shape, direction)

    const groups: LayoutNode[][] = []
    for (const node of shape.nodes) {
        const rank = ranks.get(node.id) ?? 0
        groups[rank] = [...(groups[rank] ?? []), node]
    }
    const columns = Array.from(groups, (group) => group ?? [])
    const depth = columns.map((group) => group.reduce((most, node) => Math.max(most, along(node)), 0))
    const breadth = columns.map((group) => group.reduce((sum, node) => sum + across(node), 0) + Math.max(0, group.length - 1) * NODE_GAP)
    const widest = Math.max(0, ...breadth)

    const placed = new Map<string, PlacedNode>()
    let start = 0
    columns.forEach((group, rank) => {
        let offset = (widest - (breadth[rank] ?? 0)) / 2
        for (const node of group) {
            const main = start + ((depth[rank] ?? 0) - along(node)) / 2
            placed.set(node.id, { ...node, x: down ? offset : main, y: down ? main : offset })
            offset += across(node) + NODE_GAP
        }
        start += (depth[rank] ?? 0) + gap
    })

    return {
        nodes: shape.nodes.map((node) => placed.get(node.id) ?? { ...node, x: 0, y: 0 }),
        edges: knownEdges(shape).map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
    }
}

/** The subset of elk's graph this module builds. */
export interface ElkGraph {
    id: string
    layoutOptions: Record<string, string>
    children: { id: string; width: number; height: number }[]
    edges: { id: string; sources: string[]; targets: string[]; labels?: { id: string; text: string; width: number; height: number }[] }[]
}

/** One stretch of a routed edge, as elk answers it. */
interface ElkSection {
    startPoint: GraphPoint
    endPoint: GraphPoint
    bendPoints?: GraphPoint[]
}

/** The subset of elk's answer this module reads. */
export interface ElkLaidOut {
    children?: { id: string; x?: number; y?: number; width?: number; height?: number }[]
    edges?: { id: string; sections?: ElkSection[]; labels?: { x?: number; y?: number; width?: number; height?: number }[] }[]
}

/** What placing a graph needs elk to be. */
export interface ElkEngine {
    layout: (graph: ElkGraph) => Promise<ElkLaidOut>
}

/** The layered layout elk is asked for, in the order the nodes and edges were given. */
export function elkOptions(direction: GraphDirection): Record<string, string> {
    return {
        'elk.algorithm': 'layered',
        'elk.direction': direction === 'right' ? 'RIGHT' : 'DOWN',
        'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'elk.layered.cycleBreaking.strategy': 'MODEL_ORDER',
        'elk.layered.spacing.nodeNodeBetweenLayers': String(RANK_GAP),
        'elk.spacing.nodeNode': String(NODE_GAP),
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.spacing.edgeNode': '14',
        'elk.spacing.edgeEdge': '10',
        'elk.layered.spacing.edgeNodeBetweenLayers': '14',
        'elk.layered.spacing.edgeEdgeBetweenLayers': '10',
        'elk.spacing.edgeLabel': '4',
        'elk.edgeLabels.placement': 'CENTER',
    }
}

/** The graph elk is handed for a shape. */
export function toElk(shape: GraphShape, direction: GraphDirection = 'right'): ElkGraph {
    return {
        id: 'root',
        layoutOptions: elkOptions(direction),
        children: shape.nodes.map((node) => ({ id: node.id, width: node.width, height: node.height })),
        edges: knownEdges(shape).map((edge) => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
            // elk places a label only when it has words.
            ...(edge.label === undefined ? {} : { labels: [{ id: `${edge.id}:label`, ...edge.label, text: edge.label.text || ' ' }] }),
        })),
    }
}

/** elk's answer read back as a placed graph. A node elk placed nowhere stands at the origin rather than going missing. */
export function fromElk(shape: GraphShape, laid: ElkLaidOut): PlacedGraph {
    const children = new Map((laid.children ?? []).map((child) => [child.id, child]))
    const routes = new Map((laid.edges ?? []).map((edge) => [edge.id, edge]))
    return {
        nodes: shape.nodes.map((node) => {
            const child = children.get(node.id)
            return { ...node, x: child?.x ?? 0, y: child?.y ?? 0 }
        }),
        edges: knownEdges(shape).map((edge) => {
            const routed = routes.get(edge.id)
            const points = (routed?.sections ?? []).flatMap((section, index) => [
                ...(index === 0 ? [section.startPoint] : []),
                ...(section.bendPoints ?? []),
                section.endPoint,
            ])
            const label = routed?.labels?.[0]
            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                ...(points.length >= 2 ? { points } : {}),
                ...(label?.x === undefined || label.y === undefined
                    ? {}
                    : { labelAt: { x: label.x + (label.width ?? 0) / 2, y: label.y + (label.height ?? 0) / 2 } }),
            }
        }),
    }
}

let engine: Promise<ElkEngine> | null = null

/** elk, imported the first time a graph is placed and kept for the life of the page. */
export function loadElk(): Promise<ElkEngine> {
    engine ??= import('elkjs/lib/elk.bundled.js').then(
        (module) => new module.default() as unknown as ElkEngine,
        (reason: unknown) => {
            engine = null
            throw reason
        },
    )
    return engine
}

/** Place a graph with elk, loading it first unless an engine is given. */
export async function layoutGraph(shape: GraphShape, direction: GraphDirection = 'right', elk?: ElkEngine): Promise<PlacedGraph> {
    if (shape.nodes.length === 0) return { nodes: [], edges: [] }
    const using = elk ?? (await loadElk())
    return fromElk(shape, await using.layout(toElk(shape, direction)))
}

/** How long elk tries to keep each edge of a network, center to center. */
export const NETWORK_EDGE = 130

/**
 * The options elk lays a network out with: by stress, every edge kept near one length so linked
 * nodes gather and the rest spread, each part of the network laid out alone and the parts packed
 * side by side, the nodes with no edge in a row under them.
 */
export function networkOptions(): Record<string, string> {
    return {
        'elk.algorithm': 'stress',
        'elk.stress.desiredEdgeLength': String(NETWORK_EDGE),
        'elk.spacing.nodeNode': String(NODE_GAP),
        'elk.separateConnectedComponents': 'true',
        'elk.spacing.componentComponent': String(RANK_GAP),
    }
}

/**
 * A network placed at once, before elk answers: its nodes along a spiral from the middle, the ones
 * with the most edges nearest it, so the first frame already reads as a cluster.
 */
export function spiralLayout(shape: GraphShape): PlacedGraph {
    const edges = knownEdges(shape)
    const degree = new Map<string, number>()
    for (const edge of edges) {
        degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
        degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
    }
    const order = shape.nodes
        .map((node, index) => ({ node, index }))
        .sort((a, b) => (degree.get(b.node.id) ?? 0) - (degree.get(a.node.id) ?? 0) || a.index - b.index)
    // The golden angle spreads a spiral's points evenly without lining any up.
    const turn = Math.PI * (3 - Math.sqrt(5))
    const placed = new Map(
        order.map(({ node }, rank) => {
            const radius = NETWORK_EDGE * 0.6 * Math.sqrt(rank)
            return [node.id, { ...node, x: Math.round(radius * Math.cos(rank * turn)), y: Math.round(radius * Math.sin(rank * turn)) }]
        }),
    )
    return {
        nodes: shape.nodes.map((node) => placed.get(node.id) ?? { ...node, x: 0, y: 0 }),
        edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
    }
}

/** Place a network with elk, loading it first unless an engine is given; edges are drawn straight, so their routes are not read. */
export async function layoutNetwork(shape: GraphShape, elk?: ElkEngine): Promise<PlacedGraph> {
    if (shape.nodes.length === 0) return { nodes: [], edges: [] }
    const using = elk ?? (await loadElk())
    const graph: ElkGraph = { ...toElk(shape), layoutOptions: networkOptions() }
    const laid = await using.layout(graph)
    const placed = fromElk(shape, laid)
    return { ...placed, edges: placed.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })) }
}

/** What decides a graph's geometry: its nodes and their sizes, its edges and labels, and its direction. */
export function shapeSignature(shape: GraphShape, direction: GraphDirection): string {
    return [
        direction,
        shape.nodes.map((node) => `${node.id}:${String(node.width)}x${String(node.height)}`).join(','),
        shape.edges
            .map((edge) => `${edge.source}>${edge.target}${edge.label === undefined ? '' : `:${String(edge.label.width)}`}`)
            .join(','),
    ].join('|')
}

/** The path an elk route is drawn along: straight runs, each bend turned on a small radius. */
export function routedPath(points: readonly GraphPoint[], radius = 6): string {
    const first = points[0]
    const last = points[points.length - 1]
    if (first === undefined || last === undefined || points.length < 2) return ''
    const at = (point: GraphPoint) => `${String(Math.round(point.x * 10) / 10)} ${String(Math.round(point.y * 10) / 10)}`
    const toward = (from: GraphPoint, to: GraphPoint, by: number): GraphPoint => {
        const length = Math.hypot(to.x - from.x, to.y - from.y)
        return length === 0 ? from : { x: from.x + ((to.x - from.x) * by) / length, y: from.y + ((to.y - from.y) * by) / length }
    }
    const parts = [`M ${at(first)}`]
    for (let index = 1; index < points.length - 1; index += 1) {
        const before = points[index - 1] as GraphPoint
        const corner = points[index] as GraphPoint
        const after = points[index + 1] as GraphPoint
        const inward = Math.min(
            radius,
            Math.hypot(corner.x - before.x, corner.y - before.y) / 2,
            Math.hypot(after.x - corner.x, after.y - corner.y) / 2,
        )
        parts.push(`L ${at(toward(corner, before, inward))}`, `Q ${at(corner)} ${at(toward(corner, after, inward))}`)
    }
    parts.push(`L ${at(last)}`)
    return parts.join(' ')
}

/** The middle of a route, by length, which is where a label stands until elk has placed one. */
export function midpointOf(points: readonly GraphPoint[]): GraphPoint | undefined {
    if (points.length < 2) return points[0]
    const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - (points[index]?.x ?? 0), point.y - (points[index]?.y ?? 0)))
    let left = lengths.reduce((sum, length) => sum + length, 0) / 2
    for (const [index, length] of lengths.entries()) {
        const from = points[index] as GraphPoint
        const to = points[index + 1] as GraphPoint
        if (left <= length) {
            const share = length === 0 ? 0 : left / length
            return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share }
        }
        left -= length
    }
    return points[points.length - 1]
}

/** Room left around a fitted graph, as a fraction of the canvas. */
export const FIT_PADDING = 0.12

/** A fit never magnifies a graph past its own size, and never shrinks one below a size its words can be read at. */
export const FIT_MAX_ZOOM = 1
export const FIT_MIN_ZOOM = 0.75

/** How far a reader may zoom by hand. */
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 2

/** One press of a zoom button, as a factor. */
export const ZOOM_STEP = 1.4

/** How far from the canvas's edge a graph too big to fit at the floor starts, in pixels. */
export const OVERFLOW_MARGIN = 24

/** The ground a fitted frame keeps around its drawing, and the shortest it is drawn. */
export const FITTED_GROUND = 40
export const FITTED_MIN_HEIGHT = 120

/** A zoom held between the two bounds a fit is allowed. */
export function fittedZoom(zoom: number): number {
    return Math.min(FIT_MAX_ZOOM, Math.max(FIT_MIN_ZOOM, zoom))
}

/** Where one press of a zoom button lands. */
export function steppedZoom(zoom: number, way: 'in' | 'out'): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, way === 'in' ? zoom * ZOOM_STEP : zoom / ZOOM_STEP))
}

/**
 * The factor one wheel event zooms by, where the wheel zooms. A pinch arrives as many small deltas
 * and a mouse wheel as notches of about a hundred pixels; each event is held to 15% either way.
 */
export function wheelZoomFactor(deltaY: number, deltaMode = 0): number {
    const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY
    return Math.min(1.15, Math.max(1 / 1.15, Math.exp(-pixels * 0.01)))
}

/** The box a set of placed nodes takes up. */
export function boundsOf(nodes: readonly { x: number; y: number; width: number; height: number }[]): {
    x: number
    y: number
    width: number
    height: number
} {
    if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
    const left = Math.min(...nodes.map((node) => node.x))
    const top = Math.min(...nodes.map((node) => node.y))
    const right = Math.max(...nodes.map((node) => node.x + node.width))
    const bottom = Math.max(...nodes.map((node) => node.y + node.height))
    return { x: left, y: top, width: right - left, height: bottom - top }
}

/**
 * How tall a fitted frame is at the width it has: the drawing at the zoom a fit would settle at,
 * with its ground around it.
 */
export function fittedHeight(drawing: { width: number; height: number }, width: number): number {
    if (drawing.width <= 0 || drawing.height <= 0 || width <= 0) return FITTED_MIN_HEIGHT
    const zoom = fittedZoom(width / (drawing.width * (1 + FIT_PADDING)))
    const tall = Math.max(drawing.height * zoom + FITTED_GROUND, drawing.height * zoom * (1 + FIT_PADDING))
    return Math.max(FITTED_MIN_HEIGHT, Math.ceil(tall))
}

/** A pan and a zoom, as React Flow holds them. */
export interface GraphView {
    x: number
    y: number
    zoom: number
}

/**
 * A fitted view with whatever does not fit hung off the far edges: on an axis the drawing fits, it
 * stays centered; on one it does not, the graph's start stands at the margin.
 */
export function startOfOverflow(
    view: GraphView,
    bounds: { x: number; y: number; width: number; height: number },
    canvas: { width: number; height: number },
): GraphView {
    const place = (at: number, start: number, length: number, room: number) =>
        length * view.zoom <= room ? at : OVERFLOW_MARGIN - start * view.zoom
    return {
        x: place(view.x, bounds.x, bounds.width, canvas.width),
        y: place(view.y, bounds.y, bounds.height, canvas.height),
        zoom: view.zoom,
    }
}
