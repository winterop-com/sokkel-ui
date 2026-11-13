import { IconButton } from './IconButton'
import { ChevronRight, Ellipsis, FileText, MessageSquareText, SmilePlus } from 'lucide-react'
import { isValidElement, useState, type CSSProperties, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import type { DragData } from './DragDrop'
import { DRAG_GROUP, DragSource, DragSourceGrip, GRIP_ON_HOVER } from './DragSource'
import { AudioPlayer } from './media/AudioPlayer'
import { VideoPlayer, type VideoPlayerWords } from './media/VideoPlayer'
import { PersonAvatar } from './PersonAvatar'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

/** A reaction to a message: what it is, how many gave it, and whether you are one of them. */
export interface ChatReaction {
    id: string
    /** An emoji, or an icon. */
    icon: ReactNode
    /** What the reaction means, said on hover and to a screen reader. */
    label: string
    count: number
    mine?: boolean
}

/** A person by name, drawn as their initials on their color, or as their picture when it is given. */
export interface ChatPerson {
    name: string
    image?: string
}

/** The replies under a message, folded into one line. */
export interface ChatThread {
    count: number
    /** The people who replied, most recent first, as pictures or as people; the first three are shown. */
    people: readonly (ReactNode | ChatPerson)[]
    /** When the last reply came, as the app says it. */
    last: string
}

/** A file sent with a message. */
export interface ChatFile {
    id: string
    name: string
    /**
     * An image shows as a picture, a recording plays in one line, a video plays in the library's
     * player, and anything else is a card.
     */
    kind: 'image' | 'file' | 'audio' | 'video'
    /** The picture, the recording or the video. */
    url?: string
    /** A short fact under the name: `CSV, 2.1 MB`. */
    detail?: string
    /** A recording's levels from start to end, each from 0 to 1, drawn as its scrubber. */
    waveform?: readonly number[]
    /** A recording's length in seconds, shown before it has loaded. */
    duration?: number
}

export interface ChatMessageWords {
    edited: string
    /** The edit time on hover, from `editedAt`. */
    editedAt: (when: string) => string
    react: string
    reply: string
    more: string
    replies: (count: number) => string
    lastReply: (when: string) => string
    /** Takes the last reply's place while the thread line is hovered. */
    viewThread: string
    /** The players' words, for a recording or a video: play, pause, seek, speed, captions, fullscreen and the rest. */
    player: Partial<VideoPlayerWords>
    /** A file's grip, with `fileDrag`: what the keyboard picks the file up by. */
    dragFile: (name: string) => string
}

const WORDS: ChatMessageWords = {
    edited: '(edited)',
    editedAt: (when) => `Edited ${when}`,
    react: 'Add a reaction',
    reply: 'Reply in thread',
    more: 'More actions',
    replies: (count) => `${String(count)} ${count === 1 ? 'reply' : 'replies'}`,
    lastReply: (when) => `Last reply ${when}`,
    viewThread: 'View thread',
    player: {},
    dragFile: (name) => `Drag ${name}`,
}

/** The link glyph drawn before every link in a body, as a mask so it takes the link's color. */
const LINK_ICON = `url("data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
)}")`

const BODY = cn(
    'min-w-0 text-sm leading-relaxed wrap-break-word',
    '[&_a]:text-primary-ink [&_a]:underline [&_a]:underline-offset-2',
    "[&_a]:before:mr-0.5 [&_a]:before:inline-block [&_a]:before:size-3.5 [&_a]:before:bg-current [&_a]:before:align-[-0.125em] [&_a]:before:content-['']",
    '[&_a]:before:[mask:var(--chat-link-icon)_center/contain_no-repeat]',
)

/** Lets the "(edited)" mark follow the last line of a body made of blocks, as markdown is. */
const INLINE_END = '[&>div:nth-last-child(2)]:inline [&>div:nth-last-child(2)>p:last-child]:inline [&>p:nth-last-child(2)]:inline'

/** Tells a person given by name from a picture given as a node. */
export function isChatPerson(who: ReactNode | ChatPerson): who is ChatPerson {
    return typeof who === 'object' && who !== null && !isValidElement(who) && 'name' in who && typeof who.name === 'string'
}

export interface ChatFaceProps {
    who: ReactNode | ChatPerson
    className?: string
}

/** A person filling the square they are given: a picture as given, or a person as their initials on their color. */
export function ChatFace({ who, className }: ChatFaceProps) {
    if (!isChatPerson(who)) return who
    return <PersonAvatar name={who.name} image={who.image} size="md" className={cn('size-full rounded-none', className)} />
}

/** A file's drag with a small card at the pointer, unless its data says otherwise. */
const dragOf = (drag: DragData | undefined): DragData | undefined => (drag === undefined ? undefined : { compact: true, ...drag })

/** One of the hover bar's icon buttons, its name in a tooltip. */
function BarButton({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }) {
    return (
        <IconButton label={label} size="icon-xs" onClick={onClick}>
            {children}
        </IconButton>
    )
}

export interface ChatMessageProps {
    author: string
    /** The author's picture as a node; their initials on their color when none is given. */
    avatar?: ReactNode
    /** The author's picture as an address, drawn over their initials once it has loaded. */
    image?: string
    /** The time as the conversation shows it: `09:42`. */
    time: string
    /** The full date and time, on hover. */
    timeTitle?: string
    continued?: boolean
    edited?: boolean
    /** When the message was last edited, as the app says it: `today at 09:44`. Marks it edited. */
    editedAt?: string
    /** Drawn as the message a link or a search landed on. */
    highlighted?: boolean
    /** Held in its hover look, as while a picker opened from it is showing. */
    active?: boolean
    files?: readonly ChatFile[]
    /**
     * What a file or a picture carries when it is dragged to a target elsewhere on the page, such as
     * onto another conversation; one with none, a recording and a video do not drag.
     */
    fileDrag?: (file: ChatFile) => DragData | undefined
    reactions?: readonly ChatReaction[]
    onReact?: (id: string) => void
    /** Offers the add-reaction button after the reactions and in the hover bar. */
    onAddReaction?: () => void
    thread?: ChatThread
    onOpenThread?: () => void
    /** Offers reply in thread in the hover bar. */
    onReply?: () => void
    /** Dropdown menu items behind the hover bar's more button. */
    menu?: ReactNode
    /** More buttons for the hover bar, before its more button. */
    actions?: ReactNode
    children: ReactNode
    className?: string
    words?: Partial<ChatMessageWords>
}

/**
 * One message in a conversation, laid out as a team chat does: the author's square picture, the
 * name and time on one line, the body right under it. A message that follows its author's last
 * one closely is `continued`: no picture and no name, its time shown in the gutter on hover, so
 * each message of a run still reads as its own. Under the body come the files (a recording and a video
 * play in place), the reactions
 * (pressing one adds or takes back yours, the button at the end adds a new one) and the thread
 * line that opens the replies. With `fileDrag` a file or a picture drags to a target elsewhere on
 * the page, and from the keyboard by its grip, shown on hover or focus. Links in the body carry a
 * link glyph; an edited message says so after its last line. The actions float at the top right on hover: react, reply in thread and a
 * menu, each given by its handler or items.
 */
export function ChatMessage({
    author,
    avatar,
    image,
    time,
    timeTitle,
    continued = false,
    edited = false,
    editedAt,
    highlighted = false,
    active = false,
    files,
    fileDrag,
    reactions,
    onReact,
    onAddReaction,
    thread,
    onOpenThread,
    onReply,
    menu,
    actions,
    children,
    className,
    words: given,
}: ChatMessageProps) {
    const words = { ...WORDS, ...given }
    const [menuOpen, setMenuOpen] = useState(false)
    const lit = active || menuOpen
    const isEdited = edited || editedAt !== undefined
    const hasBar = onAddReaction !== undefined || onReply !== undefined || menu !== undefined || actions !== undefined
    return (
        <article
            data-active={lit || undefined}
            className={cn(
                'group/chat relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2.5 px-(--density-chat-inset) hover:bg-hover',
                continued ? 'py-(--density-chat-follow)' : 'pt-(--density-chat-gap) pb-(--density-chat-follow)',
                lit && 'bg-muted/40',
                highlighted && 'bg-warning/10 hover:bg-warning/15',
                className,
            )}
        >
            <div className="flex justify-center">
                {continued ? (
                    <time
                        title={timeTitle}
                        className={cn(
                            'pt-0.5 text-2xs leading-5 whitespace-nowrap text-muted-foreground tabular-nums opacity-0 group-focus-within/chat:opacity-100 group-hover/chat:opacity-100',
                            lit && 'opacity-100',
                        )}
                    >
                        {time}
                    </time>
                ) : (
                    <span className="mt-1 flex size-9 items-center justify-center overflow-hidden rounded-lg bg-muted text-sm font-semibold">
                        <ChatFace who={avatar ?? { name: author, image }} className="text-sm font-semibold" />
                    </span>
                )}
            </div>
            <div className="flex min-w-0 flex-col">
                {!continued && (
                    <header className="flex min-w-0 items-baseline gap-2">
                        <span className="truncate text-sm font-semibold">{author}</span>
                        <time title={timeTitle} className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {time}
                        </time>
                    </header>
                )}
                <div className={cn(BODY, isEdited && INLINE_END)} style={{ '--chat-link-icon': LINK_ICON } as CSSProperties}>
                    {children}
                    {isEdited && (
                        <span
                            title={editedAt === undefined ? undefined : words.editedAt(editedAt)}
                            className="ml-1 text-xs text-muted-foreground"
                        >
                            {words.edited}
                        </span>
                    )}
                </div>
                {files !== undefined && files.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                        {files.map((file) =>
                            file.kind === 'audio' && file.url !== undefined ? (
                                <AudioPlayer
                                    key={file.id}
                                    src={file.url}
                                    waveform={file.waveform}
                                    duration={file.duration}
                                    label={file.name}
                                    words={words.player}
                                    variant="card"
                                    className="w-[min(100%,20rem)]"
                                />
                            ) : file.kind === 'video' && file.url !== undefined ? (
                                <VideoPlayer
                                    key={file.id}
                                    src={file.url}
                                    title={file.name}
                                    preload="metadata"
                                    words={words.player}
                                    className="w-[min(100%,24rem)]"
                                />
                            ) : (
                                <DragSource key={file.id} drag={dragOf(fileDrag?.(file))}>
                                    {(source) =>
                                        file.kind === 'image' && file.url !== undefined ? (
                                            <span
                                                ref={source.ref}
                                                {...source.press}
                                                className={cn(DRAG_GROUP, 'relative block', source.dragging && 'opacity-40')}
                                            >
                                                <img
                                                    src={file.url}
                                                    alt={file.name}
                                                    draggable={false}
                                                    className="max-h-60 max-w-[min(100%,24rem)] rounded-lg border border-border object-cover"
                                                />
                                                <DragSourceGrip
                                                    source={source}
                                                    size="icon-xs"
                                                    variant="secondary"
                                                    label={words.dragFile(file.name)}
                                                    className={cn('absolute top-1.5 right-1.5 shadow-sm', GRIP_ON_HOVER)}
                                                />
                                            </span>
                                        ) : (
                                            <div
                                                ref={source.ref}
                                                {...source.press}
                                                className={cn(
                                                    DRAG_GROUP,
                                                    'flex w-[min(100%,18rem)] items-center gap-3 rounded-surface border border-border bg-card px-3 py-2',
                                                    source.dragging && 'opacity-40',
                                                )}
                                            >
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary-ink">
                                                    <FileText className="size-4.5" aria-hidden />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium">{file.name}</span>
                                                    {file.detail !== undefined && (
                                                        <span className="block text-xs text-muted-foreground">{file.detail}</span>
                                                    )}
                                                </span>
                                                <DragSourceGrip
                                                    source={source}
                                                    size="icon-xs"
                                                    label={words.dragFile(file.name)}
                                                    className={cn('-mr-1.5', GRIP_ON_HOVER)}
                                                />
                                            </div>
                                        )
                                    }
                                </DragSource>
                            ),
                        )}
                    </div>
                )}
                {reactions !== undefined && reactions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {reactions.map((reaction) => (
                            <button
                                key={reaction.id}
                                type="button"
                                aria-pressed={reaction.mine === true}
                                title={reaction.label}
                                aria-label={`${reaction.label}, ${String(reaction.count)}`}
                                onClick={() => onReact?.(reaction.id)}
                                className={cn(
                                    'flex h-6 items-center gap-1 rounded-control border px-1.5 text-sm leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-3.5',
                                    reaction.mine === true
                                        ? 'border-primary/60 bg-primary/12 text-primary-ink'
                                        : 'border-transparent bg-muted text-muted-foreground hover:border-border-strong',
                                )}
                            >
                                {reaction.icon}
                                <span className="text-xs font-medium tabular-nums">{reaction.count}</span>
                            </button>
                        ))}
                        {onAddReaction !== undefined && (
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <button
                                            type="button"
                                            aria-label={words.react}
                                            onClick={onAddReaction}
                                            className="flex h-6 items-center rounded-control border border-transparent bg-muted px-1.5 text-muted-foreground outline-none hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                                        />
                                    }
                                >
                                    <SmilePlus className="size-3.5" aria-hidden />
                                </TooltipTrigger>
                                <TooltipContent>{words.react}</TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                )}
                {thread !== undefined && (
                    <button
                        type="button"
                        onClick={onOpenThread}
                        className="group/thread mt-1 -ml-1 flex w-fit max-w-full items-center gap-2 rounded-md border border-transparent py-0.5 pr-1 pl-1 text-xs outline-none hover:border-border hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-full sm:max-w-md"
                    >
                        <span className="flex shrink-0 gap-0.5">
                            {thread.people.slice(0, 3).map((person, index) => (
                                <span
                                    key={index}
                                    className="flex size-5 items-center justify-center overflow-hidden rounded-md bg-muted text-2xs font-semibold"
                                >
                                    <ChatFace who={person} className="text-2xs font-semibold" />
                                </span>
                            ))}
                        </span>
                        <span className="shrink-0 font-semibold text-primary-ink group-hover/thread:underline">
                            {words.replies(thread.count)}
                        </span>
                        <span className="min-w-0 truncate text-muted-foreground group-hover/thread:hidden group-focus-visible/thread:hidden">
                            {words.lastReply(thread.last)}
                        </span>
                        <span className="hidden min-w-0 truncate text-muted-foreground group-hover/thread:inline group-focus-visible/thread:inline">
                            {words.viewThread}
                        </span>
                        <ChevronRight
                            className="ml-auto hidden size-3.5 shrink-0 text-muted-foreground group-hover/thread:block group-focus-visible/thread:block"
                            aria-hidden
                        />
                    </button>
                )}
            </div>
            {hasBar && (
                <div
                    className={cn(
                        'absolute -top-3.5 right-(--density-chat-inset) z-20 hidden items-center gap-px rounded-surface border border-border bg-popover p-0.5 text-muted-foreground shadow-pop group-focus-within/chat:flex group-hover/chat:flex [&_button]:size-6',
                        lit && 'flex',
                    )}
                >
                    {onAddReaction !== undefined && (
                        <BarButton label={words.react} onClick={onAddReaction}>
                            <SmilePlus className="size-4" aria-hidden />
                        </BarButton>
                    )}
                    {onReply !== undefined && (
                        <BarButton label={words.reply} onClick={onReply}>
                            <MessageSquareText className="size-4" aria-hidden />
                        </BarButton>
                    )}
                    {actions}
                    {menu !== undefined && (
                        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label={words.more} />} />
                                    }
                                >
                                    <Ellipsis className="size-4" aria-hidden />
                                </TooltipTrigger>
                                <TooltipContent>{words.more}</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="w-48">
                                {menu}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            )}
        </article>
    )
}

