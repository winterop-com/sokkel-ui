import { ChevronRight } from 'lucide-react'
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { cn } from '../../lib/cn'

/** A card dropped somewhere: which card, the zone it left and the zone it lands in, and where. */
export interface BoardMove {
    card: string
    from: string
    to: string
    /** The card it lands before, or null for the end of the zone. */
    before: string | null
    /** Its place among the zone's other cards. */
    index: number
}

interface DragState {
    card: string
    zone: string | null
    before: string | null
}

const DragContext = createContext<DragState | null>(null)
const ZoneContext = createContext<string | null>(null)

/** The card being dragged and where it would land, for a card or a zone to draw itself by. */
export function useBoardDrag(): DragState | null {
    return useContext(DragContext)
}

/** The drop zone a card sits in. */
export function useBoardZone(): string | null {
    return useContext(ZoneContext)
}

interface Session {
    card: string
    from: string
    element: HTMLElement
    x: number
    y: number
    touch: boolean
    armed: boolean
    started: boolean
    ghost: HTMLElement | null
    timer: number | undefined
    target: DragState | null
}

/** How far a mouse moves before a press becomes a drag, and how long a finger holds before it does. */
const THRESHOLD = 4
const HOLD = 350
/** How near an edge the pointer comes before the board scrolls that way, and by how much a move. */
const EDGE = 48
const STEP = 14

function scrollNear(element: HTMLElement, x: number, y: number) {
    const box = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    if (/(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth) {
        if (x < box.left + EDGE) element.scrollLeft -= STEP
        else if (x > box.right - EDGE) element.scrollLeft += STEP
    }
    if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight) {
        if (y < box.top + EDGE) element.scrollTop -= STEP
        else if (y > box.bottom - EDGE) element.scrollTop += STEP
    }
}

/**
 * A board of cards in drop zones, the ground a board's columns or lanes stand on. It scrolls
 * sideways when the columns are wider than the room, and moves cards by drag and drop with
 * pointer events alone.
 *
 * A mouse drags once it has moved a few pixels with the button held; a finger holds still for
 * a moment first, so a swipe still scrolls. While a card is dragged a copy of it follows the
 * pointer, the card itself fades in place, a line shows where it would land, and the board
 * scrolls when the pointer nears an edge. Escape cancels. On release `onMove` says where it
 * landed; the board holds no order of its own, so the app moves the card in its state.
 *
 * Cards are `BoardCard`s, or any element with `data-board-card` set to its id, inside a
 * `BoardDrop`. Anything inside a card marked `data-board-nodrag`, such as its menu, keeps its
 * own press.
 */
export function Board({
    onMove,
    columnWidth = '18rem',
    children,
    className,
}: {
    onMove?: (move: BoardMove) => void
    /** The width of a column, and of a lane's cell. */
    columnWidth?: string
    children: ReactNode
    className?: string
}) {
    const root = useRef<HTMLDivElement>(null)
    const [drag, setDrag] = useState<DragState | null>(null)
    const session = useRef<Session | null>(null)
    const moved = useRef(onMove)
    moved.current = onMove

    useEffect(() => {
        const begin = (state: Session) => {
            const box = state.element.getBoundingClientRect()
            const ghost = state.element.cloneNode(true) as HTMLElement
            ghost.removeAttribute('data-board-card')
            ghost.setAttribute('aria-hidden', 'true')
            Object.assign(ghost.style, {
                position: 'fixed',
                left: `${box.left}px`,
                top: `${box.top}px`,
                width: `${box.width}px`,
                margin: '0',
                zIndex: '60',
                pointerEvents: 'none',
                rotate: '1.5deg',
                boxShadow: 'var(--shadow-pop)',
            })
            document.body.append(ghost)
            document.body.style.userSelect = 'none'
            document.body.style.cursor = 'grabbing'
            state.ghost = ghost
            state.started = true
        }

        const end = (commit: boolean) => {
            const state = session.current
            session.current = null
            if (state === null) return
            window.clearTimeout(state.timer)
            if (!state.started) return
            state.ghost?.remove()
            document.body.style.userSelect = ''
            document.body.style.cursor = ''
            setDrag(null)
            // The release that ends a drag is not also a press on the card under it.
            const swallow = (event: MouseEvent) => {
                event.stopPropagation()
                event.preventDefault()
            }
            window.addEventListener('click', swallow, { capture: true, once: true })
            window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
            const target = state.target
            if (!commit || target === null || target.zone === null || root.current === null) return
            const zone = root.current.querySelector<HTMLElement>(`[data-board-drop="${CSS.escape(target.zone)}"]`)
            const others = zone === null ? [] : cardsIn(zone).filter((card) => card.dataset.boardCard !== state.card)
            const index = target.before === null ? others.length : others.findIndex((card) => card.dataset.boardCard === target.before)
            moved.current?.({ card: state.card, from: state.from, to: target.zone, before: target.before, index })
        }

        const move = (event: PointerEvent) => {
            const state = session.current
            if (state === null) return
            const dx = event.clientX - state.x
            const dy = event.clientY - state.y
            const far = Math.hypot(dx, dy)
            if (!state.started) {
                if (!state.armed) {
                    if (far > THRESHOLD * 2) end(false)
                    return
                }
                if (far < THRESHOLD) return
                begin(state)
            }
            if (state.ghost !== null) state.ghost.style.translate = `${dx}px ${dy}px`
            const host = root.current
            if (host === null) return
            const under = document.elementFromPoint(event.clientX, event.clientY)
            const zone = under?.closest<HTMLElement>('[data-board-drop]') ?? null
            let target: DragState = { card: state.card, zone: null, before: null }
            if (zone !== null && host.contains(zone)) {
                const others = cardsIn(zone).filter((card) => card.dataset.boardCard !== state.card)
                const next = others.find((card) => {
                    const box = card.getBoundingClientRect()
                    return event.clientY < box.top + box.height / 2
                })
                target = { card: state.card, zone: zone.dataset.boardDrop ?? null, before: next?.dataset.boardCard ?? null }
                for (let at: HTMLElement | null = zone; at !== null && host.contains(at); at = at.parentElement) {
                    scrollNear(at, event.clientX, event.clientY)
                }
            } else {
                scrollNear(host, event.clientX, event.clientY)
            }
            const last = state.target
            if (last === null || last.zone !== target.zone || last.before !== target.before) {
                state.target = target
                setDrag(target)
            }
        }

        const touchMove = (event: TouchEvent) => {
            if (session.current?.armed === true) event.preventDefault()
        }
        const up = () => end(true)
        const cancel = () => end(false)
        const key = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && session.current?.started === true) end(false)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        window.addEventListener('pointercancel', cancel)
        window.addEventListener('keydown', key)
        window.addEventListener('touchmove', touchMove, { passive: false })
        return () => {
            end(false)
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
            window.removeEventListener('pointercancel', cancel)
            window.removeEventListener('keydown', key)
            window.removeEventListener('touchmove', touchMove)
        }
    }, [])

    return (
        <DragContext.Provider value={drag}>
            <div
                ref={root}
                data-board-dragging={drag !== null || undefined}
                className={cn('relative min-h-0 overflow-auto', className)}
                style={{ '--board-column': columnWidth } as CSSProperties}
                onPointerDown={(event) => {
                    if (event.button !== 0 || session.current !== null) return
                    const target = event.target as HTMLElement
                    if (target.closest('[data-board-nodrag]') !== null) return
                    const card = target.closest<HTMLElement>('[data-board-card]')
                    const zone = card?.closest<HTMLElement>('[data-board-drop]')
                    if (card == null || zone == null) return
                    const touch = event.pointerType === 'touch'
                    const state: Session = {
                        card: card.dataset.boardCard ?? '',
                        from: zone.dataset.boardDrop ?? '',
                        element: card,
                        x: event.clientX,
                        y: event.clientY,
                        touch,
                        armed: !touch,
                        started: false,
                        ghost: null,
                        timer: undefined,
                        target: null,
                    }
                    if (touch) {
                        state.timer = window.setTimeout(() => {
                            if (session.current !== state) return
                            state.armed = true
                            card.style.scale = '1.02'
                            window.setTimeout(() => (card.style.scale = ''), 150)
                        }, HOLD)
                    }
                    session.current = state
                }}
            >
                {children}
            </div>
        </DragContext.Provider>
    )
}

