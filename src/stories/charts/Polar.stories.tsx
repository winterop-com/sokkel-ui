import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { RUN_PROJECTS, RUN_ROWS, RUN_STATES, STATE_COLORS } from '../fixtures/runRows'
import { Framed, Ground } from './Ground'

/**
 * Categories around a center, drawn from a month of Tidevann's runs: `Chart` with the radar kind
 * puts the categories on spokes and draws a polygon per series, and the rose kind gives each
 * category a wedge as long as its figure.
 */
const meta: Meta = { title: 'Charts/Polar' }
export default meta

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)

const RUNS_BY_WEEKDAY: ChartSpec = { rows: RUN_ROWS, x: 'weekday', series: 'project', order: WEEKDAYS, seriesOrder: [...RUN_PROJECTS] }
const DURATION_BY_REGION: ChartSpec = { rows: RUN_ROWS, x: 'region', y: 'duration', series: 'project', aggregate: 'avg', unit: ' s' }
const RUNS_BY_JOB: ChartSpec = { rows: RUN_ROWS, x: 'job' }
const WAIT_BY_WEEKDAY: ChartSpec = {
    rows: RUN_ROWS,
    x: 'weekday',
    y: 'wait',
    aggregate: 'avg',
    order: WEEKDAYS,
    colors: { wait: 'chart-4' },
    unit: ' s',
}
const RUNS_BY_HOUR: ChartSpec = {
    rows: RUN_ROWS,
    x: 'hour',
    series: 'state',
    order: HOURS,
    seriesOrder: [...RUN_STATES],
    colors: STATE_COLORS,
}

/** Each project's runs per weekday, and its average duration in each region, one polygon per project. */
export const Radar: StoryObj = {
    render: () => (
        <Ground title="Runs, October">
            <Framed
                kind="radar"
                spec={RUNS_BY_WEEKDAY}
                title="Runs by weekday"
                subtitle="per project"
                label="Each project's runs per weekday"
            />
            <Framed
                kind="radar"
                spec={DURATION_BY_REGION}
                title="Duration by region"
                subtitle="average, per project"
                label="Each project's average run duration per region"
            />
        </Ground>
    ),
}

/** The runs of each job as wedges, and the average queue wait on each weekday in a color of its own. */
export const Rose: StoryObj = {
    render: () => (
        <Ground title="Runs, October">
            <Framed kind="rose" spec={RUNS_BY_JOB} title="Runs by job" label="Runs per job, as wedges" />
            <Framed
                kind="rose"
                spec={WAIT_BY_WEEKDAY}
                title="Queue wait by weekday"
                subtitle="average"
                label="Average queue wait per weekday, as wedges"
            />
        </Ground>
    ),
}

/** When runs start around the clock, each hour's wedge stacked by state. */
export const Clock: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed
                kind="rose"
                spec={RUNS_BY_HOUR}
                title="When runs start"
                subtitle="by hour, stacked by state"
                label="Runs per starting hour around the clock, stacked by state"
                bodyClassName="h-80"
            />
        </Ground>
    ),
}
