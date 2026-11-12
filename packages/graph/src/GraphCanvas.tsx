import '@xyflow/react/dist/base.css'

import {
    Background,
    BackgroundVariant,
    Panel,
    ReactFlow,
    useConnection,
    useReactFlow,
    useStoreApi,
    useUpdateNodeInternals,
    useViewport,
    type Edge,
    type EdgeTypes,
    type Node,
    type NodeChange,
    type NodeTypes,
    type ReactFlowInstance,
    type Viewport,
} from '@xyflow/react'
import { CircleAlert, Maximize, Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react'

import { useIsMobile } from '@winterop-com/sokkel-ui/hooks/use-mobile'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { GRAPH_DRAG_TYPE } from './blocks'
import {
    GraphControlsContext,
    GraphDirectionContext,
    GraphEditableContext,
    GraphEditingContext,
    useGraphControls,
    type GraphControls,
} from './context'
import { GraphEdge } from './GraphEdge'
import { GraphNode } from './GraphNode'
import {
    boundsOf,
    FIT_MAX_ZOOM,
    FIT_MIN_ZOOM,
    FIT_PADDING,
    fittedHeight,
    MAX_ZOOM,
    MIN_ZOOM,
    startOfOverflow,
    steppedZoom,
    wheelZoomFactor,
    type GraphDirection,
    type GraphLayoutStyle,
} from './layout'
import type { GraphSizing } from './use-node-graph'

export type { GraphControls } from './context'

/**
 * Where a canvas stands. A `stage` fills its box and the wheel zooms it. A `fitted` canvas is as
 * tall as its drawing at the width it has, the wheel scrolls the page past it, and the wheel with
 * ctrl or cmd held, or a pinch, zooms it. A `filled` canvas fills its box on the panel's own ground,
 * with no dots, at least as tall as its drawing up to a floor; each notch of the wheel zooms one
 * step about the pointer, a pinch zooms smoothly, and on a phone a finger scrolls the page past it.
 */
export type GraphFrame = 'stage' | 'fitted' | 'filled'

/** The words a canvas says. */
export interface GraphWords {
    /** The canvas's accessible name. */
    label: string
    zoomIn: string
    zoomOut: string
    fit: string
    /** What an empty canvas says. */
    empty: string
    /** What a node tells a keyboard reader. */
    select: string
    /** The add button at a node's output, on an editor. */
    append: string
    /** The add button at an edge's middle, on an editor. */
    insert: string
}

export const GRAPH_WORDS: GraphWords = {
    label: 'Graph',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit the graph',
    empty: 'Nothing to show',
    select: 'Press enter or space to select it.',
    append: 'Add a step after this one',
    insert: 'Add a step here',
}

/** A point a gesture ended at: on the screen, and in the graph's own coordinates. */
export interface GraphPointer {
    clientX: number
    clientY: number
    x: number
    y: number
}

/**
 * What the gestures of an editable canvas report. The canvas changes nothing itself: the app owns
 * the graph, applies what it accepts, and hands the canvas the result.
 */
export interface GraphEditing {
    /** An edge was drawn from one node's port to another's. */
    onConnect: (source: string, target: string) => void
    /** A chosen edge was deleted. */
    onDisconnect: (edge: string, source: string, target: string) => void
    /** A chosen node was deleted; its edges go with it and are not reported apart. */
    onRemove: (node: string) => void
    /** A box was dragged and let go at `position`, its top-left corner in the graph's coordinates. */
    onMove?: (node: string, position: { x: number; y: number }) => void
    /** A box was right-clicked. */
    onNodeMenu?: (node: string, at: GraphPointer) => void
    /** A connection drawn from a node's output was let go over empty ground. */
    onDrop?: (source: string, at: GraphPointer) => void
    /**
     * Why an edge from `source` to `target` is refused, or null to allow it. It is asked while a
     * connection is drawn, and the canvas says the reason beside the pointer.
     */
    canConnect?: (source: string, target: string) => string | null
    /** A connection was let go over a node it may not join, for the reason `canConnect` gave. */
    onRefuse?: (source: string, target: string, reason: string) => void
    /** The add button at the middle of an edge was pressed; given this, an edge shows one while hovered or chosen. */
    onInsert?: (edge: { id: string; source: string; target: string }, at: GraphPointer) => void
    /** The add button at a node's output was pressed; given this, a hovered or chosen node shows one. */
    onAppend?: (node: string, at: GraphPointer) => void
    /** Whether a node carries the add button at its output; every node does without this. */
    canAppend?: (node: string) => boolean
    /** Something dragged in from outside, carrying `GRAPH_DRAG_TYPE` data such as a palette's block, was dropped on the canvas. */
    onDropItem?: (item: string, at: GraphPointer) => void
}

/** Below this width a flow reads top to bottom, so its later steps stay on a phone's screen. */
const NARROW_GRAPH = 560

/** The direction a flow is laid out in for the width its canvas has: down when narrow, else right. */
export function fitDirection(width: number | undefined): GraphDirection {
    return width !== undefined && width > 0 && width < NARROW_GRAPH ? 'down' : 'right'
}

/**
 * What every ready-made graph view takes besides its data: the choice, the direction and frame, how
 * edges are routed and how much room the layout keeps (`routing`, `spacing`), and the bounds each
 * node box is sized from its words between (`minNodeWidth`, `maxNodeWidth`).
 */
export interface GraphViewProps extends GraphLayoutStyle, GraphSizing {
    /** The id of the chosen node, or null for none. */
    selected?: string | null
    /** Called with the node chosen, or null when the ground was clicked. */
    onSelect?: (id: string | null) => void
    /** Given, the graph runs this way at every width; left out, it runs down below 560px and right above. */
    direction?: GraphDirection
    frame?: GraphFrame
    /** The least zoom a fit goes to: 0.75 when left out. */
    fitMinZoom?: number
    /** False keeps a narrow canvas's fit at `fitMinZoom`, rather than letting it go to 0.6 so the width fits. */
    narrowFit?: boolean
    /** False hides the canvas's own zoom buttons, for controls drawn elsewhere through `onControls`. */
    controls?: boolean
    /** Called with what moves the view once the canvas is drawn, and null as it goes, so a section's head can zoom and fit it. */
    onControls?: (controls: GraphControls | null) => void
    /** A double click or tap zooms in a step about the point, on a stage; off when left out. */
    zoomOnDoubleClick?: boolean
    words?: Partial<GraphWords>
    className?: string
}

/** The node and edge kinds every canvas knows, whatever else it is handed. */
const NODE_TYPES: NodeTypes = { box: GraphNode }
const EDGE_TYPES: EdgeTypes = { graph: GraphEdge }
const EDGE_DEFAULTS = { type: 'graph', selectable: false, focusable: false }
const PRO_OPTIONS = { hideAttribution: true }
const DELETE_KEYS = ['Delete', 'Backspace']
const MULTI_KEYS = ['Shift', 'Meta', 'Control']
const CONNECTION_LINE = { stroke: 'var(--ring)', strokeWidth: 2, strokeDasharray: '5 4' }

/** React Flow's colors, pointed at the tokens. */
const THEME = {
    '--xy-background-color': 'var(--canvas)',
    '--xy-background-pattern-dots-color': 'var(--panel-dot)',
    '--xy-edge-stroke': 'color-mix(in oklab, var(--graph-edge) 70%, var(--muted-foreground))',
    '--xy-edge-stroke-selected': 'var(--foreground)',
    '--xy-node-border-radius': 'var(--radius-node)',
    '--xy-selection-background-color': 'color-mix(in oklab, var(--foreground) 8%, transparent)',
    '--xy-selection-border': '1px dashed var(--foreground)',
    '--xy-handle-background-color': 'transparent',
    '--xy-handle-border-color': 'transparent',
} as CSSProperties

/** The height the zoom buttons take in a fitted frame, laid out in a row. */
const BUTTON_ROW = 36

/** The tallest a filled frame insists on for its drawing; past it the drawing fits its box. */
const FILLED_FLOOR = 360

/** What every fit is made with; the least zoom is the canvas's own. */
const FIT_OPTIONS = { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, duration: 0 }

/** The id of the node under a point on the screen, if any. */
function nodeAt(clientX: number, clientY: number): string | null {
    const found = document.elementFromPoint(clientX, clientY)?.closest('.react-flow__node')
    return found?.getAttribute('data-id') ?? null
}

/** Fit the graph within the fit's zoom bounds, then hang what does not fit off the far edges, start first. */
/** The least zoom a narrow canvas goes to so a graph's width fits it, its words still readable. */
const NARROW_FIT_MIN_ZOOM = 0.6

async function fitGraph(
    flow: ReactFlowInstance,
    canvas: { width: number; height: number },
    minZoom: number,
    narrowFit = true,
): Promise<void> {
    const nodes = flow.getNodes()
    if (nodes.length === 0) return
    // On a narrow canvas the width fits first, a little under the usual least zoom if it must; a
    // tall graph then reads down and scrolls rather than hanging off the side.
    let least = minZoom
    if (narrowFit && canvas.width > 0 && canvas.width < NARROW_GRAPH) {
        const across = flow.getNodesBounds(nodes).width
        const fitsAcross = across > 0 ? (canvas.width * (1 - 2 * FIT_PADDING)) / across : minZoom
        least = Math.min(minZoom, Math.max(NARROW_FIT_MIN_ZOOM, fitsAcross))
    }
    await flow.fitView({ ...FIT_OPTIONS, minZoom: least })
    const view = flow.getViewport()
    const placed = startOfOverflow(view, flow.getNodesBounds(nodes), canvas)
    if (placed.x !== view.x || placed.y !== view.y) await flow.setViewport(placed, { duration: 0 })
}

/** The nodes' ids, places and sizes as one string, which is what a fit is redone on. */
function placementKey(nodes: readonly Node[]): string {
    return nodes
        .map(
            (node) =>
                `${node.id}@${String(node.position.x)},${String(node.position.y)}:${String(node.width ?? 0)}x${String(node.height ?? 0)}`,
        )
        .join('|')
}

export interface GraphCanvasProps<N extends Node = Node, E extends Edge = Edge> {
    nodes: N[]
    edges: E[]
    /** Node kinds beyond `box`, the node box. */
    nodeTypes?: NodeTypes
    /** Edge kinds beyond `graph`, the routed edge every edge is drawn as by default. */
    edgeTypes?: EdgeTypes
    direction?: GraphDirection
    frame?: GraphFrame
    settled?: boolean
    /** Called with the canvas's width as it changes, so a view can lay its graph out to fit. */
    onWidth?: (width: number) => void
    /** What an empty canvas offers under its words, such as a button that adds the first step. */
    emptyAction?: ReactNode
    /** Called with the node chosen, or null when the ground was clicked. */
    onSelect?: (id: string | null) => void
    /** Called with every chosen node when the choice changes; given this, several can be chosen at once. */
    onSelectionChange?: (ids: string[]) => void
    /** Makes the canvas an editor: ports to connect, boxes to drag, Delete to remove. Without it the canvas only selects. */
    editing?: GraphEditing
    /** False hides the zoom buttons, for a toolbar that carries them. */
    controls?: boolean
    /** A bar over the canvas's top-left corner; inside it, `useGraphControls` reaches the view. */
    toolbar?: ReactNode
    /**
     * The least zoom a fit goes to, past which a graph too big hangs off the far edges: 0.75 so a
     * box's words stay legible, lower for a view of small marks that should be seen whole.
     */
    fitMinZoom?: number
    /** False keeps a narrow canvas's fit at `fitMinZoom`, rather than letting it go to 0.6 so the width fits. */
    narrowFit?: boolean
    /** Called with what moves the view once the canvas is drawn, and null as it goes. */
    onControls?: (controls: GraphControls | null) => void
    /** A value that changes with the layout chosen (routing, spacing): the view fits again, even after the reader moved it. */
    layoutKey?: string
    /** A double click or tap zooms in a step about the point, on a stage; off when left out. */
    zoomOnDoubleClick?: boolean
    words?: Partial<GraphWords>
    className?: string
    /** What the canvas holds over the drawing. */
    children?: ReactNode
}

/**
 * The canvas a graph is drawn on: React Flow in the library's tokens, in either scheme. It fits the
 * whole graph whenever its nodes or its own size change, until the reader pans or zooms it; the fit
 * button gives the view back. A canvas selects and does nothing else: nodes are not dragged,
 * connected or deleted. `settled` says the nodes stand where they will stay; once they do and the
 * view has fitted them (or the reader has moved it), the frame carries `data-graph-settled`, which a
 * test waits on before it reads where a node stands.
 *
 * Given `onSelectionChange`, several nodes are chosen at once: Shift and a drag on the ground draws
 * a box around them, and Shift, Cmd or Ctrl with a click adds one or takes it out.
 */
export function GraphCanvas<N extends Node = Node, E extends Edge = Edge>({
    nodes,
    edges,
    nodeTypes,
    edgeTypes,
    direction = 'right',
    frame = 'stage',
    settled = true,
    onSelect,
    onSelectionChange,
    editing,
    controls = true,
    toolbar,
    fitMinZoom = FIT_MIN_ZOOM,
    narrowFit = true,
    onControls,
    layoutKey = '',
    zoomOnDoubleClick = false,
    onWidth,
    emptyAction,
    words,
    className,
    children,
}: GraphCanvasProps<N, E>) {
    const said = { ...GRAPH_WORDS, ...words }
    const box = useRef<HTMLDivElement | null>(null)
    const [width, setWidth] = useState(0)
    const [moved, setMoved] = useState(false)
    const [fittedFor, setFittedFor] = useState<string | null>(null)
    const gesture = useRef<Viewport | null>(null)
    const mobile = useIsMobile()
    const fitted = frame === 'fitted'
    const filled = frame === 'filled'
    // A new layout chosen fits the view again, even one the reader had moved.
    const laidOut = `${direction}|${layoutKey}`
    const [fitLayout, setFitLayout] = useState(laidOut)
    if (fitLayout !== laidOut) {
        setFitLayout(laidOut)
        setMoved(false)
    }
    const editable = editing !== undefined
    const [dragged, setDragged] = useState<Record<string, { x: number; y: number }>>({})
    const [chosenEdge, setChosenEdge] = useState<string | null>(null)
    const [connecting, setConnecting] = useState(false)
    const [dropping, setDropping] = useState(false)
    const multiple = onSelectionChange !== undefined
    const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
    const leaving = useRef<number | undefined>(undefined)
    // The add button sits over the edge in another layer, so leaving the line for the button waits a moment before it hides.
    const hoverEdge = useCallback((edge: string | null) => {
        window.clearTimeout(leaving.current)
        if (edge !== null) setHoveredEdge(edge)
        else
            leaving.current = window.setTimeout(() => {
                if (box.current?.querySelector('[data-slot=graph-insert]:hover') == null) setHoveredEdge(null)
            }, 180)
    }, [])
    useEffect(() => () => window.clearTimeout(leaving.current), [])
    const editingContext = useMemo(
        () => (editing === undefined ? null : { editing, words: said, hovered: hoveredEdge, hover: hoverEdge }),
        [editing, said, hoveredEdge, hoverEdge],
    )
    const flowRef = useRef<ReactFlowInstance<N, E> | null>(null)

    // A box being dragged stands where the pointer has it until the app answers the drop.
    const drawn = useMemo(
        () =>
            Object.keys(dragged).length === 0
                ? nodes
                : nodes.map((node) => (dragged[node.id] === undefined ? node : { ...node, position: dragged[node.id] })),
        [nodes, dragged],
    )
    const lines = useMemo(
        () => (!editable ? edges : edges.map((edge) => ({ ...edge, selectable: true, focusable: true, selected: edge.id === chosenEdge }))),
        [edges, editable, chosenEdge],
    )
    const key = placementKey(nodes)
    const empty = nodes.length === 0
    const pointer = (event: { clientX: number; clientY: number }): GraphPointer => {
        const at = flowRef.current?.screenToFlowPosition({ x: event.clientX, y: event.clientY }) ?? { x: 0, y: 0 }
        return { clientX: event.clientX, clientY: event.clientY, ...at }
    }

    const reportWidth = useRef(onWidth)
    reportWidth.current = onWidth
    const reporting = onWidth !== undefined
    useEffect(() => {
        const element = box.current
        if (element === null || !reporting) return
        reportWidth.current?.(element.clientWidth)
        const observer = new ResizeObserver(() => reportWidth.current?.(element.clientWidth))
        observer.observe(element)
        return () => observer.disconnect()
    }, [reporting])

    useEffect(() => {
        const element = box.current
        if (element === null || (!fitted && !filled)) return
        const observer = new ResizeObserver(() => setWidth(element.clientWidth))
        observer.observe(element)
        return () => observer.disconnect()
    }, [fitted, filled])

    const drawing = boundsOf(nodes.map((node) => ({ ...node.position, width: node.width ?? 0, height: node.height ?? 0 })))
    // A fitted frame keeps a row under the drawing for its buttons.
    const height = fitted ? (empty ? undefined : fittedHeight(drawing, width) + BUTTON_ROW) : undefined
    // A filled frame is at least as tall as its drawing would be fitted, up to its floor.
    const floor = filled && !empty && width > 0 ? Math.min(fittedHeight(drawing, width), FILLED_FLOOR) : undefined
    const ground = fitted || filled

    const onNodesChange = (changes: NodeChange<N>[]) => {
        if (editable) {
            const moves = changes.filter((change) => change.type === 'position' && change.position !== undefined)
            if (moves.length > 0)
                setDragged((held) => {
                    const next = { ...held }
                    for (const move of moves) if (move.type === 'position' && move.position !== undefined) next[move.id] = move.position
                    return next
                })
        }
        const chosen = changes.filter((change) => change.type === 'select')
        if (chosen.length === 0) return
        if (onSelectionChange !== undefined) {
            const now = new Set(nodes.filter((node) => node.selected === true).map((node) => node.id))
            const before = [...now].join('|')
            for (const change of chosen)
                if (change.type === 'select') {
                    if (change.selected) now.add(change.id)
                    else now.delete(change.id)
                }
            const ids = nodes.map((node) => node.id).filter((id) => now.has(id))
            if (ids.join('|') !== before) onSelectionChange(ids)
        }
        if (onSelect === undefined) return
        const picked = chosen.find((change) => change.selected)
        onSelect(picked === undefined ? null : picked.id)
    }

    // Asks the app, so a refusal is said while the connection is drawn rather than after it.
    const allowed = (source: string, target: string) => source !== target && (editing?.canConnect?.(source, target) ?? null) === null

    const carriesItem = (event: DragEvent) => editing?.onDropItem !== undefined && event.dataTransfer.types.includes(GRAPH_DRAG_TYPE)

    return (
        <GraphDirectionContext value={direction}>
            <GraphEditableContext value={editable}>
                <GraphEditingContext value={editingContext}>
                    <div
                        ref={box}
                        data-graph-view=""
                        data-graph-frame={frame}
                        data-graph-editable={editable ? '' : undefined}
                        data-graph-connecting={connecting ? '' : undefined}
                        data-graph-dropping={dropping ? '' : undefined}
                        data-graph-settled={settled && (empty || moved || fittedFor === key) ? '' : undefined}
                        style={
                            {
                                ...THEME,
                                ...(ground ? { '--xy-background-color': 'transparent' } : {}),
                                height,
                                minHeight: floor,
                            } as CSSProperties
                        }
                        className={cn(
                            'group/graph relative w-full overflow-hidden',
                            fitted ? (empty ? 'h-30' : undefined) : filled ? 'h-full' : 'h-full min-h-0 rounded-surface bg-canvas',
                            'data-graph-dropping:outline-2 data-graph-dropping:-outline-offset-2 data-graph-dropping:outline-ring data-graph-dropping:outline-dashed',
                            className,
                        )}
                    >
                        <ReactFlow<N, E>
                            nodes={drawn}
                            edges={lines}
                            onInit={(instance) => {
                                flowRef.current = instance
                            }}
                            nodeTypes={{ ...NODE_TYPES, ...nodeTypes }}
                            edgeTypes={{ ...EDGE_TYPES, ...edgeTypes }}
                            defaultEdgeOptions={EDGE_DEFAULTS}
                            proOptions={PRO_OPTIONS}
                            aria-label={said.label}
                            ariaLabelConfig={{
                                'node.a11yDescription.default': said.select,
                                'node.a11yDescription.keyboardDisabled': said.select,
                            }}
                            className="bg-transparent"
                            minZoom={MIN_ZOOM}
                            maxZoom={MAX_ZOOM}
                            nodesDraggable={editable}
                            nodesConnectable={editable}
                            edgesFocusable={editable}
                            elementsSelectable
                            selectNodesOnDrag={false}
                            deleteKeyCode={editable ? DELETE_KEYS : null}
                            connectionLineStyle={CONNECTION_LINE}
                            isValidConnection={(connection) => allowed(connection.source, connection.target)}
                            onEdgesChange={
                                editable
                                    ? (changes) => {
                                          const chosen = changes.filter((change) => change.type === 'select')
                                          if (chosen.length > 0) setChosenEdge(chosen.find((change) => change.selected)?.id ?? null)
                                      }
                                    : undefined
                            }
                            onDelete={
                                editable
                                    ? ({ nodes: removed, edges: cut }) => {
                                          const gone = new Set(removed.map((node) => node.id))
                                          for (const node of removed) editing.onRemove(node.id)
                                          for (const edge of cut)
                                              if (!gone.has(edge.source) && !gone.has(edge.target))
                                                  editing.onDisconnect(edge.id, edge.source, edge.target)
                                          setChosenEdge(null)
                                      }
                                    : undefined
                            }
                            onConnectStart={editable ? () => setConnecting(true) : undefined}
                            onEdgeMouseEnter={editable && editing.onInsert !== undefined ? (_, edge) => hoverEdge(edge.id) : undefined}
                            onEdgeMouseLeave={editable && editing.onInsert !== undefined ? () => hoverEdge(null) : undefined}
                            onConnect={editable ? (connection) => editing.onConnect(connection.source, connection.target) : undefined}
                            onConnectEnd={
                                editable
                                    ? (event, state) => {
                                          setConnecting(false)
                                          const from = state.fromNode?.id
                                          if (state.isValid === true || from === undefined) return
                                          const at = 'changedTouches' in event ? event.changedTouches[0] : event
                                          if (at === undefined) return
                                          const outward = state.fromHandle?.type !== 'target'
                                          // Let go over a box rather than its port, the connection joins that box.
                                          const over = state.toNode?.id ?? nodeAt(at.clientX, at.clientY)
                                          if (over === null) {
                                              if (outward) editing.onDrop?.(from, pointer(at))
                                              return
                                          }
                                          if (over === from) return
                                          const [source, target] = outward ? [from, over] : [over, from]
                                          const reason = editing.canConnect?.(source, target) ?? null
                                          if (reason !== null) editing.onRefuse?.(source, target, reason)
                                          else if (state.toNode === null) editing.onConnect(source, target)
                                      }
                                    : undefined
                            }
                            onNodeDragStart={editable ? () => setMoved(true) : undefined}
                            onNodeDragStop={
                                editable
                                    ? (_, node, moved) => {
                                          const all = moved.length > 0 ? moved : [node]
                                          for (const each of all) editing.onMove?.(each.id, each.position)
                                          setDragged((held) => {
                                              const next = { ...held }
                                              for (const each of all) delete next[each.id]
                                              return next
                                          })
                                      }
                                    : undefined
                            }
                            onNodeContextMenu={
                                editable && editing.onNodeMenu !== undefined
                                    ? (event, node) => {
                                          event.preventDefault()
                                          editing.onNodeMenu?.(node.id, pointer(event))
                                      }
                                    : undefined
                            }
                            selectionKeyCode={multiple ? 'Shift' : null}
                            multiSelectionKeyCode={multiple ? MULTI_KEYS : null}
                            onDragOver={
                                editable
                                    ? (event) => {
                                          if (!carriesItem(event)) return
                                          event.preventDefault()
                                          event.dataTransfer.dropEffect = 'copy'
                                          setDropping(true)
                                      }
                                    : undefined
                            }
                            onDragLeave={
                                editable
                                    ? (event) => {
                                          if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null))
                                              setDropping(false)
                                      }
                                    : undefined
                            }
                            onDrop={
                                editable
                                    ? (event) => {
                                          setDropping(false)
                                          if (!carriesItem(event)) return
                                          event.preventDefault()
                                          const item = event.dataTransfer.getData(GRAPH_DRAG_TYPE)
                                          if (item !== '') editing.onDropItem?.(item, pointer(event))
                                      }
                                    : undefined
                            }
                            panOnDrag={!ground || !mobile}
                            zoomOnScroll={!ground}
                            preventScrolling={!fitted && !(filled && mobile)}
                            zoomOnPinch
                            zoomOnDoubleClick={zoomOnDoubleClick && !fitted}
                            onNodesChange={onNodesChange}
                            onPaneClick={() => {
                                onSelect?.(null)
                                onSelectionChange?.([])
                            }}
                            onMoveStart={(event, view) => {
                                gesture.current = event === null ? null : view
                            }}
                            onMoveEnd={(event, view) => {
                                const from = gesture.current
                                gesture.current = null
                                if (event !== null && from !== null && (from.x !== view.x || from.y !== view.y || from.zoom !== view.zoom))
                                    setMoved(true)
                            }}
                        >
                            <FitToGraph
                                placement={key}
                                moved={moved}
                                settled={settled}
                                direction={direction}
                                minZoom={fitMinZoom}
                                narrowFit={narrowFit}
                                onFitted={(fittedKey) => setFittedFor(fittedKey)}
                            />
                            {fitted && <ModifierWheel onZoomed={() => setMoved(true)} />}
                            {filled && <StepWheel onZoomed={() => setMoved(true)} />}
                            {!ground && <Background variant={BackgroundVariant.Dots} gap={18} size={1} />}
                            <ViewControls
                                empty={empty}
                                onMoved={setMoved}
                                minZoom={fitMinZoom}
                                narrowFit={narrowFit}
                                onControls={onControls}
                            >
                                {controls && !empty && (
                                    <Panel position="bottom-right" className="m-2!">
                                        <ZoomButtons words={said} row={fitted} />
                                    </Panel>
                                )}
                                {toolbar !== undefined && (
                                    <Panel position="top-left" className="m-2! max-w-[calc(100%-1rem)]">
                                        {toolbar}
                                    </Panel>
                                )}
                                {editing?.canConnect !== undefined && <ConnectionVerdict canConnect={editing.canConnect} />}
                                {children}
                            </ViewControls>
                        </ReactFlow>
                        {empty && (
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                                <p className="text-sm text-muted-foreground">{said.empty}</p>
                                {emptyAction !== undefined && <div className="pointer-events-auto">{emptyAction}</div>}
                            </div>
                        )}
                    </div>
                </GraphEditingContext>
            </GraphEditableContext>
        </GraphDirectionContext>
    )
}

