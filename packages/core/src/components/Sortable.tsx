import { rectSortingStrategy, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    createContext,
    useContext,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ElementType,
    type HTMLAttributes,
    type KeyboardEvent,
    type ReactNode,
    type Ref,
} from 'react'

import { cn } from '../lib/cn'
import { stepTo } from '../lib/reorder'
import { DragDrop, DragGrip, useDragDrop, useDragging, withKeys, type DragData, type DragGripProps, type DragHandleProps } from './DragDrop'

/** The words a sortable group says, each with an English default. */
export interface SortableWords {
    /** A grip's name: what a drag or the arrow keys on it move. */
    move: (item: string) => string
    /** Said once an item is moved from the keyboard, its new place counted from 1. */
    moved: (item: string, place: number, count: number) => string
}

export const SORTABLE_WORDS: SortableWords = {
    move: (item) => `Move ${item}`,
    moved: (item, place, count) => `${item} moved to ${String(place)} of ${String(count)}`,
}

/** How items move aside as one is dragged: down a list, or across and down a grid. */
export type SortableLayout = 'list' | 'grid'

interface Group {
    scope: string
    layout: SortableLayout
    ids: readonly string[]
    kind: string
    label: (id: string) => string
    value?: (id: string) => unknown
    preview?: (id: string) => ReactNode
    accepts?: (drag: DragData) => boolean
    words: SortableWords
    disabled: boolean
    /** Moves an item `by` places, the focus following it; `say` tells a screen reader, as a drag tells it itself. */
    step: (id: string, by: number, say: boolean) => void
    /** The item whose grip takes the focus once it is drawn in its new place. */
    refocus: { current: string | null }
}

const GroupContext = createContext<Group | null>(null)

/** The id a group's item goes by among every drag on the page, so two groups' keys never meet. */
const scoped = (scope: string, id: string) => `${scope}\u0000${id}`

export interface SortableGroupProps {
    /** The keys of the items, in their order. */
    ids: readonly string[]
    layout?: SortableLayout
    /** Moves the item at `from` to `to`, both places among `ids`; the group draws the order it is given. */
    onMove: (from: number, to: number) => void
    /** What a screen reader and a grip call the item with this key. */
    label: (id: string) => string
    /** What a target outside the group takes the items as; only the group's own places take them without it. */
    kind?: string
    /** The app's value of an item, for a target outside the group that takes it. */
    value?: (id: string) => unknown
    /** What follows the pointer while the item is dragged; its label on a card without it. */
    preview?: (id: string) => ReactNode
    /** Whether an item of another group may be dropped among these; the drop is the app's to hear with `useDragDrop`. */
    accepts?: (drag: DragData) => boolean
    disabled?: boolean
    words?: Partial<SortableWords>
    children: ReactNode
}

/**
 * The order of a set of `SortableItem`s, the library's layer over the drag engine for anything put
 * in order by hand. An item is dragged by its grip (`SortableGrip`) or as a whole, the rest moving
 * aside to show where it lands; letting go calls `onMove(from, to)`, and Escape puts it back. With
 * the grip focused, the arrow keys move the item a place, the focus following it, and Space or Enter
 * picks it up to move it further. A screen reader hears each step.
 *
 * Inside a `DragDrop` the app draws around several parts, an item can be dropped on another part's
 * target that takes its `kind`, such as a folder of a tree.
 */
export function SortableGroup({
    ids,
    layout = 'list',
    onMove,
    label,
    kind,
    value,
    preview,
    accepts,
    disabled = false,
    words: given,
    children,
}: SortableGroupProps) {
    const scope = useId()
    const words = useMemo(() => ({ ...SORTABLE_WORDS, ...given }), [given])
    const [said, setSaid] = useState('')
    const refocus = useRef<string | null>(null)
    const moved = useRef(onMove)
    moved.current = onMove

    const group: Group = {
        scope,
        layout,
        ids,
        kind: kind ?? scope,
        label,
        value,
        preview,
        accepts,
        words,
        disabled,
        refocus,
        step: (id, by, say) => {
            const from = ids.indexOf(id)
            const to = stepTo(from, by, ids.length)
            if (from === -1 || to === undefined) return
            refocus.current = id
            moved.current(from, to)
            if (say) setSaid(words.moved(label(id), to + 1, ids.length))
        },
    }
    const items = useMemo(() => ids.map((id) => scoped(scope, id)), [ids, scope])
    return (
        <GroupContext.Provider value={group}>
            <DragDrop>
                <SortableMonitor scope={scope} />
                <SortableContext id={scope} items={items} strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
                    {children}
                </SortableContext>
                <span aria-live="polite" className="sr-only">
                    {said}
                </span>
            </DragDrop>
        </GroupContext.Provider>
    )
}

