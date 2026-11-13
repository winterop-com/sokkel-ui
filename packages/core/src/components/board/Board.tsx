import type { DragEndEvent, DragMoveEvent } from '@dnd-kit/core'
import { ChevronRight } from 'lucide-react'
import {
    createContext,
    useContext,
    useId,
    useRef,
    useState,
    type CSSProperties,
    type ElementType,
    type HTMLAttributes,
    type ReactNode,
} from 'react'

import { cn } from '../../lib/cn'
import {
    DragDrop,
    DragGrip,
    dragData,
    dragPoint,
    useDragItem,
    useDropTarget,
    type DragData,
    type DragGripProps,
    type DragHandleProps,
} from '../DragDrop'

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

/** The card being dragged and where it would land. */
export interface BoardDragState {
    card: string
    /** The zone it would land in; null where it would go back, as over its own place or a refused one. */
    zone: string | null
    before: string | null
}

/** A column being dragged and where it would land: beside the column `at`, or back where it was while `at` is null. */
export interface BoardColumnDragState {
    column: string
    at: string | null
    side: 'before' | 'after'
}

interface BoardScope {
    kind: string
    drag: BoardDragState | null
    /** What columns drag as, while the board moves them. */
    columnKind: string | null
    columnDrag: BoardColumnDragState | null
}

const BoardContext = createContext<BoardScope | null>(null)
const ZoneContext = createContext<{ id: string; locked: boolean } | null>(null)

/** The card being dragged and where it would land, for a card or a zone to draw itself by. */
export function useBoardDrag(): BoardDragState | null {
    return useContext(BoardContext)?.drag ?? null
}

/** The drop zone a card sits in. */
export function useBoardZone(): string | null {
    return useContext(ZoneContext)?.id ?? null
}

/** The column being dragged and where it would land, for a column to draw itself by. */
export function useBoardColumnDrag(): BoardColumnDragState | null {
    return useContext(BoardContext)?.columnDrag ?? null
}

/** What the nearest `Board`'s columns drag as, or null where it does not move them. */
export function useBoardColumnKind(): string | null {
    return useContext(BoardContext)?.columnKind ?? null
}

/** What a card or a zone hands the drag about itself. */
interface Place {
    card?: string
    zone: string
}

/**
 * Where a card held over another lands: before it, or before the card after it once it is past the
 * other's middle. `others` are the zone's cards in order without the one held.
 */
export function landingBefore(others: readonly string[], over: string, below: boolean): string | null {
    if (!below) return over
    const at = others.indexOf(over)
    return at === -1 ? null : (others[at + 1] ?? null)
}

/**
 * Where a column dragged beside another lands, as places among the columns in their order; undefined
 * where it would land where it was, or would cross a locked column, which keeps its place.
 */
export function columnLanding(
    order: readonly string[],
    locked: readonly string[],
    moved: string,
    at: string,
    side: 'before' | 'after',
): { from: number; to: number } | undefined {
    const from = order.indexOf(moved)
    const others = order.filter((id) => id !== moved)
    const beside = others.indexOf(at)
    if (from === -1 || beside === -1 || locked.includes(moved)) return undefined
    const to = beside + (side === 'after' ? 1 : 0)
    if (to === from) return undefined
    const crossed = from < to ? order.slice(from + 1, to + 1) : order.slice(to, from)
    return crossed.some((id) => locked.includes(id)) ? undefined : { from, to }
}

export interface BoardProps {
    onMove?: (move: BoardMove) => void
    /**
     * Whether a card may land where a move would put it. A refused place shows no line, and a card
     * let go there goes back. A locked zone or column refuses every card without it.
     */
    canDrop?: (move: BoardMove) => boolean
    /**
     * Moves a column from one place to another among the board's `BoardColumn`s, both counted from
     * 0 in the order they are drawn. With it a column drags by its head, and from the keyboard by
     * the grip in its head, the arrows carrying it beside the next column; a locked column keeps
     * its place, and no column moves across it. The board holds no order of its own.
     */
    onColumnMove?: (from: number, to: number) => void
    /** The width of a column, and of a lane's cell. */
    columnWidth?: string
    children: ReactNode
    className?: string
}

