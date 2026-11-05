import { FileText, SmilePlus } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/** A reaction to a message: what it is, how many gave it, and whether you are one of them. */
export interface ChatReaction {
    id: string
    icon: ReactNode
    /** What the reaction means, said on hover and to a screen reader. */
    label: string
    count: number
    mine?: boolean
}

/** The replies under a message, folded into one line. */
export interface ChatThread {
    count: number
    /** The pictures of the people who replied, most recent first. */
    people: readonly ReactNode[]
    /** When the last reply came, as the app says it. */
    last: string
}

/** A file sent with a message. */
export interface ChatFile {
    id: string
    name: string
    /** An image shows as a picture; anything else as a card. */
    kind: 'image' | 'file'
    url?: string
    /** A short fact under the name: `CSV, 2.1 MB`. */
    detail?: string
}

export interface ChatMessageWords {
    edited: string
    react: string
    replies: (count: number) => string
    lastReply: (when: string) => string
}

const WORDS: ChatMessageWords = {
    edited: '(edited)',
    react: 'Add a reaction',
    replies: (count) => `${String(count)} ${count === 1 ? 'reply' : 'replies'}`,
    lastReply: (when) => `Last reply ${when}`,
}

/**
 * One message in a conversation, laid out as a team chat does: the author's picture, name and
 * time, then the body. A message that follows its author's last one closely is `continued`: no
 * picture and no name, its time shown in the gutter on hover. Under the body come the files, the
 * reactions (pressing one adds or takes back yours) and the thread line that opens the replies.
 * The actions float at the top right on hover.
 */
