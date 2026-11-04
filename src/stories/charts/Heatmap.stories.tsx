import type { Meta, StoryObj } from '@storybook/react-vite'

import { ChartFrame } from '../../components/chart/ChartFrame'
import { EChart } from '../../components/chart/EChart'
import { Ground } from './Ground'
import { heatmap } from './options'

/** A heatmap on EChart: runs per hour and duration bucket, with its color scale beside it. */
const meta: Meta = { title: 'Charts/Heatmap' }
export default meta

const WARM = heatmap('warning')
const COOL = heatmap('chart-2')

/** Runs per hour and duration bucket, shaded from the card to the warning color. */
export const ByHour: StoryObj = {
    name: 'By hour',
    render: () => (
        <Ground title="Durations, today" columns={1}>
            <ChartFrame title="Run duration" subtitle="by hour" file="duration-heatmap" bodyClassName="h-64">
                {(state) => <EChart option={WARM} label="Runs per hour and duration bucket" {...state} />}
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
                {(state) => <EChart option={COOL} label="Runs per hour and duration bucket" {...state} />}
            </ChartFrame>
        </Ground>
    ),
}
