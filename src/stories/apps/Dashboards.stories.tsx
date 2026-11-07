import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { Activity, CalendarRange, Gauge, Globe, ListChecks, Play, Workflow, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { AccountMenu } from '../../components/AccountMenu'
import { CheckList } from '../../components/CheckList'
import { BarGauge } from '../../components/dashboard/BarGauge'
import { BarPanel } from '../../components/dashboard/BarPanel'
import { ChartPanel } from '../../components/dashboard/ChartPanel'
import { ComboPanel, type ComboSeries } from '../../components/dashboard/ComboPanel'
import { DashboardGrid, DashboardPanel } from '../../components/dashboard/DashboardGrid'
import { DashboardRow } from '../../components/dashboard/DashboardRow'
import { GaugePanel } from '../../components/dashboard/GaugePanel'
import { HeatmapPanel } from '../../components/dashboard/HeatmapPanel'
import { ScoreTable, type ScoreColumn, type ScoreRow } from '../../components/dashboard/ScoreTable'
import type { PanelSeries } from '../../components/dashboard/series'
import { StatPanel } from '../../components/dashboard/StatPanel'
import { tokenVar, type Threshold } from '../../components/dashboard/thresholds'
import { RefreshControl, TimeRangePicker, type TimeRangeValue } from '../../components/dashboard/TimeRange'
import { TimeSeriesPanel } from '../../components/dashboard/TimeSeriesPanel'
import { VariablesBar, type Variable } from '../../components/dashboard/VariablesBar'
import { MapLegend } from '../../components/map/MapLegend'
import { MapPopup } from '../../components/map/MapPopup'
import { MapOverlay, MapView } from '../../components/map/MapView'
import { PointLayer } from '../../components/map/PointLayer'
import { classCounts, colorOf, sequentialScale } from '../../components/map/scale'
import { DataTable, type DataColumn } from '../../components/DataTable'
import { Rail, type RailGroup } from '../../components/Rail'
import { Page, Shell } from '../../components/Shell'
import { StatusChip, type Status } from '../../components/StatusChip'
import { Timeline } from '../../components/Timeline'
import { TopBar } from '../../components/TopBar'
import { DropdownMenuItem } from '../../components/ui/dropdown-menu'
import { TooltipProvider } from '../../components/ui/tooltip'
import {
    across,
    cacheHits,
    clientDuration,
    clock,
    CONTINENTS,
    cpu,
    dailyRuns,
    dayBefore,
    dayLabel,
    disk,
    DURATION_BUCKETS,
    durationCells,
    errorRate,
    failureRate,
    failures,
    frameOf,
    HOUR,
    HOURLY_SHARE,
    JOB_PROJECT,
    JOBS,
    memory,
    NOW,
    PROJECTS,
    queue,
    RANGES,
    requests,
    runs,
    runSeconds,
    sample,
    siteLatency,
    siteRequests,
    SITES,
    slotUse,
    spanOf,
    wait,
    WORKERS,
    type Job,
    type Project,
    type Site,
    type Span,
    type Worker,
} from '../fixtures/metrics'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * Tidevann's monitoring dashboards in the library's frame, each a screen of panels over seeded
 * metrics that run on from a fixed moment. The range picker narrows what every panel shows, the
 * variables filter them by project, worker or continent, a refresh moves the data on by five
 * minutes, legends hide and emphasize series, and rows fold. The last stories show a board while
 * its panels load and with no data for the range.
 */
const meta: Meta = { title: 'Apps/Dashboards' }
export default meta

type Board = 'job-runs' | 'operations' | 'capacity' | 'regions' | 'forecast'

const BOARDS: { id: Board; label: string; icon: LucideIcon }[] = [
    { id: 'job-runs', label: 'Job runs', icon: ListChecks },
    { id: 'operations', label: 'Operations', icon: Activity },
    { id: 'capacity', label: 'Capacity', icon: Gauge },
    { id: 'regions', label: 'Regions', icon: Globe },
    { id: 'forecast', label: 'Forecast', icon: CalendarRange },
]

function groups(board: Board): RailGroup[] {
    return [
        {
            id: 'work',
            entries: [
                { id: 'runs', label: 'Runs', icon: Play, href: '#' },
                { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#' },
            ],
        },
        {
            id: 'dashboards',
            title: 'Dashboards',
            entries: BOARDS.map((entry) => ({ id: entry.id, label: entry.label, icon: entry.icon, href: '#', active: entry.id === board })),
        },
    ]
}

/** The app around a dashboard: the rail with the dashboards, the trail to this one, and the page it fills. */
function DashboardsApp({ board, children }: { board: Board; children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)
    const label = BOARDS.find((entry) => entry.id === board)?.label ?? board
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={groups(board)}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={<AccountMenu name="ada" where="tidevann.example.org" collapsed={collapsed} onSettings={() => undefined} />}
                    />
                }
                top={<TopBar trail={[{ label: 'Dashboards', href: '#' }, { label }]} onSearch={() => undefined} />}
            >
                <Page>{children}</Page>
            </Shell>
        </TooltipProvider>
    )
}

/** Refreshing a dashboard: it spins a moment, then `step` runs; a chosen interval keeps doing so until it is turned off. */
function useRefresh(step: () => void) {
    const [refreshing, setRefreshing] = useState(false)
    const [interval, setInterval] = useState(0)
    const timer = useRef<number | undefined>(undefined)
    const onStep = useRef(step)
    useEffect(() => {
        onStep.current = step
    })
    useEffect(() => () => window.clearTimeout(timer.current), [])
    useEffect(() => {
        if (interval === 0) return
        const id = window.setInterval(() => onStep.current(), interval * 1000)
        return () => window.clearInterval(id)
    }, [interval])
    const refresh = () => {
        setRefreshing(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
            onStep.current()
            setRefreshing(false)
        }, 450)
    }
    return { refreshing, refresh, interval, setInterval }
}

/** The range a dashboard covers and the moment it reaches, with the controls that change them: a refresh moves the moment on by a step. */
function useTimeControls() {
    const [range, setRange] = useState<TimeRangeValue>({ preset: '6h' })
    const [now, setNow] = useState(NOW)
    const { refreshing, refresh, interval, setInterval } = useRefresh(() => setNow((step) => step + 1))
    const span = useMemo(() => spanOf(range, now), [range, now])
    const controls = (
        <>
            <TimeRangePicker
                value={range}
                onChange={setRange}
                presets={RANGES}
                defaultMonth={new Date(2026, 9, 1)}
                today={new Date(2026, 10, 4)}
            />
            <RefreshControl
                onRefresh={refresh}
                refreshing={refreshing}
                interval={interval}
                onIntervalChange={setInterval}
                updated={`updated ${clock(now)}`}
            />
        </>
    )
    return { span, empty: span.end <= span.start, refreshing, controls }
}

