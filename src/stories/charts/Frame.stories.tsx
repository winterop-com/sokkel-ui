import type { Meta, StoryObj } from '@storybook/react-vite'

import { ChartFrame } from '../../components/chart/ChartFrame'
import { ChartLegend } from '../../components/chart/ChartLegend'
import { EChart } from '../../components/chart/EChart'
import { Ground, legendOf } from './Ground'
import { BY_JOB, lines, TWO } from './options'

/** The chart frame and legend on their own: the frame's states, and the legend in both modes. */
const meta: Meta = { title: 'Charts/Frame' }
export default meta

const OPTION = lines(TWO)

/** The legend as a wrapped row, one series switched off. */
export const LegendList: StoryObj = {
    name: 'Legend list',
    render: () => (
        <Ground title="Legend" columns={1}>
            <ChartLegend items={legendOf(BY_JOB)} hidden={new Set(['rebuild-index'])} />
        </Ground>
    ),
}

/** The legend as a table of each series' figures. */
export const LegendTable: StoryObj = {
    name: 'Legend table',
    render: () => (
        <Ground title="Legend" columns={1}>
            <ChartLegend items={legendOf(BY_JOB)} mode="table" hidden={new Set(['rebuild-index'])} />
        </Ground>
    ),
}

/** A frame while its data loads, and one with nothing to show. */
export const States: StoryObj = {
    render: () => (
        <Ground title="Panels">
            <ChartFrame title="Runs and failures" legend={legendOf(TWO)} loading>
                {(state) => <EChart option={OPTION} label="Runs and failures across the day" {...state} />}
            </ChartFrame>
            <ChartFrame title="Cancelled runs" empty>
                {(state) => <EChart option={OPTION} label="Cancelled runs" {...state} />}
            </ChartFrame>
        </Ground>
    ),
}
