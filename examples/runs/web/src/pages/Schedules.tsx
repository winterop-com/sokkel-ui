import { Banner } from '@winterop-com/sokkel-ui/Banner'
import { DataTable, type DataAction, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { FilterChip } from '@winterop-com/sokkel-ui/FilterChip'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { RunTimeline, type RunTimelineLane } from '@winterop-com/sokkel-ui/RunTimeline'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { ExternalLinkIcon, Pause, Play } from 'lucide-react'
import { useMemo, useState } from 'react'

import { go } from 'tidevann-shared/router'
import { useActions } from '../actions'
import { saveJob } from '../backend'
import { clock, counted, dayOf, sayDay, type Job } from '../model'
import { firesBetween, saySchedule, shiftSchedule } from '../schedule'
import { useConsole } from '../state'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

interface Fire {
    id: string
    job: Job
    at: number
    day: string
}

const SPANS = [
    { value: '24', label: '24 hours' },
    { value: '72', label: '3 days' },
    { value: '168', label: 'Week' },
]

/** The runs the schedules will start, by day, and the jobs whose schedules are paused. */
export function Schedules() {
    const { jobs, runs, now, prefs, setPrefs } = useConsole()
    const actions = useActions()
    const [span, setSpan] = useState('24')
    const [picked, setPicked] = useState<string[]>([])
    const minute = Math.floor(now / 60_000)

    const fires = useMemo(() => {
        const from = minute * 60_000
        const to = from + Number(span) * HOUR
        return jobs
            .filter((job) => job.schedule !== null && !job.paused && (picked.length === 0 || picked.includes(job.id)))
            .flatMap((job) =>
                job.schedule === null
                    ? []
                    : firesBetween(job.schedule, from, to).map((at) => ({ id: `${job.id}-${String(at)}`, job, at, day: dayOf(at) })),
            )
            .sort((left, right) => left.at - right.at)
    }, [jobs, minute, span, picked])
    const [chosen, setChosen] = useState<string | null>(null)
    // The timeline looks back half as far as it looks ahead, so the last runs stand beside the next.
    const timeline = useMemo(() => {
        const at = minute * 60_000
        const from = at - (Number(span) * HOUR) / 2
        const to = at + Number(span) * HOUR
        const lanes: RunTimelineLane[] = jobs
            .filter((job) => job.schedule !== null && (picked.length === 0 || picked.includes(job.id)))
            .map((job) => ({
                id: job.id,
                name: job.id,
                detail: job.paused ? 'Paused' : saySchedule(job.schedule),
                runs: [
                    ...runs
                        .filter((run) => run.job === job.id && (run.ended ?? at) >= from)
                        .map((run) => ({
                            id: run.id,
                            at: run.created,
                            end: run.ended ?? (run.state === 'running' ? at : undefined),
                            status: run.state,
                        })),
                    ...(job.schedule === null || job.paused
                        ? []
                        : firesBetween(job.schedule, at, to).map((fire) => ({ id: `${job.id}-${String(fire)}`, at: fire }))),
                ],
            }))
        return { from, to, at, lanes }
    }, [jobs, runs, minute, span, picked])
    const paused = jobs.filter((job) => job.paused && job.schedule !== null)
    const manual = jobs.filter((job) => job.schedule === null)
    const today = dayOf(now)

    const columns: DataColumn<Fire>[] = [
        {
            id: 'job',
            header: 'Job',
            width: 'minmax(12rem,1fr)',
            cell: (fire) => (
                <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate">{fire.job.name}</span>
                    <span className="truncate font-mono text-xs text-muted-foreground">{fire.job.id}</span>
                </span>
            ),
            sortValue: (fire) => fire.job.name,
        },
        {
            id: 'at',
            header: 'At',
            width: '5rem',
            cell: (fire) => <span className="tabular-nums">{clock(fire.at)}</span>,
            sortValue: (fire) => fire.at,
        },
        {
            id: 'schedule',
            header: 'Schedule',
            width: 'minmax(10rem,1fr)',
            cell: (fire) => <span className="text-muted-foreground">{saySchedule(fire.job.schedule)}</span>,
        },
        { id: 'project', header: 'Project', width: '6.5rem', cell: (fire) => fire.job.project, sortValue: (fire) => fire.job.project },
        {
            id: 'in',
            header: 'Starts',
            width: '7rem',
            align: 'end',
            cell: (fire) => <RelativeTime date={fire.at} now={new Date(now)} length="short" className="text-muted-foreground" />,
            sortValue: (fire) => fire.at,
        },
    ]
    const menu = (fire: Fire): DataAction[] => [
        { id: 'open', label: 'Open job', icon: <ExternalLinkIcon />, onSelect: () => go(`/jobs/${fire.job.id}`) },
        { id: 'run', label: 'Run now', icon: <Play />, onSelect: () => actions.runNow(fire.job) },
        { id: 'pause', label: 'Pause the schedule', icon: <Pause />, onSelect: () => actions.togglePause(fire.job) },
    ]
    const asideColumns: DataColumn<Job>[] = [
        { id: 'job', header: 'Job', width: 'minmax(10rem,1fr)', cell: (job) => <span className="font-mono">{job.id}</span> },
        {
            id: 'schedule',
            header: 'Schedule',
            width: 'minmax(10rem,1fr)',
            cell: (job) => <span className="text-muted-foreground">{saySchedule(job.schedule)}</span>,
        },
        {
            id: 'act',
            header: '',
            width: '6.5rem',
            align: 'end',
            cell: (job) =>
                job.schedule === null ? (
                    <Button size="xs" variant="outline" onClick={() => actions.runNow(job)}>
                        <Play aria-hidden />
                        Run now
                    </Button>
                ) : (
                    <Button size="xs" variant="outline" onClick={() => actions.togglePause(job)}>
                        <Play aria-hidden />
                        Resume
                    </Button>
                ),
        },
    ]

    return (
        <Stack gap="page" className="h-full min-h-0">
            <PageHeader
                title="Schedules"
                count={counted(fires.length, 'run') + ' ahead'}
                description="What the schedules will start, on the UTC clock."
                actions={<Segmented label="Ahead" value={span} onValueChange={setSpan} options={SPANS} />}
            />
            {!prefs.scheduler && (
                <Banner
                    tone="warning"
                    actions={
                        <Button size="sm" variant="outline" onClick={() => void setPrefs({ scheduler: true })}>
                            Turn on
                        </Button>
                    }
                >
                    The scheduler is off, so none of these will start until it is on again.
                </Banner>
            )}
            <RunTimeline
                lanes={timeline.lanes}
                from={timeline.from}
                to={timeline.to}
                now={timeline.at}
                timeZone="UTC"
                selected={chosen}
                onSelect={(id) => setChosen((current) => (current === id ? null : id))}
                snap={5 * MINUTE}
                onShift={({ lane, by }) => {
                    const job = jobs.find((entry) => entry.id === lane)
                    if (job?.schedule == null) return
                    const schedule = shiftSchedule(job.schedule, by)
                    // A schedule that fires every hour or quarter keeps only its minute, so a shift by whole periods leaves it as it was.
                    if (schedule.at === job.schedule.at && schedule.starts === job.schedule.starts) {
                        toast.add({
                            title: `${job.id} stays as it is`,
                            description: `${saySchedule(job.schedule)}: a shift by whole periods lands on the same times.`,
                        })
                        return
                    }
                    saveJob(job, { schedule }).then(
                        (saved) => toast.add({ title: `${job.id} moved`, description: saySchedule(saved.schedule) }),
                        (error: unknown) =>
                            toast.add({
                                type: 'error',
                                title: 'Could not move the schedule',
                                description: error instanceof Error ? error.message : String(error),
                            }),
                    )
                }}
            />
            {(paused.length > 0 || manual.length > 0) && (
                <Section title="Not on a schedule" meta={counted(paused.length + manual.length, 'job')} flush>
                    <DataTable
                        variant="list"
                        framed={false}
                        minWidth="auto"
                        columns={asideColumns}
                        rows={[...paused, ...manual]}
                        rowKey={(job) => job.id}
                        onOpen={(job) => go(`/jobs/${job.id}`)}
                    />
                </Section>
            )}
            <DataTable
                className="min-h-0 flex-1"
                columns={columns}
                rows={fires}
                rowKey={(fire) => fire.id}
                groupBy="day"
                groupLabel={(day) => sayDay(day, today)}
                toolbar={
                    <FilterChip
                        facet="Job"
                        options={jobs.filter((job) => job.schedule !== null).map((job) => ({ value: job.id }))}
                        multiple
                        selected={picked}
                        onSelectedChange={setPicked}
                    />
                }
                rowActions={menu}
                onOpen={(fire) => go(`/jobs/${fire.job.id}`)}
                words={{ rows: (count) => counted(count, 'run'), empty: 'No schedule fires in this span.' }}
                minWidth="40rem"
            />
        </Stack>
    )
}
