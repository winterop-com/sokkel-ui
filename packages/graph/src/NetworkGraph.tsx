import { Handle, Position, type Edge, type Node, type NodeProps, type NodeTypes } from '@xyflow/react'
import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { KIND_FILL, kindOf, type KindColor } from '@winterop-com/sokkel-ui/lib/kind'
import { GraphCanvas, type GraphViewProps } from './GraphCanvas'
import { layoutNetwork, spiralLayout, type GraphShape, type PlacedGraph } from './layout'

/** One thing in a network: a note, a person, a service. */
export interface NetworkNode {
    id: string
    label: string
    /** What the node belongs to, such as its folder, which picks its color; one color for all without it. */
    group?: string
    /** The node's color, over the one its group picks, so an app can give each group a color of its own. */
    color?: KindColor
    /** Drawn quieter, such as a note linked to that does not exist yet. */
    faint?: boolean
}

/** One link between two nodes; a network's links have no direction to read them in. */
export interface NetworkLink {
    source: string
    target: string
}

export type NetworkGraphProps = Omit<GraphViewProps, 'direction'> & {
    nodes: readonly NetworkNode[]
    links: readonly NetworkLink[]
    /** The node the reader stands on, such as the note open now: ringed, its name set strong. */
    current?: string | null
}

interface DotData extends Record<string, unknown> {
    label: string
    size: number
    fill: string
    faint: boolean
    current: boolean
    /** Another node is pointed at and this one is not linked to it. */
    dim: boolean
}

/** The width a node's name may take under its dot, and the height of its line. */
const NAME_WIDTH = 120
const NAME_LINE = 15
const NAME_GAP = 4

/** How far a fit zooms out, so a network is seen whole even on a phone; its names are small marks anyway. */
const NETWORK_FIT_ZOOM = 0.35

/** A dot's size by how many links it has: more links, a larger dot. */
export function dotSize(links: number): number {
    return Math.round(8 + Math.min(14, Math.sqrt(links) * 4))
}

/** Which node the pointer rests on, told by each dot to the network around it. */
const HoverContext = createContext<(id: string | null) => void>(() => undefined)

/** The edge's two ends meet at the middle of the dot, so every link runs center to center. */
const CENTER: CSSProperties = { top: '50%', left: '50%', width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 }

/** A node: a dot in its group's color over its name, its handles at the dot's middle. */
function NetworkDot({ id, data, selected }: NodeProps<Node<DotData>>) {
    const hover = useContext(HoverContext)
    return (
        <div
            className={cn('flex w-full flex-col items-center gap-1 transition-opacity', data.dim && 'opacity-25')}
            onPointerEnter={() => hover(id)}
            onPointerLeave={() => hover(null)}
        >
            <span
                className={cn(
                    'relative block shrink-0 rounded-full',
                    data.fill,
                    data.faint && 'opacity-50',
                    (selected || data.current) && 'ring-2 ring-ring ring-offset-2 ring-offset-canvas',
                )}
                style={{ width: data.size, height: data.size }}
            >
                <Handle type="target" position={Position.Top} isConnectable={false} className="invisible" style={CENTER} />
                <Handle type="source" position={Position.Top} isConnectable={false} className="invisible" style={CENTER} />
            </span>
            <span
                className={cn(
                    'max-w-full truncate text-center text-graph-title',
                    data.faint ? 'text-muted-foreground' : 'text-foreground',
                    data.current && 'font-semibold',
                )}
            >
                {data.label}
            </span>
        </div>
    )
}

const NODE_TYPES: NodeTypes = { dot: NetworkDot }

/** A network's placement: a spiral at once, then where elk puts it once it answers. */
function useNetworkLayout(shape: GraphShape): PlacedGraph & { settled: boolean } {
    const signature = `${shape.nodes.map((node) => `${node.id}:${String(node.height)}`).join(',')}|${shape.edges.map((edge) => edge.id).join(',')}`
    const [answer, setAnswer] = useState<{ signature: string; placed: PlacedGraph | null } | null>(null)
    useEffect(() => {
        let current = true
        layoutNetwork(shape).then(
            (placed) => {
                if (current) setAnswer({ signature, placed })
            },
            () => {
                if (current) setAnswer({ signature, placed: null })
            },
        )
        return () => {
            current = false
        }
        // The placement is a function of the signature alone.
        // oxlint-disable-next-line react/exhaustive-deps
    }, [signature])
    // oxlint-disable-next-line react/exhaustive-deps
    const rough = useMemo(() => spiralLayout(shape), [signature])
    const settled = answer?.signature === signature
    const placed = settled && answer.placed !== null ? answer.placed : rough
    return useMemo(() => ({ ...placed, settled }), [placed, settled])
}

