import { DataTable, type DataAction, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { FilterChip } from '@winterop-com/sokkel-ui/FilterChip'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Sparkline } from '@winterop-com/sokkel-ui/Stat'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { ExternalLinkIcon, Pause, Play, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { go } from 'tidevann-shared/router'
import { useActions } from '../actions'
import { clock, counted, PROJECTS, type Job } from '../model'
import { NewJobDialog } from '../NewJobDialog'
import { When } from '../parts'
import { nextFire, saySchedule } from '../schedule'
import { useConsole, type LiveRun } from '../state'

/** The sparkline's step: twelve of them span the two days of runs the console starts with. */
const STEP = 4 * 3_600_000

interface JobRow extends Job {
    last: LiveRun | undefined
    next: number | null
    /** Runs every four hours over the last two days, oldest first. */
    recent: number[]
    success: number | null
}

/** Every job: its schedule and next run, its last run and how the last two days went; a job opens on its page. */
export function Jobs() {
    const { jobs, runs, now, prefs, loading } = useConsole()
    const actions = useActions()
    const [query, setQuery] = useState('')
    const [projects, setProjects] = useState<string[]>([])
    const [making, setMaking] = useState(false)

    const rows = useMemo((): JobRow[] => {
        return jobs.map((job) => {
            const own = runs.filter((run) => run.job === job.id)
            const done = own.filter((run) => run.at.state === 'succeeded' || run.at.state === 'failed')
            return {
                ...job,
                last: own[0],
                next: job.schedule === null || job.paused ? null : nextFire(job.schedule, now),
                recent: Array.from({ length: 12 }, (_, index) => {
                    const from = now - (12 - index) * STEP
                    return own.filter((run) => run.created > from && run.created <= from + STEP).length
                }),
                success: done.length === 0 ? null : done.filter((run) => run.at.state === 'succeeded').length / done.length,
            }
        })
    }, [jobs, runs, now])
    const shown = rows.filter(
        (job) =>
            (projects.length === 0 || projects.includes(job.project)) &&
            `${job.id} ${job.name} ${job.owner}`.toLowerCase().includes(query.trim().toLowerCase()),
    )

    const columns: DataColumn<JobRow>[] = [
        {
            id: 'job',
            header: 'Job',
            width: 'minmax(13rem,1.4fr)',
            cell: (job) => (
                <span className="flex min-w-0 flex-col">
                    <span className="truncate">{job.name}</span>
                    <span className="truncate font-mono text-xs text-muted-foreground">{job.id}</span>
                </span>
            ),
            sortValue: (job) => job.name,
        },
        { id: 'project', header: 'Project', width: '6.5rem', cell: (job) => job.project, sortValue: (job) => job.project },
        { id: 'owner', header: 'Owner', width: '6.5rem', cell: (job) => job.owner, sortValue: (job) => job.owner },
        {
            id: 'schedule',
            header: 'Schedule',
            width: 'minmax(10rem,1fr)',
            cell: (job) =>
                job.paused ? <StatusChip status="paused" /> : <span className="text-muted-foreground">{saySchedule(job.schedule)}</span>,
            sortValue: (job) => (job.paused ? 'zz' : saySchedule(job.schedule)),
        },
        {
            id: 'next',
            header: 'Next run',
            width: '6.5rem',
            cell: (job) =>
                job.next === null ? (
                    <span className="text-muted-foreground">-</span>
                ) : (
                    <span className="tabular-nums">{clock(job.next)}</span>
                ),
            sortValue: (job) => job.next ?? Number.POSITIVE_INFINITY,
        },
        {
            id: 'last',
            header: 'Last run',
            width: '11rem',
            cell: (job) =>
                job.last === undefined ? (
                    <span className="text-muted-foreground">Never</span>
                ) : (
                    <span className="flex items-center gap-2">
                        <StatusChip status={job.last.at.state} />
                        <span className="text-muted-foreground">
                            <When at={job.last.created} now={now} times={prefs.times} />
                        </span>
                    </span>
                ),
            sortValue: (job) => job.last?.created ?? 0,
        },
        {
            id: 'recent',
            header: '2 days',
            width: '6rem',
            cell: (job) => <Sparkline values={job.recent} height={16} label={`${job.name}, runs every four hours over two days`} />,
        },
        {
            id: 'success',
            header: 'Succeeded',
            width: '6rem',
            align: 'end',
            cell: (job) => <span className="tabular-nums">{job.success === null ? '-' : `${String(Math.round(job.success * 100))}%`}</span>,
            sortValue: (job) => job.success ?? -1,
        },
    ]

    const menu = (job: JobRow): DataAction[] => [
        { id: 'open', label: 'Open', icon: <ExternalLinkIcon />, onSelect: () => go(`/jobs/${job.id}`) },
        { id: 'run', label: 'Run now', icon: <Play />, onSelect: () => actions.runNow(job) },
        {
            id: 'pause',
            label: job.paused ? 'Resume' : 'Pause',
            icon: job.paused ? <Play /> : <Pause />,
            disabled: job.schedule === null,
            onSelect: () => actions.togglePause(job),
        },
        { id: 'line', separator: true },
        { id: 'delete', label: 'Delete', icon: <Trash2 />, destructive: true, onSelect: () => actions.remove(job) },
    ]

    return (
        <>
            <PageHeader
                title="Jobs"
                count={counted(jobs.length, 'job')}
                actions={
                    <Button size="sm" onClick={() => setMaking(true)}>
                        <Plus aria-hidden />
                        New
                    </Button>
                }
            />
            <DataTable
                className="min-h-0 flex-1"
                columns={columns}
                rows={shown}
                rowKey={(job) => job.id}
                loading={loading}
                rowHeight="auto"
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                toolbar={
                    <FilterChip
                        facet="Project"
                        options={PROJECTS.map((value) => ({ value }))}
                        multiple
                        selected={projects}
                        onSelectedChange={setProjects}
                    />
                }
                rowActions={menu}
                onOpen={(job) => go(`/jobs/${job.id}`)}
                words={{ rows: (count) => counted(count, 'job') }}
                minWidth="56rem"
            />
            <NewJobDialog open={making} onOpenChange={setMaking} />
        </>
    )
}
