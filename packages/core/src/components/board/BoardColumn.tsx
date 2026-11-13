import { useId, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { DragGrip, useDragItem, useDropTarget, type DragHandleProps } from '../DragDrop'
import { BoardDrop, useBoardColumnDrag, useBoardColumnKind } from './Board'

export interface BoardColumnWords {
    /** What the count says when a limit is set, as a tooltip. */
    limit: (count: number, limit: number) => string
    /** What the count says past its limit, as a tooltip. */
    over: (count: number, limit: number) => string
    /** The grip's name, on a board that moves its columns. */
    move: (column: string) => string
}

const WORDS: BoardColumnWords = {
    limit: (count, limit) => `${count} of a limit of ${limit}`,
    over: (count, limit) => `${count - limit} over the limit of ${limit}`,
    move: (column) => `Move ${column}`,
}

export interface BoardColumnHeadProps {
    title: ReactNode
    count: number
    /** The most cards the column should hold; the count warns past it. */
    limit?: number
    icon?: ReactNode
    actions?: ReactNode
    /** A grip drawn at the head's end, such as the one a column that moves is dragged by. */
    grip?: ReactNode
    className?: string
    words?: Partial<BoardColumnWords>
}

/**
 * A column's head: its title, how many cards it holds, and its limit when it has one. Past the
 * limit the count turns to a warning. The head of a board with swimlanes stands alone over the
 * lanes; a plain column carries its own.
 */
export function BoardColumnHead({ title, count, limit, icon, actions, grip, className, words: given }: BoardColumnHeadProps) {
    const words = { ...WORDS, ...given }
    const over = limit !== undefined && count > limit
    return (
        <div className={cn('group/column-head flex h-9 items-center gap-2 px-1.5', className)}>
            {icon}
            <h3 className="truncate text-sm font-medium">{title}</h3>
            <span
                data-over={over || undefined}
                title={limit === undefined ? undefined : over ? words.over(count, limit) : words.limit(count, limit)}
                className={cn(
                    'rounded-chip px-1.5 py-0.5 text-xs tabular-nums',
                    over ? 'bg-warning/15 font-medium text-warning-ink' : 'bg-secondary text-muted-foreground',
                )}
            >
                {limit === undefined ? count : `${count} / ${limit}`}
            </span>
            <div className="flex-1" />
            {actions !== undefined && (
                <div data-no-drag className="flex items-center gap-0.5">
                    {actions}
                </div>
            )}
            {grip}
        </div>
    )
}

export interface BoardColumnProps {
    id: string
    title: ReactNode
    count: number
    limit?: number
    icon?: ReactNode
    actions?: ReactNode
    foot?: ReactNode
    /** What the column says with no cards. */
    empty?: ReactNode
    /** What a screen reader and the grip call the column; its title when that is text, else its id. */
    label?: string
    /** Keeps its cards and its place: no card leaves or lands in it, and on a board that moves its columns none moves across it. */
    locked?: boolean
    children?: ReactNode
    className?: string
    words?: Partial<BoardColumnWords>
}

/**
 * One column of a board: its head, then its cards in a list that scrolls on its own, then an
 * optional foot such as an "Add item" button. The column is a drop zone named by `id`.
 *
 * On a board with `onColumnMove` the column drags by its head, and from the keyboard by the grip
 * at the head's end, shown on hover; a line between the columns shows where it lands. A `locked`
 * column keeps its cards and its place.
 */
export function BoardColumn({
    id,
    title,
    count,
    limit,
    icon,
    actions,
    foot,
    empty,
    label,
    locked = false,
    children,
    className,
    words: given,
}: BoardColumnProps) {
    const words = { ...WORDS, ...given }
    const name = label ?? (typeof title === 'string' ? title : id)
    const kind = useBoardColumnKind()
    const own = useId()
    const drag = useBoardColumnDrag()
    const data = { kind: kind ?? own, label: name, value: { column: id }, compact: true }
    const item = useDragItem({ id: `${kind ?? own}:${id}`, data, disabled: kind === null || locked })
    const target = useDropTarget({ id: `${kind ?? own}:at:${id}`, data, disabled: kind === null })
    const movable = kind !== null && !locked
    const { ref: gripRef, onKeyDown, onPointerDown, onTouchStart, ...attributes } = item.handle
    const handle: DragHandleProps = { ...attributes, ref: gripRef }
    const dragged = drag?.column === id
    return (
        <section
            ref={(element) => {
                item.ref(element)
                target.ref(element)
            }}
            data-board-column={id}
            data-locked={locked || undefined}
            data-dragging={dragged || undefined}
            className={cn(
                'relative flex max-h-full w-(--board-column) shrink-0 flex-col rounded-surface bg-muted/50 dark:bg-muted/30',
                dragged && 'opacity-40',
                className,
            )}
        >
            {drag !== null && drag.at === id && (
                <span
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute inset-y-0 w-0.5 rounded-full bg-primary',
                        drag.side === 'before' ? '-left-[7px]' : '-right-[7px]',
                    )}
                />
            )}
            <div
                onKeyDown={movable ? onKeyDown : undefined}
                onPointerDown={movable ? onPointerDown : undefined}
                onTouchStart={movable ? onTouchStart : undefined}
                className={cn(movable && 'cursor-grab [touch-action:manipulation] select-none active:cursor-grabbing')}
            >
                <BoardColumnHead
                    title={title}
                    count={count}
                    limit={limit}
                    icon={icon}
                    actions={actions}
                    words={words}
                    className="px-3 pt-1.5"
                    grip={
                        movable ? (
                            <DragGrip
                                size="icon-xs"
                                handle={handle}
                                label={words.move(name)}
                                className="-mr-1.5 md:opacity-0 md:group-hover/column-head:opacity-100 md:focus-visible:opacity-100"
                            />
                        ) : undefined
                    }
                />
            </div>
            <BoardDrop id={id} label={name} locked={locked} empty={empty} className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                {children}
            </BoardDrop>
            {foot !== undefined && <div className="shrink-0 px-2 pb-2">{foot}</div>}
        </section>
    )
}
