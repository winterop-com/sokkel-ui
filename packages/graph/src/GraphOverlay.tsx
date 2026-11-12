import { Panel, useStore, useViewport, type InternalNode, type ReactFlowState } from '@xyflow/react'
import { CircleAlert, Info, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { useGraphDirection } from './context'
import type { GraphDirection, GraphPoint } from './layout'

/**
 * Where an overlay stands: a point in the graph's coordinates, a point beside a node's output
 * (`dx` and `dy` away from its port), or the middle of an edge, by its id.
 */
export type GraphAnchor = GraphPoint | { node: string; dx?: number; dy?: number } | { edge: string }

/** The point a node's edges leave from, or arrive at. */
function portOf(node: InternalNode, direction: GraphDirection, side: 'out' | 'in'): GraphPoint {
    const { x, y } = node.internals.positionAbsolute
    const width = node.measured.width ?? node.width ?? 0
    const height = node.measured.height ?? node.height ?? 0
    if (direction === 'down') return { x: x + width / 2, y: side === 'out' ? y + height : y }
    return { x: side === 'out' ? x + width : x, y: y + height / 2 }
}

/** An anchor as a point in the graph's coordinates, or null while what it names is not drawn. */
function pointOf(state: ReactFlowState, anchor: GraphAnchor, direction: GraphDirection): GraphPoint | null {
    if ('x' in anchor) return anchor
    if ('node' in anchor) {
        const node = state.nodeLookup.get(anchor.node)
        if (node === undefined) return null
        const port = portOf(node, direction, 'out')
        return { x: port.x + (anchor.dx ?? 0), y: port.y + (anchor.dy ?? 0) }
    }
    const edge = state.edges.find((each) => each.id === anchor.edge)
    const from = edge === undefined ? undefined : state.nodeLookup.get(edge.source)
    const to = edge === undefined ? undefined : state.nodeLookup.get(edge.target)
    if (from === undefined || to === undefined) return null
    const a = portOf(from, direction, 'out')
    const b = portOf(to, direction, 'in')
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** How far an overlay keeps from the canvas's edges and from its anchor. */
const MARGIN = 8

export interface GraphOverlayProps {
    at: GraphAnchor
    /** The node a pending connection is drawn from. */
    link?: string
    onClose?: () => void
    children: ReactNode
    className?: string
}

/**
 * Something held over a canvas at a place in the graph, such as a `BlockPicker`: it follows the
 * place as the view pans and zooms, opens beside it on the side with room, and stays inside the
 * canvas, whose height it gives its content as `--graph-overlay-room`. Given `link`, a dashed line runs from that node's output to the place, for a step about
 * to be added there. Escape and a press outside close it. Render it as a child of the canvas.
 */
export function GraphOverlay({ at, link, onClose, children, className }: GraphOverlayProps) {
    const direction = useGraphDirection()
    const view = useViewport()
    const point = useStore((state) => pointOf(state, at, direction), samePoint)
    const from = useStore((state) => {
        const node = link === undefined ? undefined : state.nodeLookup.get(link)
        return node === undefined ? null : portOf(node, direction, 'out')
    }, samePoint)
    const canvas = useStore((state) => ({ width: state.width, height: state.height }), sameSize)
    const box = useRef<HTMLDivElement | null>(null)
    const [size, setSize] = useState({ width: 0, height: 0 })
    const close = useRef(onClose)
    useEffect(() => {
        close.current = onClose
    }, [onClose])

    useLayoutEffect(() => {
        const element = box.current
        if (element === null) return
        const measure = () => setSize({ width: element.offsetWidth, height: element.offsetHeight })
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !event.defaultPrevented) close.current?.()
        }
        const onDown = (event: PointerEvent) => {
            if (box.current !== null && event.target instanceof globalThis.Node && !box.current.contains(event.target)) close.current?.()
        }
        document.addEventListener('keydown', onKey)
        document.addEventListener('pointerdown', onDown, true)
        return () => {
            document.removeEventListener('keydown', onKey)
            document.removeEventListener('pointerdown', onDown, true)
        }
    }, [])

    if (point === null) return null
    const sx = point.x * view.zoom + view.x
    const sy = point.y * view.zoom + view.y
    // Opens below and to the right, and turns to the side with room where it would leave the canvas.
    let left = sx + MARGIN
    let top = sy + MARGIN
    if (left + size.width > canvas.width - MARGIN)
        left = Math.max(MARGIN, Math.min(sx - MARGIN - size.width, canvas.width - MARGIN - size.width))
    if (top + size.height > canvas.height - MARGIN)
        top = Math.max(MARGIN, Math.min(sy - MARGIN - size.height, canvas.height - MARGIN - size.height))
    const start = from === null ? null : { x: from.x * view.zoom + view.x, y: from.y * view.zoom + view.y }

    return (
        <>
            {start !== null && (
                <svg className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible" aria-hidden>
                    <path
                        d={
                            direction === 'down'
                                ? `M ${String(start.x)} ${String(start.y)} C ${String(start.x)} ${String((start.y + sy) / 2)}, ${String(sx)} ${String((start.y + sy) / 2)}, ${String(sx)} ${String(sy)}`
                                : `M ${String(start.x)} ${String(start.y)} C ${String((start.x + sx) / 2)} ${String(start.y)}, ${String((start.x + sx) / 2)} ${String(sy)}, ${String(sx)} ${String(sy)}`
                        }
                        fill="none"
                        stroke="var(--ring)"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                    />
                    <circle cx={sx} cy={sy} r={4} fill="var(--ring)" />
                </svg>
            )}
            <div
                ref={box}
                data-slot="graph-overlay"
                className={cn('nodrag nopan nowheel absolute z-20', className)}
                style={{ left, top, '--graph-overlay-room': `${String(Math.max(120, canvas.height - MARGIN * 2))}px` } as CSSProperties}
            >
                {children}
            </div>
        </>
    )
}

