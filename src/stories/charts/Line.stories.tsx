import type { Meta, StoryObj } from '@storybook/react-vite'

import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'
import { chartLegend } from '@winterop-com/sokkel-ui-charts/chart-legend'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { JOB_STEP_ROWS, STEP_COLORS, STEP_ROWS } from '../fixtures/dayRows'
import { Ground } from './Ground'

/** Line charts on Chart: series over the day in fifteen-minute steps, with the legend under the chart driving it. */
const meta: Meta = { title: 'Charts/Line' }
export default meta

const TWO: ChartSpec = { rows: STEP_ROWS, x: 'time', y: ['Runs', 'Failures'], colors: STEP_COLORS, labelEvery: 16 }
const BY_JOB: ChartSpec = { rows: JOB_STEP_ROWS, x: 'time', y: 'runs', series: 'job', labelEvery: 16 }
const PERCENTILES: ChartSpec = { rows: STEP_ROWS, x: 'time', y: ['p50', 'p90', 'p99'], colors: STEP_COLORS, unit: 's', labelEvery: 16 }

const TWO_LEGEND = chartLegend('line', TWO)
const BY_JOB_LEGEND = chartLegend('line', BY_JOB)
const PERCENTILE_LEGEND = chartLegend('line', PERCENTILES)

/** Runs and failures across the day, the failures inked in the failed state's color. */
export const TwoSeries: StoryObj = {
    name: 'Two series',
    render: () => (
        <Ground title="Runs, today" columns={1}>
            <ChartFrame title="Runs and failures" subtitle="every 15 min" legend={TWO_LEGEND} file="runs-and-failures">
                {(state) => <Chart kind="line" label="Runs and failures across the day" {...TWO} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}

/** Five jobs' runs, with the legend as a table of each series' min, max, mean and current value. */
export const LegendTable: StoryObj = {
    name: 'Legend table',
    render: () => (
        <Ground title="Runs by job, today" columns={1}>
            <ChartFrame
                title="Runs by job"
                info="Runs started in each fifteen-minute step, by job."
                legend={BY_JOB_LEGEND}
                legendMode="table"
                file="runs-by-job"
                bodyClassName="h-64"
            >
                {(state) => <Chart kind="line" label="Runs by job across the day" {...BY_JOB} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}

/** Run duration at the 50th, 90th and 99th percentile, in seconds. */
export const Percentiles: StoryObj = {
    render: () => (
        <Ground title="Durations, today" columns={1}>
            <ChartFrame
                title="Run duration"
                subtitle="percentiles"
                legend={PERCENTILE_LEGEND}
                legendMode="table"
                legendFormat={(value) => `${value.toFixed(1)}s`}
                file="run-duration"
            >
                {(state) => <Chart kind="line" label="Run duration percentiles across the day" {...PERCENTILES} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}