/** What the zoom buttons and a toolbar's view buttons do, for everything drawn over the canvas. */
function ViewControls({
    empty,
    onMoved,
    minZoom,
    narrowFit,
    onControls,
    children,
}: {
    empty: boolean
    onMoved: (moved: boolean) => void
    minZoom: number
    narrowFit: boolean
    onControls?: (controls: GraphControls | null) => void
    children: ReactNode
}) {
    const flow = useReactFlow()
    const store = useStoreApi()
    const controls = useMemo<GraphControls>(() => {
        const step = (way: 'in' | 'out') => () => {
            onMoved(true)
            void flow.zoomTo(steppedZoom(flow.getZoom(), way), { duration: 120 })
        }
        return {
            zoomIn: step('in'),
            zoomOut: step('out'),
            fit: () => {
                onMoved(false)
                const { width, height } = store.getState()
                void fitGraph(flow, { width, height }, minZoom, narrowFit)
            },
            empty,
        }
    }, [flow, store, onMoved, empty, minZoom, narrowFit])
    const report = useRef(onControls)
    report.current = onControls
    useEffect(() => {
        report.current?.(controls)
    }, [controls])
    useEffect(() => () => report.current?.(null), [])
    return <GraphControlsContext value={controls}>{children}</GraphControlsContext>
}

