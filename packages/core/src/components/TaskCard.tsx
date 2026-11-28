import { ArrowRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { useClock } from '../hooks/use-clock'
import { cn } from '../lib/cn'
import type { StatusMap } from '../lib/status'
import { useWords, type WordsPart } from '../lib/words'
import { DescriptionList, type Description } from './DescriptionList'
import { ConfirmDialog } from './DialogShell'
import { StatusChip } from './StatusChip'
import { Button } from './ui/button'

/** Where a task stands: waiting to start, under way, held, finished, or given up on. */
export type TaskState = 'pending' | 'executing' | 'paused' | 'done' | 'failed'

/** Every task state, in the order a task moves through them. */
export const TASK_STATES: readonly TaskState[] = ['pending', 'executing', 'paused', 'done', 'failed']

/** One end of a task's line: what it is called, and a glyph saying what it is. */
export interface TaskEnd {
    name: ReactNode
    /** Drawn before the name, such as a `TrackGlyph`. */
    glyph?: ReactNode
}

/** A question asked before an action runs, for one that cannot be taken back. */
export interface TaskActionConfirm {
    /** The dialog's title, the question itself ("Cancel Follow Contact 14?"). */
    question: ReactNode
    /** One line on what the answer does. */
    detail?: ReactNode
    /** The answer's label; the action's own by default. */
    label?: string
}

/** One thing to do with a task, as a button in its row of actions. */
export interface TaskAction {
    label: string
    onSelect: () => void
    icon?: ReactNode
    /** The main action, drawn filled. */
    primary?: boolean
    /** Drawn in the critical tone, for an action that ends the task. */
    destructive?: boolean
    /** Asks first; a destructive action with no `confirm` runs at once. */
    confirm?: TaskActionConfirm
    /** Why it cannot run now; the button stays and says so. */
    reason?: string
    busy?: boolean
}

export interface TaskCardWords {
    pending: string
    executing: string
    paused: string
    done: string
    failed: string
    /** What the elapsed time is called, for a screen reader and its tooltip. */
    elapsed: string
    /** Read between the line's two ends. */
    to: string
    /** The confirm dialog's Cancel, which keeps the task as it is. */
    keep: string
}

export const TASK_CARD_WORDS: TaskCardWords = {
    pending: 'pending',
    executing: 'executing',
    paused: 'paused',
    done: 'done',
    failed: 'failed',
    elapsed: 'Elapsed',
    to: 'to',
    keep: 'Keep',
}

/** Where a catalog holds a task card's words. */
export const TASK_CARD_PART: WordsPart<TaskCardWords> = { id: 'taskCard', words: TASK_CARD_WORDS }

/** The task states as a status map, each in its tone: pending quiet, executing live, paused warning, done good, failed critical. */
export function taskStatuses(words: TaskCardWords = TASK_CARD_WORDS): StatusMap {
    return {
        pending: { label: words.pending, color: 'pending' },
        executing: { label: words.executing, color: 'running', live: true },
        paused: { label: words.paused, color: 'warning' },
        done: { label: words.done, color: 'good' },
        failed: { label: words.failed, color: 'critical' },
    }
}

/** An elapsed time as a clock reads it: `4:07` under an hour, `1:04:07` past one, never below zero. */
export function formatElapsed(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000))
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60
    const two = (value: number) => String(value).padStart(2, '0')
    return hours > 0 ? `${String(hours)}:${two(minutes)}:${two(seconds)}` : `${String(minutes)}:${two(seconds)}`
}

/** A time: a `Date`, milliseconds since the epoch, or an ISO 8601 text. */
export type TaskTime = Date | number | string

function msOf(time: TaskTime | undefined): number | undefined {
    if (time === undefined) return undefined
    const ms = time instanceof Date ? time.getTime() : typeof time === 'number' ? time : Date.parse(time)
    return Number.isNaN(ms) ? undefined : ms
}

export interface TaskCardProps {
    /** What the task is, such as "Follow" or "Investigate". */
    title: ReactNode
    /** Its id, in the code face after the title. */
    code?: string
    state: TaskState
    /** When it started; its elapsed time counts from here. */
    startedAt?: TaskTime
    /** When it ended; its elapsed time stops here. */
    endedAt?: TaskTime
    /** The moment its elapsed time counts to while it runs; without it, a clock shared by every card. */
    now?: TaskTime
    /** Its elapsed time in milliseconds, in place of `startedAt`. */
    elapsed?: number
    /** Who or what does it, the line's start. */
    from?: TaskEnd
    /** What it is done to, the line's end. */
    to?: TaskEnd
    /** Facts about it in one wrapping line: its priority, who set it, its area. */
    facts?: readonly Description[]
    /** Its actions, as a row of buttons at its foot. */
    actions?: readonly TaskAction[]
    /** Draws it as the task chosen. */
    selected?: boolean
    words?: Partial<TaskCardWords>
    className?: string
}

