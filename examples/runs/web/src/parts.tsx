/** The pieces several pages draw a run with: its time, its columns, its menu and its steps. */

import type { DataAction, DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import type { TimelineEvent } from '@winterop-com/sokkel-ui/Timeline'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { CopyIcon, ExternalLinkIcon, PanelRightOpen, RotateCcwIcon, XIcon } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import type { Actions } from './actions'
import { sayBy, stamp, took } from './model'
import type { LiveRun } from './state'
import { isLive } from './timeline'

/** A moment as the person prefers to read it: how long ago, or on the UTC clock. */
export function When({ at, now, times }: { at: number; now: number; times: 'relative' | 'clock' }) {
    if (times === 'clock') return <span className="tabular-nums">{stamp(at)}</span>
    return <RelativeTime date={at} now={new Date(now)} length="short" />
}

/** The columns of a listing of runs; `job` leaves out the job's own column on its page. */
export function runColumns(now: number, times: 'relative' | 'clock', { job = true } = {}): DataColumn<LiveRun>[] {
    const columns: DataColumn<LiveRun>[] = [
        {
            id: 'id',
            header: 'Run',
            width: '8.5rem',
            cell: (run) => <span className="font-mono">{run.id}</span>,
            sortValue: (run) => run.id,
        },
        {
            id: 'job',
            header: 'Job',
            width: 'minmax(10rem,1fr)',
            cell: (run) => <span className="font-mono">{run.job}</span>,
            sortValue: (run) => run.job,
        },
        { id: 'project', header: 'Project', width: '6.5rem', cell: (run) => run.project, sortValue: (run) => run.project },
        {
            id: 'state',
            header: 'State',
            width: '7.5rem',
            cell: (run) => <StatusChip status={run.at.state} />,
            sortValue: (run) => run.at.state,
        },
        {
            id: 'step',
            header: 'Step',
            width: '8rem',
            cell: (run) => <span className="font-mono text-muted-foreground">{run.at.step ?? '-'}</span>,
            sortValue: (run) => run.at.step ?? '',
        },
        {
            id: 'by',
            header: 'Started by',
            width: '7.5rem',
            cell: (run) => <span className="text-muted-foreground">{sayBy(run)}</span>,
            sortValue: (run) => run.by,
        },
        {
            id: 'started',
            header: 'Started',
            width: '7.5rem',
            cell: (run) => <When at={run.created} now={now} times={times} />,
            sortValue: (run) => run.created,
        },
        {
            id: 'duration',
            header: 'Duration',
            width: '6rem',
            align: 'end',
            cell: (run) => <span className="tabular-nums">{run.at.state === 'skipped' ? '-' : took(run.at.duration)}</span>,
            sortValue: (run) => run.at.duration,
        },
    ]
    return job ? columns : columns.filter((column) => column.id !== 'job' && column.id !== 'project')
}

/** What a run's menu offers, from its row or its page. */
export function runMenu(run: LiveRun, actions: Actions, { page = true } = {}): DataAction[] {
    const live = isLive(run.at.state)
    return [
        { id: 'open', label: 'Open', icon: <PanelRightOpen />, onSelect: () => actions.open(run) },
        ...(page ? [{ id: 'page', label: 'Open page', icon: <ExternalLinkIcon />, onSelect: () => go(`/runs/${run.id}`) }] : []),
        { id: 'retry', label: 'Retry', icon: <RotateCcwIcon />, disabled: live, onSelect: () => actions.retry(run) },
        {
            id: 'copy',
            label: 'Copy run ID',
            icon: <CopyIcon />,
            onSelect: () =>
                void navigator.clipboard.writeText(run.id).then(
                    () => toast.add({ title: 'Copied', description: run.id }),
                    () => toast.add({ type: 'error', title: 'Could not copy', description: 'The browser kept the clipboard closed.' }),
                ),
        },
        { id: 'line', separator: true },
        { id: 'cancel', label: 'Cancel run', icon: <XIcon />, destructive: true, disabled: !live, onSelect: () => actions.cancel(run) },
    ]
}

/** A run's steps as a timeline: each step's state, how long it took, and when it started. */
export function stepEvents(run: LiveRun): TimelineEvent[] {
    return run.at.steps.map((step) => ({
        id: step.code,
        title: <span className="font-mono">{step.code}</span>,
        detail:
            step.status === 'failed'
                ? run.error
                : step.status === 'running'
                  ? `${String(Math.round((step.progress ?? 0) * 100))}% done`
                  : step.kind,
        at: step.duration_ms === undefined ? step.status : took(step.duration_ms),
        tone: step.status,
    }))
}
