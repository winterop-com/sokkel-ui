import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '../../components/chart/kinds'
import { RUN_RATES } from '../fixtures/runMeasures'
import { Framed, Ground } from './Ground'

/**
 * Two measures over the same categories, drawn from a month of Tidevann's runs: `Chart` with the
 * dual kind draws the first field as bars on the left axis and the second as a line on the right,
 * each combined its own way and written with its own unit.
 */
const meta: Meta = { title: 'Charts/Dual' }
export default meta

const RUNS_AND_FAILURES: ChartSpec = {
    rows: RUN_RATES,
    x: 'day',
    y: ['runs', 'failure rate'],
    aggregate: ['sum', 'avg'],
    colors: { 'failure rate': 'status-failed' },
    unit: ['', '%'],
}
const ROWS_AND_WAIT: ChartSpec = {
    rows: RUN_RATES,
    x: 'job',
    y: ['rows', 'wait'],
    aggregate: ['sum', 'p90'],
    colors: { wait: 'chart-4' },
    unit: ['', ' s'],
    smooth: true,
}

/** The runs each day in bars, and the share of them that failed in a line on its own axis. */
export const Failures: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed
                kind="dual"
                spec={RUNS_AND_FAILURES}
                title="Runs and failure rate"
                subtitle="per day"
                label="Runs per day, with the share that failed"
            />
        </Ground>
    ),
}

/** The rows each job moved in bars, and the 90th percentile of its queue wait in a line, smooth. */
export const Wait: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed
                kind="dual"
                spec={ROWS_AND_WAIT}
                title="Rows moved and queue wait"
                subtitle="per job"
                label="Rows moved per job, with the 90th percentile of queue wait"
            />
        </Ground>
    ),
}
