import { Panel, useStore, useViewport, type InternalNode, type ReactFlowState } from '@xyflow/react'
import { CircleAlert, Info, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { useGraphDirection } from './context'
import { roughRoute, routedPath, type GraphDirection, type GraphPoint } from './layout'

/** A rectangle on the screen, in the page's client pixels, such as `getBoundingClientRect` gives. */
export interface GraphScreenRect {
    x: number
    y: number
    width: number
    height: number
}

/**
 * Where an overlay stands. In the graph, following the view as it pans and zooms: a point in the
 * graph's coordinates, a point beside a node's output (`dx` and `dy` away from its port), or the
 * middle of an edge, by its id. On the screen, standing still: a point in client pixels such as a
 * pointer's, an element such as the button that opened it, a rectangle in client pixels, or
 * `center`, the middle of the canvas, for one opened from the keyboard.
 */
export type GraphAnchor =
    | GraphPoint
    | { node: string; dx?: number; dy?: number }
    | { edge: string }
    | { clientX: number; clientY: number }
    | { element: Element }
    | { rect: GraphScreenRect }
    | 'center'

/** The point a node's edges leave from, or arrive at. */
function portOf(node: InternalNode, direction: GraphDirection, side: 'out' | 'in'): GraphPoint {
    const { x, y } = node.internals.positionAbsolute
    const width = node.measured.width ?? node.width ?? 0
    const height = node.measured.height ?? node.height ?? 0
    if (direction === 'down') return { x: x + width / 2, y: side === 'out' ? y + height : y }
    return { x: side === 'out' ? x + width : x, y: y + height / 2 }
}

/** Whether an anchor stands on the screen rather than in the graph. */
function onScreen(anchor: GraphAnchor): anchor is Exclude<GraphAnchor, GraphPoint | { node: string } | { edge: string }> {
    return anchor === 'center' || 'clientX' in anchor || 'element' in anchor || 'rect' in anchor
}

/** An anchor in the graph as a point in the graph's coordinates, or null while what it names is not drawn, or for one on the screen. */
function pointOf(state: ReactFlowState, anchor: GraphAnchor, direction: GraphDirection): GraphPoint | null {
    if (onScreen(anchor)) return null
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

/** The least height an overlay's content is let have, however little room there is. */
const LEAST_ROOM = 120

/**
 * What an overlay is placed beside, in the canvas's pixels: a `point` it opens below and to the
 * right of, a `box` it opens below or above without covering, or the canvas's `center`.
 */
export type GraphOverlayTarget = { kind: 'point'; x: number; y: number } | ({ kind: 'box' } & GraphScreenRect) | { kind: 'center' }

/**
 * Where an overlay of `size` stands on a canvas of `canvas` beside `target`, and the most height
 * its content has (`room`). Beside a point it opens below and to the right, turning to the side with
 * room. Beside a box it opens below it, lined up with its start, or above it when there is no room
 * below, and on the side with more room when neither holds it, its content then held to that room.
 */
export function placeOverlay(
    target: GraphOverlayTarget,
    size: { width: number; height: number },
    canvas: { width: number; height: number },
): { left: number; top: number; room: number } {
    const most = { left: canvas.width - MARGIN - size.width, top: canvas.height - MARGIN - size.height }
    const within = (value: number, highest: number) => Math.max(MARGIN, Math.min(value, highest))
    if (target.kind === 'center')
        return {
            left: within((canvas.width - size.width) / 2, most.left),
            top: within((canvas.height - size.height) / 2, most.top),
            room: Math.max(LEAST_ROOM, canvas.height - MARGIN * 2),
        }
    if (target.kind === 'point') {
        const { x, y } = target
        let left = x + MARGIN
        let top = y + MARGIN
        if (left + size.width > canvas.width - MARGIN) left = Math.max(MARGIN, Math.min(x - MARGIN - size.width, most.left))
        if (top + size.height > canvas.height - MARGIN) top = Math.max(MARGIN, Math.min(y - MARGIN - size.height, most.top))
        return { left, top, room: Math.max(LEAST_ROOM, canvas.height - MARGIN * 2) }
    }
    const below = Math.max(MARGIN, target.y + target.height + MARGIN)
    const above = Math.min(canvas.height - MARGIN, target.y - MARGIN)
    const roomBelow = canvas.height - MARGIN - below
    const roomAbove = above - MARGIN
    let left = target.x
    if (left + size.width > canvas.width - MARGIN) left = target.x + target.width - size.width
    left = within(left, most.left)
    let top: number
    if (size.height <= roomBelow || (size.height > roomAbove && roomBelow >= roomAbove)) top = below
    else top = Math.max(MARGIN, above - size.height)
    return { left, top, room: Math.max(LEAST_ROOM, roomBelow >= roomAbove ? roomBelow : roomAbove) }
}

/** An anchor on the screen as a target in the canvas's pixels, given where the canvas stands on the screen. */
function screenTarget(anchor: GraphAnchor, canvas: DOMRect): GraphOverlayTarget | null {
    if (anchor === 'center') return { kind: 'center' }
    if ('clientX' in anchor) return { kind: 'point', x: anchor.clientX - canvas.left, y: anchor.clientY - canvas.top }
    const rect = 'element' in anchor ? anchor.element.getBoundingClientRect() : 'rect' in anchor ? anchor.rect : null
    if (rect === null) return null
    return { kind: 'box', x: rect.x - canvas.left, y: rect.y - canvas.top, width: rect.width, height: rect.height }
}

/** The point a target's link line ends at: the point, the middle of the box, or the canvas's middle. */
function endOf(target: GraphOverlayTarget, canvas: { width: number; height: number }): GraphPoint {
    if (target.kind === 'center') return { x: canvas.width / 2, y: canvas.height / 2 }
    if (target.kind === 'point') return { x: target.x, y: target.y }
    return { x: target.x + target.width / 2, y: target.y + target.height / 2 }
}

function sameTarget(a: GraphOverlayTarget | null, b: GraphOverlayTarget | null): boolean {
    return a === b || (a !== null && b !== null && JSON.stringify(a) === JSON.stringify(b))
}

export interface GraphOverlayProps {
    at: GraphAnchor
    /** The node a pending connection is drawn from. */
    link?: string
    onClose?: () => void
    /**
     * An element a press on does not close the overlay, such as the button that toggles it; an
     * `element` anchor is never pressed outside of either.
     */
    ignore?: RefObject<Element | null>
    children: ReactNode
    className?: string
}

/**
 * Something held over a canvas, such as a `BlockPicker`: beside a place in the graph, following it
 * as the view pans and zooms, or beside a place on the screen, such as the button that opened it.
 * It opens on the side with room, never over the button it stands beside, and stays inside the
 * canvas, giving its content the height it has as `--graph-overlay-room` and the width as
 * `--graph-overlay-width`. Given `link`, a dashed
 * line runs from that node's output to the place, routed in right-angled steps as the edges are,
 * for a step about to be added there. Escape and a press outside close it; a press on its `element`
 * anchor or on `ignore` does not, so the button that opened it can close it. Render it as a child of
 * the canvas.
 */
export function GraphOverlay({ at, link, onClose, ignore, children, className }: GraphOverlayProps) {
    const direction = useGraphDirection()
    const view = useViewport()
    const point = useStore((state) => pointOf(state, at, direction), samePoint)
    const from = useStore((state) => {
        const node = link === undefined ? undefined : state.nodeLookup.get(link)
        return node === undefined ? null : portOf(node, direction, 'out')
    }, samePoint)
    const canvas = useStore((state) => ({ width: state.width, height: state.height }), sameSize)
    const frame = useStore((state) => state.domNode)
    const box = useRef<HTMLDivElement | null>(null)
    const [drawn, setDrawn] = useState<HTMLDivElement | null>(null)
    const [size, setSize] = useState({ width: 0, height: 0 })
    const [screen, setScreen] = useState<GraphOverlayTarget | null>(null)
    const close = useRef(onClose)
    const opener = useRef<Element | null>(null)
    const ignored = useRef(ignore)
    useEffect(() => {
        close.current = onClose
        opener.current = typeof at === 'object' && 'element' in at ? at.element : null
        ignored.current = ignore
    })

    // Measured once drawn, which waits on a screen anchor being read.
    useLayoutEffect(() => {
        if (drawn === null) return
        const measure = () => setSize({ width: drawn.offsetWidth, height: drawn.offsetHeight })
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(drawn)
        return () => observer.disconnect()
    }, [drawn])

    // A screen anchor is read where it stands now, and again as the page scrolls or resizes.
    const screenKey = onScreen(at)
        ? at === 'center'
            ? 'center'
            : 'clientX' in at
              ? `${String(at.clientX)},${String(at.clientY)}`
              : 'rect' in at
                ? `${String(at.rect.x)},${String(at.rect.y)},${String(at.rect.width)},${String(at.rect.height)}`
                : 'element'
        : null
    const element = typeof at === 'object' && 'element' in at ? at.element : null
    const anchor = useRef(at)
    anchor.current = at
    useLayoutEffect(() => {
        if (screenKey === null || frame === null) {
            setScreen(null)
            return
        }
        const read = () => {
            const next = screenTarget(anchor.current, frame.getBoundingClientRect())
            setScreen((held) => (sameTarget(held, next) ? held : next))
        }
        read()
        window.addEventListener('resize', read)
        window.addEventListener('scroll', read, true)
        return () => {
            window.removeEventListener('resize', read)
            window.removeEventListener('scroll', read, true)
        }
    }, [screenKey, element, frame, canvas.width, canvas.height])

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !event.defaultPrevented) close.current?.()
        }
        const onDown = (event: PointerEvent) => {
            const target = event.target
            if (box.current === null || !(target instanceof globalThis.Node) || box.current.contains(target)) return
            if (opener.current?.contains(target) === true || ignored.current?.current?.contains(target) === true) return
            close.current?.()
        }
        document.addEventListener('keydown', onKey)
        document.addEventListener('pointerdown', onDown, true)
        return () => {
            document.removeEventListener('keydown', onKey)
            document.removeEventListener('pointerdown', onDown, true)
        }
    }, [])

    const target: GraphOverlayTarget | null =
        screenKey !== null
            ? screen
            : point === null
              ? null
              : { kind: 'point', x: point.x * view.zoom + view.x, y: point.y * view.zoom + view.y }
    if (target === null) return null
    const { left, top, room } = placeOverlay(target, size, canvas)
    const end = endOf(target, canvas)
    const start = from === null ? null : { x: from.x * view.zoom + view.x, y: from.y * view.zoom + view.y }

    return (
        <>
            {start !== null && (
                <svg className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible" aria-hidden>
                    <path
                        data-slot="graph-overlay-link"
                        d={routedPath(roughRoute({ ...start, width: 0, height: 0 }, { ...end, width: 0, height: 0 }, direction))}
                        fill="none"
                        stroke="var(--ring)"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                    />
                    <circle cx={end.x} cy={end.y} r={4} fill="var(--ring)" />
                </svg>
            )}
            <div
                ref={(element) => {
                    box.current = element
                    setDrawn(element)
                }}
                data-slot="graph-overlay"
                className={cn('nodrag nopan nowheel absolute z-20', className)}
                style={
                    {
                        left,
                        top,
                        '--graph-overlay-room': `${String(room)}px`,
                        '--graph-overlay-width': canvas.width > 0 ? `${String(canvas.width - MARGIN * 2)}px` : undefined,
                    } as CSSProperties
                }
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
                        className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-focus focus-visible:outline-ring"
                    >
                        <X className="size-3.5" aria-hidden />
                    </button>
                )}
            </div>
        </Panel>
    )
}
