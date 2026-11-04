import type { Meta, StoryObj } from '@storybook/react-vite'

import { ChartFrame } from '../../components/chart/ChartFrame'
import { EChart } from '../../components/chart/EChart'
import { Ground, legendOf } from './Ground'
import { areas, BY_JOB, BY_WORKER, TWO } from './options'

/** Area charts on EChart: lines filled toward the axis, alone or stacked. */
const meta: Meta = { title: 'Charts/Area' }
export default meta

const RUNS = TWO.slice(0, 1)
const SINGLE = areas(RUNS)
const OVERLAP = areas(BY_WORKER)
const STACKED = areas(BY_JOB, true)

/** One series filled with a fade toward the axis. */
export const Single: StoryObj = {
    render: () => (
        <Ground title="Runs, today" columns={1}>
            <ChartFrame title="Runs started" subtitle="every 15 min" file="runs-started">
                {(state) => <EChart option={SINGLE} label="Runs started across the day" {...state} />}
            </ChartFrame>
        </Ground>
    ),
}

/** Four workers' queue depth, overlapping, each faded. */
export const Overlapping: StoryObj = {
    render: () => (
        <Ground title="Queue, today" columns={1}>
            <ChartFrame title="Queue depth" subtitle="by worker" legend={legendOf(BY_WORKER)} file="queue-depth">
                {(state) => <EChart option={OVERLAP} label="Queue depth by worker across the day" {...state} />}
            </ChartFrame>
        </Ground>
    ),
}

/** Five jobs' runs stacked to the day's total. */
export const Stacked: StoryObj = {
    render: () => (
        <Ground title="Runs by job, today" columns={1}>
            <ChartFrame title="Runs by job" subtitle="stacked" legend={legendOf(BY_JOB)} file="runs-by-job-stacked" bodyClassName="h-64">
                {(state) => <EChart option={STACKED} label="Runs by job, stacked, across the day" {...state} />}
            </ChartFrame>
        </Ground>
    ),
}