/**
 * One task: what it is and its state as a chip in its tone (pending, executing, paused, done,
 * failed), its elapsed time at the head's end, ticking on a shared clock while it executes, a line
 * from who does it to what it is done to, each with its glyph, optional facts, and a row of actions.
 * A destructive action asks first when it has a `confirm`, in a dialog whose Cancel keeps the task.
 * The words are generic so a fleet, an incident board or a delivery app says the same: investigate,
 * follow, report.
 */
export function TaskCard({
    title,
    code,
    state,
    startedAt,
    endedAt,
    now: given,
    elapsed: fixedElapsed,
    from,
    to,
    facts,
    actions,
    selected = false,
    words: givenWords,
    className,
}: TaskCardProps) {
    const words = useWords(TASK_CARD_PART, givenWords)
    const start = msOf(startedAt)
    const end = msOf(endedAt)
    const fixedNow = msOf(given)
    const ticking =
        fixedElapsed === undefined && start !== undefined && end === undefined && fixedNow === undefined && state === 'executing'
    const clock = useClock(ticking ? 1000 : null)
    const until = end ?? fixedNow ?? clock?.getTime() ?? Date.now()
    const elapsed = fixedElapsed ?? (start === undefined ? undefined : until - start)
    const [asking, setAsking] = useState<TaskAction | null>(null)
    return (
        <article
            data-slot="task-card"
            data-state={state}
            data-selected={selected || undefined}
            className={cn(
                'flex min-w-0 flex-col gap-2 rounded-surface border border-border bg-card p-3 text-sm text-card-foreground',
                selected && 'border-primary ring-1 ring-primary',
                className,
            )}
        >
            <header className="flex min-w-0 items-center gap-2">
                <h3 className="min-w-0 truncate font-medium">{title}</h3>
                {code !== undefined && <span className="min-w-0 shrink-[2] truncate font-mono text-xs text-muted-foreground">{code}</span>}
                <StatusChip status={state} statuses={taskStatuses(words)} dot className="shrink-0" />
                {elapsed !== undefined && (
                    <span
                        data-slot="task-card-elapsed"
                        title={words.elapsed}
                        className="ms-auto shrink-0 font-mono text-xs text-muted-foreground tabular-nums"
                    >
                        <span className="sr-only">{words.elapsed} </span>
                        {formatElapsed(elapsed)}
                    </span>
                )}
            </header>
            {(from !== undefined || to !== undefined) && (
                <p data-slot="task-card-line" className="flex min-w-0 items-center gap-2">
                    {from !== undefined && <TaskEndName end={from} />}
                    {from !== undefined && to !== undefined && (
                        <>
                            <ArrowRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="sr-only"> {words.to} </span>
                        </>
                    )}
                    {to !== undefined && <TaskEndName end={to} />}
                </p>
            )}
            {facts !== undefined && facts.length > 0 && <DescriptionList items={facts} layout="row" size="sm" />}
            {actions !== undefined && actions.length > 0 && (
                <div data-slot="task-card-actions" className="flex flex-wrap items-center gap-2 pt-1">
                    {actions.map((action) => (
                        <Button
                            key={action.label}
                            size="sm"
                            variant={action.destructive === true ? 'destructive' : action.primary === true ? 'default' : 'outline'}
                            reason={action.reason}
                            busy={action.busy}
                            onClick={() => (action.confirm === undefined ? action.onSelect() : setAsking(action))}
                        >
                            {action.icon}
                            {action.label}
                        </Button>
                    ))}
                </div>
            )}
            {asking?.confirm !== undefined && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) setAsking(null)
                    }}
                    question={asking.confirm.question}
                    detail={asking.confirm.detail}
                    confirm={{
                        label: asking.confirm.label ?? asking.label,
                        destructive: asking.destructive,
                        onConfirm: () => {
                            asking.onSelect()
                            setAsking(null)
                        },
                    }}
                    words={{ cancel: words.keep }}
                />
            )}
        </article>
    )
}

function TaskEndName({ end }: { end: TaskEnd }) {
    return (
        <span className="flex min-w-0 items-center gap-1.5">
            {end.glyph}
            <span className="min-w-0 truncate">{end.name}</span>
        </span>
    )
}