/** Hears a group's own drags end, and moves the item to where it was let go among its own. */
function SortableMonitor({ scope }: { scope: string }) {
    const group = useContext(GroupContext)
    const latest = useRef(group)
    latest.current = group
    useDragDrop({
        onDragEnd: ({ active, over }) => {
            const from = active.data.current?.sortable as { containerId: string; index: number } | undefined
            const to = over?.data.current?.sortable as { containerId: string; index: number } | undefined
            if (from?.containerId !== scope || to?.containerId !== scope || from.index === to.index) return
            const current = latest.current
            const id = current?.ids[from.index]
            if (current === null || id === undefined) return
            current.step(id, to.index - from.index, false)
        },
    })
    return null
}

interface ItemContext {
    handle: DragHandleProps
    dragging: boolean
    label: string
    words: SortableWords
}

const ItemContext = createContext<ItemContext | null>(null)

/** The grip of the sortable item around it, for an item that draws its own. */
export function useSortableHandle(): ItemContext | null {
    return useContext(ItemContext)
}

export type SortableItemProps = HTMLAttributes<HTMLElement> & {
    /** The item's key among the group's `ids`. */
    id: string
    /** The element it is drawn as, such as `li` in a list. */
    as?: ElementType
    /** `grip`: dragged by the `SortableGrip` inside it. `item`: the whole item is the grip, and takes the focus. */
    handle?: 'grip' | 'item'
    ref?: Ref<HTMLElement>
    children?: ReactNode
}

/**
 * One item of a `SortableGroup`. While it is dragged it stays in its place, faded, as the space it
 * will leave, and a copy follows the pointer.
 */
export function SortableItem({ id, as: Tag = 'div', handle: by = 'grip', ref, className, style, children, ...props }: SortableItemProps) {
    const group = useContext(GroupContext)
    if (group === null) throw new Error('A SortableItem is drawn inside a SortableGroup.')
    const dragging = useDragging()
    const label = group.label(id)
    const data: DragData = {
        kind: group.kind,
        label,
        value: group.value?.(id),
        accepts: group.accepts,
        preview: group.preview === undefined ? undefined : () => group.preview?.(id),
    }
    const sortable = useSortable({ id: scoped(group.scope, id), data, disabled: group.disabled })
    const keyed = withKeys(
        { ...sortable.attributes, ...sortable.listeners, ref: sortable.setActivatorNodeRef },
        (event: KeyboardEvent<HTMLElement>) => {
            if (
                dragging.current ||
                event.altKey ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.target !== event.currentTarget
            )
                return
            const back = event.key === 'ArrowUp' || (group.layout === 'grid' && event.key === 'ArrowLeft')
            const on = event.key === 'ArrowDown' || (group.layout === 'grid' && event.key === 'ArrowRight')
            if (!back && !on) return
            event.preventDefault()
            group.step(id, back ? -1 : 1, true)
        },
    )
    const activator = useRef<HTMLElement | null>(null)
    const handle: DragHandleProps = {
        ...keyed,
        ref: (element) => {
            activator.current = element
            sortable.setActivatorNodeRef(element)
        },
    }
    useLayoutEffect(() => {
        if (group.refocus.current !== id) return
        group.refocus.current = null
        activator.current?.focus()
    })
    const own = by === 'item' ? handle : {}
    const { ref: ownRef, ...ownProps } = own as DragHandleProps
    const item: ItemContext = { handle, dragging: sortable.isDragging, label, words: group.words }
    return (
        <ItemContext.Provider value={item}>
            <Tag
                {...props}
                {...ownProps}
                ref={(element: HTMLElement | null) => {
                    sortable.setNodeRef(element)
                    ownRef?.(element)
                    if (typeof ref === 'function') ref(element)
                    else if (ref != null) (ref as { current: HTMLElement | null }).current = element
                }}
                data-dragging={sortable.isDragging || undefined}
                style={
                    { ...style, transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition } as CSSProperties
                }
                className={cn(
                    sortable.isDragging && 'opacity-40',
                    by === 'item' &&
                        'cursor-grab touch-manipulation outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:cursor-grabbing',
                    className,
                )}
            >
                {children}
            </Tag>
        </ItemContext.Provider>
    )
}

export type SortableGripProps = Omit<DragGripProps, 'handle' | 'label'> & {
    /** Its name; `words.move` of the item's label by default. */
    label?: string
}

/** The grip of the sortable item it is drawn in, named for the item it moves. */
export function SortableGrip({ label, ...props }: SortableGripProps) {
    const item = useContext(ItemContext)
    if (item === null) return null
    return <DragGrip {...props} handle={item.handle} label={label ?? item.words.move(item.label)} />
}

/** What an item is drawn with: its place, whether it is the one being dragged, and whether this is the copy following the pointer. */
export interface SortableItemState {
    index: number
    dragging: boolean
    overlay: boolean
}

interface SortableBaseProps<T> {
    items: readonly T[]
    /** Each item's key, stable across moves. */
    itemKey: (item: T) => string
    /** What a screen reader and the grip call an item. */
    itemLabel: (item: T) => string
    /** Draws an item's own content; the list draws the grip and the room around it. */
    renderItem: (item: T, state: SortableItemState) => ReactNode
    /** Moves the item at `from` to `to`; the list draws the order it is given. */
    onMove: (from: number, to: number) => void
    /** What a target outside the list takes its items as, such as a tree's folders; only the list takes them without it. */
    kind?: string
    disabled?: boolean
    /** What the list is, for a screen reader. */
    label?: string
    words?: Partial<SortableWords>
    className?: string
    itemClassName?: string
}