/**
 * A board of cards in drop zones, the ground a board's columns or lanes stand on. It scrolls
 * sideways when the columns are wider than the room, and moves cards by drag and drop.
 *
 * A mouse drags once it has moved a few pixels with the button held; a finger holds still for
 * a moment first, so a swipe still scrolls; a card's grip picks it up from the keyboard with
 * Space or Enter, the arrows carrying it between cards and columns. While a card is dragged a copy
 * of it follows the pointer, the card itself fades in place, a line shows where it would land, and
 * the board scrolls when the pointer nears an edge. Escape cancels. On release `onMove` says where
 * it landed; the board holds no order of its own, so the app moves the card in its state.
 *
 * Cards are `BoardCard`s, or any content in a `BoardItem`, inside a `BoardDrop`. Anything inside a
 * card marked `data-no-drag`, such as its menu, keeps its own press. A `locked` card stays where it
 * is, a `locked` zone or column neither gives nor takes a card, and `canDrop` refuses any other
 * place, so no line shows where a card cannot go.
 */
export function Board({ onMove, canDrop, onColumnMove, columnWidth = '18rem', children, className }: BoardProps) {
    const kind = useId()
    const columnKind = `${kind}:column`
    const root = useRef<HTMLDivElement>(null)
    const [drag, setDrag] = useState<BoardDragState | null>(null)
    const target = useRef<BoardDragState | null>(null)
    const [columnDrag, setColumnDrag] = useState<BoardColumnDragState | null>(null)
    const columnTarget = useRef<BoardColumnDragState | null>(null)

    /** The move a card would make landing before `before` in `zone`. */
    const moveOf = (card: DragData, zone: string, before: string | null): BoardMove => {
        const held = (card.value as Place).card ?? ''
        const others = cardsIn(root.current, zone).filter((each) => each !== held)
        const index = before === null ? others.length : others.indexOf(before)
        return { card: held, from: (card.value as Place).zone, to: zone, before, index }
    }

    /** Where the card would land now: in the zone under it, before the card it is above; nowhere over its own place or a refused one. */
    const aim = (event: DragMoveEvent | DragEndEvent): BoardDragState | null => {
        const card = dragData(event.active)
        if (card?.kind !== kind) return null
        const held = (card.value as Place).card ?? ''
        const over = dragData(event.over)
        const nowhere = { card: held, zone: null, before: null }
        if (event.over === null || over?.kind !== kind) return nowhere
        const place = over.value as Place
        if (place.card === held) return nowhere
        let before: string | null = null
        if (place.card !== undefined) {
            const box = event.over.rect
            const point = dragPoint(event)
            const below = point !== null && point.y > box.top + box.height / 2
            const others = cardsIn(root.current, place.zone).filter((each) => each !== held)
            before = landingBefore(others, place.card, below)
        }
        const move = moveOf(card, place.zone, before)
        const home = cardsIn(root.current, move.from)
        if (move.to === move.from && (home[home.indexOf(held) + 1] ?? null) === before) return nowhere
        if (canDrop !== undefined && !canDrop(move)) return nowhere
        return { card: held, zone: place.zone, before }
    }

    /** Where the column would land now: beside the column under it, on the side the pointer is; nowhere where it cannot go. */
    const aimColumn = (event: DragMoveEvent | DragEndEvent): BoardColumnDragState | null => {
        const held = dragData(event.active)
        if (held?.kind !== columnKind) return null
        const column = (held.value as { column: string }).column
        const over = dragData(event.over)
        const nowhere: BoardColumnDragState = { column, at: null, side: 'before' }
        if (event.over === null || over?.kind !== columnKind) return nowhere
        const at = (over.value as { column: string }).column
        const box = event.over.rect
        const point = dragPoint(event)
        const side = point !== null && point.x > box.left + box.width / 2 ? 'after' : 'before'
        const { order, locked } = columnsIn(root.current)
        return columnLanding(order, locked, column, at, side) === undefined ? nowhere : { column, at, side }
    }

    const follow = (event: DragMoveEvent) => {
        const next = aim(event)
        const last = target.current
        if (next !== null && (last === null || last.zone !== next.zone || last.before !== next.before)) {
            target.current = next
            setDrag(next)
        }
        const column = aimColumn(event)
        const lastColumn = columnTarget.current
        if (column !== null && (lastColumn === null || lastColumn.at !== column.at || lastColumn.side !== column.side)) {
            columnTarget.current = column
            setColumnDrag(column)
        }
    }
    const done = () => {
        target.current = null
        setDrag(null)
        columnTarget.current = null
        setColumnDrag(null)
    }

    return (
        <BoardContext.Provider value={{ kind, drag, columnKind: onColumnMove === undefined ? null : columnKind, columnDrag }}>
            <DragDrop
                onDragMove={follow}
                onDragOver={follow}
                onDragEnd={(event) => {
                    const held = dragData(event.active)
                    const landed = target.current
                    const column = columnTarget.current
                    done()
                    if (held?.kind === columnKind) {
                        if (column === null || column.at === null) return
                        const { order, locked } = columnsIn(root.current)
                        const moved = columnLanding(order, locked, column.column, column.at, column.side)
                        if (moved !== undefined) onColumnMove?.(moved.from, moved.to)
                        return
                    }
                    if (held?.kind !== kind || landed === null || landed.zone === null) return
                    onMove?.(moveOf(held, landed.zone, landed.before))
                }}
                onDragCancel={done}
            >
                <div
                    ref={root}
                    data-board-dragging={drag !== null || undefined}
                    className={cn('relative min-h-0 overflow-auto', className)}
                    style={{ '--board-column': columnWidth } as CSSProperties}
                >
                    {children}
                </div>
            </DragDrop>
        </BoardContext.Provider>
    )
}

