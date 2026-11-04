import type { Meta, StoryObj } from '@storybook/react-vite'

import { ChartFrame } from '../../components/chart/ChartFrame'
import { EChart } from '../../components/chart/EChart'
import { Ground } from './Ground'
import { scatter } from './options'

/** A scatter chart on EChart: each run of a job by the rows it read and the time it took. */
const meta: Meta = { title: 'Charts/Scatter' }
export default meta

const OPTION = scatter()

/** Every import-orders run of the day, the slow outliers standing above the trend. */
export const RowsAndTime: StoryObj = {
    name: 'Rows and time',
    render: () => (
        <Ground title="import-orders, today" columns={1}>
            <ChartFrame title="Rows read and time taken" subtitle="import-orders" file="rows-and-time" bodyClassName="h-72">
                {(state) => <EChart option={OPTION} label="Rows read against seconds taken, per run" {...state} />}
            </ChartFrame>
        </Ground>
    ),
}
