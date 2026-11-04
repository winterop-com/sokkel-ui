import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bell, Check, CircleAlert, Pause, Play, Trash2, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Banner } from '../../components/Banner'
import { StatusChip, type Status } from '../../components/StatusChip'
import { StatusItem, StatusLine } from '../../components/StatusLine'
import { Button } from '../../components/ui/button'
import { Kbd } from '../../components/ui/kbd'
import {
    Toast,
    ToastAction,
    ToastClose,
    ToastContent,
    ToastDescription,
    ToastPortal,
    ToastProvider,
    ToastTitle,
    ToastViewport,
    createToastManager,
    useToastManager,
} from '../../components/ui/toast'
import { cn } from '../../lib/cn'

interface Job {
    code: string
    schedule: string
    status: Status
    label?: string
}

const JOBS: Job[] = [
    { code: 'nightly-export', schedule: 'Every day at 02:00 UTC', status: 'succeeded' },
    { code: 'weekly-digest', schedule: 'Every Monday at 07:00 UTC', status: 'succeeded' },
    { code: 'report-sync', schedule: 'Every 15 minutes', status: 'running' },
    { code: 'archive-sweep', schedule: 'Every Sunday at 03:00 UTC', status: 'skipped' },
]

/** A small window of the app: its top bar, a body, and an optional foot strip, for one pattern to sit in. */
function Frame({
    top,
    foot,
    children,
    frame,
}: {
    top?: ReactNode
    foot?: ReactNode
    children: ReactNode
    frame?: React.RefObject<HTMLDivElement | null>
}) {
    return (
        <div ref={frame} className="relative flex h-80 min-w-0 flex-col overflow-hidden rounded-xl border bg-background shadow-surface">
            <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-border-strong bg-sidebar px-3 text-xs">
                <span className="font-medium">atlas</span>
                <span className="text-faint">/</span>
                <span className="text-muted-foreground">Jobs</span>
                <div className="flex-1" />
                {top}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
            {foot !== undefined && (
                <div className="flex h-9 shrink-0 items-center border-t border-border-strong bg-sidebar px-3">{foot}</div>
            )}
        </div>
    )
}