/** Zoom in, zoom out and fit, drawn as the library's own buttons. */
function ZoomButtons({ words, row }: { words: GraphWords; row: boolean }) {
    const controls = useGraphControls()
    const button =
        'flex size-7 items-center justify-center text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&_svg]:size-3.5'
    if (controls === null) return null
    return (
        <div className={cn('flex overflow-hidden rounded-control border border-border bg-card shadow-node', !row && 'flex-col')}>
            <button type="button" className={button} aria-label={words.zoomIn} title={words.zoomIn} onClick={controls.zoomIn}>
                <Plus aria-hidden />
            </button>
            <button
                type="button"
                className={cn(button, row ? 'border-x border-border' : 'border-y border-border')}
                aria-label={words.zoomOut}
                title={words.zoomOut}
                onClick={controls.zoomOut}
            >
                <Minus aria-hidden />
            </button>
            <button type="button" className={button} aria-label={words.fit} title={words.fit} onClick={controls.fit}>
                <Maximize aria-hidden />
            </button>
        </div>
    )
}

/** While a connection is drawn over a node it may not join, why not, beside the pointer. */
function ConnectionVerdict({ canConnect }: { canConnect: (source: string, target: string) => string | null }) {
    const connection = useConnection()
    const view = useViewport()
    if (!connection.inProgress || connection.toNode === null) return null
    const from = connection.fromNode.id
    const over = connection.toNode.id
    if (from === over) return null
    const outward = connection.fromHandle.type !== 'target'
    const reason = outward ? canConnect(from, over) : canConnect(over, from)
    if (reason === null) return null
    return (
        <div
            role="status"
            data-slot="graph-verdict"
            className="pointer-events-none absolute z-20 flex max-w-64 items-start gap-1.5 rounded-control border border-critical/60 bg-popover px-2 py-1.5 text-xs text-popover-foreground shadow-pop"
            style={{ left: connection.to.x * view.zoom + view.x + 14, top: connection.to.y * view.zoom + view.y + 14 }}
        >
            <CircleAlert className="mt-px size-3.5 shrink-0 text-critical-ink" aria-hidden />
            <span>{reason}</span>
        </div>
    )
}

