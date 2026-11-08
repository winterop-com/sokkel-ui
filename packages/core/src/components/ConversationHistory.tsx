import { PencilLine, Pin, PinOff, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { cn } from '../lib/cn'
import { type DataAction, type DataColumn, DataTable } from './DataTable'
import { ConfirmDialog } from './DialogShell'
import { Input } from './ui/input'

/** One conversation in the history. */
export interface ConversationEntry {
    id: string
    title: string
    /** When it was last active, in milliseconds since the epoch. */
    time: number
    pinned?: boolean
}

export interface ConversationHistoryWords {
    /** The group heads. */
    pinned: string
    today: string
    earlier: string
    rename: string
    pin: string
    unpin: string
    delete: string
    /** The delete dialog's question. */
    deleteQuestion: (title: string) => string
    /** The line under the question. */
    deleteDetail: string
    /** The rename field's accessible name. */
    title: string
    /** Said when there is no conversation yet. */
    empty: string
}

export const CONVERSATION_HISTORY_WORDS: ConversationHistoryWords = {
    pinned: 'Pinned',
    today: 'Today',
    earlier: 'Earlier',
    rename: 'Rename',
    pin: 'Pin',
    unpin: 'Unpin',
    delete: 'Delete',
    deleteQuestion: (title) => `Delete ${title}?`,
    deleteDetail: 'The conversation and everything in it is removed for good.',
    title: 'Title',
    empty: 'No conversations yet.',
}

type Group = 'pinned' | 'today' | 'earlier'

/** The start of the day `now` falls in, in the local time zone. */
function startOfDay(now: number): number {
    const day = new Date(now)
    day.setHours(0, 0, 0, 0)
    return day.getTime()
}

/** Where a conversation is listed: pinned ones first, then today's, then the rest. */
export function conversationGroup(entry: ConversationEntry, now: number): Group {
    if (entry.pinned === true) return 'pinned'
    return entry.time >= startOfDay(now) ? 'today' : 'earlier'
}

/** The time a conversation shows: the hour today, the day this year, the date before. */
export function conversationTime(time: number, now: number): string {
    if (time >= startOfDay(now)) return new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const sameYear = new Date(time).getFullYear() === new Date(now).getFullYear()
    return new Date(time).toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { dateStyle: 'medium' })
}

/** The title being changed in place: Enter or leaving keeps it, Escape puts it back. */
function RenameField({ entry, label, onDone }: { entry: ConversationEntry; label: string; onDone: (title: string | undefined) => void }) {
    const [value, setValue] = useState(entry.title)
    const finish = () => {
        const title = value.trim()
        onDone(title === '' || title === entry.title ? undefined : title)
    }
    return (
        <Input
            aria-label={label}
            value={value}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setValue(event.target.value)}
            onBlur={finish}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
                // The field's keys type and edit, rather than moving through the list.
                event.stopPropagation()
                if (event.key === 'Enter') finish()
                if (event.key === 'Escape') onDone(undefined)
            }}
            className="h-7 px-1.5"
        />
    )
}

/**
 * The conversations beside a chat, newest first and grouped under Pinned, Today and Earlier, with
 * the current one marked. A conversation's menu (its button, shown on hover, or a right-click)
 * renames it in place, pins or unpins it, and deletes it once a dialog has asked; the pin is also a
 * button on the row. A `DataTable` list with row groups draws it, so the groups fold and the keys
 * move through it.
 *
 * Without `onRename`, `onPin` or `onDelete` that action is not offered. Times are read against
 * `now`, which a story fixes.
 */
