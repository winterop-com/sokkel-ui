import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature } from 'geojson'
import { useState, type ReactNode } from 'react'

import { BarGauge } from '@winterop-com/sokkel-ui-charts/dashboard/BarGauge'
import { BarPanel } from '@winterop-com/sokkel-ui-charts/dashboard/BarPanel'
import { ChartPanel } from '@winterop-com/sokkel-ui-charts/dashboard/ChartPanel'
import { DashboardGrid, DashboardPanel } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { DashboardRow } from '@winterop-com/sokkel-ui/dashboard/DashboardRow'
import { GaugePanel } from '@winterop-com/sokkel-ui-charts/dashboard/GaugePanel'
import { HeatmapPanel } from '@winterop-com/sokkel-ui-charts/dashboard/HeatmapPanel'
import type { PanelSeries } from '@winterop-com/sokkel-ui-charts/dashboard/series'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import { tokenVar, type Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'
import { RefreshControl, TimeRangePicker, type TimeRangeValue } from '@winterop-com/sokkel-ui/dashboard/TimeRange'
import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import { VariablesBar } from '@winterop-com/sokkel-ui/dashboard/VariablesBar'
import { BoundaryLayer } from '@winterop-com/sokkel-ui-maps/BoundaryLayer'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { PointLayer } from '@winterop-com/sokkel-ui-maps/PointLayer'
import { classCounts, sequentialScale } from '@winterop-com/sokkel-ui-maps/scale'
import { DropdownMenuItem, DropdownMenuSeparator } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
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
    TIMES,
    WORKERS,
} from '../fixtures/runs'
import { RUN_ROWS, RUN_STATES, STATE_COLORS } from '../fixtures/runRows'
import { TidevannMark } from '../fixtures/TidevannMark'
import { places, regions, sites } from '../map/data'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * The panels a monitoring dashboard is made of: stat tiles colored by thresholds, gauges, bar
 * gauges, time series, bars, a heatmap, the variables bar and collapsible rows, on Tidevann's job
 * runs over one day.
 */
const meta: Meta = { title: 'Patterns/Dashboard panels' }
export default meta

function Ground({ title, children }: { title: string; children: ReactNode }) {
    return (
        <TooltipProvider>
            <div className="min-h-svh bg-background p-3 text-foreground md:p-4">
                <Stack gap="sm">
                    <TopBar mark={<TidevannMark />} trail={[{ label: 'Tidevann', href: '#' }, { label: title }]} />
                    {children}
                </Stack>
            </div>
        </TooltipProvider>
    )
}

const HIGH_IS_GOOD: Threshold[] = [{ color: 'critical' }, { value: 95, color: 'warning' }, { value: 99, color: 'good' }]
const LOW_IS_GOOD: Threshold[] = [{ color: 'good' }, { value: 60, color: 'warning' }, { value: 85, color: 'critical' }]
const FAILED_IS_BAD: Threshold[] = [{ color: 'good' }, { value: 1, color: 'critical' }]
const QUEUE_STEPS: Threshold[] = [{ color: 'good' }, { value: 20, color: 'warning' }, { value: 40, color: 'critical' }]

const RUN_SERIES: PanelSeries[] = [
    { name: 'Runs', values: RUNS, color: 'chart-2' },
    { name: 'Failures', values: FAILURES, color: 'status-failed' },
]
const JOB_SERIES: PanelSeries[] = JOBS.map((job) => ({ name: job, values: RUNS_BY_JOB[job] }))
const DURATION_SERIES: PanelSeries[] = [
    { name: 'p50', values: DURATIONS.p50, color: 'chart-3' },
    { name: 'p90', values: DURATIONS.p90, color: 'warning' },
    { name: 'p99', values: DURATIONS.p99, color: 'status-failed' },
]
const QUEUE_SERIES: PanelSeries[] = WORKERS.map((worker) => ({ name: worker, values: QUEUE[worker] }))
const STATE_SERIES: PanelSeries[] = [
    { name: 'Succeeded', values: BY_STATE.succeeded, color: 'status-succeeded' },
    { name: 'Failed', values: BY_STATE.failed, color: 'status-failed' },
    { name: 'Cancelled', values: BY_STATE.cancelled, color: 'status-cancelled' },
    { name: 'Skipped', values: BY_STATE.skipped, color: 'status-skipped' },
]
const HISTOGRAM_SERIES: PanelSeries[] = [{ name: 'Runs', values: HISTOGRAM, color: 'chart-2' }]
const SECONDS = (value: number) => `${value.toFixed(1)}s`

