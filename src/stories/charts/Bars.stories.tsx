import type { Meta, StoryObj } from '@storybook/react-vite'

import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'
import { chartLegend } from '@winterop-com/sokkel-ui-charts/chart-legend'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { BarPanel } from '@winterop-com/sokkel-ui-charts/dashboard/BarPanel'
import type { PanelSeries } from '@winterop-com/sokkel-ui-charts/dashboard/series'
import { DURATION_ROWS, STATE_HOUR_ROWS, STATE_LABEL_COLORS } from '../fixtures/dayRows'
import { JOB_STATES, MONTHS, PROJECT_MONTHLY, SHARE_JOBS } from '../fixtures/scores'
import { Ground } from './Ground'

/**
 * Bar charts: runs per hour stacked by state and runs per duration bucket on Chart, and each
 * month's or job's runs as shares of 100% on the dashboard's bar panel.
 */
const meta: Meta = { title: 'Charts/Bars' }
export default meta

const STACKED: ChartSpec = {
    rows: STATE_HOUR_ROWS,
    x: 'hour',
    y: 'runs',
    series: 'state',
    colors: STATE_LABEL_COLORS,
    stack: 'stacked',
    labelEvery: 4,
}
const STACKED_LEGEND = chartLegend('bar', STACKED)
const HISTOGRAM: ChartSpec = { rows: DURATION_ROWS, x: 'bucket', y: 'runs', gap: 'tight' }

const STATE_TOKENS = { succeeded: 'status-succeeded', failed: 'status-failed', cancelled: 'status-cancelled', skipped: 'status-skipped' }
const stateSeries = (source: Record<keyof typeof STATE_TOKENS, readonly number[]>): PanelSeries[] =>
    (Object.keys(STATE_TOKENS) as (keyof typeof STATE_TOKENS)[]).map((state) => ({
        name: state[0].toUpperCase() + state.slice(1),
        values: source[state],
        color: STATE_TOKENS[state],
    }))
const JOB_SHARES = stateSeries(JOB_STATES)
const PROJECT_SHARES: PanelSeries[] = [
    { name: 'harbor', values: PROJECT_MONTHLY.harbor, color: 'chart-2' },
    { name: 'juniper', values: PROJECT_MONTHLY.juniper, color: 'chart-3' },
    { name: 'larkspur', values: PROJECT_MONTHLY.larkspur, color: 'chart-4' },
]

/** Runs per hour, stacked by state in the run states' colors. */
export const Stacked: StoryObj = {
    render: () => (
        <Ground title="Runs by state, today" columns={1}>
            <ChartFrame title="Runs by state" subtitle="per hour" legend={STACKED_LEGEND} file="runs-by-state">
                {(state) => <Chart kind="bar" label="Runs per hour, stacked by state" {...STACKED} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}

/** Each month's runs as shares of 100% by project, so the months compare whatever their volume. */
export const Percent: StoryObj = {
    render: () => (
        <Ground title="Runs, first half" columns={1}>
            <BarPanel title="Runs by project" subtitle="share per month" x={MONTHS} series={PROJECT_SHARES} stacked="percent" span="full" />
        </Ground>
    ),
}

/** This week's runs per job as shares of 100%, lying down so the job names read in full. */
export const PercentLying: StoryObj = {
    name: 'Percent lying',
    render: () => (
        <Ground title="Runs by job, this week" columns={1}>
            <BarPanel
                title="How runs ended"
                subtitle="share per job"
                x={SHARE_JOBS}
                series={JOB_SHARES}
                stacked="percent"
                horizontal
                span="full"
            />
        </Ground>
    ),
}

/** The day's runs by how long they took, as tall bars with almost no gap. */
export const Histogram: StoryObj = {
    render: () => (
        <Ground title="Durations, today" columns={1}>
            <ChartFrame title="Run duration" subtitle="distribution" file="duration-histogram">
                {(state) => <Chart kind="bar" label="Runs by duration" {...HISTOGRAM} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}