/**
 * Keeps the whole graph in view until the reader moves it: fitted one frame after the nodes are
 * placed or the canvas is resized, and told back which placement it fitted.
 */
function FitToGraph({
    placement,
    moved,
    settled,
    direction,
    minZoom,
    narrowFit,
    onFitted,
}: {
    placement: string
    moved: boolean
    settled: boolean
    direction: GraphDirection
    minZoom: number
    narrowFit: boolean
    onFitted: (placement: string) => void
}) {
    const flow = useReactFlow()
    const store = useStoreApi()
    const updateInternals = useUpdateNodeInternals()
    const done = useRef(onFitted)
    useEffect(() => {
        done.current = onFitted
    }, [onFitted])

    // A box's handles move to other sides when the direction changes, and React Flow reads them only when told.
    const anchored = useRef(direction)
    useEffect(() => {
        if (anchored.current === direction) return
        anchored.current = direction
        const frame = requestAnimationFrame(() => updateInternals(flow.getNodes().map((node) => node.id)))
        return () => cancelAnimationFrame(frame)
    }, [direction, flow, updateInternals])

    // A view the reader moved keeps its zoom as the canvas is resized, and brings the chosen node back into it.
    useEffect(() => {
        if (!moved) return
        return store.subscribe((state, before) => {
            if (state.width === before.width && state.height === before.height) return
            const chosen = flow.getNodes().find((node) => node.selected === true)
            if (chosen === undefined) return
            const view = flow.getViewport()
            const width = chosen.width ?? 0
            const height = chosen.height ?? 0
            const left = chosen.position.x * view.zoom + view.x
            const top = chosen.position.y * view.zoom + view.y
            const inside = left >= 0 && top >= 0 && left + width * view.zoom <= state.width && top + height * view.zoom <= state.height
            if (!inside)
                void flow.setCenter(chosen.position.x + width / 2, chosen.position.y + height / 2, { zoom: view.zoom, duration: 0 })
        })
    }, [flow, store, moved])

    useEffect(() => {
        if (moved || placement === '') return
        let current = true
        const fit = () => {
            const { width, height } = store.getState()
            void fitGraph(flow, { width, height }, minZoom, narrowFit).then(() => {
                if (current && settled) done.current(placement)
            })
        }
        const frame = requestAnimationFrame(fit)
        const unsubscribe = store.subscribe((state, before) => {
            if (state.width !== before.width || state.height !== before.height) fit()
        })
        return () => {
            current = false
            cancelAnimationFrame(frame)
            unsubscribe()
        }
    }, [flow, store, moved, placement, settled, minZoom, narrowFit])

    return null
}

