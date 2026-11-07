import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '../../components/chart/kinds'
import { RUN_ROWS, RUN_STATES, STATE_COLORS } from '../fixtures/runRows'
import { Framed, Ground } from './Ground'

/**
 * Parallel coordinates drawn from rows: `parallel` takes a month of Tidevann's runs and several
 * fields, one upright axis each, and draws every run as a line through its values, colored by a
 * field. A field of numbers gets a scale and any other its labels.
 */
const meta: Meta = { title: 'Charts/Parallel' }
export default meta

const BY_PROJECT: ChartSpec = { rows: RUN_ROWS, y: ['duration', 'rows', 'wait'], series: 'project' }
const BY_STATE: ChartSpec = {
    rows: RUN_ROWS,
    y: ['duration', 'rows', 'wait', 'hour', 'worker'],
    series: 'state',
    seriesOrder: [...RUN_STATES],
    colors: STATE_COLORS,
}

/** Each run's duration, rows moved and queue wait, colored by project. */
export const Projects: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed
                kind="parallel"
                spec={BY_PROJECT}
                title="Runs"
                subtitle="by project"
                label="Each run's duration, rows and wait, by project"
            />
        </Ground>
    ),
}

/** Five axes, two of them labels, colored by state: failed runs move no rows and stop early. */
export const States: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed
                kind="parallel"
                spec={BY_STATE}
                title="Runs"
                subtitle="by state"
                label="Each run's duration, rows, wait, hour and worker, by state"
                bodyClassName="h-72"
            />
        </Ground>
    ),
}
