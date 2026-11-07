import type { Meta, StoryObj } from '@storybook/react-vite'

import { ComboPanel, type ComboSeries } from '@winterop-com/sokkel-ui-charts/dashboard/ComboPanel'
import { FAILURE_TARGET, WEEKLY_BY_STATE, WEEKLY_FAILURE_RATE, WEEKLY_RUNS, WEEKLY_SUCCESS_RATE, WEEKS } from '../fixtures/scores'
import { Ground } from './Ground'

/** Bars and lines over the same weeks on EChart, a count on the left axis and a rate on the right. */
const meta: Meta = { title: 'Charts/Combined' }
export default meta

const RUNS_AND_RATE: ComboSeries[] = [
    { name: 'Runs', kind: 'bar', values: WEEKLY_RUNS, color: 'chart-2' },
    { name: 'Failure rate', kind: 'line', axis: 'right', values: WEEKLY_FAILURE_RATE, color: 'status-failed' },
    { name: 'Target', kind: 'line', axis: 'right', values: FAILURE_TARGET, color: 'muted-foreground', dashed: true },
]

const STATES_AND_SUCCESS: ComboSeries[] = [
    { name: 'Failed', kind: 'bar', values: WEEKLY_BY_STATE.failed, color: 'status-failed' },
    { name: 'Cancelled', kind: 'bar', values: WEEKLY_BY_STATE.cancelled, color: 'status-cancelled' },
    { name: 'Skipped', kind: 'bar', values: WEEKLY_BY_STATE.skipped, color: 'status-skipped' },
    { name: 'Success rate', kind: 'line', axis: 'right', values: WEEKLY_SUCCESS_RATE, color: 'chart-2' },
]

const RUNS_AXIS = { name: 'Runs' }
const RATE_AXIS = { name: 'Failure rate', unit: '%', decimals: 2, min: 0 }
const SUCCESS_AXIS = { name: 'Success rate', unit: '%', decimals: 1, min: 95, max: 100 }

/** Runs each week in bars on the left axis, the failure rate and its target in lines on the right. */
export const TwoAxes: StoryObj = {
    name: 'Two axes',
    render: () => (
        <Ground title="Runs, twelve weeks" columns={1}>
            <ComboPanel
                title="Runs and failure rate"
                subtitle="per week"
                x={WEEKS}
                series={RUNS_AND_RATE}
                left={RUNS_AXIS}
                right={RATE_AXIS}
                span="full"
                file="runs-and-failure-rate"
            />
        </Ground>
    ),
}

/** The runs each week that did not succeed, stacked by state, with the success rate drawn over them on its own axis. */
export const Stacked: StoryObj = {
    render: () => (
        <Ground title="Runs, twelve weeks" columns={1}>
            <ComboPanel
                title="Unsuccessful runs and success rate"
                subtitle="per week"
                info="Runs each week that failed, were cancelled or were skipped; the line is the share of all runs that succeeded."
                x={WEEKS}
                series={STATES_AND_SUCCESS}
                left={RUNS_AXIS}
                right={SUCCESS_AXIS}
                stacked
                span="full"
                bodyClassName="h-64"
                file="unsuccessful-runs-and-success-rate"
            />
        </Ground>
    ),
}
