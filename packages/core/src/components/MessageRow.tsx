import { Paperclip, Star } from 'lucide-react'

import { cn } from '../lib/cn'
import type { DragData } from './DragDrop'
import { DragSource, DragSourceGrip } from './DragSource'
import { Checkbox } from './ui/checkbox'
import { Highlight } from './Highlight'
import { literalRanges } from '../lib/search'

/** A label a message carries: its name, and the color of its dot as any CSS color. */
export interface MessageLabel {
    id: string
    label: string
    color?: string
}

export interface MessageRowWords {
    select: (from: string) => string
    star: string
    unstar: string
    unread: string
    attachment: string
    thread: (count: number) => string
    /** The grip's name, with `drag`: what the keyboard picks the message up by. */
    drag: (subject: string) => string
}

const WORDS: MessageRowWords = {
    select: (from) => `Select the message from ${from}`,
    star: 'Star',
    unstar: 'Remove the star',
    unread: 'Unread',
    attachment: 'Has attachments',
    thread: (count) => `${count} messages`,
    drag: (subject) => `Drag ${subject}`,
}

export interface MessageRowProps {
    from: string
    subject: string
    /** The start of the text, kept to one line. */
    snippet?: string
    /** When it came, already formatted: `09:42`, `Yesterday`, `Nov 3`. */
    time: string
    unread?: boolean
    starred?: boolean
    attachment?: boolean
    /** How many messages the thread holds; shown from two. */
    count?: number
    labels?: readonly MessageLabel[]
    /** This message is the one shown in the reading pane. */
    open?: boolean
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    onStarredChange?: (starred: boolean) => void
    onOpen?: () => void
    /** A search term to mark wherever it occurs. */
    highlight?: string
    /**
     * What the message carries when it is dragged to a target elsewhere on the page, such as a
     * folder in the rail inside a `RailDrops`; it does not drag without it. A small card with its
     * label follows the pointer unless the data says otherwise.
     */
    drag?: DragData
    className?: string
    words?: Partial<MessageRowWords>
}

/**
 * One message, or one conversation, in a list of them: who it is from, the subject, a line of the
 * text, and when it came, with marks for unread, starred, attachments and the number of messages
 * in its thread.
 *
 * Unread, the sender and subject are in the strong weight behind an accent dot. The open one wears
 * the accent bar at its left edge; a checked one sits on the accent's wash. The checkbox and the
 * star are drawn only with their handlers, so a list that cannot select or star has no dead
 * controls. `highlight` marks every place a search term occurs in the sender, subject and text,
 * and starts the text shortly before its first match.
 *
 * With `drag` the row drags as a whole to a target elsewhere on the page, and from the keyboard by
 * the grip at its end, shown on hover or focus; it fades while it is dragged.
 */
export function MessageRow({
    from,
    subject,
    snippet,
    time,
    unread = false,
    starred = false,
    attachment = false,
    count,
    labels = [],
    open = false,
    checked = false,
    onCheckedChange,
    onStarredChange,
    onOpen,
    highlight,
    drag,
    className,
    words: given,
}: MessageRowProps) {
    const words = { ...WORDS, ...given }
    const gutter = onCheckedChange !== undefined || onStarredChange !== undefined
    return (
        <DragSource drag={drag === undefined ? undefined : { compact: true, ...drag }}>
            {(source) => (
                <div
                    ref={source.ref}
                    {...source.press}
                    data-slot="message-row"
                    data-unread={unread || undefined}
                    data-open={open || undefined}
                    data-dragging={source.dragging || undefined}
                    className={cn(
                        'group/message relative flex gap-3 border-b border-border px-3 py-2.5 text-sm transition-colors',
                        open ? 'bg-sidebar-accent' : checked ? 'bg-accent' : 'hover:bg-hover',
                        source.dragging && 'opacity-40',
                        className,
                    )}
                >
                    <RowBody
                        from={from}
                        subject={subject}
                        snippet={snippet}
                        time={time}
                        unread={unread}
                        starred={starred}
                        attachment={attachment}
                        count={count}
                        labels={labels}
                        open={open}
                        checked={checked}
                        onCheckedChange={onCheckedChange}
                        onStarredChange={onStarredChange}
                        onOpen={onOpen}
                        highlight={highlight}
                        words={words}
                        gutter={gutter}
                    />
                    {source.enabled && (
                        <div className="flex shrink-0 items-center">
                            <DragSourceGrip
                                source={source}
                                size="icon-xs"
                                label={words.drag(subject)}
                                className="-mr-1.5 pointer-coarse:hidden pointer-fine:opacity-0 pointer-fine:group-hover/message:opacity-100 pointer-fine:focus-visible:opacity-100"
                            />
                        </div>
                    )}
                </div>
            )}
        </DragSource>
    )
}

