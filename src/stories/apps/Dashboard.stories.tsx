import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CheckList } from '../../components/CheckList'
import { DataTable, type DataColumn } from '../../components/DataTable'
import { BarGauge } from '../../components/dashboard/BarGauge'
import { BarPanel } from '../../components/dashboard/BarPanel'
import { DashboardPanel } from '../../components/dashboard/DashboardGrid'
import { DashboardRow } from '../../components/dashboard/DashboardRow'
import { GaugePanel } from '../../components/dashboard/GaugePanel'
import { HeatmapPanel } from '../../components/dashboard/HeatmapPanel'
import type { PanelSeries } from '../../components/dashboard/series'
import { StatPanel } from '../../components/dashboard/StatPanel'
import type { Threshold } from '../../components/dashboard/thresholds'
import { RefreshControl, TimeRangePicker, type TimeRangeValue } from '../../components/dashboard/TimeRange'
import { TimeSeriesPanel } from '../../components/dashboard/TimeSeriesPanel'
import { VariablesBar } from '../../components/dashboard/VariablesBar'
import { StatusChip, type Status } from '../../components/StatusChip'
import { Timeline } from '../../components/Timeline'
import { DropdownMenuItem } from '../../components/ui/dropdown-menu'
import { TooltipProvider } from '../../components/ui/tooltip'
import {
    BUCKETS,
    BY_STATE,
    DURATIONS,
    FAILURES,
    HEATMAP,
    HISTOGRAM,
    HOURS,
    JOBS,
    QUEUE,
    RUNS,
    RUNS_BY_JOB,
    sum,
    TIMES,
    WORKERS,
} from '../fixtures/runs'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * Tidevann's job runs as a monitoring dashboard: variables across the top with the range and
 * refresh at the end, then collapsible rows of densely packed panels: stat tiles colored by
 * thresholds, time series with legend tables, a duration heatmap and histogram, the workers'
 * queue and load, and the health, latest runs and activity panels.
 */
const meta: Meta = { title: 'Apps/Dashboard' }
export default meta

const SUCCESS_STEPS: Threshold[] = [{ color: 'critical' }, { value: 85, color: 'warning' }, { value: 92, color: 'good' }]
const HIGH_IS_GOOD: Threshold[] = [{ color: 'critical' }, { value: 95, color: 'warning' }, { value: 97, color: 'good' }]
const LOW_IS_GOOD: Threshold[] = [{ color: 'good' }, { value: 60, color: 'warning' }, { value: 85, color: 'critical' }]
const NONE_IS_GOOD: Threshold[] = [{ color: 'good' }, { value: 1, color: 'critical' }]
const QUEUE_STEPS: Threshold[] = [{ color: 'good' }, { value: 20, color: 'warning' }, { value: 40, color: 'critical' }]
const SLOW: Threshold[] = [{ color: 'good' }, { value: 10, color: 'warning' }, { value: 30, color: 'critical' }]
const BUDGET: Threshold[] = [{ color: 'good' }, { value: 30, color: 'critical' }]
const QUEUE_LINE: Threshold[] = [{ color: 'good' }, { value: 20, color: 'warning' }]

const RUN_SERIES: PanelSeries[] = [
    { name: 'Runs', values: RUNS, color: 'chart-2' },
    { name: 'Failures', values: FAILURES, color: 'status-failed' },
]
const STATE_SERIES: PanelSeries[] = [
    { name: 'Succeeded', values: BY_STATE.succeeded, color: 'status-succeeded' },
    { name: 'Failed', values: BY_STATE.failed, color: 'status-failed' },
    { name: 'Cancelled', values: BY_STATE.cancelled, color: 'status-cancelled' },
    { name: 'Skipped', values: BY_STATE.skipped, color: 'status-skipped' },
]
const DURATION_SERIES: PanelSeries[] = [
    { name: 'p50', values: DURATIONS.p50, color: 'chart-3' },
    { name: 'p90', values: DURATIONS.p90, color: 'warning' },
    { name: 'p99', values: DURATIONS.p99, color: 'status-failed' },
]
const JOB_SERIES: PanelSeries[] = JOBS.map((job) => ({ name: job, values: RUNS_BY_JOB[job] }))
const QUEUE_SERIES: PanelSeries[] = WORKERS.map((worker) => ({ name: worker, values: QUEUE[worker] }))
const HISTOGRAM_SERIES: PanelSeries[] = [{ name: 'Runs', values: HISTOGRAM, color: 'chart-2' }]
const HEAT_SCALE = ['chart-2', 'chart-3', 'warning', 'critical']
const JOB_STATS = ['max', 'avg', 'current'] as const
const SECONDS = (value: number) => `${value.toFixed(1)}s`