const ALL = 'all'
const choices = (values: readonly string[]) => [{ value: ALL, label: 'All' }, ...values.map((value) => ({ value, label: value }))]
const chosen = <T extends string>(value: string, every: readonly T[]): readonly T[] =>
    value === ALL ? every : every.filter((one) => one === value)

const total = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0)
const mean = (values: readonly number[]) => (values.length === 0 ? 0 : total(values) / values.length)
const latest = (values: readonly number[]) => values[values.length - 1] ?? 0
/** The change from one figure to another, written for a reader: `+4.2%`. */
const change = (now: number, before: number) =>
    before === 0 ? undefined : `${now >= before ? '+' : ''}${(((now - before) / before) * 100).toFixed(1)}%`

const ERRORS: Threshold[] = [{ color: 'good' }, { value: 1, color: 'warning' }, { value: 3, color: 'critical' }]
const SLOW: Threshold[] = [{ color: 'good' }, { value: 250, color: 'warning' }, { value: 500, color: 'critical' }]
const SUCCESS: Threshold[] = [{ color: 'critical' }, { value: 95, color: 'warning' }, { value: 98, color: 'good' }]
const WAITING: Threshold[] = [{ color: 'good' }, { value: 60, color: 'warning' }, { value: 100, color: 'critical' }]
const QUEUE_STEPS: Threshold[] = [{ color: 'good' }, { value: 20, color: 'warning' }, { value: 40, color: 'critical' }]
const LOAD: Threshold[] = [{ color: 'good' }, { value: 70, color: 'warning' }, { value: 85, color: 'critical' }]
const LOAD_LINE: Threshold[] = [{ color: 'good' }, { value: 85, color: 'critical' }]
const DISK: Threshold[] = [{ color: 'good' }, { value: 75, color: 'warning' }, { value: 90, color: 'critical' }]
const WAIT: Threshold[] = [{ color: 'good' }, { value: 30, color: 'warning' }, { value: 60, color: 'critical' }]
const CACHE: Threshold[] = [{ color: 'critical' }, { value: 93, color: 'warning' }, { value: 97, color: 'good' }]
const AVAILABILITY: Threshold[] = [{ color: 'critical' }, { value: 99, color: 'warning' }, { value: 99.5, color: 'good' }]
const LATENCY: Threshold[] = [{ color: 'good' }, { value: 150, color: 'warning' }, { value: 250, color: 'critical' }]
const HEAT_SCALE = ['chart-2', 'chart-3', 'warning', 'critical']
const TABLE_STATS = ['avg', 'max', 'current'] as const
const AVERAGES = ['avg'] as const

/** Every pair of the chosen projects and workers, for a figure summed or weighed across them. */
const pairs = (projects: readonly Project[], workers: readonly Worker[]) =>
    projects.flatMap((project) => workers.map((worker) => [project, worker] as const))

const RUN_SLOW: Threshold[] = [{ color: 'good' }, { value: 10, color: 'warning' }, { value: 30, color: 'critical' }]
const RUN_BUDGET: Threshold[] = [{ color: 'good' }, { value: 30, color: 'critical' }]
const NONE_IS_GOOD: Threshold[] = [{ color: 'good' }, { value: 1, color: 'critical' }]
const QUEUE_LINE: Threshold[] = [{ color: 'good' }, { value: 20, color: 'warning' }]
const JOB_STATS = ['max', 'avg', 'current'] as const
const SECONDS = (value: number) => `${value.toFixed(1)}s`

/** Shares of the runs started that end cancelled or skipped; the rest that do not fail succeed. */
const CANCELLED = 0.012
const SKIPPED = 0.02

/** What the job runs dashboard draws for a span, a project, a job and a worker. */
function jobRuns(span: Span, project: string, job: string, worker: string) {
    const projects = chosen(project, PROJECTS)
    const jobs = chosen(job, JOBS).filter((one) => projects.includes(JOB_PROJECT[one]))
    const workers = chosen(worker, WORKERS)
    const line = frameOf(span, 150)
    // Runs are counted in wider buckets than levels are read, so whole runs make a smooth line.
    const counts = frameOf(span, 48)
    const bars = frameOf(span, 30)
    const heat = frameOf(span, 48)
    const spark = frameOf(span, 40)
    const startedBy = (one: Job) => (step: number) => total(workers.map((w) => runs(one, w, step)))
    const failedBy = (one: Job) => (step: number) => total(workers.map((w) => failures(one, w, step)))
    const started = (step: number) => total(jobs.map((one) => startedBy(one)(step)))
    const failed = (step: number) => total(jobs.map((one) => failedBy(one)(step)))
    const waiting = (step: number) => total(workers.map((w) => queue(w, step)))
    const p95 = (step: number) => runSeconds(step) * 2.9
    const end = span.end - 1
    const runTotal = across(span, started, 'sum')
    const failedTotal = across(span, failed, 'sum')
    const lastHour: Span = { start: span.end - HOUR, end: span.end }
    const failingNow = jobs.filter((one) => {
        const ran = across(lastHour, startedBy(one), 'sum')
        return ran > 0 && across(lastHour, failedBy(one), 'sum') / ran > 0.05
    })
    const percentile = (spread: number, name: string, color: string): PanelSeries => ({
        name,
        color,
        values: sample(line, (step) => runSeconds(step) * spread).map((value) => Math.round(value * 10) / 10),
    })
    const cells = durationCells(heat, sample(heat, started, 'sum'), sample(heat, runSeconds))
    const busiest = workers.reduce((most, w) => (cpu(w, end) > cpu(most, end) ? w : most), workers[0])
    return {
        success: {
            now: runTotal === 0 ? 100 : 100 - (failedTotal / runTotal) * 100,
            spark: sample(spark, (step) => 100 - (failed(step) / (started(step) || 1)) * 100),
        },
        runs: {
            now: Math.round(runTotal),
            spark: sample(spark, started, 'sum'),
            change: change(runTotal, across(dayBefore(span), started, 'sum')),
        },
        queue: { now: waiting(end), spark: sample(spark, waiting) },
        failing: failingNow.length,
        p95: { now: p95(end), spark: sample(spark, p95) },
        line: line.labels,
        counts: counts.labels,
        runsAndFailures: [
            { name: 'Runs', values: sample(counts, started, 'sum').map(Math.round), color: 'chart-2' },
            { name: 'Failures', values: sample(counts, failed, 'sum').map(Math.round), color: 'status-failed' },
        ] satisfies PanelSeries[],
        bars: bars.labels,
        byState: [
            {
                name: 'Succeeded',
                values: sample(bars, (step) => started(step) * (1 - CANCELLED - SKIPPED) - failed(step), 'sum').map(Math.round),
                color: 'status-succeeded',
            },
            { name: 'Failed', values: sample(bars, failed, 'sum').map(Math.round), color: 'status-failed' },
            {
                name: 'Cancelled',
                values: sample(bars, (step) => started(step) * CANCELLED, 'sum').map(Math.round),
                color: 'status-cancelled',
            },
            { name: 'Skipped', values: sample(bars, (step) => started(step) * SKIPPED, 'sum').map(Math.round), color: 'status-skipped' },
        ] satisfies PanelSeries[],
        durations: [percentile(1, 'p50', 'chart-3'), percentile(2.1, 'p90', 'warning'), percentile(3.6, 'p99', 'status-failed')],
        heat: heat.labels,
        cells,
        histogram: [
            {
                name: 'Runs',
                values: DURATION_BUCKETS.map((_, bucket) => total(cells.filter((cell) => cell[1] === bucket).map((cell) => cell[2]))),
                color: 'chart-2',
            },
        ] satisfies PanelSeries[],
        perJob: jobs.map((one): PanelSeries => ({ name: one, values: sample(counts, startedBy(one), 'sum').map(Math.round) })),
        perWorker: workers.map((w): PanelSeries => ({ name: w, values: sample(line, (step) => queue(w, step)) })),
        load: workers.map((w) => ({ name: w, value: Math.round(cpu(w, end)) })),
        slots: mean(workers.map((w) => cpu(w, end))),
        cache: cacheHits(end),
        health: [
            { name: 'API', status: 'ok' as const, detail: `p95 ${Math.round(clientDuration('harbor', 'worker-1', end, 95))}ms` },
            {
                name: 'Worker',
                status: waiting(end) > 20 ? ('warn' as const) : ('ok' as const),
                detail: `queue depth ${waiting(end)}`,
                hint: busiest === undefined ? undefined : `${busiest} is at ${Math.round(cpu(busiest, end))}% load.`,
            },
            { name: 'Scheduler', status: 'ok' as const, detail: `last tick ${clock(end)}` },
        ],
        latest: LATEST_RUNS.filter((run) => jobs.includes(run.job)),
    }
}