/** The board's columns in the order they are drawn, and which of them are locked. */
function columnsIn(root: HTMLElement | null): { order: string[]; locked: string[] } {
    const columns = [...(root?.querySelectorAll<HTMLElement>('[data-board-column]') ?? [])]
    return {
        order: columns.map((column) => column.dataset.boardColumn ?? ''),
        locked: columns.filter((column) => column.dataset.locked !== undefined).map((column) => column.dataset.boardColumn ?? ''),
    }
}

/** The cards of a zone in the order they are drawn. */
function cardsIn(root: HTMLElement | null, zone: string): string[] {
    const element = root?.querySelector<HTMLElement>(`[data-board-drop="${CSS.escape(zone)}"]`)
    if (element == null) return []
    return [...element.querySelectorAll<HTMLElement>('[data-board-card]')]
        .filter((card) => card.closest('[data-board-drop]') === element)
        .map((card) => card.dataset.boardCard ?? '')
}

export interface BoardDropProps {
    id: string
    children?: ReactNode
    /** What an empty zone says, such as "No items". */
    empty?: ReactNode
    /** What a screen reader calls the zone as a card is carried over it; its id without it. */
    label?: string
    /** Neither gives nor takes a card: its cards stay, and none lands in it. */
    locked?: boolean
    className?: string
}

/**
 * Where cards lie and land: a column's list, or one cell of a lane. Its `id` is what a move
 * names; a board with lanes gives each cell an id that says both its lane and its column. While
 * a card is over it, it washes, and a line at its end shows a card landing last. A `locked` zone
 * neither gives nor takes a card.
 */
export function BoardDrop({ id, children, empty, label, locked = false, className }: BoardDropProps) {
    const board = useContext(BoardContext)
    const drag = board?.drag ?? null
    const kind = board?.kind ?? ''
    const place: Place = { zone: id }
    const data: DragData = { kind, label: label ?? id, value: place }
    const { ref } = useDropTarget({ id: `${kind}:zone:${id}`, data, disabled: board === null || locked })
    // The zone's end as a place of its own, so the arrows carry a card past the last one.
    const end = useDropTarget({ id: `${kind}:end:${id}`, data, disabled: board === null || locked })
    const over = drag !== null && drag.zone === id
    const hasCards = Array.isArray(children) ? children.some((child) => child !== null && child !== false) : children != null
    return (
        <ZoneContext.Provider value={{ id, locked }}>
            <div
                ref={ref}
                data-board-drop={id}
                data-over={over || undefined}
                data-locked={locked || undefined}
                className={cn('flex min-h-20 flex-col gap-2 rounded-surface p-1.5 transition-colors', over && 'bg-primary/5', className)}
            >
                {children}
                {!hasCards && empty !== undefined && !over && (
                    <div className="flex items-center justify-center rounded-md border border-dashed border-border px-3 py-6 text-xs text-faint">
                        {empty}
                    </div>
                )}
                <div ref={end.ref} className="relative h-0 shrink-0">
                    {over && drag.before === null && <DropLine />}
                </div>
            </div>
        </ZoneContext.Provider>
    )
}