/**
 * Things and the links between them with no direction to read them in, such as notes that link to
 * each other: each a dot in its group's color, larger the more links it has, its name under it, and
 * each link a straight line between two dots. elk lays it out by stress, so linked things gather
 * and the rest spread, each separate part laid out alone and the nodes with no link in a row under
 * them; a spiral holds the first frame until elk answers, and the view zooms out as far as it must
 * to show the whole of it. Pointing at a dot lights it, its links
 * and its neighbors, and fades the rest. `current` rings the node the reader stands on, and
 * choosing a dot calls `onSelect`, as opening the note it is.
 */
export function NetworkGraph({
    nodes,
    links,
    current = null,
    selected = null,
    onSelect,
    frame = 'stage',
    zoomOnDoubleClick,
    fitMinZoom,
    narrowFit,
    tallFit,
    onControls,
    fillFloor,
    controls,
    words,
    className,
}: NetworkGraphProps) {
    const [hovered, setHovered] = useState<string | null>(null)
    const known = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes])
    const kept = useMemo(
        () => links.filter((link) => link.source !== link.target && known.has(link.source) && known.has(link.target)),
        [links, known],
    )
    const degree = useMemo(() => {
        const count = new Map<string, number>()
        for (const link of kept) {
            count.set(link.source, (count.get(link.source) ?? 0) + 1)
            count.set(link.target, (count.get(link.target) ?? 0) + 1)
        }
        return count
    }, [kept])
    const shape = useMemo<GraphShape>(
        () => ({
            nodes: nodes.map((node) => ({
                id: node.id,
                width: NAME_WIDTH,
                height: dotSize(degree.get(node.id) ?? 0) + NAME_GAP + NAME_LINE,
            })),
            edges: kept.map((link, index) => ({
                id: `${link.source}~${link.target}~${String(index)}`,
                source: link.source,
                target: link.target,
            })),
        }),
        [nodes, kept, degree],
    )
    const placed = useNetworkLayout(shape)
    const lit = useMemo(() => {
        if (hovered === null) return null
        const near = new Set([hovered])
        for (const link of kept) {
            if (link.source === hovered) near.add(link.target)
            if (link.target === hovered) near.add(link.source)
        }
        return near
    }, [hovered, kept])

    const drawn = useMemo<Node<DotData>[]>(() => {
        const byId = new Map(nodes.map((node) => [node.id, node]))
        return placed.nodes.flatMap((spot) => {
            const node = byId.get(spot.id)
            if (node === undefined) return []
            return [
                {
                    id: node.id,
                    type: 'dot',
                    position: { x: spot.x, y: spot.y },
                    width: spot.width,
                    height: spot.height,
                    measured: { width: spot.width, height: spot.height },
                    selected: node.id === selected,
                    className:
                        'rounded-node outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
                    data: {
                        label: node.label,
                        size: dotSize(degree.get(node.id) ?? 0),
                        fill:
                            node.color !== undefined
                                ? KIND_FILL[node.color]
                                : node.group === undefined
                                  ? 'bg-muted-foreground'
                                  : KIND_FILL[kindOf(node.group)],
                        faint: node.faint === true,
                        current: node.id === current,
                        dim: lit !== null && !lit.has(node.id),
                    },
                },
            ]
        })
    }, [nodes, placed, selected, current, degree, lit])

    const lines = useMemo<Edge[]>(
        () =>
            shape.edges.map((edge) => {
                const touches = hovered !== null && (edge.source === hovered || edge.target === hovered)
                return {
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    type: 'straight',
                    style: touches ? { stroke: 'var(--foreground)', strokeWidth: 1.5 } : hovered === null ? undefined : { opacity: 0.15 },
                }
            }),
        [shape, hovered],
    )

    return (
        <HoverContext value={setHovered}>
            <GraphCanvas
                nodes={drawn}
                edges={lines}
                nodeTypes={NODE_TYPES}
                settled={placed.settled}
                fitMinZoom={fitMinZoom ?? NETWORK_FIT_ZOOM}
                frame={frame}
                zoomOnDoubleClick={zoomOnDoubleClick}
                narrowFit={narrowFit}
                tallFit={tallFit}
                onControls={onControls}
                fillFloor={fillFloor}
                controls={controls}
                onSelect={onSelect}
                words={words}
                className={className}
            />
        </HoverContext>
    )
}