interface LatestRun {
    job: Job
    state: Status
    took: string
    /** How long it took, for sorting; a run not yet started sorts first. */
    seconds: number
    at: string
}

const LATEST_RUNS: LatestRun[] = [
    { job: 'import-orders', state: 'running', took: '1m 12s', seconds: 72, at: '11:58' },
    { job: 'nightly-export', state: 'failed', took: '4.2s', seconds: 4.2, at: '11:45' },
    { job: 'rebuild-index', state: 'succeeded', took: '6m 03s', seconds: 363, at: '11:40' },
    { job: 'send-digest', state: 'succeeded', took: '12.8s', seconds: 12.8, at: '11:30' },
    { job: 'sync-inventory', state: 'queued', took: '-', seconds: 0, at: '11:30' },
    { job: 'import-orders', state: 'cancelled', took: '38.0s', seconds: 38, at: '11:15' },
]

const RUN_COLUMNS: DataColumn<LatestRun>[] = [
    {
        id: 'job',
        header: 'Job',
        width: 'minmax(7rem,1fr)',
        cell: (run) => <span className="font-mono">{run.job}</span>,
        sortValue: (run) => run.job,
    },
    { id: 'state', header: 'State', width: '7rem', cell: (run) => <StatusChip status={run.state} />, sortValue: (run) => run.state },
    {
        id: 'took',
        header: 'Took',
        width: '5.5rem',
        align: 'end',
        cell: (run) => <span className="text-muted-foreground tabular-nums">{run.took}</span>,
        sortValue: (run) => run.seconds,
    },
    {
        id: 'at',
        header: 'At',
        width: '4.5rem',
        align: 'end',
        cell: (run) => <span className="text-faint tabular-nums">{run.at}</span>,
        sortValue: (run) => run.at,
    },
]

const RUN_MENU = (
    <>
        <DropdownMenuItem>Open runs</DropdownMenuItem>
        <DropdownMenuItem>Export as CSV</DropdownMenuItem>
    </>
)

/**
 * Tidevann's job runs: stat tiles colored by thresholds, runs and failures, runs by state, duration
 * percentiles against the budget, a duration heatmap and histogram, runs by job, the workers' queue
 * and load, and the health, latest runs and activity panels. The range, project, job and worker
 * narrow every panel, and a refresh moves them on. `loading` and `empty` hold every panel loading,
 * or with no data for the range.
 */
