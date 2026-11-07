import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { RUN_DAYS } from '../fixtures/runDays'
import { RUN_ROWS } from '../fixtures/runRows'
import { Framed, Ground } from './Ground'

/**
 * Figures over time drawn from rows, beyond lines and areas: a `stream` of series swelling around
 * a middle line, a `step` line for levels that change at moments, and a `range`, a band of spread
 * with its middle drawn through it. Tidevann's runs for October, and its project days for the year.
 */
const meta: Meta = { title: 'Charts/Trends' }
export default meta

const ROWS_BY_JOB: ChartSpec = { rows: RUN_ROWS, x: 'day', y: 'rows', series: 'job' }
const RUNS_BY_PROJECT: ChartSpec = { rows: RUN_DAYS, x: 'week', y: 'runs', series: 'project' }
const WORKERS: ChartSpec = { rows: RUN_DAYS, x: 'week', y: 'workers', series: 'project', aggregate: 'max' }
const WAIT_SPREAD: ChartSpec = { rows: RUN_ROWS, x: 'day', y: 'wait', unit: ' s' }
const DURATION_BANDS: ChartSpec = { rows: RUN_DAYS, x: 'week', y: ['p10', 'p50', 'p90'], series: 'project', unit: ' s', smooth: true }

/** Rows moved per day as a stream of the five jobs, and the year's runs per week by project. */
export const Stream: StoryObj = {
    render: () => (
        <Ground title="Runs">
            <Framed kind="stream" spec={ROWS_BY_JOB} title="Rows moved" subtitle="per day, October" label="Rows moved per day by job" />
            <Framed kind="stream" spec={RUNS_BY_PROJECT} title="Runs" subtitle="per week, 2026" label="Runs per week by project" />
        </Ground>
    ),
}

/** The workers in each project's pool by week: flat between the days a pool grew or shrank. */
export const Steps: StoryObj = {
    render: () => (
        <Ground title="Workers, 2026" columns={1}>
            <Framed kind="step" spec={WORKERS} title="Workers" subtitle="per project" label="Workers in each project's pool by week" />
        </Ground>
    ),
}

/** How long runs waited each day: the median, inside a band from the 10th to the 90th percentile. */
export const Range: StoryObj = {
    render: () => (
        <Ground title="Queue wait, October" columns={1}>
            <Framed
                kind="range"
                spec={WAIT_SPREAD}
                title="Queue wait"
                subtitle="median, 10th to 90th percentile"
                label="Queue wait per day"
            />
        </Ground>
    ),
}

/** Each project's weekly run durations from three fields of figures: the typical day inside its fastest and slowest. */
export const Bands: StoryObj = {
    render: () => (
        <Ground title="Durations, 2026" columns={1}>
            <Framed
                kind="range"
                spec={DURATION_BANDS}
                title="Run duration"
                subtitle="p50 within p10 to p90, per week"
                label="Run duration per week by project, the median within the 10th to 90th percentile"
                bodyClassName="h-72"
            />
        </Ground>
    ),
}
