import { ChartPanel } from '@winterop-com/sokkel-ui-charts/dashboard/ChartPanel'
import { DashboardGrid, DashboardPanel } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import type { Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'
import { RefreshControl } from '@winterop-com/sokkel-ui/dashboard/TimeRange'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { useEffect, useMemo, useState } from 'react'

import { go } from 'tidevann-shared/router'
import { useActions } from '../actions'
import { runs as runStore } from '../backend'
import { clock, counted, STATES, took } from '../model'
import { When } from '../parts'
import { nextFire, saySchedule } from '../schedule'
import { useConsole, type LiveRun } from '../state'
import { isLive } from '../timeline'

const HOUR = 3_600_000
const SUCCESS: Threshold[] = [{ color: 'critical' }, { value: 85, color: 'warning' }, { value: 95, color: 'good' }]
const FAILURES: Threshold[] = [{ color: 'good' }, { value: 1, color: 'warning' }, { value: 10, color: 'critical' }]
const STATE_COLORS = Object.fromEntries(STATES.map((state) => [state, `status-${state}`]))

interface Fire {
    job: string
    name: string
    at: number
    schedule: string
}

const median = (values: readonly number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted.length === 0 ? null : (sorted[Math.floor(sorted.length / 2)] ?? null)
}

/** The console's front page: how the last day went, what is going now, what failed and what comes next. */
export function Overview() {
    const { runs, jobs, now, prefs } = useConsole()
    const actions = useActions()
    // The charts are built again once a minute, or when a run changes state, not with every tick of the clock.
    const minute = Math.floor(now / 60_000)
    const signature = runs.map((run) => `${run.id}:${run.at.state}`).join(',')
    const [refreshed, setRefreshed] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const [updated, setUpdated] = useState(now)
    const [every, setEvery] = useState(0)
    // A refresh asks the backend for the runs again and builds the panels from what it answers.
    const refresh = () => {
        setRefreshing(true)
        void runStore.list().finally(() => {
            setRefreshed((count) => count + 1)
            setUpdated(Date.now())
            setRefreshing(false)
        })
    }
    useEffect(() => {
        if (every === 0) return
        const timer = window.setInterval(() => {
            setRefreshed((count) => count + 1)
            setUpdated(Date.now())
        }, every * 1000)
        return () => window.clearInterval(timer)
    }, [every])

    const day = useMemo(() => {
        const end = (minute + 1) * 60_000
        const start = end - 24 * HOUR
        const recent = runs.filter((run) => run.created > start && run.created <= end)
        const hours = Array.from({ length: 24 }, (_, index) => clock(Math.floor((start + HOUR) / HOUR) * HOUR + index * HOUR))
        const hourOf = (at: number) => clock(Math.floor(at / HOUR) * HOUR)
        const perHour = hours.flatMap((hour) =>
            STATES.map((state) => ({
                hour,
                state,
                runs: recent.filter((run) => run.at.state === state && hourOf(run.created) === hour).length,
            })),
        )
        const finished = recent.filter((run) => run.at.state === 'succeeded' || run.at.state === 'failed')
        const failed = recent.filter((run) => run.at.state === 'failed')
        const byJob = jobs.map((job) => ({ job: job.id, failures: failed.filter((run) => run.job === job.id).length }))
        // Each run against its job's usual time, so a job of seconds and a job of minutes read on one scale.
        const succeeded = recent.filter((run) => run.at.state === 'succeeded')
        const usual = new Map(
            jobs.map((job) => [job.id, median(succeeded.filter((run) => run.job === job.id).map((run) => run.at.duration))]),
        )
        const durations = succeeded.map((run) => ({
            job: run.job,
            share: Math.round((run.at.duration / (usual.get(run.job) ?? run.at.duration)) * 100),
        }))
        const sparkOf = (keep: (run: LiveRun) => boolean) =>
            hours.map((hour) => recent.filter((run) => keep(run) && hourOf(run.created) === hour).length)
        return {
            recent,
            hours,
            perHour,
            byJob,
            durations,
            success: finished.length === 0 ? null : ((finished.length - failed.length) / finished.length) * 100,
            failed: failed.length,
            median: median(recent.filter((run) => run.at.state === 'succeeded').map((run) => run.at.duration)),
            sparkRuns: sparkOf(() => true),
            sparkFailed: sparkOf((run) => run.at.state === 'failed'),
        }
        // `signature` stands for the runs' states; `refreshed` reads them again on a refresh.
    }, [minute, signature, jobs, refreshed])

    const going = runs.filter((run) => isLive(run.at.state))
    const trouble = useMemo(() => {
        const latest = new Map<string, LiveRun>()
        for (const run of day.recent) if (run.at.state === 'failed' && !latest.has(run.job)) latest.set(run.job, run)
        return [...latest.values()]
    }, [day.recent])
    const fires: Fire[] = jobs
        .filter((job) => job.schedule !== null && !job.paused)
        .map((job) => ({
            job: job.id,
            name: job.name,
            at: job.schedule === null ? Infinity : nextFire(job.schedule, now),
            schedule: saySchedule(job.schedule),
        }))
        .sort((left, right) => left.at - right.at)
        .slice(0, 5)

    const troubleColumns: DataColumn<LiveRun>[] = [
        { id: 'job', header: 'Job', width: '9rem', cell: (run) => <span className="font-mono">{run.job}</span> },
        { id: 'step', header: 'Failed at', width: '6.5rem', cell: (run) => <span className="font-mono">{run.at.step}</span> },
        {
            id: 'error',
            header: 'What it said',
            width: 'minmax(10rem,1fr)',
            cell: (run) => <span className="truncate text-muted-foreground">{run.error}</span>,
        },
        { id: 'when', header: 'When', width: '6rem', align: 'end', cell: (run) => <When at={run.created} now={now} times={prefs.times} /> },
    ]
    const goingColumns: DataColumn<LiveRun>[] = [
        { id: 'job', header: 'Job', width: 'minmax(8rem,1fr)', cell: (run) => <span className="font-mono">{run.job}</span> },
        { id: 'state', header: 'State', width: '7rem', cell: (run) => <StatusChip status={run.at.state} /> },
        {
            id: 'step',
            header: 'Step',
            width: '7rem',
            cell: (run) => <span className="font-mono text-muted-foreground">{run.at.step ?? '-'}</span>,
        },
        {
            id: 'took',
            header: 'So far',
            width: '5rem',
            align: 'end',
            cell: (run) => <span className="tabular-nums">{took(run.at.duration)}</span>,
        },
    ]
    const fireColumns: DataColumn<Fire>[] = [
        { id: 'job', header: 'Job', width: 'minmax(8rem,1fr)', cell: (fire) => <span className="font-mono">{fire.job}</span> },
        {
            id: 'schedule',
            header: 'Schedule',
            width: '11rem',
            cell: (fire) => <span className="text-muted-foreground">{fire.schedule}</span>,
        },
        { id: 'at', header: 'At', width: '4.5rem', align: 'end', cell: (fire) => <span className="tabular-nums">{clock(fire.at)}</span> },
    ]

    return (
        <>
            <PageHeader
                title="Overview"
                description="The last 24 hours of Tidevann's runs, on the UTC clock."
                actions={
                    <RefreshControl
                        onRefresh={refresh}
                        refreshing={refreshing}
                        interval={every}
                        onIntervalChange={setEvery}
                        updated={`updated ${clock(updated, true)}`}
                    />
                }
            />
            <DashboardGrid>
                <StatPanel title="Runs" value={day.recent.length} sparkline={day.sparkRuns} color="chart-2" note="in 24 hours" />
                <StatPanel title="Success rate" value={day.success} unit="%" decimals={1} thresholds={SUCCESS} note="of those finished" />
                <StatPanel title="Failed" value={day.failed} thresholds={FAILURES} colorMode="background" sparkline={day.sparkFailed} />
                <StatPanel title="Going now" value={going.filter((run) => run.at.state === 'running').length} color="status-running" />
                <StatPanel title="Queued" value={going.filter((run) => run.at.state === 'queued').length} color="status-queued" />
                <StatPanel title="Median duration" value={day.median === null ? null : day.median / 1000} unit="s" decimals={1} />
                <ChartPanel
                    title="Runs per hour"
                    subtitle="by state"
                    span="two-thirds"
                    kind="bar"
                    rows={day.perHour}
                    x="hour"
                    y="runs"
                    series="state"
                    stack="stacked"
                    order={day.hours}
                    seriesOrder={STATES}
                    colors={STATE_COLORS}
                    labelEvery={3}
                    file="runs-per-hour"
                />
                <ChartPanel
                    title="Failures by job"
                    subtitle="24 hours"
                    span="third"
                    kind="donut"
                    rows={day.byJob}
                    x="job"
                    y="failures"
                    total="failed"
                    empty={day.failed === 0}
                    file="failures-by-job"
                />
                <ChartPanel
                    title="Durations"
                    subtitle="each run against its job's median"
                    info="How long each run that succeeded took, as a share of its job's median: 100% is a usual run, 200% one that took twice as long."
                    span="half"
                    kind="boxplot"
                    rows={day.durations}
                    x="job"
                    y="share"
                    unit="%"
                    legend="none"
                    empty={day.durations.length === 0}
                    file="durations"
                />
                <DashboardPanel
                    title="Runs in trouble"
                    subtitle={counted(trouble.length, 'job')}
                    span="half"
                    flush
                    actions={
                        <Button size="xs" variant="ghost" onClick={() => go('/runs')}>
                            All runs
                        </Button>
                    }
                    empty={trouble.length === 0}
                    words={{ empty: 'No job failed in the last 24 hours.' }}
                >
                    <DataTable
                        variant="list"
                        framed={false}
                        minWidth="auto"
                        stackBelow={420}
                        columns={troubleColumns}
                        rows={trouble}
                        rowKey={(run) => run.id}
                        onOpen={actions.open}
                    />
                </DashboardPanel>
                <DashboardPanel
                    title="Going now"
                    subtitle={counted(going.length, 'run')}
                    span="half"
                    flush
                    empty={going.length === 0}
                    words={{ empty: 'Nothing is running. Start a job from Jobs or the palette.' }}
                >
                    <DataTable
                        variant="list"
                        framed={false}
                        minWidth="auto"
                        stackBelow={420}
                        columns={goingColumns}
                        rows={going}
                        rowKey={(run) => run.id}
                        onOpen={actions.open}
                    />
                </DashboardPanel>
                <DashboardPanel
                    title="Next up"
                    subtitle="on the schedules"
                    span="half"
                    flush
                    actions={
                        <Button size="xs" variant="ghost" onClick={() => go('/schedules')}>
                            Schedules
                        </Button>
                    }
                    empty={fires.length === 0}
                    words={{ empty: 'No schedule is on.' }}
                >
                    <DataTable
                        variant="list"
                        framed={false}
                        minWidth="auto"
                        stackBelow={420}
                        columns={fireColumns}
                        rows={fires}
                        rowKey={(fire) => fire.job}
                        onOpen={(fire) => go(`/jobs/${fire.job}`)}
                    />
                </DashboardPanel>
            </DashboardGrid>
        </>
    )
}
