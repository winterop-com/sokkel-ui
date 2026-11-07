import type { Meta, StoryObj } from '@storybook/react-vite'

import { Chart, chartLegend } from '@winterop-com/sokkel-ui-charts/Chart'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { JOB_STEP_ROWS, STEP_COLORS, STEP_ROWS, WORKER_COLORS, WORKER_STEP_ROWS } from '../fixtures/dayRows'
import { Ground } from './Ground'

/** Area charts on Chart: lines filled toward the axis, alone or stacked. */
const meta: Meta = { title: 'Charts/Area' }
export default meta

const SINGLE: ChartSpec = { rows: STEP_ROWS, x: 'time', y: 'Runs', colors: STEP_COLORS, fill: 'gradient', labelEvery: 16 }
const OVERLAP: ChartSpec = {
    rows: WORKER_STEP_ROWS,
    x: 'time',
    y: 'waiting',
    series: 'worker',
    colors: WORKER_COLORS,
    fill: 'gradient',
    labelEvery: 16,
}
const STACKED: ChartSpec = { rows: JOB_STEP_ROWS, x: 'time', y: 'runs', series: 'job', stack: 'stacked', fill: 'gradient', labelEvery: 16 }

const OVERLAP_LEGEND = chartLegend('area', OVERLAP)
const STACKED_LEGEND = chartLegend('area', STACKED)

/** One series filled with a fade toward the axis. */
export const Single: StoryObj = {
    render: () => (
        <Ground title="Runs, today" columns={1}>
            <ChartFrame title="Runs started" subtitle="every 15 min" file="runs-started">
                {(state) => <Chart kind="area" label="Runs started across the day" {...SINGLE} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}

/** Four workers' queue depth, overlapping, each faded. */
export const Overlapping: StoryObj = {
    render: () => (
        <Ground title="Queue, today" columns={1}>
            <ChartFrame title="Queue depth" subtitle="by worker" legend={OVERLAP_LEGEND} file="queue-depth">
                {(state) => <Chart kind="area" label="Queue depth by worker across the day" {...OVERLAP} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}

/** Five jobs' runs stacked to the day's total. */
export const Stacked: StoryObj = {
    render: () => (
        <Ground title="Runs by job, today" columns={1}>
            <ChartFrame title="Runs by job" subtitle="stacked" legend={STACKED_LEGEND} file="runs-by-job-stacked" bodyClassName="h-64">
                {(state) => <Chart kind="area" label="Runs by job, stacked, across the day" {...STACKED} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}