const TOTAL = sum(RUNS)
const FAILED = sum(FAILURES)
const QUEUE_TOTAL = TIMES.map((_, i) => WORKERS.reduce((total, worker) => total + QUEUE[worker][i], 0))
const QUEUE_NOW = QUEUE_TOTAL[QUEUE_TOTAL.length - 1]
const P95 = DURATIONS.p90.map((value, i) => Math.round(((value + DURATIONS.p99[i]) / 2) * 10) / 10)
const SUCCESS = RUNS.map((runs, i) => (runs === 0 ? 100 : 100 - (FAILURES[i] / runs) * 100))

const PROJECTS = ['harbor', 'juniper', 'larkspur'].map((value) => ({ value, label: value }))
const JOB_OPTIONS = [{ value: 'all', label: 'All' }, ...JOBS.map((value) => ({ value, label: value }))]
const WORKER_OPTIONS = [{ value: 'all', label: 'All' }, ...WORKERS.map((value) => ({ value, label: value }))]

interface LatestRun {
    job: string
    state: Status
    took: string
    /** How long it took, for sorting; a run not yet started sorts first. */
    seconds: number
    at: string
}

const RUN_LIST: LatestRun[] = [
    { job: 'import-orders', state: 'running', took: '1m 12s', seconds: 72, at: '23:58' },
    { job: 'nightly-export', state: 'failed', took: '4.2s', seconds: 4.2, at: '23:45' },
    { job: 'rebuild-index', state: 'succeeded', took: '6m 03s', seconds: 363, at: '23:40' },
    { job: 'send-digest', state: 'succeeded', took: '12.8s', seconds: 12.8, at: '23:30' },
    { job: 'sync-inventory', state: 'queued', took: '-', seconds: 0, at: '23:30' },
    { job: 'import-orders', state: 'cancelled', took: '38.0s', seconds: 38, at: '23:15' },
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

const MENU = (
    <>
        <DropdownMenuItem>Open runs</DropdownMenuItem>
        <DropdownMenuItem>Export as CSV</DropdownMenuItem>
    </>
)

function Head() {
    const [project, setProject] = useState('larkspur')
    const [job, setJob] = useState('all')
    const [worker, setWorker] = useState('all')
    const [live, setLive] = useState(true)
    const [range, setRange] = useState<TimeRangeValue>({ preset: '24h' })
    const [interval, setInterval] = useState(30)
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
                <TidevannMark className="size-4 text-primary" />
                <span className="font-medium">Tidevann</span>
                <span className="text-muted-foreground">/</span>
                <h1 className="font-medium">Job runs</h1>
            </div>
            <VariablesBar
                variables={[
                    { kind: 'select', id: 'project', label: 'project', value: project, options: PROJECTS, onChange: setProject },
                    { kind: 'select', id: 'job', label: 'job', value: job, options: JOB_OPTIONS, onChange: setJob },
                    { kind: 'select', id: 'worker', label: 'worker', value: worker, options: WORKER_OPTIONS, onChange: setWorker },
                    { kind: 'toggle', id: 'live', label: 'live', checked: live, onChange: setLive },
                ]}
                end={
                    <>
                        <TimeRangePicker
                            value={range}
                            onChange={setRange}
                            defaultMonth={new Date(2026, 10, 1)}
                            today={new Date(2026, 10, 4)}
                        />
                        <RefreshControl
                            onRefresh={() => undefined}
                            interval={interval}
                            onIntervalChange={setInterval}
                            updated="updated 12s ago"
                        />
                    </>
                }
            />
        </div>
    )
}

