import type { Meta, StoryObj } from '@storybook/react-vite'

import { ChartFrame } from '../../components/chart/ChartFrame'
import { EChart } from '../../components/chart/EChart'
import { Ground, legendOf } from './Ground'
import { BY_JOB, lines, PERCENTILES, TWO } from './options'

/** Line charts on EChart: series over the day in fifteen-minute steps, with the legend under the chart driving it. */
const meta: Meta = { title: 'Charts/Line' }
export default meta

const TWO_OPTION = lines(TWO)
const BY_JOB_OPTION = lines(BY_JOB)
const PERCENTILE_OPTION = lines(PERCENTILES, 's')

/** Runs and failures across the day, the failures inked in the failed state's color. */
export const TwoSeries: StoryObj = {
    name: 'Two series',
    render: () => (
        <Ground title="Runs, today" columns={1}>
            <ChartFrame title="Runs and failures" subtitle="every 15 min" legend={legendOf(TWO)} file="runs-and-failures">
                {(state) => <EChart option={TWO_OPTION} label="Runs and failures across the day" {...state} />}
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
                legend={legendOf(BY_JOB)}
                legendMode="table"
                file="runs-by-job"
                bodyClassName="h-64"
            >
                {(state) => <EChart option={BY_JOB_OPTION} label="Runs by job across the day" {...state} />}
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
                legend={legendOf(PERCENTILES)}
                legendMode="table"
                legendFormat={(value) => `${value.toFixed(1)}s`}
                file="run-duration"
            >
                {(state) => <EChart option={PERCENTILE_OPTION} label="Run duration percentiles across the day" {...state} />}
            </ChartFrame>
        </Ground>
    ),
}