/** Stat tiles: values inked by thresholds, tiles filled by them, a trend behind the value, a change, and one with no data. */
export const StatTiles: StoryObj = {
    name: 'Stat tiles',
    render: () => (
        <Ground title="Stat tiles">
            <DashboardGrid dense>
                <StatPanel title="Success rate" value={99.3} unit="%" decimals={1} thresholds={HIGH_IS_GOOD} sparkline={RUNS} />
                <StatPanel title="Runs" value={3526} color="chart-2" sparkline={RUNS} delta="+6%" good />
                <StatPanel
                    title="Queue depth"
                    value={30}
                    thresholds={QUEUE_STEPS}
                    sparkline={QUEUE['worker-3']}
                    info="Runs waiting for a slot, every worker."
                />
                <StatPanel title="Failed now" value={0} thresholds={FAILED_IS_BAD} colorMode="background" />
                <StatPanel title="Median" value={4.2} unit="s" color="chart-4" colorMode="background" sparkline={DURATIONS.p50} />
                <StatPanel title="Paused jobs" value={null} />
            </DashboardGrid>
        </Ground>
    ),
}

/** Gauges and bar gauges colored by where their readings fall among thresholds. */
export const Gauges: StoryObj = {
    render: () => (
        <Ground title="Gauges">
            <DashboardGrid dense>
                <GaugePanel title="Success rate" value={99.3} unit="%" decimals={1} thresholds={HIGH_IS_GOOD} label="today" />
                <GaugePanel title="Worker load" value={72} unit="%" thresholds={LOW_IS_GOOD} label="worker-3" />
                <GaugePanel title="Disk used" value={91} unit="%" thresholds={LOW_IS_GOOD} label="scheduler" />
                <BarGauge
                    title="Worker load"
                    span="half"
                    unit="%"
                    thresholds={LOW_IS_GOOD}
                    bars={[
                        { name: 'worker-1', value: 34 },
                        { name: 'worker-2', value: 58 },
                        { name: 'worker-3', value: 72 },
                        { name: 'worker-4', value: 91 },
                    ]}
                />
            </DashboardGrid>
        </Ground>
    ),
}

/** Time series: lines over fading areas, percentiles with a threshold line, stacked areas, and a legend table. */
export const TimeSeries: StoryObj = {
    name: 'Time series',
    render: () => (
        <Ground title="Time series">
            <DashboardGrid dense>
                <TimeSeriesPanel title="Runs and failures" subtitle="every 15 min" x={TIMES} series={RUN_SERIES} labelEvery={16} />
                <TimeSeriesPanel
                    title="Run duration"
                    info="Run duration at the 50th, 90th and 99th percentile."
                    x={TIMES}
                    series={DURATION_SERIES}
                    unit="s"
                    format={SECONDS}
                    fill="none"
                    thresholds={[{ color: 'good' }, { value: 30, color: 'critical' }]}
                    legend="table"
                    labelEvery={16}
                />
                <TimeSeriesPanel
                    title="Runs by job"
                    subtitle="stacked"
                    x={TIMES}
                    series={JOB_SERIES}
                    stacked
                    legend="table"
                    labelEvery={16}
                />
                <TimeSeriesPanel title="Queue depth" x={TIMES} series={QUEUE_SERIES} step labelEvery={16} />
            </DashboardGrid>
        </Ground>
    ),
}

/** Bars stacked by state per hour, and a histogram of run durations with tall touching bars. */
export const Bars: StoryObj = {
    render: () => (
        <Ground title="Bars">
            <DashboardGrid dense>
                <BarPanel title="Runs by state" subtitle="per hour" x={HOURS} series={STATE_SERIES} stacked labelEvery={3} />
                <BarPanel title="Run duration" subtitle="distribution" x={BUCKETS} series={HISTOGRAM_SERIES} gap="tight" />
            </DashboardGrid>
        </Ground>
    ),
}