function JobRuns({ loading = false, empty: none = false }: { loading?: boolean; empty?: boolean }) {
    const { span, empty: past, refreshing, controls } = useTimeControls()
    const [project, setProject] = useState(ALL)
    const [job, setJob] = useState(ALL)
    const [worker, setWorker] = useState(ALL)
    const data = useMemo(() => jobRuns(span, project, job, worker), [span, project, job, worker])
    const busy = loading || refreshing
    const empty = none || past
    const reading = (value: number) => (empty ? null : value)
    const variables: Variable[] = [
        { kind: 'select', id: 'project', label: 'project', value: project, options: choices(PROJECTS), onChange: setProject },
        { kind: 'select', id: 'job', label: 'job', value: job, options: choices(JOBS), onChange: setJob },
        { kind: 'select', id: 'worker', label: 'worker', value: worker, options: choices(WORKERS), onChange: setWorker },
    ]
    return (
        <>
            <VariablesBar variables={variables} end={controls} />
            <DashboardRow title="Overview" count={8}>
                <StatPanel
                    title="Success rate"
                    value={reading(data.success.now)}
                    unit="%"
                    decimals={1}
                    thresholds={SUCCESS}
                    sparkline={data.success.spark}
                    info="Runs that succeeded, of every run that finished in the range."
                    loading={busy}
                />
                <StatPanel
                    title="Runs"
                    value={reading(data.runs.now)}
                    color="chart-2"
                    sparkline={data.runs.spark}
                    delta={data.runs.change}
                    good={data.runs.change?.startsWith('+')}
                    loading={busy}
                />
                <StatPanel
                    title="Queue depth"
                    value={reading(data.queue.now)}
                    thresholds={QUEUE_STEPS}
                    sparkline={data.queue.spark}
                    info="Runs waiting for a worker slot, now."
                    loading={busy}
                />
                <StatPanel
                    title="Failing now"
                    value={reading(data.failing)}
                    thresholds={NONE_IS_GOOD}
                    colorMode="background"
                    info="Jobs that failed more than one run in twenty in the last hour."
                    loading={busy}
                />
                <StatPanel
                    title="p95 duration"
                    value={reading(data.p95.now)}
                    unit="s"
                    decimals={1}
                    thresholds={RUN_SLOW}
                    colorMode="background"
                    sparkline={data.p95.spark}
                    loading={busy}
                />
                <StatPanel
                    title="Workers up"
                    value={reading(WORKERS.length)}
                    unit={`/ ${WORKERS.length}`}
                    color="chart-4"
                    colorMode="background"
                    loading={busy}
                />
                <TimeSeriesPanel
                    title="Runs and failures"
                    subtitle="in the range"
                    info="Runs started and runs failed in each step of the range."
                    span="two-thirds"
                    x={data.counts}
                    series={data.runsAndFailures}
                    bodyClassName="h-52"
                    loading={busy}
                    empty={empty}
                    file="runs-and-failures"
                />
                <BarPanel
                    title="Runs by state"
                    subtitle="stacked"
                    span="third"
                    x={data.bars}
                    series={data.byState}
                    stacked
                    bodyClassName="h-52"
                    loading={busy}
                    empty={empty}
                    file="runs-by-state"
                />
            </DashboardRow>
            <DashboardRow title="Latency" count={4}>
                <TimeSeriesPanel
                    title="Run duration"
                    subtitle="percentiles"
                    info="Run duration at the 50th, 90th and 99th percentile. The dashed line is the 30s budget."
                    span="half"
                    x={data.line}
                    series={data.durations}
                    unit="s"
                    format={SECONDS}
                    fill="none"
                    thresholds={RUN_BUDGET}
                    legend="table"
                    loading={busy}
                    empty={empty}
                    file="run-duration"
                />
                <HeatmapPanel
                    title="Run duration"
                    subtitle="runs per duration bucket"
                    info="Runs started in each step, by how long they took."
                    span="half"
                    x={data.heat}
                    y={DURATION_BUCKETS}
                    cells={data.cells}
                    scale={HEAT_SCALE}
                    bodyClassName="h-72"
                    loading={busy}
                    empty={empty}
                    file="duration-heatmap"
                />
                <BarPanel
                    title="Duration distribution"
                    subtitle="in the range"
                    span="third"
                    x={DURATION_BUCKETS}
                    series={data.histogram}
                    gap="tight"
                    bodyClassName="h-64"
                    loading={busy}
                    empty={empty}
                    file="duration-histogram"
                />
                <TimeSeriesPanel
                    title="Runs by job"
                    subtitle="stacked"
                    span="two-thirds"
                    x={data.counts}
                    series={data.perJob}
                    stacked
                    legend="table"
                    legendStats={JOB_STATS}
                    bodyClassName="h-44"
                    loading={busy}
                    empty={empty}
                    file="runs-by-job"
                />
            </DashboardRow>
            <DashboardRow title="Workers" count={4}>
                <TimeSeriesPanel
                    title="Queue depth"
                    subtitle="by worker"
                    span="third"
                    x={data.line}
                    series={data.perWorker}
                    step
                    thresholds={QUEUE_LINE}
                    bodyClassName="h-36"
                    loading={busy}
                    empty={empty}
                    file="queue-depth"
                />
                <BarGauge
                    title="Worker load"
                    subtitle="now"
                    span="third"
                    unit="%"
                    thresholds={LOAD}
                    loading={busy}
                    empty={empty}
                    bars={data.load}
                />
                <GaugePanel
                    title="Slots used"
                    value={reading(data.slots)}
                    unit="%"
                    thresholds={LOAD}
                    label="mean"
                    bodyClassName="h-40"
                    loading={busy}
                />
                <GaugePanel
                    title="Cache hits"
                    value={reading(data.cache)}
                    min={80}
                    unit="%"
                    decimals={1}
                    thresholds={CACHE}
                    label="fetch"
                    bodyClassName="h-40"
                    loading={busy}
                />
            </DashboardRow>
            <DashboardRow title="Runs" count={3}>
                <DashboardPanel title="Health" span="third" flush loading={busy}>
                    <CheckList checks={data.health} />
                </DashboardPanel>
                <DashboardPanel
                    title="Latest runs"
                    span="third"
                    flush
                    menu={RUN_MENU}
                    loading={busy}
                    empty={empty || data.latest.length === 0}
                >
                    <DataTable
                        columns={RUN_COLUMNS}
                        rows={data.latest}
                        rowKey={(run) => run.job + run.at}
                        minWidth="24rem"
                        className="flex-1 rounded-none border-0"
                    />
                </DashboardPanel>
                <DashboardPanel title="Activity" span="third" loading={busy} empty={empty}>
                    <Timeline
                        events={[
                            { id: '1', title: 'nightly-export failed at validate', at: '11:45', tone: 'failed' },
                            { id: '2', title: 'worker-3 queue passed 20', at: '10:10', tone: 'waiting' },
                            { id: '3', title: 'ada paused send-digest', at: '09:40' },
                            { id: '4', title: 'grace added the job sync-inventory', at: '08:12' },
                        ]}
                    />
                </DashboardPanel>
            </DashboardRow>
        </>
    )
}

/** What the operations dashboard draws for a span, a project and a worker. */
function operations(span: Span, project: string, worker: string) {
    const projects = chosen(project, PROJECTS)
    const workers = chosen(worker, WORKERS)
    const jobs = JOBS.filter((job) => projects.includes(JOB_PROJECT[job]))
    const every = pairs(projects, workers)
    const line = frameOf(span, 150)
    const bars = frameOf(span, 30)
    const heat = frameOf(span, 48)
    const spark = frameOf(span, 40)
    const served = (step: number) => total(every.map(([p, w]) => requests(p, w, step)))
    /** A figure across the chosen pairs, weighed by the requests each serves. */
    const weighed = (figure: (p: Project, w: Worker, step: number) => number) => (step: number) => {
        const weights = every.map(([p, w]) => requests(p, w, step))
        return total(every.map(([p, w], index) => figure(p, w, step) * weights[index])) / (total(weights) || 1)
    }
    const errors = weighed(errorRate)
    const p95 = weighed((p, w, step) => clientDuration(p, w, step, 95))
    const started = (step: number) => total(jobs.flatMap((job) => workers.map((w) => runs(job, w, step))))
    const failed = (step: number) => total(jobs.flatMap((job) => workers.map((w) => failures(job, w, step))))
    const waiting = (step: number) => total(workers.map((w) => queue(w, step)))
    const end = span.end - 1
    const runTotal = across(span, started, 'sum')
    const failedTotal = across(span, failed, 'sum')
    const percentile = (at: 50 | 90 | 99, name: string, color: string): PanelSeries => ({
        name,
        color,
        values: sample(
            bars,
            weighed((p, w, step) => clientDuration(p, w, step, at)),
        ).map(Math.round),
    })
    return {
        requests: { now: served(end), spark: sample(spark, served), change: change(across(span, served), across(dayBefore(span), served)) },
        errors: { now: errors(end), spark: sample(spark, errors) },
        p95: { now: p95(end), spark: sample(spark, p95) },
        success: {
            now: runTotal === 0 ? 100 : 100 - (failedTotal / runTotal) * 100,
            spark: sample(spark, (step) => 100 - (failed(step) / (started(step) || 1)) * 100),
        },
        runs: {
            now: Math.round(runTotal),
            spark: sample(spark, started, 'sum'),
            change: change(runTotal, across(dayBefore(span), started, 'sum')),
        },
        waiting: { now: waiting(end), spark: sample(spark, waiting) },
        cpu: mean(workers.map((w) => cpu(w, end))),
        memory: mean(workers.map((w) => memory(w, end))),
        cache: cacheHits(end),
        availability: 100 - across(span, errors),
        line: line.labels,
        perWorker: workers.map((w): PanelSeries => ({
            name: w,
            values: sample(line, (step) => total(projects.map((p) => requests(p, w, step)))),
        })),
        heat: heat.labels,
        cells: durationCells(heat, sample(heat, started, 'sum'), sample(heat, runSeconds)),
        bars: bars.labels,
        client: [percentile(50, 'p50', 'chart-3'), percentile(90, 'p90', 'warning'), percentile(99, 'p99', 'status-failed')],
        failures: jobs.map((job) => ({
            job,
            failures: Math.round(across(span, (step) => total(workers.map((w) => failures(job, w, step))), 'sum')),
        })),
    }
}

