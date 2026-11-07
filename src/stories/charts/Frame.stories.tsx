import type { Meta, StoryObj } from '@storybook/react-vite'

import { Chart, chartLegend } from '@winterop-com/sokkel-ui-charts/Chart'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import { ChartLegend } from '@winterop-com/sokkel-ui-charts/ChartLegend'
import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { JOB_STEP_ROWS, STEP_COLORS, STEP_ROWS } from '../fixtures/dayRows'
import { Ground } from './Ground'

/** The chart frame and legend on their own: the frame's states, and the legend in both modes. */
const meta: Meta = { title: 'Charts/Frame' }
export default meta

const TWO: ChartSpec = { rows: STEP_ROWS, x: 'time', y: ['Runs', 'Failures'], colors: STEP_COLORS, labelEvery: 16 }
const TWO_LEGEND = chartLegend('line', TWO)
const BY_JOB_LEGEND = chartLegend('line', { rows: JOB_STEP_ROWS, x: 'time', y: 'runs', series: 'job' })

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
