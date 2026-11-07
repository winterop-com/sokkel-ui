import type { Meta, StoryObj } from '@storybook/react-vite'

import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { IMPORT_ROWS } from '../fixtures/dayRows'
import { Ground } from './Ground'

/** A scatter chart on Chart: each run of a job by the rows it read and the time it took. */
const meta: Meta = { title: 'Charts/Scatter' }
export default meta

const ROWS_AND_TIME: ChartSpec = {
    rows: IMPORT_ROWS,
    x: 'rows',
    y: 'seconds',
    series: 'job',
    colors: { 'import-orders': 'chart-4' },
    unit: 's',
    fieldNames: { rows: 'Rows read', seconds: 'Seconds' },
}

/** Every import-orders run of the day, the slow outliers standing above the trend. */
export const RowsAndTime: StoryObj = {
    name: 'Rows and time',
    render: () => (
        <Ground title="import-orders, today" columns={1}>
            <ChartFrame title="Rows read and time taken" subtitle="import-orders" file="rows-and-time" bodyClassName="h-72">
                {(state) => <Chart kind="scatter" label="Rows read against seconds taken, per run" {...ROWS_AND_TIME} {...state} />}
            </ChartFrame>
        </Ground>
    ),
}
