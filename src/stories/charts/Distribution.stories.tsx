import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { RUN_PROJECTS, RUN_ROWS, RUN_STATES, RUN_WORKERS, STATE_COLORS } from '../fixtures/runRows'
import { Framed, Ground } from './Ground'

/**
 * How a number spreads, drawn from a month of Tidevann's runs: `Chart` with the histogram kind bins
 * one field and counts the runs in each bin, and the box plot kind shows each category's quartiles,
 * median, reach and outliers.
 */
const meta: Meta = { title: 'Charts/Distribution' }
export default meta

const DURATIONS: ChartSpec = { rows: RUN_ROWS, x: 'duration', unit: ' s' }
const DURATIONS_BY_STATE: ChartSpec = {
    rows: RUN_ROWS,
    x: 'duration',
    series: 'state',
    seriesOrder: [...RUN_STATES],
    colors: STATE_COLORS,
    stack: 'stacked',
    bins: { width: 50 },
    unit: ' s',
}
const WAIT_BY_PROJECT: ChartSpec = { rows: RUN_ROWS, x: 'wait', series: 'project', seriesOrder: [...RUN_PROJECTS], bins: 12, unit: ' s' }
const DURATION_BY_JOB: ChartSpec = { rows: RUN_ROWS, x: 'job', y: 'duration', unit: ' s' }
const WAIT_BY_WORKER: ChartSpec = {
    rows: RUN_ROWS,
    x: 'worker',
    y: 'wait',
    order: [...RUN_WORKERS],
    horizontal: true,
    colors: { wait: 'chart-4' },
    unit: ' s',
}

/** Every run's duration in bins of a round width, chosen from how many runs there are. */
export const Histogram: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed kind="histogram" spec={DURATIONS} title="Duration" subtitle="runs per bin" label="Runs by how long they took" />
        </Ground>
    ),
}

/** Durations in 50-second bins stacked by state, and queue waits in twelve bins with each project overlaid. */
export const Groups: StoryObj = {
    render: () => (
        <Ground title="Runs, October">
            <Framed
                kind="histogram"
                spec={DURATIONS_BY_STATE}
                title="Duration by state"
                subtitle="50 s bins"
                label="Runs by how long they took, stacked by state"
            />
            <Framed
                kind="histogram"
                spec={WAIT_BY_PROJECT}
                title="Queue wait by project"
                subtitle="overlaid"
                label="Runs by how long they waited, one layer per project"
            />
        </Ground>
    ),
}

/** Each job's durations as a box with its outliers, and each worker's queue waits running sideways. */
export const BoxPlot: StoryObj = {
    name: 'Box plot',
    render: () => (
        <Ground title="Runs, October">
            <Framed kind="boxplot" spec={DURATION_BY_JOB} title="Duration by job" label="The spread of each job's run durations" />
            <Framed kind="boxplot" spec={WAIT_BY_WORKER} title="Queue wait by worker" label="The spread of each worker's queue waits" />
        </Ground>
    ),
}
