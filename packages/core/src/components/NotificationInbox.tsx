import { Bell, BellOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { Count } from './Count'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from './ui/popover'

/** How a notice stands out: a neutral one, or one in a status tone. */
export type NoticeTone = 'neutral' | 'good' | 'warning' | 'critical'

/** One notice in the inbox. */
export interface Notice {
    id: string
    title: string
    /** A line under the title. */
    body?: ReactNode
    /** When it came, as the app writes it, such as with `RelativeTime`. */
    when: ReactNode
    tone?: NoticeTone
    /** Not read yet: marked with a dot, and counted on the bell. */
    unread?: boolean
}

export interface NotificationInboxWords {
    /** The bell's name, by how many are unread. */
    bell: (unread: number) => string
    /** The inbox's title. */
    title: string
    markAllRead: string
    /** Said when there is nothing in the inbox. */
    empty: string
    /** Said to a screen reader of a notice not read yet. */
    unread: string
}

export const NOTIFICATION_INBOX_WORDS: NotificationInboxWords = {
    bell: (unread) => (unread === 0 ? 'Notifications' : `Notifications, ${unread.toLocaleString('en-US')} unread`),
    title: 'Notifications',
    markAllRead: 'Mark all as read',
    empty: 'You are all caught up',
    unread: 'Unread',
}

/** Where a catalog holds a notification inbox's words, and the arguments its phrases name. */
export const NOTIFICATION_INBOX_PART: WordsPart<NotificationInboxWords> = {
    id: 'notificationInbox',
    words: NOTIFICATION_INBOX_WORDS,
    args: { bell: 'unread' },
}

/** A notification inbox's phrases as ICU messages in English, for the catalog. */
export const NOTIFICATION_INBOX_MESSAGES: WordMessages<NotificationInboxWords> = {
    bell: '{unread, plural, =0 {Notifications} other {Notifications, # unread}}',
}

export interface NotificationInboxProps {
    notices: readonly Notice[]
    /** A notice pressed: the app opens what it is about and marks it read. */
    onOpen?: (id: string) => void
    /** Marks every notice read; the action shows while any is unread. */
    onMarkAllRead?: () => void
    /** Whether the inbox is open, held from outside with `onOpenChange`. */
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    words?: Partial<NotificationInboxWords>
    className?: string
}

/** Each tone's mark beside a notice. */
const MARK: Record<NoticeTone, string> = {
    neutral: 'bg-muted-foreground/50',
    good: 'bg-good',
    warning: 'bg-warning',
    critical: 'bg-critical',
}

/**
 * What the app has told the viewer, behind a bell in the top bar: the bell carries how many are
 * unread, and opens a list of the notices, newest first as the app gives them, each with its tone's
 * mark, its title, a line and when it came, the unread ones marked with a dot and set on a wash.
 * Pressing a notice hands it to the app, which opens what it is about and marks it read; Mark all as
 * read clears the count. An empty inbox says so.
 */
export function NotificationInbox({
    notices,
    onOpen,
    onMarkAllRead,
    open,
    defaultOpen = false,
    onOpenChange,
    words: given,
    className,
}: NotificationInboxProps) {
    const words = useWords(NOTIFICATION_INBOX_PART, given)
    const [own, setOwn] = useState(defaultOpen)
    const opened = open ?? own
    const unread = notices.filter((notice) => notice.unread === true).length
    const change = (next: boolean) => {
        if (open === undefined) setOwn(next)
        onOpenChange?.(next)
    }
    return (
        <Popover open={opened} onOpenChange={change}>
            <PopoverTrigger
                render={<Button variant="ghost" size="icon" aria-label={words.bell(unread)} className={cn('relative', className)} />}
                data-slot="notification-bell"
            >
                <Bell aria-hidden />
                {unread > 0 && <Count value={unread} size="sm" shape="round" className="absolute -end-0.5 -top-0.5" />}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 gap-0 p-0" data-slot="notification-inbox">
                <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                    <PopoverTitle className="text-sm">{words.title}</PopoverTitle>
                    {onMarkAllRead !== undefined && unread > 0 && (
                        <Button variant="ghost" size="xs" onClick={onMarkAllRead}>
                            {words.markAllRead}
                        </Button>
                    )}
                </div>
                {notices.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-3 py-8 text-sm text-muted-foreground">
                        <BellOff aria-hidden className="size-5" />
                        {words.empty}
                    </div>
                ) : (
                    <ul className="max-h-96 overflow-y-auto p-1">
                        {notices.map((notice) => {
                            const Row = onOpen === undefined ? 'div' : 'button'
                            return (
                                <li key={notice.id}>
                                    <Row
                                        type={onOpen === undefined ? undefined : 'button'}
                                        data-slot="notice"
                                        data-unread={notice.unread === true || undefined}
                                        onClick={onOpen === undefined ? undefined : () => onOpen(notice.id)}
                                        className={cn(
                                            'flex w-full items-start gap-2.5 rounded-control px-2.5 py-2 text-start outline-none',
                                            notice.unread === true && 'bg-primary/5',
                                            onOpen !== undefined &&
                                                'cursor-pointer hover:bg-hover focus-visible:ring-3 focus-visible:ring-ring/50',
                                        )}
                                    >
                                        <span
                                            aria-hidden
                                            className={cn('mt-1.5 size-2 shrink-0 rounded-full', MARK[notice.tone ?? 'neutral'])}
                                        />
                                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span className={cn('text-sm', notice.unread === true ? 'font-medium' : 'text-foreground/90')}>
                                                {notice.unread === true && <span className="sr-only">{words.unread}: </span>}
                                                {notice.title}
                                            </span>
                                            {notice.body !== undefined && (
                                                <span className="text-xs text-muted-foreground">{notice.body}</span>
                                            )}
                                            <span className="text-2xs text-muted-foreground">{notice.when}</span>
                                        </span>
                                        {notice.unread === true && (
                                            <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                                        )}
                                    </Row>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </PopoverContent>
        </Popover>
    )
}
