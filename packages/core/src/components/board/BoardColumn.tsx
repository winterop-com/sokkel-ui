import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { BoardDrop } from './Board'

export interface BoardColumnWords {
    /** What the count says when a limit is set, as a tooltip. */
    limit: (count: number, limit: number) => string
    /** What the count says past its limit, as a tooltip. */
    over: (count: number, limit: number) => string
}

const WORDS: BoardColumnWords = {
    limit: (count, limit) => `${count} of a limit of ${limit}`,
    over: (count, limit) => `${count - limit} over the limit of ${limit}`,
}

/**
 * A column's head: its title, how many cards it holds, and its limit when it has one. Past the
 * limit the count turns to a warning. The head of a board with swimlanes stands alone over the
 * lanes; a plain column carries its own.
 */
export function BoardColumnHead({
    title,
    count,
    limit,
    icon,
    actions,
    className,
    words: given,
}: {
    title: ReactNode
    count: number
    /** The most cards the column should hold; the count warns past it. */
    limit?: number
    icon?: ReactNode
    actions?: ReactNode
    className?: string
    words?: Partial<BoardColumnWords>
}) {
    const words = { ...WORDS, ...given }
    const over = limit !== undefined && count > limit
    return (
        <div className={cn('flex h-9 items-center gap-2 px-1.5', className)}>
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
            {actions !== undefined && <div className="flex items-center gap-0.5">{actions}</div>}
        </div>
    )
}

/**
 * One column of a board: its head, then its cards in a list that scrolls on its own, then an
 * optional foot such as an "Add item" button. The column is a drop zone named by `id`.
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
    children,
    className,
    words,
}: {
    id: string
    title: ReactNode
    count: number
    limit?: number
    icon?: ReactNode
    actions?: ReactNode
    foot?: ReactNode
    /** What the column says with no cards. */
    empty?: ReactNode
    children?: ReactNode
    className?: string
    words?: Partial<BoardColumnWords>
}) {
    return (
        <section
            className={cn('flex max-h-full w-(--board-column) shrink-0 flex-col rounded-surface bg-muted/50 dark:bg-muted/30', className)}
        >
            <BoardColumnHead
                title={title}
                count={count}
                limit={limit}
                icon={icon}
                actions={actions}
                words={words}
                className="px-3 pt-1.5"
            />
            <BoardDrop id={id} empty={empty} className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                {children}
            </BoardDrop>
            {foot !== undefined && <div className="shrink-0 px-2 pb-2">{foot}</div>}
        </section>
    )
}
