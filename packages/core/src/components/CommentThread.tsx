import { MoreHorizontal, Pin, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import type { KindColor } from '../lib/kind'
import { IconButton } from './IconButton'
import { PersonAvatar } from './PersonAvatar'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Textarea } from './ui/textarea'

/** One comment under a post or a video, and the replies to it, nested to any depth. */
export interface ThreadComment {
    id: string
    author: string
    /** The author's picture, drawn over their initials once it has loaded. */
    image?: string
    color?: KindColor
    /** When it was written, as the app says it: `3 weeks ago`. */
    time: string
    /** The full date and time, on hover. */
    timeTitle?: string
    body: ReactNode
    /** How many liked it, as the app writes it: `1.2k`. */
    likes?: number | string
    liked?: boolean
    disliked?: boolean
    /** Pinned to the top by the thread's owner, said over the comment. */
    pinned?: boolean
    /** Written by the owner of what is commented on, marked beside the name. */
    creator?: boolean
    edited?: boolean
    replies?: readonly ThreadComment[]
}

export interface CommentThreadWords {
    like: string
    dislike: string
    reply: string
    /** The more button's name, before its menu. */
    actions: string
    /** The mark beside the name of the owner of what is commented on. */
    creator: string
    pinned: (by: string | undefined) => string
    edited: string
    replies: (count: number) => string
    hideReplies: string
}

const WORDS: CommentThreadWords = {
    like: 'Like',
    dislike: 'Dislike',
    reply: 'Reply',
    actions: 'Comment actions',
    creator: 'creator',
    pinned: (by) => (by === undefined ? 'Pinned' : `Pinned by ${by}`),
    edited: '(edited)',
    replies: (count) => `${String(count)} ${count === 1 ? 'reply' : 'replies'}`,
    hideReplies: 'Hide replies',
}

export interface CommentComposerWords {
    placeholder: string
    submit: string
    cancel: string
}

const COMPOSER_WORDS: CommentComposerWords = { placeholder: 'Add a comment', submit: 'Comment', cancel: 'Cancel' }

/**
 * A field to write a comment in, beside the writer's picture. It grows with the text, and its
 * Cancel and Comment buttons show once something is written, or always while `onCancel` is given,
 * as a reply's field opened from a comment. Comment hands the text to `onSubmit` and empties the
 * field; Cancel empties it and calls `onCancel`. Enter with Ctrl or Command sends it too.
 */
