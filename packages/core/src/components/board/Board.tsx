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
    fromKeyboard,
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
    zone: string | null
    before: string | null
}

interface BoardScope {
    kind: string
    drag: BoardDragState | null
}

const BoardContext = createContext<BoardScope | null>(null)
const ZoneContext = createContext<string | null>(null)

/** The card being dragged and where it would land, for a card or a zone to draw itself by. */
export function useBoardDrag(): BoardDragState | null {
    return useContext(BoardContext)?.drag ?? null
}

/** The drop zone a card sits in. */
export function useBoardZone(): string | null {
    return useContext(ZoneContext)
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

export interface BoardProps {
    onMove?: (move: BoardMove) => void
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
 * card marked `data-no-drag`, such as its menu, keeps its own press.
 */
export function Board({ onMove, columnWidth = '18rem', children, className }: BoardProps) {
    const kind = useId()
    const root = useRef<HTMLDivElement>(null)
    const [drag, setDrag] = useState<BoardDragState | null>(null)
    const target = useRef<BoardDragState | null>(null)

    /** Where the card would land now: in the zone under it, before the card it is above. */
    const aim = (event: DragMoveEvent | DragEndEvent): BoardDragState | null => {
        const card = dragData(event.active)
        if (card?.kind !== kind) return null
        const held = (card.value as Place).card ?? ''
        const over = dragData(event.over)
        if (event.over === null || over?.kind !== kind) return { card: held, zone: null, before: null }
        const place = over.value as Place
        if (place.card === undefined) return { card: held, zone: place.zone, before: null }
        // Over its own place the card lands where it was.
        if (place.card === held) return { card: held, zone: place.zone, before: target.current?.before ?? null }
        const box = event.over.rect
        const point = dragPoint(event)
        const start = event.active.rect.current.initial
        const below = fromKeyboard(event) ? start !== null && box.top > start.top : point !== null && point.y > box.top + box.height / 2
        const others = cardsIn(root.current, place.zone).filter((each) => each !== held)
        return { card: held, zone: place.zone, before: landingBefore(others, place.card, below) }
    }
    const follow = (event: DragMoveEvent) => {
        const next = aim(event)
        const last = target.current
        if (next === null) return
        if (last === null || last.zone !== next.zone || last.before !== next.before) {
            target.current = next
            setDrag(next)
        }
    }
    const done = () => {
        target.current = null
        setDrag(null)
    }

    return (
        <BoardContext.Provider value={{ kind, drag }}>
            <DragDrop
                onDragMove={follow}
                onDragOver={follow}
                onDragEnd={(event) => {
                    const card = dragData(event.active)
                    const landed = target.current
                    done()
                    if (card?.kind !== kind || landed === null || landed.zone === null) return
                    const from = (card.value as Place).zone
                    const others = cardsIn(root.current, landed.zone).filter((each) => each !== landed.card)
                    const index = landed.before === null ? others.length : others.indexOf(landed.before)
                    onMove?.({ card: landed.card, from, to: landed.zone, before: landed.before, index })
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
    className?: string
}

/**
 * Where cards lie and land: a column's list, or one cell of a lane. Its `id` is what a move
 * names; a board with lanes gives each cell an id that says both its lane and its column. While
 * a card is over it, it washes, and a line at its end shows a card landing last.
 */
export function BoardDrop({ id, children, empty, label, className }: BoardDropProps) {
    const board = useContext(BoardContext)
    const drag = board?.drag ?? null
    const kind = board?.kind ?? ''
    const place: Place = { zone: id }
    const { ref } = useDropTarget({ id: `${kind}:zone:${id}`, data: { kind, label: label ?? id, value: place }, disabled: board === null })
    const over = drag !== null && drag.zone === id
    const hasCards = Array.isArray(children) ? children.some((child) => child !== null && child !== false) : children != null
    return (
        <ZoneContext.Provider value={id}>
            <div
                ref={ref}
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
    as?: ElementType
    children?: ReactNode
    className?: string
}

/**
 * Anything a board moves as a card: pressed anywhere it drags, and picked up from the keyboard by
 * the `BoardGrip` inside it. It fades while it is dragged, and a line above it shows a card
 * landing before it. `BoardCard` is one.
 */
export function BoardItem({ id, label, preview, as: Tag = 'div', children, className, ...props }: BoardItemProps) {
    const board = useContext(BoardContext)
    const zone = useContext(ZoneContext) ?? ''
    const kind = board?.kind ?? ''
    const drag = board?.drag ?? null
    const place: Place = { card: id, zone }
    const data: DragData = { kind, label, value: place, preview }
    const item = useDragItem({ id: `${kind}:card:${id}`, data, disabled: board === null })
    const target = useDropTarget({ id: `${kind}:at:${id}`, data, disabled: board === null })
    const { ref: grip, onKeyDown, onPointerDown, onTouchStart, ...attributes } = item.handle
    const dragged = drag?.card === id
    const landing = drag !== null && !dragged && drag.zone === zone && drag.before === id
    return (
        <ItemContext.Provider value={{ handle: { ...attributes, ref: grip }, label }}>
            <Tag
                {...props}
                ref={(element: HTMLElement | null) => {
                    item.ref(element)
                    target.ref(element)
                }}
                data-board-card={id}
                data-dragging={dragged || undefined}
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onTouchStart={onTouchStart}
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
