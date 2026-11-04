import '@xyflow/react/dist/base.css'

import {
    Background,
    BackgroundVariant,
    Panel,
    ReactFlow,
    useReactFlow,
    useStoreApi,
    useUpdateNodeInternals,
    type Edge,
    type EdgeTypes,
    type Node,
    type NodeChange,
    type NodeTypes,
    type ReactFlowInstance,
    type Viewport,
} from '@xyflow/react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { useIsMobile } from '../../hooks/use-mobile'
import { cn } from '../../lib/cn'
import { GraphDirectionContext, GraphEditableContext } from './context'
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
} from './layout'

/**
 * Where a canvas stands. A `stage` fills its box and the wheel zooms it. A `fitted` canvas is as
 * tall as its drawing at the width it has, the wheel scrolls the page past it, and the wheel with
 * ctrl or cmd held, or a pinch, zooms it.
 */
export type GraphFrame = 'stage' | 'fitted'

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
}

export const GRAPH_WORDS: GraphWords = {
    label: 'Graph',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit the graph',
    empty: 'Nothing to show',
    select: 'Press enter or space to select it.',
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
    /** A connection was let go over empty ground. */
    onDrop?: (source: string, at: GraphPointer) => void
}

/** What every ready-made graph view takes besides its data. */
export interface GraphViewProps {
    /** The id of the chosen node, or null for none. */
    selected?: string | null
    /** Called with the node chosen, or null when the ground was clicked. */
    onSelect?: (id: string | null) => void
    direction?: GraphDirection
    frame?: GraphFrame
    words?: Partial<GraphWords>
    className?: string
}

/** The node and edge kinds every canvas knows, whatever else it is handed. */
const NODE_TYPES: NodeTypes = { box: GraphNode }
const EDGE_TYPES: EdgeTypes = { graph: GraphEdge }
const EDGE_DEFAULTS = { type: 'graph', selectable: false, focusable: false }
const PRO_OPTIONS = { hideAttribution: true }
const DELETE_KEYS = ['Delete', 'Backspace']
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

/** What every fit is made with. */
const FIT_OPTIONS = { padding: FIT_PADDING, minZoom: FIT_MIN_ZOOM, maxZoom: FIT_MAX_ZOOM, duration: 0 }