export function CommentComposer({
    author,
    image,
    color,
    size = 'md',
    autoFocus = false,
    onSubmit,
    onCancel,
    className,
    words: given,
}: {
    /** Who is writing, drawn as their picture. */
    author: string
    image?: string
    color?: KindColor
    /** `sm` for a reply's field, under the comment it answers. */
    size?: 'sm' | 'md'
    autoFocus?: boolean
    onSubmit?: (text: string) => void
    onCancel?: () => void
    className?: string
    words?: Partial<CommentComposerWords>
}) {
    const words = { ...COMPOSER_WORDS, ...given }
    const [draft, setDraft] = useState('')
    const submit = () => {
        if (draft.trim() === '') return
        onSubmit?.(draft)
        setDraft('')
    }
    const cancel = () => {
        setDraft('')
        onCancel?.()
    }
    return (
        <div data-slot="comment-composer" className={cn('flex min-w-0 items-start gap-3', className)}>
            <PersonAvatar name={author} image={image} color={color} size={size === 'sm' ? 'sm' : 'md'} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Textarea
                    value={draft}
                    rows={1}
                    autoFocus={autoFocus}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault()
                            submit()
                        }
                        if (event.key === 'Escape' && onCancel !== undefined) cancel()
                    }}
                    placeholder={words.placeholder}
                    aria-label={words.placeholder}
                    className="min-h-8 resize-none"
                />
                {(draft !== '' || onCancel !== undefined) && (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={cancel}>
                            {words.cancel}
                        </Button>
                        <Button size="sm" disabled={draft.trim() === ''} onClick={submit}>
                            {words.submit}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

interface ItemProps {
    /** Who replies, for the field a reply opens; with `onReply`. */
    viewer?: { name: string; image?: string; color?: KindColor }
    pinnedBy?: string
    onLike?: (comment: ThreadComment) => void
    onDislike?: (comment: ThreadComment) => void
    onReply?: (comment: ThreadComment, text: string) => void
    menu?: (comment: ThreadComment) => ReactNode
    openReplies?: readonly string[]
    words?: Partial<CommentThreadWords>
    composerWords?: Partial<CommentComposerWords>
}

/**
 * One comment of a thread: the author's picture, their name with a creator mark and the time, what
 * they wrote, the like, dislike and reply buttons, and a menu at its right. A pinned comment says
 * so over the name. Replies fold under it behind a count, each drawn the same way at a smaller
 * picture, to any depth. Reply opens a field under the comment when `onReply` is given.
 */
export function CommentItem({
    comment,
    depth = 0,
    viewer,
    pinnedBy,
    onLike,
    onDislike,
    onReply,
    menu,
    openReplies,
    words: given,
    composerWords,
}: ItemProps & { comment: ThreadComment; depth?: number }) {
    const words = { ...WORDS, ...given }
    const [open, setOpen] = useState(openReplies?.includes(comment.id) ?? false)
    const [replying, setReplying] = useState(false)
    const replies = comment.replies ?? []
    const items = menu?.(comment)
    const reply = depth > 0
    return (
        <li data-slot="comment" className="flex min-w-0 items-start gap-3">
            <PersonAvatar name={comment.author} image={comment.image} color={comment.color} size={reply ? 'sm' : 'md'} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {comment.pinned === true && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Pin className="size-3" aria-hidden />
                        {words.pinned(pinnedBy)}
                    </span>
                )}
                <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-xs">
                    <span className="truncate font-medium">{comment.author}</span>
                    {comment.creator === true && <span className="rounded-mini bg-muted px-1 text-muted-foreground">{words.creator}</span>}
                    <time title={comment.timeTitle} className="text-muted-foreground">
                        {comment.time}
                    </time>
                    {comment.edited === true && <span className="text-muted-foreground">{words.edited}</span>}
                </p>
                <div className="text-sm leading-relaxed wrap-break-word">{comment.body}</div>
                <div className="-ml-2 flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Button
                        variant="ghost"
                        size="xs"
                        aria-label={words.like}
                        aria-pressed={comment.liked === true}
                        className={cn(comment.liked === true && 'text-primary-ink')}
                        onClick={() => onLike?.(comment)}
                    >
                        <ThumbsUp className={cn(comment.liked === true && 'fill-current')} aria-hidden />
                        {comment.likes}
                    </Button>
                    <IconButton
                        label={words.dislike}
                        size="icon-xs"
                        pressed={comment.disliked === true}
                        onClick={() => onDislike?.(comment)}
                    >
                        <ThumbsDown aria-hidden />
                    </IconButton>
                    {onReply !== undefined && (
                        <Button variant="ghost" size="xs" onClick={() => setReplying(true)}>
                            {words.reply}
                        </Button>
                    )}
                </div>
                {replying && onReply !== undefined && (
                    <CommentComposer
                        author={viewer?.name ?? ''}
                        image={viewer?.image}
                        color={viewer?.color}
                        size="sm"
                        autoFocus
                        className="mt-1"
                        onSubmit={(text) => {
                            onReply(comment, text)
                            setReplying(false)
                            setOpen(true)
                        }}
                        onCancel={() => setReplying(false)}
                        words={{ placeholder: words.reply, submit: words.reply, ...composerWords }}
                    />
                )}
                {replies.length > 0 && (
                    <>
                        <Button
                            variant="ghost"
                            size="xs"
                            className="-ml-2 self-start text-primary-ink"
                            aria-expanded={open}
                            onClick={() => setOpen(!open)}
                        >
                            {open ? words.hideReplies : words.replies(replies.length)}
                        </Button>
                        {open && (
                            <ul className="mt-2 flex flex-col gap-4">
                                {replies.map((one) => (
                                    <CommentItem
                                        key={one.id}
                                        comment={one}
                                        depth={depth + 1}
                                        viewer={viewer}
                                        pinnedBy={pinnedBy}
                                        onLike={onLike}
                                        onDislike={onDislike}
                                        onReply={onReply}
                                        menu={menu}
                                        openReplies={openReplies}
                                        words={words}
                                        composerWords={composerWords}
                                    />
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
            {items !== undefined && items !== null && (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" aria-label={words.actions} className="text-muted-foreground" />}
                    >
                        <MoreHorizontal aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        {items}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </li>
    )
}

/**
 * The comments under a post or a video, as a list: each with its author, time, likes and menu, the
 * pinned one first as given, and replies folded under their comment behind a count. The likes and
 * replies are the app's: `onLike` and `onDislike` hear a press and the app hands back the comment
 * with `liked` or `disliked` set, and `onReply` (with the `viewer` who writes) opens a field under a
 * comment and hears what was written. `menu` gives a comment's menu items, or nothing for no menu.
 * `openReplies` names comments whose replies start open.
 *
 * Put a `CommentComposer` above it for a new comment, and a count with a sort in a `Toolbar` above
 * that.
 */
export function CommentThread({
    comments,
    viewer,
    pinnedBy,
    onLike,
    onDislike,
    onReply,
    menu,
    openReplies,
    className,
    words: given,
    composerWords,
}: ItemProps & {
    comments: readonly ThreadComment[]
    className?: string
}) {
    return (
        <ul data-slot="comment-thread" className={cn('flex min-w-0 flex-col gap-6', className)}>
            {comments.map((comment) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    viewer={viewer}
                    pinnedBy={pinnedBy}
                    onLike={onLike}
                    onDislike={onDislike}
                    onReply={onReply}
                    menu={menu}
                    openReplies={openReplies}
                    words={given}
                    composerWords={composerWords}
                />
            ))}
        </ul>
    )
}