function samePoint(a: GraphPoint | null, b: GraphPoint | null): boolean {
    return a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y)
}

function sameSize(a: { width: number; height: number }, b: { width: number; height: number }): boolean {
    return a.width === b.width && a.height === b.height
}

/** The words a graph notice says. */
export interface GraphNoticeWords {
    close: string
}

const NOTICE_WORDS: GraphNoticeWords = { close: 'Dismiss' }

export interface GraphNoticeProps {
    tone?: 'critical' | 'info'
    onClose?: () => void
    children: ReactNode
    words?: Partial<GraphNoticeWords>
}

/**
 * A short message across the foot of a canvas: why a connection was refused, or what a gesture
 * did. `critical` says a refusal; `info` says anything else. Render it as a child of the canvas.
 */
export function GraphNotice({ tone = 'info', onClose, children, words: given }: GraphNoticeProps) {
    const words = { ...NOTICE_WORDS, ...given }
    const Icon = tone === 'critical' ? CircleAlert : Info
    return (
        <Panel position="bottom-center" className="m-3! w-max max-w-[calc(100%-1.5rem)]">
            <div
                role="status"
                data-slot="graph-notice"
                data-tone={tone}
                className={cn(
                    'flex items-start gap-2 rounded-control border bg-popover py-1.5 pr-1.5 pl-2.5 text-sm text-popover-foreground shadow-pop',
                    tone === 'critical' ? 'border-critical/60' : 'border-border',
                )}
            >
                <Icon
                    className={cn('mt-0.5 size-4 shrink-0', tone === 'critical' ? 'text-critical-ink' : 'text-muted-foreground')}
                    aria-hidden
                />
                <span className="min-w-0 py-px">{children}</span>
                {onClose !== undefined && (
                    <button
                        type="button"
                        aria-label={words.close}
                        title={words.close}
                        onClick={onClose}
                        className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <X className="size-3.5" aria-hidden />
                    </button>
                )}
            </div>
        </Panel>
    )
}