export interface ChatDayDividerProps {
    children: ReactNode
    sticky?: boolean
}

/**
 * The date between a day's messages and the previous day's: a pill on a rule, on an opaque strip
 * across the list's width. In a `ChatDay` the strip is sticky, so the day in view stays named at
 * the top of the list, with no message showing behind it, and leaves with its last message. A `sticky` divider outside one stays stuck to the end of the list, under the later ones.
 */
export function ChatDayDivider({ children, sticky = false }: ChatDayDividerProps) {
    return (
        <div
            role="separator"
            className={cn(
                'pointer-events-none relative z-10 mt-1 flex h-10 items-center justify-center bg-background',
                sticky && 'sticky top-0',
            )}
        >
            <span aria-hidden className="absolute inset-x-(--density-chat-inset) top-1/2 h-px bg-border" />
            <span className="relative flex h-6 items-center rounded-control border border-border bg-background px-3 text-xs font-semibold whitespace-nowrap shadow-surface">
                {children}
            </span>
        </div>
    )
}

export interface ChatDayProps {
    label: ReactNode
    children: ReactNode
    className?: string
}

/** One day of a conversation: its date divider, then its messages; the date stays in view while the day scrolls by. */
export function ChatDay({ label, children, className }: ChatDayProps) {
    return (
        <section className={cn('relative', className)}>
            <ChatDayDivider sticky>{label}</ChatDayDivider>
            {children}
        </section>
    )
}

export interface ChatNewDividerProps {
    label?: string
}

/** Where the messages not read yet begin: a rule in the critical color, with the word at its end. */
export function ChatNewDivider({ label = 'New' }: ChatNewDividerProps) {
    return (
        <div role="separator" aria-label={label} className="relative flex h-4 items-center justify-end px-(--density-chat-inset)">
            <span className="absolute inset-x-(--density-chat-inset) top-1/2 h-px bg-critical/70" aria-hidden />
            <span className="relative bg-background pl-1.5 text-2xs font-semibold text-critical-ink">{label}</span>
        </div>
    )
}

export interface ChatTypingProps {
    children: ReactNode
}

/** Who is writing now, under the conversation. */
export function ChatTyping({ children }: ChatTypingProps) {
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