/** Fit the graph within the fit's zoom bounds, then hang what does not fit off the far edges, start first. */
async function fitGraph(flow: ReactFlowInstance, canvas: { width: number; height: number }): Promise<void> {
    const nodes = flow.getNodes()
    if (nodes.length === 0) return
    await flow.fitView(FIT_OPTIONS)
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

/**
 * The canvas a graph is drawn on: React Flow in the library's tokens, in either scheme. It fits the
 * whole graph whenever its nodes or its own size change, until the reader pans or zooms it; the fit
 * button gives the view back. A canvas selects and does nothing else: nodes are not dragged,
 * connected or deleted. `settled` says the nodes stand where they will stay; once they do and the
 * view has fitted them, the frame carries `data-graph-settled`.
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
    editing,
    words,
    className,
    children,
}: {
    nodes: N[]
    edges: E[]
    /** Node kinds beyond `box`, the node box. */
    nodeTypes?: NodeTypes
    /** Edge kinds beyond `graph`, the routed edge every edge is drawn as by default. */
    edgeTypes?: EdgeTypes
    direction?: GraphDirection
    frame?: GraphFrame
    settled?: boolean
    /** Called with the node chosen, or null when the ground was clicked. */
    onSelect?: (id: string | null) => void
    /** Makes the canvas an editor: ports to connect, boxes to drag, Delete to remove. Without it the canvas only selects. */
    editing?: GraphEditing
    words?: Partial<GraphWords>
    className?: string
    /** What the canvas holds over the drawing. */
    children?: ReactNode
}) {
    const said = { ...GRAPH_WORDS, ...words }
    const box = useRef<HTMLDivElement | null>(null)
    const [width, setWidth] = useState(0)
    const [moved, setMoved] = useState(false)
    const [fittedFor, setFittedFor] = useState<string | null>(null)
    const gesture = useRef<Viewport | null>(null)
    const mobile = useIsMobile()
    const fitted = frame === 'fitted'
    const editable = editing !== undefined
    const [dragged, setDragged] = useState<Record<string, { x: number; y: number }>>({})
    const [chosenEdge, setChosenEdge] = useState<string | null>(null)
    const [connecting, setConnecting] = useState(false)
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

    useEffect(() => {
        const element = box.current
        if (element === null || !fitted) return
        const observer = new ResizeObserver(() => setWidth(element.clientWidth))
        observer.observe(element)
        return () => observer.disconnect()
    }, [fitted])

    const drawing = boundsOf(nodes.map((node) => ({ ...node.position, width: node.width ?? 0, height: node.height ?? 0 })))
    // A fitted frame keeps a row under the drawing for its buttons.
    const height = fitted ? (empty ? undefined : fittedHeight(drawing, width) + BUTTON_ROW) : undefined

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
        if (chosen.length === 0 || onSelect === undefined) return
        const picked = chosen.find((change) => change.selected)
        onSelect(picked === undefined ? null : picked.id)
    }

    return (
        <GraphDirectionContext value={direction}>
            <GraphEditableContext value={editable}>
                <div
                    ref={box}
                    data-graph-view=""
                    data-graph-frame={frame}
                    data-graph-editable={editable ? '' : undefined}
                    data-graph-connecting={connecting ? '' : undefined}
                    data-graph-settled={settled && (empty || moved || fittedFor === key) ? '' : undefined}
                    style={{ ...THEME, ...(fitted ? { '--xy-background-color': 'transparent' } : {}), height } as CSSProperties}
                    className={cn(
                        'group/graph relative w-full overflow-hidden',
                        fitted ? (empty ? 'h-30' : undefined) : 'h-full min-h-0 rounded-surface bg-canvas',
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
                        isValidConnection={(connection) => connection.source !== connection.target}
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
                        onConnect={editable ? (connection) => editing.onConnect(connection.source, connection.target) : undefined}
                        onConnectEnd={
                            editable
                                ? (event, state) => {
                                      setConnecting(false)
                                      const from = state.fromNode?.id
                                      if (state.isValid === true || from === undefined || state.toNode !== null) return
                                      const at = 'changedTouches' in event ? event.changedTouches[0] : event
                                      if (at !== undefined) editing.onDrop?.(from, pointer(at))
                                  }
                                : undefined
                        }
                        onNodeDragStart={editable ? () => setMoved(true) : undefined}
                        onNodeDragStop={
                            editable
                                ? (_, node) => {
                                      editing.onMove?.(node.id, node.position)
                                      setDragged((held) => {
                                          const next = { ...held }
                                          delete next[node.id]
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
                        selectionKeyCode={null}
                        multiSelectionKeyCode={null}
                        panOnDrag={!fitted || !mobile}
                        zoomOnScroll={!fitted}
                        preventScrolling={!fitted}
                        zoomOnPinch
                        zoomOnDoubleClick={false}
                        onNodesChange={onNodesChange}
                        onPaneClick={() => onSelect?.(null)}
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
                            onFitted={(fittedKey) => setFittedFor(fittedKey)}
                        />
                        {fitted && <ModifierWheel onZoomed={() => setMoved(true)} />}
                        {!fitted && <Background variant={BackgroundVariant.Dots} gap={18} size={1} />}
                        {!empty && (
                            <Panel position="bottom-right" className="m-2!">
                                <ZoomButtons words={said} row={fitted} onFit={() => setMoved(false)} />
                            </Panel>
                        )}
                        {children}
                    </ReactFlow>
                    {empty && (
                        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                            {said.empty}
                        </p>
                    )}
                </div>
            </GraphEditableContext>
        </GraphDirectionContext>
    )
}

/** Zoom in, zoom out and fit, drawn as the library's own buttons. */
function ZoomButtons({ words, row, onFit }: { words: GraphWords; row: boolean; onFit: () => void }) {
    const flow = useReactFlow()
    const store = useStoreApi()
    const step = (way: 'in' | 'out') => () => void flow.zoomTo(steppedZoom(flow.getZoom(), way), { duration: 120 })
    const button =
        'flex size-7 items-center justify-center text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&_svg]:size-3.5'
    return (
        <div className={cn('flex overflow-hidden rounded-control border border-border bg-card shadow-node', !row && 'flex-col')}>
            <button type="button" className={button} aria-label={words.zoomIn} title={words.zoomIn} onClick={step('in')}>
                <Plus aria-hidden />
            </button>
            <button
                type="button"
                className={cn(button, row ? 'border-x border-border' : 'border-y border-border')}
                aria-label={words.zoomOut}
                title={words.zoomOut}
                onClick={step('out')}
            >
                <Minus aria-hidden />
            </button>
            <button
                type="button"
                className={button}
                aria-label={words.fit}
                title={words.fit}
                onClick={() => {
                    onFit()
                    const { width, height } = store.getState()
                    void fitGraph(flow, { width, height })
                }}
            >
                <Maximize aria-hidden />
            </button>
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
    onFitted,
}: {
    placement: string
    moved: boolean
    settled: boolean
    direction: GraphDirection
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

    useEffect(() => {
        if (moved || placement === '') return
        let current = true
        const fit = () => {
            const { width, height } = store.getState()
            void fitGraph(flow, { width, height }).then(() => {
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
    }, [flow, store, moved, placement, settled])

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