function Dashboard({ loading = false, empty = false }: { loading?: boolean; empty?: boolean }) {
    const reading = (value: number) => (empty ? null : value)
    return (
        <TooltipProvider>
            <div className="min-h-svh bg-background p-3 text-foreground md:p-4">
                <div className="mx-auto flex max-w-[1600px] flex-col gap-3">
                    <Head />
                    <DashboardRow title="Overview" count={8}>
                        <StatPanel
                            title="Success rate"
                            value={reading(100 - (FAILED / TOTAL) * 100)}
                            unit="%"
                            decimals={1}
                            thresholds={SUCCESS_STEPS}
                            sparkline={SUCCESS}
                            info="Runs that succeeded, of every run that finished in the range."
                            loading={loading}
                        />
                        <StatPanel
                            title="Runs"
                            value={reading(TOTAL)}
                            color="chart-2"
                            sparkline={RUNS}
                            delta="+6%"
                            good
                            loading={loading}
                        />
                        <StatPanel
                            title="Queue depth"
                            value={reading(QUEUE_NOW)}
                            thresholds={QUEUE_STEPS}
                            sparkline={QUEUE_TOTAL}
                            info="Runs waiting for a worker slot, now."
                            loading={loading}
                        />
                        <StatPanel
                            title="Failing now"
                            value={reading(0)}
                            thresholds={NONE_IS_GOOD}
                            colorMode="background"
                            loading={loading}
                        />
                        <StatPanel
                            title="p95 duration"
                            value={reading(P95[P95.length - 1])}
                            unit="s"
                            decimals={1}
                            thresholds={SLOW}
                            colorMode="background"
                            sparkline={P95}
                            loading={loading}
                        />
                        <StatPanel
                            title="Workers up"
                            value={reading(4)}
                            unit="/ 4"
                            color="chart-4"
                            colorMode="background"
                            loading={loading}
                        />
                        <TimeSeriesPanel
                            title="Runs and failures"
                            subtitle="every 15 min"
                            info="Runs started and runs failed in each fifteen-minute step."
                            span="two-thirds"
                            x={TIMES}
                            series={RUN_SERIES}
                            labelEvery={16}
                            bodyClassName="h-52"
                            loading={loading}
                            empty={empty}
                            file="runs-and-failures"
                        />
                        <BarPanel
                            title="Runs by state"
                            subtitle="per hour"
                            span="third"
                            x={HOURS}
                            series={STATE_SERIES}
                            stacked
                            labelEvery={6}
                            bodyClassName="h-52"
                            loading={loading}
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
                            x={TIMES}
                            series={DURATION_SERIES}
                            unit="s"
                            format={SECONDS}
                            fill="none"
                            thresholds={BUDGET}
                            legend="table"
                            labelEvery={16}
                            loading={loading}
                            empty={empty}
                            file="run-duration"
                        />
                        <HeatmapPanel
                            title="Run duration"
                            subtitle="by hour"
                            info="Runs in each duration bucket, per hour."
                            span="half"
                            x={HOURS}
                            y={BUCKETS}
                            cells={HEATMAP}
                            scale={HEAT_SCALE}
                            labelEvery={3}
                            bodyClassName="h-[18rem]"
                            loading={loading}
                            empty={empty}
                            file="duration-heatmap"
                        />
                        <BarPanel
                            title="Duration distribution"
                            subtitle="today"
                            span="third"
                            x={BUCKETS}
                            series={HISTOGRAM_SERIES}
                            gap="tight"
                            bodyClassName="h-[17rem]"
                            loading={loading}
                            empty={empty}
                            file="duration-histogram"
                        />
                        <TimeSeriesPanel
                            title="Runs by job"
                            subtitle="stacked"
                            span="two-thirds"
                            x={TIMES}
                            series={JOB_SERIES}
                            stacked
                            legend="table"
                            legendStats={JOB_STATS}
                            labelEvery={16}
                            bodyClassName="h-44"
                            loading={loading}
                            empty={empty}
                            file="runs-by-job"
                        />
                    </DashboardRow>
                    <DashboardRow title="Workers" count={4}>
                        <TimeSeriesPanel
                            title="Queue depth"
                            subtitle="by worker"
                            span="third"
                            x={TIMES}
                            series={QUEUE_SERIES}
                            step
                            thresholds={QUEUE_LINE}
                            labelEvery={16}
                            bodyClassName="h-36"
                            loading={loading}
                            empty={empty}
                            file="queue-depth"
                        />
                        <BarGauge
                            title="Worker load"
                            subtitle="now"
                            span="third"
                            unit="%"
                            thresholds={LOW_IS_GOOD}
                            loading={loading}
                            empty={empty}
                            bars={[
                                { name: 'worker-1', value: 34 },
                                { name: 'worker-2', value: 58 },
                                { name: 'worker-3', value: 72 },
                                { name: 'worker-4', value: 91 },
                                { name: 'scheduler', value: 12 },
                            ]}
                        />
                        <GaugePanel
                            title="Slots used"
                            value={reading(76)}
                            unit="%"
                            thresholds={LOW_IS_GOOD}
                            label="of 48"
                            bodyClassName="h-40"
                            loading={loading}
                        />
                        <GaugePanel
                            title="Cache hits"
                            value={reading(98.1)}
                            unit="%"
                            decimals={1}
                            thresholds={HIGH_IS_GOOD}
                            label="fetch"
                            bodyClassName="h-40"
                            loading={loading}
                        />
                    </DashboardRow>
                    <DashboardRow title="Runs" count={3}>
                        <DashboardPanel title="Health" span="third" flush loading={loading}>
                            <CheckList
                                checks={[
                                    { name: 'API', status: 'ok', detail: 'p95 182ms' },
                                    {
                                        name: 'Worker',
                                        status: 'warn',
                                        detail: `queue depth ${QUEUE_NOW}`,
                                        hint: 'worker-4 is at 91% load.',
                                    },
                                    { name: 'Scheduler', status: 'ok', detail: 'last tick 4s ago' },
                                ]}
                            />
                        </DashboardPanel>
                        <DashboardPanel title="Latest runs" span="third" flush menu={MENU} loading={loading} empty={empty}>
                            <DataTable
                                columns={RUN_COLUMNS}
                                rows={RUN_LIST}
                                rowKey={(run) => run.job + run.at}
                                total={3_526}
                                minWidth="24rem"
                                className="flex-1 rounded-none border-0"
                            />
                        </DashboardPanel>
                        <DashboardPanel title="Activity" span="third" loading={loading} empty={empty}>
                            <Timeline
                                events={[
                                    { id: '1', title: 'nightly-export failed at validate', at: '23:45', tone: 'failed' },
                                    { id: '2', title: 'worker-3 queue passed 20', at: '14:10', tone: 'waiting' },
                                    { id: '3', title: 'ada paused send-digest', at: '13:40' },
                                    { id: '4', title: 'grace added the job sync-inventory', at: '09:12' },
                                ]}
                            />
                        </DashboardPanel>
                    </DashboardRow>
                </div>
            </div>
        </TooltipProvider>
    )
}

function Picker() {
    const [range, setRange] = useState<TimeRangeValue>({ preset: '24h' })
    return (
        <div className="flex min-h-svh justify-end bg-background p-6 text-foreground">
            <TimeRangePicker value={range} onChange={setRange} defaultMonth={new Date(2026, 9, 1)} today={new Date(2026, 9, 20)} open />
        </div>
    )
}

export const Overview: StoryObj = { render: () => <Dashboard /> }

/** The same dashboard while its panels load, and then with no data for the range. */
export const LoadingAndEmpty: StoryObj = {
    name: 'Loading and empty',
    render: () => (
        <div className="flex flex-col">
            <Dashboard loading />
            <Dashboard empty />
        </div>
    ),
}

export const TimeRange: StoryObj = { name: 'Time range', render: () => <Picker /> }
