import { Bell } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Count } from './Count'

/** One thing that happened: what, when, how it reads, and the one way to act on it. */
export interface ActivityItem {
    id: string
    text: ReactNode
    /** When it happened, as the app says it: `12 minutes ago`. */
    when: string
    /** The heading it is listed under, such as Today or Yesterday; items keep their order within it. */
    group?: string
    icon?: ReactNode
    tone?: 'critical' | 'warning' | 'info' | 'good' | 'quiet'
    unread?: boolean
    action?: { label: string; onClick: () => void }
}

export interface ActivityWords {
    title: string
    markAllRead: string
    empty: string
    unread: string
    /** The bell's name, with the count of unread items. */
    bell: (unread: number) => string
}

const WORDS: ActivityWords = {
    title: 'Activity',
    markAllRead: 'Mark all read',
    empty: 'Nothing new.',
    unread: 'unread',
    bell: (unread) => (unread > 0 ? `Activity, ${String(unread)} unread` : 'Activity'),
}

const INK: Record<NonNullable<ActivityItem['tone']>, string> = {
    critical: 'text-critical-ink',
    warning: 'text-warning-ink',
    info: 'text-info-ink',
    good: 'text-good-ink',
    quiet: 'text-muted-foreground',
}

export interface ActivityListProps {
    items: readonly ActivityItem[]
    /** An item was acted on, so it counts as read. */
    onRead?: (id: string) => void
    onReadAll?: () => void
    className?: string
    words?: Partial<ActivityWords>
}

/**
 * What happened while the person was away, or needs following up: newest first, in groups by
 * day when given, the unread ones drawn stronger with a dot. Each item carries its own way to act,
 * such as opening the failed job or restoring what was deleted; acting on one marks it read.
 * Items stay until read. Arriving items are not announced; the bell's name says the count.
 */
export function ActivityList({ items, onRead, onReadAll, className, words: given }: ActivityListProps) {
    const words = { ...WORDS, ...given }
    const unread = items.filter((item) => item.unread === true).length
    let group: string | undefined
    return (
        <div className={cn('flex min-h-0 flex-col', className)}>
            <div className="flex h-(--density-panel-head) shrink-0 items-center gap-2 border-b border-border px-3">
                <p className="flex-1 text-[length:var(--table-head-size)] font-[number:var(--table-head-weight)]">
                    {words.title}
                    {unread > 0 && <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{unread}</span>}
                </p>
                {onReadAll !== undefined && (
                    <Button variant="ghost" size="xs" disabled={unread === 0} onClick={onReadAll}>
                        {words.markAllRead}
                    </Button>
                )}
            </div>
            {items.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">{words.empty}</p>
            ) : (
                <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1">
                    {items.map((item) => {
                        const heading = item.group !== undefined && item.group !== group ? item.group : undefined
                        group = item.group
                        return (
                            <Fragment key={item.id}>
                                {heading !== undefined && (
                                    <li aria-hidden className="px-2 pt-2.5 pb-1 text-xs font-medium text-faint">
                                        {heading}
                                    </li>
                                )}
                                <li className={cn('flex items-start gap-2.5 rounded-md px-2 py-2', item.unread === true && 'bg-muted/60')}>
                                    {item.icon !== undefined && (
                                        <span
                                            className={cn('mt-0.5 flex size-4 shrink-0 [&_svg]:size-4', INK[item.tone ?? 'quiet'])}
                                            aria-hidden
                                        >
                                            {item.icon}
                                        </span>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className={cn('text-sm leading-5', item.unread === true && 'font-medium')}>{item.text}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.when}
                                            {item.unread === true && <span className="sr-only">, {words.unread}</span>}
                                        </p>
                                    </div>
                                    {item.action !== undefined && (
                                        <Button
                                            variant="outline"
                                            size="xs"
                                            onClick={() => {
                                                item.action?.onClick()
                                                onRead?.(item.id)
                                            }}
                                        >
                                            {item.action.label}
                                        </Button>
                                    )}
                                    {item.unread === true && <span className="mt-2 size-2 shrink-0 rounded-full bg-info" aria-hidden />}
                                </li>
                            </Fragment>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

export type ActivityButtonProps = { unread: number; words?: Partial<ActivityWords> } & React.ComponentProps<typeof Button>

/** The bell for the top bar, with the count of unread items on it. */
export function ActivityButton({ unread, className, words: given, ...props }: ActivityButtonProps) {
    const words = { ...WORDS, ...given }
    return (
        <Button
            variant="ghost"
            size="icon-sm"
            aria-label={words.bell(unread)}
            title={words.bell(unread)}
            className={cn('relative', className)}
            {...props}
        >
            <Bell aria-hidden />
            {unread > 0 && <Count value={unread} className="absolute -top-1 -right-1" />}
        </Button>
    )
}

export interface ActivityMenuProps {
    items: readonly ActivityItem[]
    onRead?: (id: string) => void
    onReadAll?: () => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
    defaultOpen?: boolean
    words?: Partial<ActivityWords>
}

/** The bell opening the activity list in a popover, as a top bar carries it. */
export function ActivityMenu({ items, onRead, onReadAll, open, onOpenChange, defaultOpen, words }: ActivityMenuProps) {
    const unread = items.filter((item) => item.unread === true).length
    return (
        <Popover open={open} onOpenChange={onOpenChange} defaultOpen={defaultOpen}>
            <PopoverTrigger render={<ActivityButton unread={unread} words={words} />} />
            <PopoverContent
                align="end"
                sideOffset={8}
                initialFocus={false}
                className="flex max-h-[min(32rem,calc(100svh-6rem))] w-[min(24rem,calc(100vw-2rem))] gap-0 p-0"
            >
                <ActivityList items={items} onRead={onRead} onReadAll={onReadAll} words={words} className="w-full" />
            </PopoverContent>
        </Popover>
    )
}