/** The line that shows where a dragged card would land. */
export function DropLine() {
    return <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-[5px] h-0.5 rounded-full bg-primary" />
}

interface ItemHandle {
    handle: DragHandleProps
    label: string
}

const ItemContext = createContext<ItemHandle | null>(null)

export interface BoardItemProps extends Omit<HTMLAttributes<HTMLElement>, 'id'> {
    /** What a move names the card by. */
    id: string
    /** What a screen reader and the card's grip call it. */
    label: string
    /** What follows the pointer while it is dragged: the card drawn again, without its drag. */
    preview?: () => ReactNode
    /** Stays where it is: it does not drag, and draws no grip. */
    locked?: boolean
    as?: ElementType
    children?: ReactNode
    className?: string
}

/**
 * Anything a board moves as a card: pressed anywhere it drags, and picked up from the keyboard by
 * the `BoardGrip` inside it. It fades while it is dragged, and a line above it shows a card
 * landing before it. A `locked` card, or any card of a locked zone, stays where it is. `BoardCard`
 * is one.
 */
export function BoardItem({ id, label, preview, locked = false, as: Tag = 'div', children, className, ...props }: BoardItemProps) {
    const board = useContext(BoardContext)
    const zoneScope = useContext(ZoneContext)
    const zone = zoneScope?.id ?? ''
    const kind = board?.kind ?? ''
    const drag = board?.drag ?? null
    const fixed = board === null || locked || zoneScope?.locked === true
    const place: Place = { card: id, zone }
    const data: DragData = { kind, label, value: place, preview }
    const item = useDragItem({ id: `${kind}:card:${id}`, data, disabled: fixed })
    const target = useDropTarget({ id: `${kind}:at:${id}`, data, disabled: board === null || zoneScope?.locked === true })
    const { ref: grip, onKeyDown, onPointerDown, onTouchStart, ...attributes } = item.handle
    const dragged = drag?.card === id
    const landing = drag !== null && !dragged && drag.zone === zone && drag.before === id
    return (
        <ItemContext.Provider value={fixed ? null : { handle: { ...attributes, ref: grip }, label }}>
            <Tag
                {...props}
                ref={(element: HTMLElement | null) => {
                    item.ref(element)
                    target.ref(element)
                }}
                data-board-card={id}
                data-dragging={dragged || undefined}
                data-locked={fixed || undefined}
                onKeyDown={fixed ? undefined : onKeyDown}
                onPointerDown={fixed ? undefined : onPointerDown}
                onTouchStart={fixed ? undefined : onTouchStart}
                className={cn('relative', dragged && 'opacity-40', className)}
            >
                {landing && <DropLine />}
                {children}
            </Tag>
        </ItemContext.Provider>
    )
}

export type BoardGripProps = Omit<DragGripProps, 'handle' | 'label'> & {
    /** Its name; `move` of the card's label without it. */
    label?: string
    /** Names the grip from the card's label, where `label` is not given. */
    move?: (card: string) => string
}

/** The grip of the `BoardItem` it is drawn in: what a keyboard picks the card up by. */
export function BoardGrip({ label, move = (card) => `Move ${card}`, ...props }: BoardGripProps) {
    const item = useContext(ItemContext)
    if (item === null) return null
    return <DragGrip size="icon-xs" {...props} handle={item.handle} label={label ?? move(item.label)} />
}

/** The words a board lane says. */
export interface BoardLaneWords {
    collapse: string
    expand: string
}

const LANE_WORDS: BoardLaneWords = {
    collapse: 'Fold the lane',
    expand: 'Unfold the lane',
}

export interface BoardLaneProps {
    title: ReactNode
    count?: number
    /** How many columns the board has, so the lane's cells line up under their heads. */
    columns: number
    collapsed?: boolean
    onCollapsedChange?: (collapsed: boolean) => void
    children: ReactNode
    words?: Partial<BoardLaneWords>
}

/**
 * One lane of a board with swimlanes: a header across the board with the lane's title and how
 * many cards it holds, then its cells, one `BoardDrop` per column. The header stays in view as
 * the board scrolls sideways, and folds the lane away.
 */
export function BoardLane({ title, count, columns, collapsed = false, onCollapsedChange, children, words: given }: BoardLaneProps) {
    const words = { ...LANE_WORDS, ...given }
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