export function ConversationHistory({
    conversations,
    current,
    onSelect,
    onRename,
    onPin,
    onDelete,
    now = Date.now(),
    formatTime = conversationTime,
    defaultRenaming,
    defaultDeleting,
    framed = true,
    className,
    words: given,
}: {
    conversations: readonly ConversationEntry[]
    /** The id of the conversation shown in the chat. */
    current?: string
    onSelect?: (id: string) => void
    onRename?: (id: string, title: string) => void
    onPin?: (id: string, pinned: boolean) => void
    onDelete?: (id: string) => void
    /** The instant the groups and times are read against, in milliseconds since the epoch. */
    now?: number
    /** A conversation's time as shown, given the instant it is read against. */
    formatTime?: (time: number, now: number) => string
    /** The id of a conversation whose title is being changed at first. */
    defaultRenaming?: string
    /** The id of a conversation whose delete dialog is open at first. */
    defaultDeleting?: string
    /** A box with a border all round; `false` for a column of its own at a window's edge, with a rule at its end. */
    framed?: boolean
    className?: string
    words?: Partial<ConversationHistoryWords>
}) {
    const words = { ...CONVERSATION_HISTORY_WORDS, ...given }
    const [renaming, setRenaming] = useState(defaultRenaming)
    const [deleting, setDeleting] = useState(defaultDeleting)
    const doomed = conversations.find((entry) => entry.id === deleting)
    const rows = [...conversations].sort((a, b) => b.time - a.time)

    const columns: DataColumn<ConversationEntry>[] = [
        {
            id: 'title',
            header: words.title,
            width: 'minmax(0,1fr)',
            cell: (entry) =>
                entry.id === renaming ? (
                    <RenameField
                        entry={entry}
                        label={words.title}
                        onDone={(title) => {
                            setRenaming(undefined)
                            if (title !== undefined) onRename?.(entry.id, title)
                        }}
                    />
                ) : (
                    <span className={cn(entry.id === current && 'font-medium')}>{entry.title}</span>
                ),
        },
        {
            id: 'time',
            header: '',
            width: 'auto',
            align: 'end',
            cell: (entry) => <span className="text-xs text-muted-foreground">{formatTime(entry.time, now)}</span>,
        },
    ]

    const actions = (entry: ConversationEntry): DataAction[] => {
        const pinned = entry.pinned === true
        const list: DataAction[] = []
        if (onPin !== undefined)
            list.push({
                id: 'pin',
                label: pinned ? words.unpin : words.pin,
                icon: pinned ? <PinOff /> : <Pin />,
                inline: true,
                onSelect: () => onPin(entry.id, !pinned),
            })
        if (onRename !== undefined)
            list.push({ id: 'rename', label: words.rename, icon: <PencilLine />, onSelect: () => setRenaming(entry.id) })
        if (onDelete !== undefined) {
            if (list.length > 0) list.push({ id: 'line', separator: true })
            list.push({ id: 'delete', label: words.delete, icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(entry.id) })
        }
        return list
    }

    const labels: Record<string, string> = { pinned: words.pinned, today: words.today, earlier: words.earlier }
    return (
        <>
            <DataTable
                variant="list"
                columnHeads={false}
                stackBelow={false}
                resizable={false}
                className={cn(!framed && 'rounded-none border-y-0 border-l-0', className)}
                columns={columns}
                rows={rows}
                rowKey={(entry) => entry.id}
                groupBy={(entry) => conversationGroup(entry, now)}
                groupOrder={['pinned', 'today', 'earlier']}
                groupLabel={(key) => labels[key] ?? key}
                onOpen={(entry) => {
                    if (entry.id !== renaming) onSelect?.(entry.id)
                }}
                opened={(entry) => entry.id === current}
                rowActions={onRename === undefined && onPin === undefined && onDelete === undefined ? undefined : actions}
                actionButton="hover"
                words={{ empty: words.empty }}
            />
            <ConfirmDialog
                open={doomed !== undefined}
                onOpenChange={(open) => {
                    if (!open) setDeleting(undefined)
                }}
                question={words.deleteQuestion(doomed?.title ?? '')}
                detail={words.deleteDetail}
                confirm={{
                    label: words.delete,
                    destructive: true,
                    onConfirm: () => {
                        if (doomed !== undefined) onDelete?.(doomed.id)
                        setDeleting(undefined)
                    },
                }}
            />
        </>
    )
}