/** How long one notch of a filled canvas's wheel holds before the next zooms, so a trackpad's stream is one step. */
const STEP_WHEEL_MS = 160

/**
 * On a filled canvas, each notch of the wheel zooms one button's step about the pointer, and a
 * pinch (a wheel with ctrl) or a wheel with cmd zooms smoothly.
 */
function StepWheel({ onZoomed }: { onZoomed: () => void }) {
    const flow = useReactFlow()
    const store = useStoreApi()
    const zoomed = useRef(onZoomed)
    useEffect(() => {
        zoomed.current = onZoomed
    }, [onZoomed])
    useEffect(() => {
        const element = store.getState().domNode
        if (element === null) return
        let last = 0
        const onWheel = (event: WheelEvent) => {
            event.preventDefault()
            event.stopPropagation()
            const view = flow.getViewport()
            let zoom: number
            if (event.ctrlKey || event.metaKey) {
                zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * wheelZoomFactor(event.deltaY, event.deltaMode)))
            } else {
                if (event.deltaY === 0 || event.timeStamp - last < STEP_WHEEL_MS) return
                last = event.timeStamp
                zoom = steppedZoom(view.zoom, event.deltaY < 0 ? 'in' : 'out')
            }
            if (zoom === view.zoom) return
            const bounds = element.getBoundingClientRect()
            const at = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
            void flow.setViewport(
                { x: at.x - ((at.x - view.x) * zoom) / view.zoom, y: at.y - ((at.y - view.y) * zoom) / view.zoom, zoom },
                { duration: 0 },
            )
            zoomed.current()
        }
        element.addEventListener('wheel', onWheel, { capture: true, passive: false })
        return () => element.removeEventListener('wheel', onWheel, { capture: true })
    }, [flow, store])
    return null
}

