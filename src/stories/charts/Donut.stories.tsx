import type { Meta, StoryObj } from '@storybook/react-vite'

import { ChartFrame } from '../../components/chart/ChartFrame'
import { EChart } from '../../components/chart/EChart'
import { Ground, legendOf } from './Ground'
import { donut, STATE_SLICES } from './options'

/** A donut on EChart: the day's runs by state, the total in the middle, the legend under it. */
const meta: Meta = { title: 'Charts/Donut' }
export default meta

const OPTION = donut(STATE_SLICES)

/** The day's runs by state. */
export const ByState: StoryObj = {
    name: 'By state',
    render: () => (
        <Ground title="Runs, today" columns={1}>
            <div className="max-w-sm">
                <ChartFrame
                    title="Runs by state"
                    legend={legendOf(STATE_SLICES).map((item) => ({
                        ...item,
                        value: item.values?.[0]?.toLocaleString('en-US'),
                        values: undefined,
                    }))}
                    file="runs-by-state"
                >
                    {(state) => <EChart option={OPTION} label="Runs by state" {...state} />}
                </ChartFrame>
            </div>
        </Ground>
    ),
}