export function ChatMessage({
    author,
    avatar,
    time,
    timeTitle,
    continued = false,
    edited = false,
    highlighted = false,
    files,
    reactions,
    onReact,
    onAddReaction,
    thread,
    onOpenThread,
    actions,
    children,
    className,
    words: given,
}: {
    author: string
    avatar?: ReactNode
    /** The time as the conversation shows it: `09:42`. */
    time: string
    /** The full date and time, on hover. */
    timeTitle?: string
    continued?: boolean
    edited?: boolean
    /** Drawn as the message a link or a search landed on. */
    highlighted?: boolean
    files?: readonly ChatFile[]
    reactions?: readonly ChatReaction[]
    onReact?: (id: string) => void
    onAddReaction?: () => void
    thread?: ChatThread
    onOpenThread?: () => void
    /** The hover toolbar's buttons. */
    actions?: ReactNode
    children: ReactNode
    className?: string
    words?: Partial<ChatMessageWords>
}) {
    const words = { ...WORDS, ...given }
    return (
        <article
            className={cn(
                'group/chat relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2.5 px-(--density-chat-inset) hover:bg-muted/40',
                continued ? 'py-(--density-chat-follow)' : 'pt-(--density-chat-gap) pb-1',
                highlighted && 'bg-warning/10 hover:bg-warning/15',
                className,
            )}
        >
            <div className="flex justify-center">
                {continued ? (
                    <time
                        title={timeTitle}
                        className="pt-0.5 text-[11px] leading-5 text-faint tabular-nums opacity-0 group-hover/chat:opacity-100"
                    >
                        {time}
                    </time>
                ) : (
                    <span className="mt-0.5 flex size-9 items-center justify-center overflow-hidden rounded-lg bg-muted text-xs font-medium">
                        {avatar}
                    </span>
                )}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
                {!continued && (
                    <header className="flex min-w-0 items-baseline gap-2">
                        <span className="truncate text-sm font-semibold">{author}</span>
                        <time title={timeTitle} className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {time}
                        </time>
                    </header>
                )}
                <div className="min-w-0 text-sm leading-6 wrap-break-word">
                    {children}
                    {edited && <span className="ml-1 text-xs text-faint">{words.edited}</span>}
                </div>
                {files !== undefined && files.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {files.map((file) =>
                            file.kind === 'image' && file.url !== undefined ? (
                                <img
                                    key={file.id}
                                    src={file.url}
                                    alt={file.name}
                                    className="max-h-60 max-w-[min(100%,24rem)] rounded-lg border border-border object-cover"
                                />
                            ) : (
                                <div
                                    key={file.id}
                                    className="flex w-[min(100%,18rem)] items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                                >
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary-ink">
                                        <FileText className="size-4.5" aria-hidden />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium">{file.name}</span>
                                        {file.detail !== undefined && (
                                            <span className="block text-xs text-muted-foreground">{file.detail}</span>
                                        )}
                                    </span>
                                </div>
                            ),
                        )}
                    </div>
                )}
                {reactions !== undefined && reactions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {reactions.map((reaction) => (
                            <button
                                key={reaction.id}
                                type="button"
                                aria-pressed={reaction.mine === true}
                                title={reaction.label}
                                aria-label={`${reaction.label}, ${String(reaction.count)}`}
                                onClick={() => onReact?.(reaction.id)}
                                className={cn(
                                    'flex h-6 items-center gap-1 rounded-control border px-2 text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-3.5',
                                    reaction.mine === true
                                        ? 'border-primary/50 bg-primary/12 text-primary-ink'
                                        : 'border-border bg-muted/50 text-muted-foreground hover:border-border-strong',
                                )}
                            >
                                {reaction.icon}
                                {reaction.count}
                            </button>
                        ))}
                        {onAddReaction !== undefined && (
                            <button
                                type="button"
                                aria-label={words.react}
                                title={words.react}
                                onClick={onAddReaction}
                                className="flex h-6 items-center rounded-control border border-transparent px-1.5 text-muted-foreground opacity-0 outline-none group-hover/chat:opacity-100 hover:border-border focus-visible:opacity-100"
                            >
                                <SmilePlus className="size-3.5" aria-hidden />
                            </button>
                        )}
                    </div>
                )}
                {thread !== undefined && (
                    <button
                        type="button"
                        onClick={onOpenThread}
                        className="-ml-1 flex w-fit max-w-full items-center gap-2 rounded-md border border-transparent px-1 py-0.5 text-xs outline-none hover:border-border hover:bg-card focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <span className="flex -space-x-1">
                            {thread.people.slice(0, 3).map((person, index) => (
                                <span
                                    key={index}
                                    className="flex size-5 items-center justify-center overflow-hidden rounded-md bg-muted text-[9px] font-medium ring-2 ring-background"
                                >
                                    {person}
                                </span>
                            ))}
                        </span>
                        <span className="font-semibold text-primary-ink">{words.replies(thread.count)}</span>
                        <span className="truncate text-muted-foreground">{words.lastReply(thread.last)}</span>
                    </button>
                )}
            </div>
            {actions !== undefined && (
                <div className="absolute -top-3 right-4 hidden items-center rounded-md border border-border bg-popover p-0.5 shadow-pop group-focus-within/chat:flex group-hover/chat:flex [&_button]:size-7">
                    {actions}
                </div>
            )}
        </article>
    )
}

/** The date between a day's messages and the next day's, as a rule with the date on it. */
export function ChatDayDivider({ children }: { children: ReactNode }) {
    return (
        <div role="separator" className="relative my-(--density-chat-gap) flex items-center justify-center px-(--density-chat-inset)">
            <span className="absolute inset-x-(--density-chat-inset) top-1/2 h-px bg-border" aria-hidden />
            <span className="relative rounded-chip border border-border bg-background px-2 py-0.5 text-xs font-medium">{children}</span>
        </div>
    )
}

/** Where the messages not read yet begin. */
export function ChatNewDivider({ label = 'New' }: { label?: string }) {
    return (
        <div role="separator" aria-label={label} className="relative my-1 flex items-center justify-end px-(--density-chat-inset)">
            <span className="absolute inset-x-(--density-chat-inset) top-1/2 h-px bg-critical/60" aria-hidden />
            <span className="relative bg-background pl-2 text-[11px] font-semibold tracking-wide text-critical-ink uppercase">{label}</span>
        </div>
    )
}

/** Who is writing now, under the conversation. */
export function ChatTyping({ children }: { children: ReactNode }) {
    return (
        <p aria-live="polite" className="flex h-5 items-center gap-1.5 px-(--density-chat-inset) text-xs text-muted-foreground">
            <span className="flex gap-0.5" aria-hidden>
                {[0, 1, 2].map((dot) => (
                    <span key={dot} className="size-1 rounded-full bg-muted-foreground" />
                ))}
            </span>
            {children}
        </p>
    )
}