/**
 * On a fitted canvas, a wheel with ctrl or cmd held zooms it about the pointer; a trackpad pinch
 * arrives as a wheel with ctrl. Every other wheel scrolls the page.
 */
function ModifierWheel({ onZoomed }: { onZoomed: () => void }) {
    const flow = useReactFlow()
    const store = useStoreApi()
    const zoomed = useRef(onZoomed)
    useEffect(() => {
        zoomed.current = onZoomed
    }, [onZoomed])
    useEffect(() => {
        const element = store.getState().domNode
        if (element === null) return
        const onWheel = (event: WheelEvent) => {
            if (!event.ctrlKey && !event.metaKey) return
            event.preventDefault()
            event.stopPropagation()
            const view = flow.getViewport()
            const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * wheelZoomFactor(event.deltaY, event.deltaMode)))
            if (zoom === view.zoom) return
            const bounds = element.getBoundingClientRect()
            const at = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
            void flow.setViewport(
                { x: at.x - ((at.x - view.x) * zoom) / view.zoom, y: at.y - ((at.y - view.y) * zoom) / view.zoom, zoom },
                { duration: 0 },
            )
            zoomed.current()
        }
        element.addEventListener('wheel', onWheel, { capture: true, passive: false })
        return () => element.removeEventListener('wheel', onWheel, { capture: true })
    }, [flow, store])
    return null
}