function cardsIn(zone: HTMLElement): HTMLElement[] {
    return [...zone.querySelectorAll<HTMLElement>('[data-board-card]')].filter((card) => card.closest('[data-board-drop]') === zone)
}

/**
 * Where cards lie and land: a column's list, or one cell of a lane. Its `id` is what a move
 * names; a board with lanes gives each cell an id that says both its lane and its column. While
 * a card is over it, it washes, and a line at its end shows a card landing last.
 */
export function BoardDrop({
    id,
    children,
    empty,
    className,
}: {
    id: string
    children?: ReactNode
    /** What an empty zone says, such as "No items". */
    empty?: ReactNode
    className?: string
}) {
    const drag = useBoardDrag()
    const over = drag !== null && drag.zone === id
    const hasCards = Array.isArray(children) ? children.some((child) => child !== null && child !== false) : children != null
    return (
        <ZoneContext.Provider value={id}>
            <div
                data-board-drop={id}
                data-over={over || undefined}
                className={cn('flex min-h-20 flex-col gap-2 rounded-surface p-1.5 transition-colors', over && 'bg-primary/5', className)}
            >
                {children}
                {!hasCards && empty !== undefined && !over && (
                    <div className="flex items-center justify-center rounded-md border border-dashed border-border px-3 py-6 text-xs text-faint">
                        {empty}
                    </div>
                )}
                <div className="relative h-0 shrink-0">{over && drag.before === null && <DropLine />}</div>
            </div>
        </ZoneContext.Provider>
    )
}

/** The line that shows where a dragged card would land. */
export function DropLine() {
    return <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-[5px] h-0.5 rounded-full bg-primary" />
}

/**
 * One lane of a board with swimlanes: a header across the board with the lane's title and how
 * many cards it holds, then its cells, one `BoardDrop` per column. The header stays in view as
 * the board scrolls sideways, and folds the lane away.
 */
export function BoardLane({
    title,
    count,
    columns,
    collapsed = false,
    onCollapsedChange,
    children,
    words = { collapse: 'Fold the lane', expand: 'Unfold the lane' },
}: {
    title: ReactNode
    count?: number
    /** How many columns the board has, so the lane's cells line up under their heads. */
    columns: number
    collapsed?: boolean
    onCollapsedChange?: (collapsed: boolean) => void
    children: ReactNode
    words?: { collapse: string; expand: string }
}) {
    return (
        <section className="flex flex-col">
            <div className="sticky left-0 z-10 flex w-max items-center gap-2 py-2 pr-3">
                <button
                    type="button"
                    aria-expanded={!collapsed}
                    aria-label={collapsed ? words.expand : words.collapse}
                    title={collapsed ? words.expand : words.collapse}
                    className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
                    onClick={() => onCollapsedChange?.(!collapsed)}
                >
                    <ChevronRight className={cn('size-4 transition-transform', !collapsed && 'rotate-90')} aria-hidden />
                </button>
                <h3 className="text-sm font-medium">{title}</h3>
                {count !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{count}</span>}
            </div>
            {!collapsed && (
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, var(--board-column))` }}>
                    {children}
                </div>
            )}
        </section>
    )
}
