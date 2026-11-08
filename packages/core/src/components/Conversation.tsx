import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ChatTyping } from './ChatMessage'

export interface ConversationProps {
    /** The head of the conversation, such as a `ChannelHeader`. */
    header?: ReactNode
    /** Who is writing now, under the messages. */
    typing?: ReactNode
    /** The box at the foot, such as a `MessageComposer`. */
    composer?: ReactNode
    /** The messages, such as `ChatDay`s of `ChatMessage`s, oldest first. */
    children: ReactNode
    className?: string
}

/**
 * A conversation's column, as a team chat lays it out: the header on top, the messages scrolling
 * under it from their end, as a conversation opens at its latest message, then who is typing and
 * the composer at the foot. The column fills the height it is given.
 */
export function Conversation({ header, typing, composer, children, className }: ConversationProps) {
    return (
        <div className={cn('flex h-full min-h-0 flex-col', className)}>
            {header}
            <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto">
                <div className="pt-1 pb-3">{children}</div>
            </div>
            {typing === undefined ? (
                composer !== undefined && <div className="h-2 shrink-0" aria-hidden />
            ) : (
                <ChatTyping>{typing}</ChatTyping>
            )}
            {composer !== undefined && <div className="shrink-0 px-(--density-chat-inset) pb-4">{composer}</div>}
        </div>
    )
}

export interface ConversationStartProps {
    /** The person's picture, such as a `PersonAvatar` at `xl`; drawn as given. */
    picture?: ReactNode
    /** The channel's icon, drawn on a tile in the primary wash when there is no `picture`. */
    icon?: ReactNode
    title: ReactNode
    /** What the conversation is, under its name. */
    children?: ReactNode
    /** Buttons that get it going: add people, set a topic. */
    actions?: ReactNode
    className?: string
}

/**
 * The start of a conversation, at the top of its messages: a large picture of the person, or the
 * channel's icon on a tile, its name, a line on what it is, and the ways to get it going.
 */
export function ConversationStart({ picture, icon, title, children, actions, className }: ConversationStartProps) {
    return (
        <div className={cn('flex max-w-lg flex-col items-start gap-3 px-(--density-chat-inset) pt-6 pb-4', className)}>
            {picture ??
                (icon !== undefined && (
                    <span className="flex size-16 items-center justify-center rounded-xl bg-primary/15 text-primary-ink [&_svg]:size-7">
                        {icon}
                    </span>
                ))}
            <div className="flex flex-col gap-1">
                <h2 className="text-page-title">{title}</h2>
                {children !== undefined && <p className="text-sm text-muted-foreground">{children}</p>}
            </div>
            {actions !== undefined && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    )
}

export interface ThreadViewProps {
    /** The message the thread started from, as a `ChatMessage`. */
    parent: ReactNode
    /** The reply box, such as a `MessageComposer`. */
    composer?: ReactNode
    /** The replies, oldest first, as `ChatMessage`s. */
    children?: ReactNode
    className?: string
}

/**
 * A thread, as a side panel shows it: the message it started from, its replies right under it, and
 * the reply box after the last one, all in one column that scrolls. Replies by the same author in a
 * row are given `continued`, so they read as one run.
 */
export function ThreadView({ parent, composer, children, className }: ThreadViewProps) {
    return (
        <div className={cn('flex h-full min-h-0 flex-col', className)}>
            <div className="min-h-0 flex-1 overflow-y-auto pt-1 pb-4">
                {parent}
                {children}
                {composer !== undefined && <div className="px-(--density-chat-inset) pt-3">{composer}</div>}
            </div>
        </div>
    )
}