function Rows({ jobs, onDelete }: { jobs: Job[]; onDelete?: (code: string) => void }) {
    return (
        <ul className="divide-y">
            {jobs.map((job) => (
                <li key={job.code} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm">{job.code}</p>
                        <p className="truncate text-xs text-muted-foreground">{job.schedule}</p>
                    </div>
                    <StatusChip status={job.status} label={job.label} />
                    {onDelete !== undefined && (
                        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${job.code}`} onClick={() => onDelete(job.code)}>
                            <Trash2 aria-hidden />
                        </Button>
                    )}
                </li>
            ))}
        </ul>
    )
}

/** One pattern: its number and name, what it is for, the frame, and how it behaves. */
function Pattern({ n, title, use, notes, children }: { n: number; title: string; use: string; notes: string[]; children: ReactNode }) {
    return (
        <section className="flex min-w-0 flex-col gap-3">
            <header className="flex items-start gap-2.5 px-4 sm:px-0">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-xs font-medium text-primary-foreground">
                    {n}
                </span>
                <div className="min-w-0">
                    <h2 className="text-base leading-6 font-medium">{title}</h2>
                    <p className="text-sm text-muted-foreground">{use}</p>
                </div>
            </header>
            <div className="px-4 sm:px-0">{children}</div>
            <ul className="flex flex-col gap-1.5 px-4 text-sm sm:px-0">
                {notes.map((note) => (
                    <li key={note} className="flex gap-2 text-pretty">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-faint" aria-hidden />
                        {note}
                    </li>
                ))}
            </ul>
        </section>
    )
}

/* ------------------------------------------------------------------------------------------------
 * 1. A toast with Undo.
 * --------------------------------------------------------------------------------------------- */

function FrameToasts() {
    const { toasts } = useToastManager()
    return toasts.map((item) => (
        <Toast key={item.id} toast={item}>
            <ToastContent className="gap-3 p-3">
                <Trash2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <ToastTitle />
                    <ToastDescription className="text-xs" />
                </div>
                <ToastAction />
                <ToastClose />
            </ToastContent>
        </Toast>
    ))
}

function UndoToast() {
    const [manager] = useState(() => createToastManager())
    const frame = useRef<HTMLDivElement>(null)
    const [jobs, setJobs] = useState(() => JOBS.filter((job) => job.code !== 'weekly-digest'))
    const remove = (code: string, timeout: number) => {
        const job = JOBS.find((one) => one.code === code)
        if (job === undefined) return
        setJobs((was) => was.filter((one) => one.code !== code))
        const id = `deleted-${code}`
        manager.add({
            id,
            timeout,
            title: `${code} deleted`,
            description: 'Its 48 runs went with it.',
            actionProps: {
                children: (
                    <>
                        Undo
                        <Kbd className="-mr-1 hidden sm:inline-flex">⌘Z</Kbd>
                    </>
                ),
                onClick: () => {
                    setJobs((was) => JOBS.filter((one) => one.code === code || was.some((kept) => kept.code === one.code)))
                    manager.close(id)
                },
            },
        })
    }
    useEffect(() => {
        manager.add({
            id: 'deleted-weekly-digest',
            timeout: 0,
            title: 'weekly-digest deleted',
            description: 'Its 48 runs went with it.',
            actionProps: {
                children: (
                    <>
                        Undo
                        <Kbd className="-mr-1 hidden sm:inline-flex">⌘Z</Kbd>
                    </>
                ),
                onClick: () => {
                    setJobs(JOBS)
                    manager.close('deleted-weekly-digest')
                },
            },
        })
        return () => manager.close('deleted-weekly-digest')
    }, [manager])
    return (
        <ToastProvider toastManager={manager}>
            <Frame frame={frame}>
                <Rows jobs={jobs} onDelete={(code) => remove(code, 8000)} />
            </Frame>
            <ToastPortal container={frame}>
                <ToastViewport className="absolute inset-x-3 bottom-3 sm:right-3 sm:left-auto sm:w-96">
                    <FrameToasts />
                </ToastViewport>
            </ToastPortal>
        </ToastProvider>
    )
}

/* ------------------------------------------------------------------------------------------------
 * 2. A banner that holds while a state does.
 * --------------------------------------------------------------------------------------------- */

function HeldBanner() {
    const [retrying, setRetrying] = useState(false)
    const held = (job: Job): Job =>
        job.code === 'nightly-export' || job.code === 'weekly-digest' ? { ...job, status: 'waiting', label: 'held' } : job
    return (
        <Frame>
            <Banner
                tone="warning"
                actions={
                    <Button
                        size="sm"
                        variant="outline"
                        aria-disabled={retrying || undefined}
                        onClick={() => {
                            setRetrying(true)
                            window.setTimeout(() => setRetrying(false), 1200)
                        }}
                    >
                        {retrying ? 'Retrying…' : 'Retry now'}
                    </Button>
                }
            >
                <span className="font-mono">hooks.example.org</span> is not answering; 2 jobs held
            </Banner>
            <Rows jobs={JOBS.map(held)} />
        </Frame>
    )
}

/* ------------------------------------------------------------------------------------------------
 * 3. A note in the status strip.
 * --------------------------------------------------------------------------------------------- */

function StripNote() {
    const [saving, setSaving] = useState(false)
    const [at, setAt] = useState('14:02')
    const [paused, setPaused] = useState(false)
    const save = (next: boolean) => {
        setPaused(next)
        setSaving(true)
        window.setTimeout(() => {
            setSaving(false)
            setAt((was) => (was === '14:02' ? '14:03' : '14:04'))
        }, 900)
    }
    const rows: [string, ReactNode][] = [
        ['Schedule', 'Every day at 02:00 UTC'],
        ['Endpoint', <span className="font-mono">https://hooks.example.org/atlas/export</span>],
        ['Timeout', '15 minutes'],
    ]
    return (
        <Frame
            foot={
                <StatusLine
                    tone={saving ? 'live' : 'quiet'}
                    live={saving}
                    note={
                        <span role="status" className="flex items-center gap-1.5">
                            {!saving && <Check className="size-3.5" aria-hidden />}
                            {saving ? 'Saving' : `Saved at ${at}`}
                        </span>
                    }
                >
                    <StatusItem label="job" code>
                        nightly-export
                    </StatusItem>
                    <span className="hidden sm:inline">
                        <StatusItem>3 changes today</StatusItem>
                    </span>
                </StatusLine>
            }
        >
            <div className="flex flex-col gap-3 p-3">
                <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-mono text-sm">nightly-export</p>
                    <Button size="sm" variant="outline" onClick={() => save(!paused)}>
                        {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
                        {paused ? 'Resume' : 'Pause'}
                    </Button>
                </div>
                <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                    {rows.map(([term, value]) => (
                        <div key={term} className="contents">
                            <dt className="text-muted-foreground">{term}</dt>
                            <dd className="truncate">{value}</dd>
                        </div>
                    ))}
                    <dt className="text-muted-foreground">State</dt>
                    <dd>
                        <StatusChip status={paused ? 'waiting' : 'succeeded'} label={paused ? 'paused' : 'active'} />
                    </dd>
                </dl>
            </div>
        </Frame>
    )
}

/* ------------------------------------------------------------------------------------------------
 * 4. The activity list: what happened while the person was away.
 * --------------------------------------------------------------------------------------------- */

interface Event {
    id: string
    icon: LucideIcon
    ink: string
    text: ReactNode
    when: string
    action?: string
    unread: boolean
}

const EVENTS: Event[] = [
    {
        id: 'failed',
        icon: CircleAlert,
        ink: 'text-critical-ink',
        text: (
            <>
                <span className="font-mono">nightly-export</span> failed 3 runs in a row
            </>
        ),
        when: '2 hours ago',
        action: 'Open',
        unread: true,
    },
    {
        id: 'mention',
        icon: Bell,
        ink: 'text-info-ink',
        text: (
            <>
                grace mentioned you on <span className="font-mono">report-sync</span>
            </>
        ),
        when: '12 minutes ago',
        action: 'Reply',
        unread: true,
    },
    {
        id: 'deleted',
        icon: Trash2,
        ink: 'text-muted-foreground',
        text: (
            <>
                You deleted <span className="font-mono">weekly-digest</span>
            </>
        ),
        when: 'Yesterday',
        action: 'Restore',
        unread: false,
    },
    {
        id: 'resumed',
        icon: Play,
        ink: 'text-muted-foreground',
        text: (
            <>
                ada resumed <span className="font-mono">archive-sweep</span>
            </>
        ),
        when: 'Yesterday',
        unread: false,
    },
]

function Activity() {
    const [events, setEvents] = useState(EVENTS)
    const [open, setOpen] = useState(true)
    const unread = events.filter((event) => event.unread).length
    return (
        <Frame
            top={
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={unread > 0 ? `Activity, ${unread} unread` : 'Activity'}
                    aria-expanded={open}
                    className="relative"
                    onClick={() => setOpen((was) => !was)}
                >
                    <Bell aria-hidden />
                    {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] leading-none font-semibold text-white">
                            {unread}
                        </span>
                    )}
                </Button>
            }
        >
            <Rows jobs={JOBS} />
            {open && (
                <div className="absolute top-11 right-2 bottom-2 left-2 z-10 flex flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-pop ring-1 ring-foreground/10 sm:left-auto sm:w-84">
                    <div className="flex items-center gap-2 border-b px-3 py-2">
                        <p className="flex-1 text-sm font-medium">Activity</p>
                        <Button
                            variant="ghost"
                            size="xs"
                            aria-disabled={unread === 0 || undefined}
                            onClick={() => setEvents((was) => was.map((event) => ({ ...event, unread: false })))}
                        >
                            Mark all read
                        </Button>
                    </div>
                    <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1">
                        {events.map((event) => {
                            const Icon = event.icon
                            return (
                                <li
                                    key={event.id}
                                    className={cn('flex items-start gap-2.5 rounded-md px-2 py-2', event.unread && 'bg-muted/60')}
                                >
                                    <Icon className={cn('mt-0.5 size-4 shrink-0', event.ink)} aria-hidden />
                                    <div className="min-w-0 flex-1">
                                        <p className={cn('text-sm leading-5', event.unread && 'font-medium')}>{event.text}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {event.when}
                                            {event.unread && <span className="sr-only">, unread</span>}
                                        </p>
                                    </div>
                                    {event.action !== undefined && (
                                        <Button
                                            variant="outline"
                                            size="xs"
                                            onClick={() =>
                                                setEvents((was) =>
                                                    was.map((one) => (one.id === event.id ? { ...one, unread: false } : one)),
                                                )
                                            }
                                        >
                                            {event.action}
                                        </Button>
                                    )}
                                    {event.unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-info" aria-hidden />}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
        </Frame>
    )
}

/* ------------------------------------------------------------------------------------------------ */

function Patterns() {
    return (
        <div className="min-h-svh bg-background py-6 text-foreground sm:px-6 lg:py-10">
            <div className="mx-auto flex max-w-6xl flex-col gap-8">
                <header className="flex max-w-3xl flex-col gap-2 px-4 sm:px-0">
                    <h1 className="text-page leading-8 font-medium">Notification</h1>
                    <p className="text-pretty text-muted-foreground">
                        Validation stays on the form it is about, and a form’s refusal is never a toast. Everything else the app has to say
                        is one of four kinds, each with its own place, and none of them is the only record of what happened: every event a
                        toast reports is also in the activity list.
                    </p>
                </header>
                <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
                    <Pattern
                        n={1}
                        title="Toast with undo"
                        use="The result of what the person just did, when it can be taken back. After Gmail and Linear: no confirm dialog, an Undo instead."
                        notes={[
                            'Polite (role status) and never takes focus; it stays at least 8 seconds and holds while hovered or focused.',
                            'Undo also has a key, and the deletion stays restorable from the activity list after the toast has gone.',
                            'Never for an error the person must act on, and never the only place an event is told.',
                        ]}
                    >
                        <UndoToast />
                    </Pattern>
                    <Pattern
                        n={2}
                        title="Persistent banner"
                        use="A state that holds until it changes: a host not answering, a read-only instance. After Carbon’s and Atlassian’s banners."
                        notes={[
                            'One at a time, across the top of the screen it concerns, with the one action that helps.',
                            'An alert only when critical, else a polite status. It goes by itself when the state ends.',
                            'A dismiss hides it for this visit only; the state is still told where it shows, as the held chips here.',
                        ]}
                    >
                        <HeldBanner />
                    </Pattern>
                    <Pattern
                        n={3}
                        title="Status strip note"
                        use="What this screen is doing, said quietly: saved, saving, reconnecting. It replaces the “Saved” toast."
                        notes={[
                            'Short facts, never a sentence, on a strip that never grows. Press Pause to see it say Saving, then Saved.',
                            'Polite, and only for a change the person may want to know without looking.',
                            'Never for something that needs an answer; that is a banner or a dialog.',
                        ]}
                    >
                        <StripNote />
                    </Pattern>
                    <Pattern
                        n={4}
                        title="Activity list"
                        use="What happened while the person was away, or needs following up. After Linear’s inbox and Carbon’s notification panel."
                        notes={[
                            'A count on the bell; items stay until read, newest first, unread drawn stronger.',
                            'Each item carries its own way to act: open the failed job, reply, restore what was deleted.',
                            'The bell’s label says the count to a screen reader; arriving items are not announced.',
                        ]}
                    >
                        <Activity />
                    </Pattern>
                </div>
            </div>
        </div>
    )
}

/** The four ways the app tells a person something outside a form, each in a small window of the app. */
const meta: Meta = { title: 'Research/Notification' }
export default meta

export const SideBySide: StoryObj = { name: 'Side by side', render: () => <Patterns /> }
