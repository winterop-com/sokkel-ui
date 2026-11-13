import {
    closestCorners,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    pointerWithin,
    rectIntersection,
    TouchSensor,
    useDndMonitor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type Active,
    type Announcements,
    type Collision,
    type CollisionDetection,
    type Modifier,
    type DragEndEvent,
    type DragMoveEvent,
    type DragOverEvent,
    type DragStartEvent,
    type Over,
    type PointerSensorOptions,
    type TouchSensorOptions,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { getEventCoordinates } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import {
    createContext,
    useContext,
    useMemo,
    useRef,
    useState,
    type HTMLAttributes,
    type KeyboardEvent,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
    type TouchEvent as ReactTouchEvent,
} from 'react'

import { useReducedMotion } from '../hooks/use-reduced-motion'
import { cn } from '../lib/cn'
import { IconButton, type IconButtonProps } from './IconButton'

/**
 * What a thing being dragged, or a place it is dropped on, carries: what kind it is, its name for a
 * screen reader, and the app's own value. A target takes things of its own `kind` unless `accepts`
 * says otherwise, so a list's rows land only in that list until the app lets them land elsewhere.
 */
export interface DragData {
    /** What sort of thing it is; a target takes only its own kind unless it `accepts` more. */
    kind: string
    /** What a screen reader calls it. */
    label: string
    /** The app's own value: the row, the item, the node. */
    value?: unknown
    /** Whether a target takes the thing being dragged; without it, a target takes its own kind. */
    accepts?: (drag: DragData) => boolean
    /** What follows the pointer while it is dragged; its label in a chip without it. */
    preview?: () => ReactNode
    /**
     * Whether what follows the pointer is a small card held at the pointer, rather than a copy the
     * thing's own size held where it was grabbed: for a wide thing carried to another part of the
     * page, such as a row onto a place in the rail, so the target stays in sight.
     */
    compact?: boolean
}

/** The words a drag says to a screen reader, each with an English default. */
export interface DragDropWords {
    /** Said once a thing that can be picked up is focused. */
    instructions: string
    pickedUp: (item: string) => string
    over: (item: string, target: string) => string
    /** Said while a thing moves along its own list, its place counted from 1. */
    place: (item: string, place: number, count: number) => string
    dropped: (item: string, target: string) => string
    /** Said as a thing is let go at a place in its own list. */
    placed: (item: string, place: number, count: number) => string
    /** Said when it is let go where nothing takes it. */
    putBack: (item: string) => string
    cancelled: (item: string) => string
}

export const DRAG_DROP_WORDS: DragDropWords = {
    instructions:
        'To pick it up, press Space or Enter. Move it with the arrow keys, press Space or Enter to drop it, or Escape to put it back.',
    pickedUp: (item) => `Picked up ${item}.`,
    over: (item, target) => `${item} is over ${target}.`,
    place: (item, place, count) => `${item} is at ${String(place)} of ${String(count)}.`,
    dropped: (item, target) => `${item} was dropped on ${target}.`,
    placed: (item, place, count) => `${item} was dropped at ${String(place)} of ${String(count)}.`,
    putBack: (item) => `${item} was put back.`,
    cancelled: (item) => `Moving ${item} was cancelled; it is back where it was.`,
}

/** The data a thing or a target carries, or undefined for one that carries none of the library's. */
export function dragData(entry: { data: { current?: unknown } } | null | undefined): DragData | undefined {
    const data = entry?.data.current as Partial<DragData> | null | undefined
    return data != null && typeof data.kind === 'string' ? (data as DragData) : undefined
}

/** Whether a target takes what is dragged: by its `accepts`, or else by being of the same kind. */
export function takes(target: DragData | undefined, drag: DragData | undefined): boolean {
    if (target === undefined || drag === undefined) return false
    return target.accepts !== undefined ? target.accepts(drag) : target.kind === drag.kind
}

/** Anything inside a dragged thing marked so, such as its menu button, keeps its own press. */
const KEEPS_PRESS = '[data-no-drag]'

function keepsPress(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(KEEPS_PRESS) !== null
}

/** A mouse or a pen: it drags once it has moved a few pixels with the button held. A finger is the hold sensor's. */
class PressSensor extends PointerSensor {
    static activators = [
        {
            eventName: 'onPointerDown' as const,
            handler: ({ nativeEvent: event }: ReactPointerEvent, { onActivation }: PointerSensorOptions) => {
                if (!event.isPrimary || event.button !== 0 || event.pointerType === 'touch' || keepsPress(event.target)) return false
                onActivation?.({ event })
                return true
            },
        },
    ]
}

/** A finger: it drags once it has held still for a moment, so a swipe still scrolls. */
class HoldSensor extends TouchSensor {
    static activators = [
        {
            eventName: 'onTouchStart' as const,
            handler: ({ nativeEvent: event }: ReactTouchEvent, { onActivation }: TouchSensorOptions) => {
                if (event.touches.length > 1 || keepsPress(event.target)) return false
                onActivation?.({ event })
                return true
            },
        },
    ]
}

/** How far a mouse moves before a press becomes a drag, in pixels. */
const DISTANCE = 4
/** How long a finger holds still before it drags, in milliseconds, and how far it may stray meanwhile. */
const HOLD = 300
const HOLD_TOLERANCE = 8

function area(collision: Collision): number {
    const rect = collision.data?.droppableContainer?.rect.current as { width: number; height: number } | null | undefined
    return rect == null ? Number.POSITIVE_INFINITY : rect.width * rect.height
}

/**
 * Where a drag is: the smallest target under the pointer that takes the thing (a row before the
 * list around it), else the targets the thing itself overlaps; from the keyboard, the nearest.
 */
export const dragCollision: CollisionDetection = (args) => {
    const drag = dragData(args.active)
    const droppableContainers = args.droppableContainers.filter(
        (container) => container.id === args.active.id || takes(dragData(container), drag),
    )
    const within = { ...args, droppableContainers }
    if (args.pointerCoordinates === null) return closestCorners(within)
    const hits = pointerWithin(within)
    if (hits.length > 0) return [...hits].sort((a, b) => area(a) - area(b))
    return rectIntersection(within)
}

/**
 * Where the pointer is during a drag, or the middle of the dragged thing for a drag from the
 * keyboard, in the window's coordinates.
 */
export function dragPoint(event: DragMoveEvent | DragOverEvent | DragEndEvent): { x: number; y: number } | null {
    const start = event.activatorEvent instanceof globalThis.KeyboardEvent ? null : getEventCoordinates(event.activatorEvent)
    if (start !== null) return { x: start.x + event.delta.x, y: start.y + event.delta.y }
    const rect = event.active.rect.current.translated
    return rect === null ? null : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/** Whether a drag came from the keyboard. */
export function fromKeyboard(event: { activatorEvent: Event | null }): boolean {
    return event.activatorEvent instanceof globalThis.KeyboardEvent
}

interface DragScope {
    /** Whether a thing is being dragged now, read without drawing again on every move. */
    dragging: { current: boolean }
    words: DragDropWords
}

const ScopeContext = createContext<DragScope | null>(null)

/** Whether a drag is under way in the nearest `DragDrop`, read when asked rather than drawn by. */
export function useDragging(): { current: boolean } {
    return useContext(ScopeContext)?.dragging ?? NOT_DRAGGING
}

const NOT_DRAGGING = { current: false }

/** The words of the nearest `DragDrop`, for a part's own announcements. */
export function useDragWords(): DragDropWords {
    return useContext(ScopeContext)?.words ?? DRAG_DROP_WORDS
}

export interface DragDropHandlers {
    onDragStart?: (event: DragStartEvent) => void
    onDragMove?: (event: DragMoveEvent) => void
    onDragOver?: (event: DragOverEvent) => void
    onDragEnd?: (event: DragEndEvent) => void
    onDragCancel?: (event: DragEndEvent) => void
}

export interface DragDropProps extends DragDropHandlers {
    children: ReactNode
    words?: Partial<DragDropWords>
}

/**
 * Where things are dragged and dropped. Every part that drags draws one around itself, and one an
 * app draws around several parts makes them one: a row of a list can then be dropped onto a folder
 * of a tree beside it, each part hearing the drags through `useDragDrop`. Inside another
 * `DragDrop` it adds its handlers to that one.
 *
 * A mouse drags once it moves a few pixels; a finger holds still a moment first, so a swipe still
 * scrolls; a keyboard picks up with Space or Enter on a grip, moves with the arrows and drops with
 * Space or Enter. Escape puts the thing back. The page and any box under the pointer scroll at
 * their edges. A copy of the thing follows the pointer in a lifted card, and every step is said to
 * a screen reader in `words`. The release that ends a drag is never also a press on what is under it.
 */
export function DragDrop({ children, words, ...handlers }: DragDropProps) {
    const scope = useContext(ScopeContext)
    if (scope !== null) {
        return (
            <>
                <DragDropMonitor {...handlers} />
                {children}
            </>
        )
    }
    return (
        <DragDropRoot words={words} handlers={handlers}>
            {children}
        </DragDropRoot>
    )
}

/** Hears every drag in the nearest `DragDrop`. */
export function useDragDrop(handlers: DragDropHandlers): void {
    useDndMonitor(handlers)
}

function DragDropMonitor(handlers: DragDropHandlers) {
    useDndMonitor(handlers)
    return null
}

function DragDropRoot({
    children,
    words: given,
    handlers,
}: {
    children: ReactNode
    words?: Partial<DragDropWords>
    handlers: DragDropHandlers
}) {
    const words = useMemo(() => ({ ...DRAG_DROP_WORDS, ...given }), [given])
    const dragging = useRef(false)
    const scope = useMemo<DragScope>(() => ({ dragging, words }), [words])
    const [active, setActive] = useState<DragData | null>(null)
    const still = useReducedMotion()
    const sensors = useSensors(
        useSensor(PressSensor, { activationConstraint: { distance: DISTANCE } }),
        useSensor(HoldSensor, { activationConstraint: { delay: HOLD, tolerance: HOLD_TOLERANCE } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )
    const announcements = useMemo<Announcements>(() => {
        const name = (entry: Active | Over | null) => dragData(entry)?.label ?? String(entry?.id ?? '')
        const place = (active: Active, over: Over | null) => {
            const from = active.data.current?.sortable as { containerId: string } | undefined
            const at = over?.data.current?.sortable as { containerId: string; index: number; items: unknown[] } | undefined
            return from !== undefined && at !== undefined && from.containerId === at.containerId ? at : undefined
        }
        return {
            onDragStart: ({ active }) => words.pickedUp(name(active)),
            onDragOver: ({ active, over }) => {
                if (over === null) return undefined
                const at = place(active, over)
                return at === undefined ? words.over(name(active), name(over)) : words.place(name(active), at.index + 1, at.items.length)
            },
            onDragEnd: ({ active, over }) => {
                if (over === null) return words.putBack(name(active))
                const at = place(active, over)
                return at === undefined
                    ? words.dropped(name(active), name(over))
                    : words.placed(name(active), at.index + 1, at.items.length)
            },
            onDragCancel: ({ active }) => words.cancelled(name(active)),
        }
    }, [words])

    // The release that ends a drag is not also a press on what lies under it.
    const swallowClick = () => {
        const swallow = (event: MouseEvent) => {
            event.stopPropagation()
            event.preventDefault()
        }
        window.addEventListener('click', swallow, { capture: true, once: true })
        window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
    }

    return (
        <ScopeContext.Provider value={scope}>
            <DndContext
                sensors={sensors}
                collisionDetection={dragCollision}
                accessibility={{ announcements, screenReaderInstructions: { draggable: words.instructions } }}
                autoScroll
                onDragStart={(event) => {
                    dragging.current = true
                    setActive(dragData(event.active) ?? null)
                    document.body.style.cursor = 'grabbing'
                    handlers.onDragStart?.(event)
                }}
                onDragMove={handlers.onDragMove}
                onDragOver={handlers.onDragOver}
                onDragEnd={(event) => {
                    dragging.current = false
                    setActive(null)
                    document.body.style.cursor = ''
                    if (!fromKeyboard(event)) swallowClick()
                    handlers.onDragEnd?.(event)
                }}
                onDragCancel={(event) => {
                    dragging.current = false
                    setActive(null)
                    document.body.style.cursor = ''
                    handlers.onDragCancel?.(event)
                }}
            >
                {children}
                <DragOverlay
                    dropAnimation={still ? null : undefined}
                    zIndex={60}
                    modifiers={active?.compact === true ? COMPACT_MODIFIERS : undefined}
                >
                    {active === null ? null : (
                        <div
                            className={cn(
                                'pointer-events-none cursor-grabbing rounded-surface bg-card shadow-pop',
                                active.compact === true ? 'w-fit max-w-80' : 'h-full',
                            )}
                        >
                            {active.preview?.() ?? <DragChip label={active.label} />}
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </ScopeContext.Provider>
    )
}

/** How far a compact copy stands from the pointer, in pixels, so the pointer still shows the target under it. */
const COMPACT_OFFSET = 12

/** Holds a compact copy just below and right of the pointer, wherever on the thing the drag began. */
const atPointer: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
    const point = activatorEvent === null ? null : getEventCoordinates(activatorEvent)
    if (point === null || draggingNodeRect === null || activatorEvent instanceof globalThis.KeyboardEvent) return transform
    return {
        ...transform,
        x: transform.x + point.x - draggingNodeRect.left + COMPACT_OFFSET,
        y: transform.y + point.y - draggingNodeRect.top + COMPACT_OFFSET,
    }
}

const COMPACT_MODIFIERS = [atPointer]

/** What follows the pointer for a thing that draws no copy of itself: its name on a card. */
function DragChip({ label }: { label: string }) {
    return <div className="truncate rounded-surface border border-border-strong px-3 py-1.5 text-sm">{label}</div>
}

/** The press, touch and key handlers and the attributes a grip spreads to start a drag. */
export type DragHandleProps = HTMLAttributes<HTMLElement> & { ref?: (element: HTMLElement | null) => void }

export interface DragItemOptions {
    id: string
    data: DragData
    disabled?: boolean
}

/**
 * A thing that drags: `ref` on what moves, `handle` spread on what is pressed to start it (the
 * thing itself, or a grip in it), and whether it is being dragged now. Inside a `DragDrop`.
 */
export function useDragItem({ id, data, disabled = false }: DragItemOptions) {
    const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging } = useDraggable({ id, data, disabled })
    const handle: DragHandleProps = { ...attributes, ...listeners, ref: setActivatorNodeRef }
    return { ref: setNodeRef, handle, dragging: isDragging }
}

export interface DropTargetOptions {
    id: string
    data: DragData
    disabled?: boolean
}

/**
 * A place things are dropped on: `ref` on its element, whether a thing that it takes is over it now,
 * and that thing's data. Inside a `DragDrop`.
 */
export function useDropTarget({ id, data, disabled = false }: DropTargetOptions) {
    const { setNodeRef, isOver, active } = useDroppable({ id, data, disabled })
    const drag = dragData(active)
    return { ref: setNodeRef, over: isOver && takes(data, drag), dragged: drag }
}

/** Joins a grip's own key handler before the drag's, so its arrows can move it a place at a time. */
export function withKeys(handle: DragHandleProps, onKeyDown: (event: KeyboardEvent<HTMLElement>) => void): DragHandleProps {
    return {
        ...handle,
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            onKeyDown(event)
            if (!event.defaultPrevented) handle.onKeyDown?.(event)
        },
    }
}

export type DragGripProps = Omit<IconButtonProps, 'children'> & {
    /** The handlers from `useDragItem`'s `handle`, or a sortable item's. */
    handle: DragHandleProps
}

/** The grip a thing is dragged by: a quiet button with the grip glyph, named for what it moves. */
export function DragGrip({ handle, className, ...props }: DragGripProps) {
    const { ref, ...rest } = handle
    return (
        <IconButton {...props} {...(rest as object)} ref={ref} className={cn('cursor-grab touch-none active:cursor-grabbing', className)}>
            <GripVertical aria-hidden />
        </IconButton>
    )
}
