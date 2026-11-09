import type { Meta, StoryObj } from '@storybook/react-vite'

import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'
import { chartLegend } from '@winterop-com/sokkel-ui-charts/chart-legend'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { STATE_HOUR_ROWS, STATE_LABEL_COLORS } from '../fixtures/dayRows'
import { Ground } from './Ground'

/** A donut on Chart: the day's runs by state, the total in the middle, the legend under it; and the same slices as a pie. */
const meta: Meta = { title: 'Charts/Donut' }
export default meta

const BY_STATE: ChartSpec = { rows: STATE_HOUR_ROWS, x: 'state', y: 'runs', colors: STATE_LABEL_COLORS, total: 'runs' }
const LEGEND = chartLegend('donut', BY_STATE).map((item) => ({
    ...item,
    value: item.values?.[0]?.toLocaleString('en-US'),
    values: undefined,
}))

/** The day's runs by state. */
export const ByState: StoryObj = {
    name: 'By state',
    render: () => (
        <Ground title="Runs, today" columns={1}>
            <div className="max-w-sm">
                <ChartFrame title="Runs by state" legend={LEGEND} file="runs-by-state">
                    {(state) => <Chart kind="donut" label="Runs by state" {...BY_STATE} {...state} />}
                </ChartFrame>
            </div>
        </Ground>
    ),
}

/** The same runs by state as a pie: whole slices with no hole, the figures in the legend. */
export const Pie: StoryObj = {
    render: () => (
        <Ground title="Runs, today" columns={1}>
            <div className="max-w-sm">
                <ChartFrame title="Runs by state" legend={LEGEND} file="runs-by-state">
                    {(state) => <Chart kind="pie" label="Runs by state" {...BY_STATE} {...state} />}
                </ChartFrame>
            </div>
        </Ground>
    ),
}
