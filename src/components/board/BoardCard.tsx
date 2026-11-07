import { format } from 'date-fns'
import { CalendarDays, ListChecks, MessageSquare, MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { KIND_WASH, kindOf, type KindColor } from '../../lib/kind'
import { DueText } from '../DueText'
import { PersonAvatar } from '../PersonAvatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { DropLine, useBoardDrag, useBoardZone } from './Board'

/** A label on a card: its name, and the color it wears, which follows from the name by default. */
export interface BoardLabelSpec {
    name: string
    color?: KindColor
}

/** A label as a small chip in its color. */
export function BoardLabel({ name, color, className }: BoardLabelSpec & { className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-chip px-1.5 py-px text-xs whitespace-nowrap',
                KIND_WASH[color ?? kindOf(name)],
                className,
            )}
        >
            {name}
        </span>
    )
}

export interface BoardCardWords {
    menu: string
    /** How a due date is written. */
    due: (date: Date) => string
    /** The due date's tooltip, with whether it has passed. */
    dueTitle: (date: Date, overdue: boolean) => string
    comments: (count: number) => string
    checklist: (done: number, total: number) => string
    assignee: (name: string) => string
}

const WORDS: BoardCardWords = {
    menu: 'More actions',
    due: (date) => format(date, 'MMM d'),
    dueTitle: (date, overdue) => `${overdue ? 'Overdue, was due' : 'Due'} ${format(date, 'EEEE d MMMM')}`,
    comments: (count) => `${count} ${count === 1 ? 'comment' : 'comments'}`,
    checklist: (done, total) => `${done} of ${total} checklist items done`,
    assignee: (name) => `Assigned to ${name}`,
}

/**
 * One work item on a board: its code in the code face, its title, its labels, and a foot with
 * the due date, the counts of comments and checklist items, and the assignee. A due date that has
 * passed is drawn in the critical ink, and one that falls today in the warning ink; `now` says
 * what today is.
 *
 * The whole card is one control that opens the item; `selected` marks the open one. A `menu`,
 * such as "Move to", sits at the head's right and keeps its own press. Inside a `Board` the card
 * drags; it fades while it is dragged, and a line above it shows a card landing before it.
 */
export function BoardCard({
    id,
    code,
    title,
    labels = [],
    assignee,
    due,
    now = new Date(),
    done = false,
    comments,
    checklist,
    selected = false,
    onSelect,
    menu,
    className,
    words: given,
}: {
    /** What a move names the card by. */
    id: string
    code?: string
    title: ReactNode
    labels?: readonly BoardLabelSpec[]
    assignee?: { name: string; color?: KindColor; image?: string }
    due?: Date
    /** Today, against which the due date is judged. */
    now?: Date
    /** A finished item's due date is never overdue. */
    done?: boolean
    comments?: number
    checklist?: { done: number; total: number }
    selected?: boolean
    onSelect?: () => void
    /** Dropdown menu items behind the head's more button. */
    menu?: ReactNode
    className?: string
    words?: Partial<BoardCardWords>
}) {
    const words = { ...WORDS, ...given }
    const drag = useBoardDrag()
    const zone = useBoardZone()
    const dragged = drag?.card === id
    const landing = drag !== null && !dragged && drag.zone === zone && drag.before === id
    const hasFoot = due !== undefined || comments !== undefined || checklist !== undefined || assignee !== undefined
    return (
        <article
            data-board-card={id}
            data-selected={selected || undefined}
            className={cn(
                'group/card relative flex shrink-0 cursor-grab [touch-action:manipulation] flex-col gap-2 rounded-surface border border-border-strong bg-card p-3 text-sm text-card-foreground shadow-surface transition-[background-color,border-color,opacity] select-none hover:border-foreground/25 active:cursor-grabbing',
                selected && 'border-primary ring-1 ring-primary hover:border-primary',
                dragged && 'opacity-40',
                className,
            )}
        >
            {landing && <DropLine />}
            {onSelect !== undefined && (
                <button
                    type="button"
                    aria-pressed={selected}
                    className="absolute inset-0 z-0 cursor-[inherit] rounded-surface outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                    onClick={onSelect}
                >
                    <span className="sr-only">{code ?? (typeof title === 'string' ? title : id)}</span>
                </button>
            )}
            <div className="pointer-events-none relative flex min-w-0 items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {code !== undefined && <span className="truncate font-mono text-xs text-muted-foreground">{code}</span>}
                    <h4 className="line-clamp-3 leading-5 font-medium">{title}</h4>
                </div>
                {menu !== undefined && (
                    <div data-board-nodrag className="pointer-events-auto relative z-10 -mt-1 -mr-1.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                aria-label={words.menu}
                                title={words.menu}
                                className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid data-popup-open:bg-hover md:opacity-0 md:group-hover/card:opacity-100 md:focus-visible:opacity-100 md:data-popup-open:opacity-100"
                            >
                                <MoreHorizontal className="size-4" aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {menu}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>
            {labels.length > 0 && (
                <div className="pointer-events-none relative flex flex-wrap gap-1">
                    {labels.map((label) => (
                        <BoardLabel key={label.name} {...label} />
                    ))}
                </div>
            )}
            {hasFoot && (
                <div className="pointer-events-none relative flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                    {due !== undefined && (
                        <DueText
                            date={due}
                            now={now}
                            done={done}
                            quiet={false}
                            icon={<CalendarDays aria-hidden />}
                            words={{ date: words.due, title: (date, state) => words.dueTitle(date, state === 'overdue') }}
                        />
                    )}
                    {comments !== undefined && comments > 0 && (
                        <span title={words.comments(comments)} className="inline-flex items-center gap-1">
                            <MessageSquare className="size-3.5" aria-hidden />
                            {comments}
                        </span>
                    )}
                    {checklist !== undefined && checklist.total > 0 && (
                        <span
                            title={words.checklist(checklist.done, checklist.total)}
                            className={cn('inline-flex items-center gap-1', checklist.done === checklist.total && 'text-good-ink')}
                        >
                            <ListChecks className="size-3.5" aria-hidden />
                            {checklist.done}/{checklist.total}
                        </span>
                    )}
                    <span className="flex-1" />
                    {assignee !== undefined && (
                        <PersonAvatar
                            name={assignee.name}
                            label={words.assignee(assignee.name)}
                            color={assignee.color}
                            image={assignee.image}
                            size="xs"
                        />
                    )}
                </div>
            )}
        </article>
    )
}