function Operations() {
    const { span, empty, refreshing, controls } = useTimeControls()
    const [project, setProject] = useState(ALL)
    const [worker, setWorker] = useState(ALL)
    const data = useMemo(() => operations(span, project, worker), [span, project, worker])
    const reading = (value: number) => (empty ? null : value)
    const variables: Variable[] = [
        { kind: 'select', id: 'project', label: 'project', value: project, options: choices(PROJECTS), onChange: setProject },
        { kind: 'select', id: 'worker', label: 'worker', value: worker, options: choices(WORKERS), onChange: setWorker },
    ]
    return (
        <>
            <VariablesBar variables={variables} end={controls} />
            <DashboardRow title="Overview" count={10}>
                <StatPanel
                    title="Requests"
                    value={reading(data.requests.now)}
                    unit="/s"
                    decimals={1}
                    color="chart-2"
                    sparkline={data.requests.spark}
                    delta={data.requests.change}
                    info="Requests served a second, now, against the same range yesterday."
                    loading={refreshing}
                />
                <StatPanel
                    title="Error rate"
                    value={reading(data.errors.now)}
                    unit="%"
                    decimals={2}
                    thresholds={ERRORS}
                    sparkline={data.errors.spark}
                    loading={refreshing}
                />
                <StatPanel
                    title="p95 duration"
                    value={reading(data.p95.now)}
                    unit="ms"
                    decimals={0}
                    thresholds={SLOW}
                    colorMode="background"
                    sparkline={data.p95.spark}
                    loading={refreshing}
                />
                <StatPanel
                    title="Run success"
                    value={reading(data.success.now)}
                    unit="%"
                    decimals={2}
                    thresholds={SUCCESS}
                    sparkline={data.success.spark}
                    info="Runs that succeeded, of every run started in the range."
                    loading={refreshing}
                />
                <StatPanel
                    title="Runs"
                    value={reading(data.runs.now)}
                    color="chart-3"
                    sparkline={data.runs.spark}
                    delta={data.runs.change}
                    good={data.runs.change?.startsWith('+')}
                    loading={refreshing}
                />
                <StatPanel
                    title="Waiting"
                    value={reading(data.waiting.now)}
                    thresholds={WAITING}
                    colorMode="background"
                    sparkline={data.waiting.spark}
                    info="Runs waiting for a worker slot, now."
                    loading={refreshing}
                />
                <GaugePanel
                    title="CPU"
                    span="quarter"
                    value={reading(data.cpu)}
                    unit="%"
                    thresholds={LOAD}
                    label="mean"
                    bodyClassName="h-36"
                    loading={refreshing}
                />
                <GaugePanel
                    title="Memory"
                    span="quarter"
                    value={reading(data.memory)}
                    unit="%"
                    thresholds={LOAD}
                    label="mean"
                    bodyClassName="h-36"
                    loading={refreshing}
                />
                <GaugePanel
                    title="Cache hits"
                    span="quarter"
                    value={reading(data.cache)}
                    min={80}
                    unit="%"
                    decimals={1}
                    thresholds={CACHE}
                    label="fetch"
                    bodyClassName="h-36"
                    loading={refreshing}
                />
                <GaugePanel
                    title="Availability"
                    span="quarter"
                    value={reading(data.availability)}
                    min={95}
                    unit="%"
                    decimals={2}
                    thresholds={AVAILABILITY}
                    label="in range"
                    bodyClassName="h-36"
                    loading={refreshing}
                />
            </DashboardRow>
            <DashboardRow title="Traffic" count={2}>
                <TimeSeriesPanel
                    title="Requests"
                    subtitle="per worker, stacked"
                    span="half"
                    x={data.line}
                    series={data.perWorker}
                    unit="/s"
                    decimals={1}
                    stacked
                    bodyClassName="h-56"
                    loading={refreshing}
                    empty={empty}
                    file="requests-per-worker"
                />
                <HeatmapPanel
                    title="Run duration"
                    subtitle="runs per duration bucket"
                    info="Runs started in each step, by how long they took."
                    span="half"
                    x={data.heat}
                    y={DURATION_BUCKETS}
                    cells={data.cells}
                    scale={HEAT_SCALE}
                    bodyClassName="h-64"
                    loading={refreshing}
                    empty={empty}
                    file="run-duration"
                />
            </DashboardRow>
            <DashboardRow title="Clients" count={2}>
                <BarPanel
                    title="Client duration"
                    subtitle="p50, p90 and p99, stacked"
                    info="How long clients wait for an answer, at three percentiles."
                    span="two-thirds"
                    x={data.bars}
                    series={data.client}
                    unit=" ms"
                    decimals={0}
                    stacked
                    legend="table"
                    legendStats={AVERAGES}
                    bodyClassName="h-52"
                    loading={refreshing}
                    empty={empty}
                    file="client-duration"
                />
                <ChartPanel
                    kind="donut"
                    title="Failures by job"
                    subtitle="in range"
                    label="Failed runs by job"
                    span="third"
                    rows={data.failures}
                    x="job"
                    y="failures"
                    bodyClassName="h-60"
                    loading={refreshing}
                    empty={empty}
                    file="failures-by-job"
                />
            </DashboardRow>
        </>
    )
}