/** Runs per hour and duration bucket, on one hue and on a scale through three. */
export const Heatmap: StoryObj = {
    render: () => (
        <Ground title="Heatmap">
            <DashboardGrid dense>
                <HeatmapPanel title="Run duration" subtitle="by hour" x={HOURS} y={BUCKETS} cells={HEATMAP} labelEvery={3} />
                <HeatmapPanel
                    title="Run duration"
                    subtitle="by hour"
                    x={HOURS}
                    y={BUCKETS}
                    cells={HEATMAP}
                    scale={['chart-2', 'chart-3', 'warning', 'critical']}
                    labelEvery={3}
                />
            </DashboardGrid>
        </Ground>
    ),
}

const STATE_ORDER = [...RUN_STATES]
const HOURS_OF_DAY = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Charts drawn from a month of runs where no other panel draws them: a ring of states, runs as points, and when they start. */
export const ChartPanels: StoryObj = {
    name: 'Chart panels',
    render: () => (
        <Ground title="Chart panels">
            <DashboardGrid dense>
                <ChartPanel
                    kind="donut"
                    title="Runs by state"
                    subtitle="October"
                    rows={RUN_ROWS}
                    x="state"
                    order={STATE_ORDER}
                    colors={STATE_COLORS}
                    span="third"
                    bodyClassName="h-56"
                />
                <ChartPanel
                    kind="scatter"
                    title="Duration against rows"
                    subtitle="each run"
                    rows={RUN_ROWS}
                    x="rows"
                    y="duration"
                    series="project"
                    unit=" s"
                    span="third"
                    bodyClassName="h-56"
                />
                <ChartPanel
                    kind="heatmap"
                    title="When runs start"
                    subtitle="hour by weekday"
                    rows={RUN_ROWS}
                    x="hour"
                    series="weekday"
                    order={HOURS_OF_DAY}
                    seriesOrder={WEEKDAYS}
                    legend="none"
                    span="third"
                    bodyClassName="h-[15.75rem]"
                />
            </DashboardGrid>
        </Ground>
    ),
}

/** A panel's menu: View opens the panel in its window from the menu, as its expand button does. */
function PanelMenu({ onView }: { onView?: () => void }) {
    return (
        <>
            {onView !== undefined && <DropdownMenuItem onClick={onView}>View</DropdownMenuItem>}
            <DropdownMenuItem>Inspect data</DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </>
    )
}

function PanelMenus() {
    const [viewing, setViewing] = useState<string | null>(null)
    const view = (id: string) => ({
        expanded: viewing === id,
        onExpandedChange: (open: boolean) => setViewing(open ? id : null),
    })
    return (
        <Ground title="Panel menus">
            <DashboardGrid dense>
                <StatPanel
                    title="Success rate"
                    value={99.3}
                    unit="%"
                    decimals={1}
                    thresholds={HIGH_IS_GOOD}
                    sparkline={RUNS}
                    menu={<PanelMenu />}
                />
                <StatPanel title="Failed now" value={0} thresholds={FAILED_IS_BAD} colorMode="background" menu={<PanelMenu />} />
                <GaugePanel
                    title="Worker load"
                    value={72}
                    unit="%"
                    thresholds={LOW_IS_GOOD}
                    label="worker-3"
                    menu={<PanelMenu onView={() => setViewing('load')} />}
                    {...view('load')}
                />
                <TimeSeriesPanel
                    title="Runs and failures"
                    subtitle="every 15 min"
                    x={TIMES}
                    series={RUN_SERIES}
                    labelEvery={16}
                    menu={<PanelMenu onView={() => setViewing('runs')} />}
                    {...view('runs')}
                />
            </DashboardGrid>
        </Ground>
    )
}

/**
 * Panels with a menu behind their more button, a stat tile's in its head and a chart panel's
 * after its export and expand tools. View opens a chart panel in its window from the menu, held
 * by the app through `expanded`.
 */
export const PanelMenusStory: StoryObj = { name: 'Panel menus', render: () => <PanelMenus /> }

