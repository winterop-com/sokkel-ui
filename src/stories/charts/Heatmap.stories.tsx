import type { Meta, StoryObj } from '@storybook/react-vite'

import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { DURATION_ROWS } from '../fixtures/dayRows'
import { BUCKETS } from '../fixtures/runs'
import { Ground } from './Ground'

/** A heatmap on Chart: runs per hour and duration bucket, with its color scale beside it. */
const meta: Meta = { title: 'Charts/Heatmap' }
export default meta

const BY_HOUR: ChartSpec = {
    rows: DURATION_ROWS,
    x: 'hour',
    y: 'runs',
    series: 'bucket',
    seriesOrder: [...BUCKETS].reverse(),
    showScale: true,
    labelEvery: 4,
}
const WARM: ChartSpec = { ...BY_HOUR, colors: { value: 'warning' } }
const COOL: ChartSpec = { ...BY_HOUR, colors: { value: 'chart-2' } }

/** Runs per hour and duration bucket, shaded from the card to the warning color. */
export const ByHour: StoryObj = {
    name: 'By hour',
    render: () => (
        <Ground title="Durations, today" columns={1}>
            <ChartFrame title="Run duration" subtitle="by hour" file="duration-heatmap" bodyClassName="h-64">
                {(state) => <Chart kind="heatmap" label="Runs per hour and duration bucket" {...WARM} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}

/** The same cells on a cool scale. */
export const CoolScale: StoryObj = {
    name: 'Cool scale',
    render: () => (
        <Ground title="Durations, today" columns={1}>
            <ChartFrame title="Run duration" subtitle="by hour" file="duration-heatmap-cool" bodyClassName="h-64">
                {(state) => <Chart kind="heatmap" label="Runs per hour and duration bucket" {...COOL} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}
