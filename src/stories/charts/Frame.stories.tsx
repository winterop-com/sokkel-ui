import type { Meta, StoryObj } from '@storybook/react-vite'

import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'
import { chartLegend } from '@winterop-com/sokkel-ui-charts/chart-legend'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import { ChartLegend } from '@winterop-com/sokkel-ui-charts/ChartLegend'
import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { JOB_STEP_ROWS, STEP_COLORS, STEP_ROWS } from '../fixtures/dayRows'
import { MONTH_RUNS } from '../fixtures/monthRuns'
import { FORECAST_START, HARBOR_ORDER_WEEKS } from '../fixtures/orderForecast'
import { Ground } from './Ground'

/** The chart frame and legend on their own: the frame's states, and the legend in both modes. */
const meta: Meta = { title: 'Charts/Frame' }
export default meta

const TWO: ChartSpec = { rows: STEP_ROWS, x: 'time', y: ['Runs', 'Failures'], colors: STEP_COLORS, labelEvery: 16 }
const TWO_LEGEND = chartLegend('line', TWO)
const BY_JOB_LEGEND = chartLegend('line', { rows: JOB_STEP_ROWS, x: 'time', y: 'runs', series: 'job' })
const FORECAST: ChartSpec = {
    rows: HARBOR_ORDER_WEEKS,
    x: 'week',
    y: 'median',
    bands: [
        { low: 'q10', high: 'q90' },
        { low: 'q25', high: 'q75' },
    ],
    points: 'observed',
    history: 'observed',
    marks: [{ x: FORECAST_START, label: 'Forecast' }],
    dataFields: ['project', 'ahead'],
    fieldNames: { week: 'Week', median: 'Median', observed: 'Observed', project: 'Project', ahead: 'Weeks ahead' },
}
const FORECAST_LEGEND = chartLegend('fan', FORECAST)
const MONTHLY: ChartSpec = {
    rows: MONTH_RUNS,
    x: 'period',
    series: 'project',
    y: 'runs',
    dataFields: ['failed', 'cancelled', 'skipped', 'seconds'],
    fieldNames: {
        period: 'Month',
        project: 'Project',
        runs: 'Runs',
        failed: 'Failed',
        cancelled: 'Cancelled',
        skipped: 'Skipped',
        seconds: 'Median seconds',
    },
}
const MONTHLY_LEGEND = chartLegend('line', MONTHLY)

/** The legend as a wrapped row, one series switched off. */
export const LegendList: StoryObj = {
    name: 'Legend list',
    render: () => (
        <Ground title="Legend" columns={1}>
            <ChartLegend items={BY_JOB_LEGEND} hidden={new Set(['rebuild-index'])} />
        </Ground>
    ),
}

/** The legend as a table of each series' figures. */
export const LegendTable: StoryObj = {
    name: 'Legend table',
    render: () => (
        <Ground title="Legend" columns={1}>
            <ChartLegend items={BY_JOB_LEGEND} mode="table" hidden={new Set(['rebuild-index'])} />
        </Ground>
    ),
}

/** A frame while its data loads, and one with nothing to show. */
export const States: StoryObj = {
    render: () => (
        <Ground title="Panels">
            <ChartFrame title="Runs and failures" legend={TWO_LEGEND} loading>
                {(state) => <Chart kind="line" label="Runs and failures across the day" {...TWO} {...state} />}
            </ChartFrame>
            <ChartFrame title="Cancelled runs" empty>
                {(state) => <Chart kind="line" label="Cancelled runs" {...TWO} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}

/**
 * Frames with their data view open: the rows of the chart in its place as a table, in the columns
 * its spec reads and written as the chart writes them. The fan's bands stand in quantile order
 * around its median, and its `dataFields` add the project and how many weeks ahead each forecast
 * reaches; in a half-width frame the week stays pinned while the figures scroll. The monthly runs
 * show each period whole, its column as wide as its longest label. Chart brings the chart back; the
 * table loads the first time the view opens.
 */
export const DataView: StoryObj = {
    name: 'Data view',
    render: () => (
        <Ground title="Panels">
            <ChartFrame title="Runs and failures" legend={TWO_LEGEND} defaultView="data">
                {(state) => <Chart kind="line" label="Runs and failures across the day" {...TWO} {...state} />}
            </ChartFrame>
            <ChartFrame title="Orders imported" subtitle="per week, import-orders in harbor" legend={FORECAST_LEGEND} defaultView="data">
                {(state) => <Chart kind="fan" label="Orders imported per week, observed and forecast" {...FORECAST} {...state} />}
            </ChartFrame>
            <ChartFrame title="Runs per month" subtitle="by project" legend={MONTHLY_LEGEND} defaultView="data">
                {(state) => <Chart kind="line" label="Runs per month by project" {...MONTHLY} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}

/** A frame opened in its window near full screen, the legend with it; Escape or the close button brings it back. */
export const Expanded: StoryObj = {
    render: () => (
        <Ground title="Panels" columns={1}>
            <ChartFrame title="Runs and failures" subtitle="Today" legend={TWO_LEGEND} defaultExpanded>
                {(state) => <Chart kind="line" label="Runs and failures across the day" {...TWO} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}
