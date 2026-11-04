import type { Meta, StoryObj } from '@storybook/react-vite'

import { ChartFrame } from '../../components/chart/ChartFrame'
import { EChart } from '../../components/chart/EChart'
import { Ground, legendOf } from './Ground'
import { BY_STATE_SERIES, histogram, stackedBars } from './options'

/** Bar charts on EChart: runs per hour stacked by state, and runs per duration bucket. */
const meta: Meta = { title: 'Charts/Bars' }
export default meta

const STACKED = stackedBars(BY_STATE_SERIES)
const HISTOGRAM = histogram()

/** Runs per hour, stacked by state in the run states' colors. */
export const Stacked: StoryObj = {
    render: () => (
        <Ground title="Runs by state, today" columns={1}>
            <ChartFrame title="Runs by state" subtitle="per hour" legend={legendOf(BY_STATE_SERIES)} file="runs-by-state">
                {(state) => <EChart option={STACKED} label="Runs per hour, stacked by state" {...state} />}
            </ChartFrame>
        </Ground>
    ),
}

/** The day's runs by how long they took, as tall bars with almost no gap. */
export const Histogram: StoryObj = {
    render: () => (
        <Ground title="Durations, today" columns={1}>
            <ChartFrame title="Run duration" subtitle="distribution" file="duration-histogram">
                {(state) => <EChart option={HISTOGRAM} label="Runs by duration" {...state} />}
            </ChartFrame>
        </Ground>
    ),
}
