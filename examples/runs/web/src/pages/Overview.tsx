import { ChartPanel } from '@winterop-com/sokkel-ui-charts/dashboard/ChartPanel'
import { DashboardArrange, type DashboardLayoutItem, type DashboardWidget } from '@winterop-com/sokkel-ui/dashboard/DashboardArrange'
import { DashboardPanel } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import type { Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'
import { RefreshControl } from '@winterop-com/sokkel-ui/dashboard/TimeRange'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { insertItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    Activity,
    ChartColumn,
    ChartColumnStacked,
    ChartPie,
    CircleCheck,
    CircleDot,
    CircleX,
    Clock,
    Hourglass,
    LayoutGrid,
    ListChecks,
    ListOrdered,
    RotateCcw,
    Timer,
    TriangleAlert,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

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

/** Every panel the overview can show, each fed by the console's runs and jobs. */
const WIDGETS = [
    { id: 'runs', label: 'Runs', icon: <ListChecks aria-hidden />, span: 'sixth' },
    { id: 'success', label: 'Success rate', icon: <CircleCheck aria-hidden />, span: 'sixth' },
    { id: 'failed', label: 'Failed', icon: <CircleX aria-hidden />, span: 'sixth' },
    { id: 'running', label: 'Going now', icon: <CircleDot aria-hidden />, span: 'sixth' },
    { id: 'queued', label: 'Queued', icon: <Hourglass aria-hidden />, span: 'sixth' },
    { id: 'median', label: 'Median duration', icon: <Timer aria-hidden />, span: 'sixth' },
    { id: 'per-hour', label: 'Runs per hour', icon: <ChartColumnStacked aria-hidden />, span: 'two-thirds' },
    { id: 'by-job', label: 'Failures by job', icon: <ChartPie aria-hidden />, span: 'third' },
    { id: 'durations', label: 'Durations', icon: <Activity aria-hidden />, span: 'half' },
    { id: 'trouble', label: 'Runs in trouble', icon: <TriangleAlert aria-hidden />, span: 'half' },
    { id: 'going', label: 'Running and queued', icon: <CircleDot aria-hidden />, span: 'half' },
    { id: 'next', label: 'Next up', icon: <Clock aria-hidden />, span: 'half' },
    { id: 'by-trigger', label: 'Runs by trigger', icon: <ChartPie aria-hidden />, span: 'third' },
    { id: 'busiest', label: 'Runs by job', icon: <ChartColumn aria-hidden />, span: 'third' },
    { id: 'latest', label: 'Latest runs', icon: <ListOrdered aria-hidden />, span: 'half' },
] as const satisfies readonly DashboardWidget[]

type WidgetId = (typeof WIDGETS)[number]['id']

const LABELS = Object.fromEntries(WIDGETS.map((widget) => [widget.id, widget.label])) as Record<WidgetId, string>

/** The overview as it comes: the figures in a row, the charts, then the lists. */
const DEFAULT_LAYOUT: DashboardLayoutItem[] = WIDGETS.slice(0, 12).map((widget) => ({ id: widget.id, span: widget.span }))

const TRIGGERS = ['schedule', 'manual', 'retry'] as const

const sameLayout = (left: readonly DashboardLayoutItem[], right: readonly DashboardLayoutItem[]) =>
    left.length === right.length && left.every((item, index) => item.id === right[index]?.id && item.span === right[index]?.span)

const median = (values: readonly number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted.length === 0 ? null : (sorted[Math.floor(sorted.length / 2)] ?? null)
}

/** The console's front page: how the last day went, what is going now, what failed and what comes next. */
export function Overview() {
    const { runs, jobs, now, prefs, setPrefs } = useConsole()
    const [arranging, setArranging] = useState(false)
    // Held here as it changes and kept in the preferences behind it, so a quick second move never reads a stale first.
    const [arranged, setArranged] = useState<DashboardLayoutItem[] | null>(null)
    const layout = (arranged ?? prefs.overview ?? DEFAULT_LAYOUT).filter((item) => LABELS[item.id as WidgetId] !== undefined)
    const keep = (next: DashboardLayoutItem[]) => {
        setArranged(next)
        void setPrefs({ overview: next })
    }
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
            byTrigger: TRIGGERS.map((trigger) => ({ trigger, runs: recent.filter((run) => run.trigger === trigger).length })),
            byJobRuns: jobs
                .map((job) => ({ job: job.id, runs: recent.filter((run) => run.job === job.id).length }))
                .filter((row) => row.runs > 0)
                .sort((left, right) => right.runs - left.runs),
        }
        // `signature` stands for the runs' states; `refreshed` reads them again on a refresh.
    }, [minute, signature, jobs, refreshed])

    const going = runs.filter((run) => isLive(run.at.state))
    const trouble = useMemo(() => {
        const latest = new Map<string, LiveRun>()
        for (const run of day.recent) if (run.at.state === 'failed' && !latest.has(run.job)) latest.set(run.job, run)
        return [...latest.values()]
    }, [day.recent])
    const latest = useMemo(() => [...day.recent].sort((left, right) => right.created - left.created).slice(0, 8), [day.recent])
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
        { id: 'job', header: 'Job', width: '8.5rem', cell: (run) => <span className="font-mono">{run.job}</span> },
        { id: 'step', header: 'Failed at', width: '6.5rem', cell: (run) => <span className="font-mono">{run.at.step}</span> },
        {
            id: 'error',
            header: 'What it said',
            width: 'minmax(6rem,1fr)',
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

    const latestColumns: DataColumn<LiveRun>[] = [
        { id: 'job', header: 'Job', width: 'minmax(8rem,1fr)', cell: (run) => <span className="font-mono">{run.job}</span> },
        { id: 'state', header: 'State', width: '7rem', cell: (run) => <StatusChip status={run.at.state} /> },
        { id: 'by', header: 'By', width: '6rem', cell: (run) => <span className="text-muted-foreground">{run.by}</span> },
        { id: 'when', header: 'When', width: '6rem', align: 'end', cell: (run) => <When at={run.created} now={now} times={prefs.times} /> },
    ]

    const runList = (rows: LiveRun[], columns: DataColumn<LiveRun>[]) => (
        <DataTable
            variant="list"
            framed={false}
            minWidth="auto"
            stackBelow={420}
            columns={columns}
            rows={rows}
            rowKey={(run) => run.id}
            onOpen={actions.open}
        />
    )

    const panelOf = (item: DashboardLayoutItem): ReactNode => {
        const id = item.id as WidgetId
        const title = LABELS[id]
        switch (id) {
            case 'runs':
                return <StatPanel title={title} value={day.recent.length} sparkline={day.sparkRuns} color="chart-2" note="in 24 hours" />
            case 'success':
                return <StatPanel title={title} value={day.success} unit="%" decimals={1} thresholds={SUCCESS} note="of those finished" />
            case 'failed':
                return (
                    <StatPanel title={title} value={day.failed} thresholds={FAILURES} colorMode="background" sparkline={day.sparkFailed} />
                )
            case 'running':
                return <StatPanel title={title} value={going.filter((run) => run.at.state === 'running').length} color="status-running" />
            case 'queued':
                return <StatPanel title={title} value={going.filter((run) => run.at.state === 'queued').length} color="status-queued" />
            case 'median':
                return <StatPanel title={title} value={day.median === null ? null : day.median / 1000} unit="s" decimals={1} />
            case 'per-hour':
                return (
                    <ChartPanel
                        title={title}
                        subtitle="by state"
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
                )
            case 'by-job':
                return (
                    <ChartPanel
                        title={title}
                        subtitle="24 hours"
                        kind="donut"
                        rows={day.byJob}
                        x="job"
                        y="failures"
                        total="failed"
                        empty={day.failed === 0}
                        file="failures-by-job"
                    />
                )
            case 'durations':
                return (
                    <ChartPanel
                        title={title}
                        subtitle="each run against its job's median"
                        info="How long each run that succeeded took, as a share of its job's median: 100% is a usual run, 200% one that took twice as long."
                        kind="boxplot"
                        rows={day.durations}
                        x="job"
                        y="share"
                        unit="%"
                        legend="none"
                        empty={day.durations.length === 0}
                        file="durations"
                    />
                )
            case 'by-trigger':
                return (
                    <ChartPanel
                        title={title}
                        subtitle="24 hours"
                        kind="donut"
                        rows={day.byTrigger}
                        x="trigger"
                        y="runs"
                        total="runs"
                        empty={day.recent.length === 0}
                        file="runs-by-trigger"
                    />
                )
            case 'busiest':
                return (
                    <ChartPanel
                        title={title}
                        subtitle="24 hours"
                        kind="bar"
                        horizontal
                        rows={day.byJobRuns}
                        x="job"
                        y="runs"
                        legend="none"
                        empty={day.byJobRuns.length === 0}
                        file="runs-by-job"
                    />
                )
            case 'trouble':
                return (
                    <DashboardPanel
                        title={title}
                        subtitle={counted(trouble.length, 'job')}
                        flush
                        actions={
                            <Button size="xs" variant="ghost" onClick={() => go('/runs')}>
                                All runs
                            </Button>
                        }
                        empty={trouble.length === 0}
                        words={{ empty: 'No job failed in the last 24 hours.' }}
                    >
                        {runList(trouble, troubleColumns)}
                    </DashboardPanel>
                )
            case 'going':
                return (
                    <DashboardPanel
                        title={title}
                        subtitle={counted(going.length, 'run')}
                        flush
                        empty={going.length === 0}
                        words={{ empty: 'Nothing is running. Start a job from Jobs or the palette.' }}
                    >
                        {runList(going, goingColumns)}
                    </DashboardPanel>
                )
            case 'latest':
                return (
                    <DashboardPanel
                        title={title}
                        subtitle="the last 24 hours"
                        flush
                        actions={
                            <Button size="xs" variant="ghost" onClick={() => go('/runs')}>
                                All runs
                            </Button>
                        }
                        empty={latest.length === 0}
                        words={{ empty: 'No run in the last 24 hours.' }}
                    >
                        {runList(latest, latestColumns)}
                    </DashboardPanel>
                )
            case 'next':
                return (
                    <DashboardPanel
                        title={title}
                        subtitle="on the schedules"
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
                )
        }
    }

    const shown = new Set(layout.map((item) => item.id))

    return (
        <>
            <PageHeader
                title="Overview"
                description={
                    arranging
                        ? 'Drag a panel by its grip to move it, set its width or remove it, and drag a widget in to add it.'
                        : "The last 24 hours of Tidevann's runs, on the UTC clock."
                }
                actions={
                    arranging ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => keep(DEFAULT_LAYOUT)}
                                reason={sameLayout(layout, DEFAULT_LAYOUT) ? 'The layout is the default.' : undefined}
                            >
                                <RotateCcw aria-hidden />
                                Reset layout
                            </Button>
                            <Button size="sm" onClick={() => setArranging(false)}>
                                Done
                            </Button>
                        </>
                    ) : (
                        <>
                            <RefreshControl
                                onRefresh={refresh}
                                refreshing={refreshing}
                                interval={every}
                                onIntervalChange={setEvery}
                                updated={`updated ${clock(updated, true)}`}
                            />
                            <Button variant="outline" size="sm" onClick={() => setArranging(true)}>
                                <LayoutGrid aria-hidden />
                                Arrange
                            </Button>
                        </>
                    )
                }
            />
            <DashboardArrange
                layout={layout}
                onLayoutChange={keep}
                renderPanel={panelOf}
                label={(item) => LABELS[item.id as WidgetId]}
                arranging={arranging}
                palette={WIDGETS.filter((widget) => !shown.has(widget.id))}
                onAdd={(widget, index) => keep(insertItem(layout, { id: widget.id, span: widget.span }, index))}
            />
        </>
    )
}