export interface SortableListProps<T> extends SortableBaseProps<T> {
    /** `grip`: each row is dragged by a grip at its `gripSide`. `item`: the whole row is the grip, for rows with nothing else to press. */
    handle?: 'grip' | 'item'
    gripSide?: 'start' | 'end'
    /** `boxed`: the rows in a bordered surface with rules between them. `plain`: the rows on the ground they are drawn on, a little apart. */
    variant?: 'boxed' | 'plain'
}

/**
 * A list the reader puts in order: each row a grip and the app's own content. Dragging a grip lifts
 * a copy of the row and moves the rest aside to show where it lands, scrolling the box around it at
 * its edges; letting go calls `onMove(from, to)`, and Escape puts it back. With a grip focused, the
 * up and down arrows move its row a place, the focus following it, and Space or Enter picks it up.
 */
export function SortableList<T>({ handle = 'grip', gripSide = 'start', variant = 'boxed', ...props }: SortableListProps<T>) {
    return <SortableItems {...props} layout="list" handle={handle} gripSide={gripSide} boxed={variant === 'boxed'} />
}

export interface SortableGridProps<T> extends SortableBaseProps<T> {
    /** `item`: the whole card is the grip and takes the focus. `grip`: the app draws a `SortableGrip` in each card. */
    handle?: 'item' | 'grip'
    /** The least width of a cell; the grid fits as many across as its room holds. */
    minItemWidth?: string
}

/**
 * Cards the reader puts in order, as many across as the room holds. A card is dragged as a whole or
 * by its `SortableGrip`, the rest moving aside; letting go calls `onMove(from, to)`, and Escape puts
 * it back. With a card focused, the arrow keys move it a place, and Space or Enter picks it up.
 */
export function SortableGrid<T>({ handle = 'item', minItemWidth = '12rem', ...props }: SortableGridProps<T>) {
    return <SortableItems {...props} layout="grid" handle={handle} minItemWidth={minItemWidth} />
}

function SortableItems<T>({
    items,
    itemKey,
    itemLabel,
    renderItem,
    onMove,
    kind,
    disabled,
    label,
    words,
    className,
    itemClassName,
    layout,
    handle,
    gripSide = 'start',
    minItemWidth,
    boxed = false,
}: SortableBaseProps<T> & {
    layout: SortableLayout
    handle: 'grip' | 'item'
    gripSide?: 'start' | 'end'
    minItemWidth?: string
    boxed?: boolean
}) {
    const ids = items.map(itemKey)
    const byId = new Map(items.map((item, index) => [ids[index], { item, index }]))
    const grid = layout === 'grid'
    const row = (item: T, index: number, overlay: boolean, dragging: boolean) => {
        const content = renderItem(item, { index, dragging, overlay })
        if (grid || handle === 'item') return content
        const grip = overlay ? <span aria-hidden className="size-7 shrink-0" /> : <SortableGrip />
        return (
            <>
                {gripSide === 'start' && grip}
                <div className="min-w-0 flex-1">{content}</div>
                {gripSide === 'end' && grip}
            </>
        )
    }
    const rowClass = cn(
        !grid && handle === 'grip' && 'flex items-center gap-1',
        grid && 'flex flex-col *:flex-1',
        boxed && 'min-h-(--density-row) border-b border-border px-1.5 last:border-b-0',
        itemClassName,
    )
    return (
        <SortableGroup
            ids={ids}
            layout={layout}
            onMove={onMove}
            label={(id) => {
                const found = byId.get(id)
                return found === undefined ? id : itemLabel(found.item)
            }}
            value={(id) => byId.get(id)?.item}
            preview={(id) => {
                const found = byId.get(id)
                return found === undefined ? null : <div className={rowClass}>{row(found.item, found.index, true, false)}</div>
            }}
            kind={kind}
            disabled={disabled}
            words={words}
        >
            <ul
                aria-label={label}
                className={cn(
                    grid
                        ? 'grid gap-3'
                        : boxed
                          ? 'flex flex-col rounded-surface border border-border-strong bg-card'
                          : 'flex flex-col gap-1',
                    className,
                )}
                style={grid ? { gridTemplateColumns: `repeat(auto-fill, minmax(min(${minItemWidth ?? '12rem'}, 100%), 1fr))` } : undefined}
            >
                {items.map((item, index) => (
                    <SortableItem key={ids[index]} id={ids[index]} as="li" handle={handle} className={rowClass}>
                        <ItemDragging>{(dragging) => row(item, index, false, dragging)}</ItemDragging>
                    </SortableItem>
                ))}
            </ul>
        </SortableGroup>
    )
}

/** Hands its children whether the item around it is being dragged. */
function ItemDragging({ children }: { children: (dragging: boolean) => ReactNode }) {
    return children(useContext(ItemContext)?.dragging ?? false)
}
