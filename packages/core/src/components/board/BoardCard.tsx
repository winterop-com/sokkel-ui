import { format } from 'date-fns'
import { CalendarDays, ListChecks, MessageSquare, MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'

import { useClamped } from '../../hooks/use-clamped'
import { cn } from '../../lib/cn'
import { KIND_WASH, kindOf, type KindColor } from '../../lib/kind'
import { TITLE_LINES, type TitleLines } from '../../lib/title-lines'
import { DueText } from '../DueText'
import { PersonAvatar } from '../PersonAvatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { BoardGrip, BoardItem } from './Board'

/** A label on a card: its name, and the color it wears, which follows from the name by default. */
export interface BoardLabelSpec {
    name: string
    color?: KindColor
}

export type BoardLabelProps = BoardLabelSpec & { className?: string }

/** A label as a small chip in its color. */
export function BoardLabel({ name, color, className }: BoardLabelProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-chip px-1.5 py-px text-badge whitespace-nowrap',
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
    /** The grip's name, what the keyboard picks the card up by. */
    move: (card: string) => string
}

const WORDS: BoardCardWords = {
    menu: 'More actions',
    due: (date) => format(date, 'MMM d'),
    dueTitle: (date, overdue) => `${overdue ? 'Overdue, was due' : 'Due'} ${format(date, 'EEEE d MMMM')}`,
    comments: (count) => `${count} ${count === 1 ? 'comment' : 'comments'}`,
    checklist: (done, total) => `${done} of ${total} checklist items done`,
    assignee: (name) => `Assigned to ${name}`,
    move: (card) => `Move ${card}`,
}

export interface BoardCardProps {
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
    /** How many lines the title may take before it is cut short. */
    titleLines?: TitleLines
    className?: string
    words?: Partial<BoardCardWords>
}

/**
 * One work item on a board: its code in the code face, its title, its labels, and a foot with
 * the due date, the counts of comments and checklist items, and the assignee. A due date that has
 * passed is drawn in the critical ink, and one that falls today in the warning ink; `now` says
 * what today is.
 *
 * The whole card is one control that opens the item; `selected` marks the open one. A `menu`,
 * such as "Move to", sits at the head's right and keeps its own press. Inside a `Board` the card
 * drags from anywhere, and from the keyboard by the grip beside its menu; it fades while it is
 * dragged, a copy of it follows the pointer, and a line above it shows a card landing before it.
 *
 * The title takes up to `titleLines` lines, three by default; one cut short shows its whole text on hover.
 */
export function BoardCard(props: BoardCardProps) {
    const { id, code, title, selected = false, className } = props
    const label = code ?? (typeof title === 'string' ? title : id)
    const look = cn(CARD, selected && 'border-primary ring-1 ring-primary hover:border-primary', className)
    return (
        <BoardItem
            id={id}
            label={label}
            as="article"
            data-selected={selected || undefined}
            className={look}
            preview={() => (
                <article className={look}>
                    <CardFace {...props} overlay />
                </article>
            )}
        >
            <CardFace {...props} />
        </BoardItem>
    )
}

const CARD =
    'group/card flex shrink-0 cursor-grab [touch-action:manipulation] flex-col gap-2 rounded-surface border border-border-strong bg-card p-3 text-sm text-card-foreground shadow-surface transition-[background-color,border-color,opacity] select-none hover:border-foreground/25 active:cursor-grabbing'

/** What a card shows, on the board and in the copy that follows the pointer (`overlay`), which holds no controls. */
function CardFace({
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
    titleLines = 3,
    words: given,
    overlay = false,
}: BoardCardProps & { overlay?: boolean }) {
    const words = { ...WORDS, ...given }
    const [titleRef, clamped] = useClamped<HTMLHeadingElement>()
    const hasFoot = due !== undefined || comments !== undefined || checklist !== undefined || assignee !== undefined
    const tool = 'md:opacity-0 md:group-hover/card:opacity-100 md:focus-visible:opacity-100'
    return (
        <>
            {onSelect !== undefined && !overlay && (
                <button
                    type="button"
                    aria-pressed={selected}
                    className="absolute inset-0 z-0 cursor-[inherit] rounded-surface outline-none focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid"
                    onClick={onSelect}
                >
                    <span className="sr-only">{code ?? (typeof title === 'string' ? title : id)}</span>
                </button>
            )}
            <div className="pointer-events-none relative flex min-w-0 items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {code !== undefined && <span className="truncate font-mono text-xs text-muted-foreground">{code}</span>}
                    <h4
                        ref={titleRef}
                        title={clamped && typeof title === 'string' ? title : undefined}
                        className={cn('text-section-title leading-5', TITLE_LINES[titleLines])}
                    >
                        {title}
                    </h4>
                </div>
                {!overlay && (
                    <BoardGrip
                        move={words.move}
                        className={cn('pointer-events-auto relative z-10 -mt-1', menu === undefined && '-mr-1.5', tool)}
                    />
                )}
                {menu !== undefined && !overlay && (
                    <div data-no-drag className="pointer-events-auto relative z-10 -mt-1 -mr-1.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                aria-label={words.menu}
                                title={words.menu}
                                className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid data-popup-open:bg-hover md:opacity-0 md:group-hover/card:opacity-100 md:focus-visible:opacity-100 md:data-popup-open:opacity-100"
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
        </>
    )
}