/** What the capacity dashboard draws for a span and a worker, each worker read now or at its peak in the range. */
function capacity(span: Span, worker: string, peak: boolean) {
    const workers = chosen(worker, WORKERS)
    const line = frameOf(span, 150)
    const read = (figure: (w: Worker, step: number) => number) => (w: Worker) =>
        peak ? across(span, (step) => figure(w, step), 'max') : figure(w, span.end - 1)
    const bars = (figure: (w: Worker, step: number) => number) => workers.map((w) => ({ name: w, value: Math.round(read(figure)(w)) }))
    const lines = (figure: (w: Worker, step: number) => number): PanelSeries[] =>
        workers.map((w) => ({ name: w, values: sample(line, (step) => figure(w, step)).map(Math.round) }))
    return {
        cpu: mean(workers.map(read(cpu))),
        memory: mean(workers.map(read(memory))),
        disk: Math.max(...workers.map(read(disk))),
        wait: Math.max(...workers.map(read(wait))),
        cpuBars: bars(cpu),
        memoryBars: bars(memory),
        diskBars: bars(disk),
        x: line.labels,
        cpuLines: lines(cpu),
        memoryLines: lines(memory),
        queueLines: lines(queue),
        rows: workers.map((w): ScoreRow => ({
            key: w,
            label: w,
            values: {
                cpu: read(cpu)(w),
                memory: read(memory)(w),
                disk: read(disk)(w),
                queue: read(queue)(w),
                wait: read(wait)(w),
            },
        })),
    }
}

const WORKER_COLUMNS: ScoreColumn[] = [
    { key: 'cpu', label: 'CPU', unit: '%', decimals: 0, thresholds: LOAD, higherIsBetter: false },
    { key: 'memory', label: 'Memory', unit: '%', decimals: 0, thresholds: LOAD, higherIsBetter: false },
    { key: 'disk', label: 'Disk', unit: '%', decimals: 0, thresholds: DISK, higherIsBetter: false },
    { key: 'queue', label: 'Queue', decimals: 0, thresholds: QUEUE_STEPS, higherIsBetter: false },
    { key: 'wait', label: 'Wait p90', unit: 's', decimals: 0, thresholds: WAIT, higherIsBetter: false },
]

function Capacity() {
    const { span, empty, refreshing, controls } = useTimeControls()
    const [worker, setWorker] = useState(ALL)
    const [peak, setPeak] = useState(false)
    const data = useMemo(() => capacity(span, worker, peak), [span, worker, peak])
    const reading = (value: number) => (empty ? null : value)
    const when = peak ? 'peak in range' : 'now'
    const variables: Variable[] = [
        { kind: 'select', id: 'worker', label: 'worker', value: worker, options: choices(WORKERS), onChange: setWorker },
        { kind: 'toggle', id: 'peak', label: 'peak', checked: peak, onChange: setPeak },
    ]
    return (
        <>
            <VariablesBar variables={variables} end={controls} />
            <DashboardRow title="Cluster" count={4}>
                <GaugePanel
                    title="CPU"
                    span="quarter"
                    value={reading(data.cpu)}
                    unit="%"
                    thresholds={LOAD}
                    label={peak ? 'peak' : 'mean'}
                    bodyClassName="h-36"
                    loading={refreshing}
                />
                <GaugePanel
                    title="Memory"
                    span="quarter"
                    value={reading(data.memory)}
                    unit="%"
                    thresholds={LOAD}
                    label={peak ? 'peak' : 'mean'}
                    bodyClassName="h-36"
                    loading={refreshing}
                />
                <GaugePanel
                    title="Disk"
                    span="quarter"
                    value={reading(data.disk)}
                    unit="%"
                    thresholds={DISK}
                    label="fullest"
                    bodyClassName="h-36"
                    loading={refreshing}
                />
                <GaugePanel
                    title="Queue wait"
                    span="quarter"
                    value={reading(data.wait)}
                    max={120}
                    unit="s"
                    thresholds={WAIT}
                    label="p90, longest"
                    bodyClassName="h-36"
                    loading={refreshing}
                />
            </DashboardRow>
            <DashboardRow title="Workers" count={5}>
                <BarGauge title="CPU" subtitle={when} bars={data.cpuBars} unit="%" thresholds={LOAD} loading={refreshing} empty={empty} />
                <BarGauge
                    title="Memory"
                    subtitle={when}
                    bars={data.memoryBars}
                    unit="%"
                    thresholds={LOAD}
                    loading={refreshing}
                    empty={empty}
                />
                <BarGauge
                    title="Disk"
                    subtitle={when}
                    bars={data.diskBars}
                    unit="%"
                    thresholds={DISK}
                    mode="basic"
                    loading={refreshing}
                    empty={empty}
                />
                <TimeSeriesPanel
                    title="CPU"
                    subtitle="by worker"
                    x={data.x}
                    series={data.cpuLines}
                    unit="%"
                    fill="none"
                    min={0}
                    max={100}
                    thresholds={LOAD_LINE}
                    loading={refreshing}
                    empty={empty}
                    file="cpu-by-worker"
                />
                <TimeSeriesPanel
                    title="Memory"
                    subtitle="by worker"
                    x={data.x}
                    series={data.memoryLines}
                    unit="%"
                    min={0}
                    max={100}
                    thresholds={LOAD_LINE}
                    loading={refreshing}
                    empty={empty}
                    file="memory-by-worker"
                />
            </DashboardRow>
            <DashboardRow title="Queue" count={2}>
                <TimeSeriesPanel
                    title="Queue depth"
                    subtitle="runs waiting, by worker"
                    info="Runs waiting for a slot on each worker. The dashed lines are the warning and critical depths."
                    x={data.x}
                    series={data.queueLines}
                    step
                    fill="none"
                    thresholds={QUEUE_STEPS}
                    legend="table"
                    legendStats={TABLE_STATS}
                    bodyClassName="h-52"
                    loading={refreshing}
                    empty={empty}
                    file="queue-depth"
                />
                <DashboardPanel title="Workers" subtitle={when} span="half" flush loading={refreshing} empty={empty}>
                    <ScoreTable columns={WORKER_COLUMNS} rows={data.rows} nameHeader="Worker" framed={false} />
                </DashboardPanel>
            </DashboardRow>
        </>
    )
}

/** The tokens the sites' lines take, in order, so each site keeps its color when others are filtered out. */
const SITE_COLORS = [
    'chart-2',
    'chart-3',
    'chart-4',
    'kind-teal',
    'kind-pink',
    'kind-green',
    'kind-blue',
    'chart-5',
    'kind-jade',
    'kind-violet',
]
const siteColor = (site: Site) => SITE_COLORS[SITES.indexOf(site) % SITE_COLORS.length]

const PERCENTILES = [
    { value: '50', label: 'p50' },
    { value: '95', label: 'p95' },
    { value: '99', label: 'p99' },
]

const ms = (value: number) => `${Math.round(value)} ms`
const LATENCY_SCALE = sequentialScale({
    breaks: LATENCY.flatMap((step) => (step.value === undefined ? [] : [step.value])),
    colors: LATENCY.map((step) => tokenVar(step.color)),
    format: ms,
})