const CAPACITY: Threshold[] = [{ color: 'critical' }, { value: 100, color: 'warning' }, { value: 300, color: 'good' }]
const capacityScale = sequentialScale({
    breaks: [100, 300],
    colors: CAPACITY.map((step) => tokenVar(step.color)),
    format: (value) => value.toLocaleString('en-US'),
})
const capacityOf = (place: Feature) => sites[String(place.id)]?.capacity
const capacityTally = classCounts(
    capacityScale,
    places.features.map((place) => capacityOf(place)),
)

/** A map filling a panel: sites as points in the colors of a threshold scale, with the scale's key and the count in each band. */
export const MapPanel: StoryObj = {
    name: 'Map panel',
    render: () => (
        <Ground title="Map panel">
            <DashboardGrid>
                <DashboardPanel title="Sites" subtitle="by capacity" span="full" flush>
                    <MapView label="Sites by capacity" framed={false} className="h-96">
                        <BoundaryLayer id="regions" data={regions} interactive={false} />
                        <PointLayer id="sites" data={places} scale={capacityScale} value={capacityOf} radius={4} />
                        <MapOverlay corner="bottom-left">
                            <MapLegend
                                title="Capacity"
                                description="People each site holds"
                                scale={capacityScale}
                                layout="list"
                                shape="point"
                                counts={capacityTally.counts}
                                noData="Planned"
                                noDataCount={capacityTally.noData}
                            />
                        </MapOverlay>
                    </MapView>
                </DashboardPanel>
            </DashboardGrid>
        </Ground>
    ),
}

const PROJECTS = [
    { value: 'harbor', label: 'harbor' },
    { value: 'juniper', label: 'juniper' },
    { value: 'larkspur', label: 'larkspur' },
]
const JOB_OPTIONS = [{ value: 'all', label: 'All' }, ...JOBS.map((job) => ({ value: job, label: job }))]

function Variables() {
    const [project, setProject] = useState('larkspur')
    const [job, setJob] = useState('all')
    const [live, setLive] = useState(true)
    const [range, setRange] = useState<TimeRangeValue>({ preset: '24h' })
    const [interval, setInterval] = useState(30)
    const [paused, setPaused] = useState(false)
    return (
        <Ground title="Variables">
            <VariablesBar
                variables={[
                    { kind: 'select', id: 'project', label: 'project', value: project, options: PROJECTS, onChange: setProject },
                    { kind: 'select', id: 'job', label: 'job', value: job, options: JOB_OPTIONS, onChange: setJob },
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
                            intervals={[0, 5, 10, 30]}
                            paused={paused}
                            onPausedChange={setPaused}
                        />
                    </>
                }
            />
        </Ground>
    )
}

/** The variables bar: two dropdown filters and a toggle, with the range and refresh at the end, the refresh with its own intervals and a pause. */
export const VariablesStory: StoryObj = { name: 'Variables bar', render: () => <Variables /> }

function OpenRange() {
    const [range, setRange] = useState<TimeRangeValue>({ preset: '24h' })
    return (
        <Row gap="none" align="stretch" justify="end" className="min-h-svh bg-background p-6 text-foreground">
            <TimeRangePicker
                value={range}
                onChange={setRange}
                defaultMonth={new Date(2026, 9, 1)}
                today={new Date(2026, 9, 20)}
                defaultOpen
            />
        </Row>
    )
}

/** The range picker open: presets beside a calendar for a range of its own. */
export const TimeRange: StoryObj = { name: 'Time range', render: () => <OpenRange /> }

/** Rows grouping panels: one open, one collapsed saying how many panels it holds. */
export const Rows: StoryObj = {
    render: () => (
        <Ground title="Rows">
            <DashboardRow title="Overview" count={3}>
                <StatPanel title="Success rate" value={99.3} unit="%" decimals={1} thresholds={HIGH_IS_GOOD} sparkline={RUNS} />
                <StatPanel title="Runs" value={3526} color="chart-2" sparkline={RUNS} />
                <StatPanel title="Failed now" value={0} thresholds={FAILED_IS_BAD} colorMode="background" />
            </DashboardRow>
            <DashboardRow title="Workers" count={2} defaultOpen={false}>
                <TimeSeriesPanel title="Queue depth" x={TIMES} series={QUEUE_SERIES} />
            </DashboardRow>
        </Ground>
    ),
}