/** A row's contents: the marks in its gutter, and the button that opens it. */
function RowBody({
    from,
    subject,
    snippet,
    time,
    unread,
    starred,
    attachment,
    count,
    labels,
    open,
    checked,
    onCheckedChange,
    onStarredChange,
    onOpen,
    highlight,
    words,
    gutter,
}: Required<Pick<MessageRowProps, 'from' | 'subject' | 'time' | 'unread' | 'starred' | 'attachment' | 'labels' | 'open' | 'checked'>> &
    Pick<MessageRowProps, 'snippet' | 'count' | 'onCheckedChange' | 'onStarredChange' | 'onOpen' | 'highlight'> & {
        words: MessageRowWords
        gutter: boolean
    }) {
    return (
        <>
            {open && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" aria-hidden />}
            {gutter && (
                <div data-no-drag className="flex shrink-0 flex-col items-center gap-2.5 pt-0.5">
                    {onCheckedChange !== undefined && (
                        <Checkbox checked={checked} onCheckedChange={(next) => onCheckedChange(next)} aria-label={words.select(from)} />
                    )}
                    {onStarredChange !== undefined && (
                        <button
                            type="button"
                            aria-pressed={starred}
                            aria-label={starred ? words.unstar : words.star}
                            title={starred ? words.unstar : words.star}
                            className={cn(
                                'flex size-4 items-center justify-center rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                starred ? 'text-warning' : 'text-faint hover:text-foreground',
                            )}
                            onClick={() => onStarredChange(!starred)}
                        >
                            <Star className={cn('size-4', starred && 'fill-current')} aria-hidden />
                        </button>
                    )}
                </div>
            )}
            <button
                type="button"
                aria-current={open || undefined}
                className="flex min-w-0 flex-1 flex-col gap-0.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                onClick={onOpen}
            >
                <span className="flex min-w-0 items-center gap-2">
                    {unread && (
                        <span className="size-2 shrink-0 rounded-full bg-primary">
                            <span className="sr-only">{words.unread}</span>
                        </span>
                    )}
                    <span className={cn('min-w-0 truncate', unread ? 'font-semibold text-foreground' : 'text-foreground')}>
                        <Marked text={from} term={highlight} />
                    </span>
                    {count !== undefined && count > 1 && (
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums" title={words.thread(count)}>
                            {count}
                        </span>
                    )}
                    <span className="ml-auto flex shrink-0 items-center gap-1.5 pl-2 text-xs text-muted-foreground tabular-nums">
                        {attachment && <Paperclip className="size-3.5" aria-label={words.attachment} />}
                        {!gutter && starred && <Star className="size-3.5 fill-current text-warning" aria-label={words.unstar} />}
                        <span className={cn(unread && 'font-medium text-foreground')}>{time}</span>
                    </span>
                </span>
                <span className="flex min-w-0 items-center gap-2">
                    <span className={cn('min-w-0 truncate', unread ? 'font-semibold text-foreground' : 'text-foreground')}>
                        <Marked text={subject} term={highlight} />
                    </span>
                    {labels.map((label) => (
                        <span
                            key={label.id}
                            className="inline-flex h-5 shrink-0 items-center gap-1 rounded-chip border border-border px-1.5 text-xs text-muted-foreground"
                        >
                            <span
                                className="size-1.5 rounded-full bg-faint"
                                style={label.color ? { background: label.color } : undefined}
                            />
                            {label.label}
                        </span>
                    ))}
                </span>
                {snippet !== undefined && (
                    <span className="truncate text-muted-foreground">
                        <Marked text={excerpt(snippet, highlight)} term={highlight} />
                    </span>
                )}
            </button>
        </>
    )
}

/** The text from a few words before the first match on, so a match deep in a long text stays in view. */
export function excerpt(text: string, term?: string, lead = 24): string {
    const at = term === undefined || term.trim() === '' ? -1 : text.toLowerCase().indexOf(term.trim().toLowerCase())
    if (at <= lead) return text
    const space = text.lastIndexOf(' ', at - lead)
    return `…${text.slice(space === -1 ? at - lead : space + 1)}`
}

/** The text with every case-blind occurrence of the term marked. */
function Marked({ text, term = '' }: { text: string; term?: string }) {
    return <Highlight text={text} ranges={literalRanges(text, term)} />
}