/** What the regions dashboard draws for a span, a project, a continent and a percentile. */
function regions(span: Span, project: string, continent: string, percentile: 50 | 95 | 99) {
    const sites = continent === ALL ? SITES : SITES.filter((site) => site.continent === continent)
    const line = frameOf(span, 120)
    const spark = frameOf(span, 40)
    const latency = (site: Site) => (step: number) =>
        siteLatency(site, step, percentile, project === ALL ? undefined : (project as Project))
    const now = new Map(sites.map((site) => [site.id, latest(sample(spark, latency(site)))]))
    const points: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: sites.map((site) => ({
            type: 'Feature',
            id: site.id,
            geometry: { type: 'Point', coordinates: [site.lon, site.lat] },
            properties: { name: site.name, latency: now.get(site.id) ?? null },
        })),
    }
    const series = (of: readonly Site[]): PanelSeries[] =>
        of.map((site) => ({ name: site.name, color: siteColor(site), values: sample(line, latency(site)).map(Math.round) }))
    return {
        sites,
        x: line.labels,
        all: series(sites),
        points,
        counts: classCounts(LATENCY_SCALE, [...now.values()]).counts,
        now,
        spark: new Map(sites.map((site) => [site.id, sample(spark, latency(site))])),
        served: new Map(sites.map((site) => [site.id, siteRequests(site, span.end - 1)])),
        continents: CONTINENTS.filter((name) => continent === ALL || name === continent).map((name) => {
            const own = sites.filter((site) => site.continent === name)
            return { name, sites: own, series: series(own) }
        }),
    }
}

function Regions() {
    const { span, empty, refreshing, controls } = useTimeControls()
    const [project, setProject] = useState(ALL)
    const [continent, setContinent] = useState(ALL)
    const [percentile, setPercentile] = useState('95')
    const [selected, setSelected] = useState<string | null>(null)
    const at = Number(percentile) as 50 | 95 | 99
    const data = useMemo(() => regions(span, project, continent, at), [span, project, continent, at])
    const named = `p${percentile}`
    const site = data.sites.find((one) => one.id === selected)
    const feature = data.points.features.find((one) => one.id === selected)
    const variables: Variable[] = [
        { kind: 'select', id: 'project', label: 'project', value: project, options: choices(PROJECTS), onChange: setProject },
        { kind: 'select', id: 'continent', label: 'continent', value: continent, options: choices(CONTINENTS), onChange: setContinent },
        { kind: 'select', id: 'percentile', label: 'latency', value: percentile, options: PERCENTILES, onChange: setPercentile },
    ]
    return (
        <>
            <VariablesBar variables={variables} end={controls} />
            <DashboardGrid>
                <DashboardPanel title="Sites" subtitle={`${named} latency, now`} span="half" flush loading={refreshing} empty={empty}>
                    <MapView
                        label={`Sites by ${named} latency`}
                        framed={false}
                        selected={selected}
                        onSelectedChange={(id) => setSelected(id)}
                        className="min-h-80 flex-1"
                    >
                        <PointLayer id="sites" data={data.points} scale={LATENCY_SCALE} value="latency" radius={6} />
                        <MapOverlay corner="bottom-left">
                            <MapLegend
                                title={`${named} latency`}
                                description={`${data.sites.length} sites`}
                                scale={LATENCY_SCALE}
                                layout="list"
                                shape="point"
                                counts={data.counts}
                            />
                        </MapOverlay>
                        {site !== undefined && feature !== undefined && (
                            <MapPopup
                                feature={feature as Feature}
                                title={site.name}
                                description={`${site.country}, ${site.continent}`}
                                rows={[
                                    {
                                        label: `${named} latency`,
                                        value: ms(data.now.get(site.id) ?? 0),
                                        color: colorOf(LATENCY_SCALE, data.now.get(site.id)) ?? undefined,
                                    },
                                    { label: 'Runs', value: `${(data.served.get(site.id) ?? 0).toFixed(1)}/s` },
                                ]}
                                onClose={() => setSelected(null)}
                            />
                        )}
                    </MapView>
                </DashboardPanel>
                <TimeSeriesPanel
                    title="Run latency"
                    subtitle={`${named}, by site`}
                    info="Each site's run latency. The dashed lines are the warning and critical latencies."
                    x={data.x}
                    series={data.all}
                    unit=" ms"
                    decimals={0}
                    fill="none"
                    thresholds={LATENCY}
                    legend="table"
                    legendStats={TABLE_STATS}
                    bodyClassName="h-64"
                    loading={refreshing}
                    empty={empty}
                    file="run-latency-by-site"
                />
            </DashboardGrid>
            {data.continents.map((group, index) => (
                <DashboardRow
                    key={`${continent}:${group.name}`}
                    title={group.name}
                    count={group.sites.length + 1}
                    defaultOpen={index === 0}
                >
                    {group.sites.map((one) => (
                        <StatPanel
                            key={one.id}
                            title={one.name}
                            value={empty ? null : (data.now.get(one.id) ?? null)}
                            unit="ms"
                            decimals={0}
                            thresholds={LATENCY}
                            sparkline={data.spark.get(one.id)}
                            note={one.country}
                            loading={refreshing}
                        />
                    ))}
                    <TimeSeriesPanel
                        title="Run latency"
                        subtitle={named}
                        x={data.x}
                        series={group.series}
                        unit=" ms"
                        decimals={0}
                        thresholds={LATENCY}
                        loading={refreshing}
                        empty={empty}
                        file={`run-latency-${group.name.toLowerCase().replaceAll(' ', '-')}`}
                    />
                </DashboardRow>
            ))}
        </>
    )
}

const HORIZONS = [
    { value: '7', label: '7 days' },
    { value: '14', label: '14 days' },
]

const SLOT_COLUMNS = (days: readonly number[]): ScoreColumn[] => days.map((day) => ({ key: String(day), label: dayLabel(day) }))

/** What the forecast draws for a project over the days ahead, from the forecast run `run`. */
function forecast(project: string, horizon: number, run: number) {
    const projects = chosen(project, PROJECTS)
    const days = Array.from({ length: horizon }, (_, index) => index + 1)
    const labels = days.map(dayLabel)
    const expected = days.map((day) => total(projects.map((p) => dailyRuns(p, day, run))))
    const lastWeek = days.map((day) => total(projects.map((p) => dailyRuns(p, day - 7))))
    const slots = WORKERS.map((w) => days.map((day, index) => slotUse(w, expected[index], day, run)))
    const peak = days.map((_, index) => Math.round(Math.max(...slots.map((one) => one[index]))))
    const failing = days.map((day, index) => (expected[index] * failureRate(day, run)) / 100)
    const busiest = expected.indexOf(Math.max(...expected))
    const quietest = expected.indexOf(Math.min(...expected))
    const series: ComboSeries[] = [
        { name: 'Expected runs', kind: 'bar', values: expected, color: 'chart-2' },
        { name: 'Same day last week', kind: 'line', values: lastWeek, color: 'muted-foreground', dashed: true },
        { name: 'Peak slot use', kind: 'line', axis: 'right', values: peak, color: 'warning' },
    ]
    return {
        days,
        labels,
        series,
        expected: total(expected),
        mean: Math.round(mean(expected)),
        change: change(total(expected), total(lastWeek)),
        busiest: { runs: expected[busiest], day: labels[busiest] },
        quietest: { runs: expected[quietest], day: labels[quietest] },
        peak: Math.max(...peak),
        failing: Math.round(total(failing)),
        trend: expected,
        hourly: labels.flatMap((label, index) =>
            HOURLY_SHARE.map((share, hour) => ({
                day: label,
                hour: `${String(hour).padStart(2, '0')}:00`,
                runs: Math.round(expected[index] * share),
            })),
        ),
        rows: WORKERS.map((w, at): ScoreRow => ({
            key: w,
            label: w,
            values: Object.fromEntries(days.map((day, index) => [String(day), slots[at][index]])),
        })),
    }
}

const SLOT_AXIS = { name: 'slot use', unit: '%', min: 0, max: 100 }
const RUN_AXIS = { name: 'runs' }

function Forecast() {
    const [project, setProject] = useState(ALL)
    const [horizon, setHorizon] = useState('7')
    const [run, setRun] = useState(0)
    const { refreshing, refresh, interval, setInterval } = useRefresh(() => setRun((count) => count + 1))
    const data = useMemo(() => forecast(project, Number(horizon), run), [project, horizon, run])
    const columns = useMemo(() => SLOT_COLUMNS(data.days), [data.days])
    const variables: Variable[] = [
        { kind: 'select', id: 'project', label: 'project', value: project, options: choices(PROJECTS), onChange: setProject },
        { kind: 'select', id: 'horizon', label: 'horizon', value: horizon, options: HORIZONS, onChange: setHorizon },
    ]
    return (
        <>
            <VariablesBar
                variables={variables}
                end={
                    <RefreshControl
                        onRefresh={refresh}
                        refreshing={refreshing}
                        interval={interval}
                        onIntervalChange={setInterval}
                        updated={`forecast ${clock(NOW + run)}`}
                    />
                }
            />
            <DashboardGrid dense>
                <StatPanel
                    title="Expected runs"
                    value={data.expected}
                    color="chart-2"
                    sparkline={data.trend}
                    delta={data.change}
                    info="Runs expected over the days ahead, against the same days a week before."
                    loading={refreshing}
                />
                <StatPanel title="Busiest day" value={data.busiest.runs} note={data.busiest.day} color="chart-3" loading={refreshing} />
                <StatPanel title="Quietest day" value={data.quietest.runs} note={data.quietest.day} color="chart-4" loading={refreshing} />
                <StatPanel
                    title="Peak slot use"
                    value={data.peak}
                    unit="%"
                    thresholds={LOAD}
                    colorMode="background"
                    info="The most of any worker's slots the busiest hour of a day is expected to take."
                    loading={refreshing}
                />
                <StatPanel
                    title="Expected failures"
                    value={data.failing}
                    thresholds={[{ color: 'good' }, { value: 250, color: 'warning' }, { value: 500, color: 'critical' }]}
                    loading={refreshing}
                />
                <StatPanel title="Mean per day" value={data.mean} color="chart-5" note={`from ${data.labels[0]}`} loading={refreshing} />
                <ComboPanel
                    title="Runs per day"
                    subtitle="expected, with last week and slot use"
                    span="two-thirds"
                    x={data.labels}
                    series={data.series}
                    left={RUN_AXIS}
                    right={SLOT_AXIS}
                    bodyClassName="h-64"
                    loading={refreshing}
                    file="runs-per-day"
                />
                <ChartPanel
                    kind="heatmap"
                    title="Runs by hour"
                    subtitle="expected"
                    label="Expected runs by hour and day"
                    span="third"
                    rows={data.hourly}
                    x="hour"
                    series="day"
                    y="runs"
                    legend="none"
                    bodyClassName="h-[17.5rem]"
                    loading={refreshing}
                    file="runs-by-hour"
                />
                <DashboardPanel title="Slot use by worker" subtitle="peak hour, expected" span="full" flush loading={refreshing}>
                    <ScoreTable
                        columns={columns}
                        rows={data.rows}
                        thresholds={LOAD}
                        unit="%"
                        decimals={0}
                        fill="solid"
                        nameHeader="Worker"
                        framed={false}
                    />
                </DashboardPanel>
            </DashboardGrid>
        </>
    )
}

/** A forecast of the days ahead: expected runs per day in bars beside last week's and the peak slot use on a second axis, runs by hour, and each worker's expected slot use in colored cells. */
export const ForecastBoard: StoryObj = {
    name: 'Forecast',
    render: () => (
        <DashboardsApp board="forecast">
            <Forecast />
        </DashboardsApp>
    ),
}

/** Capacity: gauges for the cluster, bar gauges and lines per worker, queue depth against its thresholds, and a scorecard of the workers, each read now or at its peak. */
export const CapacityBoard: StoryObj = {
    name: 'Capacity',
    render: () => (
        <DashboardsApp board="capacity">
            <Capacity />
        </DashboardsApp>
    ),
}

/** Operations: stat tiles and gauges on thresholds, requests per worker, run durations as a heatmap, client duration percentiles with their averages, and failures by job. */
export const OperationsBoard: StoryObj = {
    name: 'Operations',
    render: () => (
        <DashboardsApp board="operations">
            <Operations />
        </DashboardsApp>
    ),
}

/** Job runs: stat tiles on thresholds, runs and failures, duration percentiles, a heatmap and histogram, the workers' queue and load, and the health, latest runs and activity panels. */
export const JobRunsBoard: StoryObj = {
    name: 'Job runs',
    render: () => (
        <DashboardsApp board="job-runs">
            <JobRuns />
        </DashboardsApp>
    ),
}

/** Regions: sites on a world map colored by latency, every site's latency in one dense chart with a long legend, and a folded row per continent. */
export const RegionsBoard: StoryObj = {
    name: 'Regions',
    render: () => (
        <DashboardsApp board="regions">
            <Regions />
        </DashboardsApp>
    ),
}

/** The job runs board while every panel loads. */
export const Loading: StoryObj = {
    render: () => (
        <DashboardsApp board="job-runs">
            <JobRuns loading />
        </DashboardsApp>
    ),
}

/** The job runs board with no data for the range: each panel says so, and the figures show none. */
export const Empty: StoryObj = {
    render: () => (
        <DashboardsApp board="job-runs">
            <JobRuns empty />
        </DashboardsApp>
    ),
}
