import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '../../components/chart/kinds'
import { CARRY_STEPS, INDEX_ROWS, STEP_ROWS } from '../fixtures/runMeasures'
import { RUN_ROWS, STATE_COLORS } from '../fixtures/runRows'
import { Framed, Ground } from './Ground'

/**
 * What adds up, what drops out and where it goes, drawn from Tidevann's runs: `Chart` with the
 * waterfall kind runs a total across categories, rises and falls in their own tones; the funnel kind
 * narrows stages by their figure, each with its share of the first; and the sankey kind takes a
 * `path` of stages and draws each run from its label at one stage to its label at the next, bands as
 * wide as the runs or a figure. A sankey's legend lists the first stage; hiding one takes its flows
 * out.
 */
const meta: Meta = { title: 'Charts/Flows' }
export default meta

const FIRST_DAYS = Array.from({ length: 14 }, (_, day) => `Oct ${String(day + 1)}`)
const INDEX_BY_DAY: ChartSpec = {
    rows: INDEX_ROWS.filter((row) => FIRST_DAYS.includes(row.date)),
    x: 'date',
    y: 'change',
    order: FIRST_DAYS,
}
const INDEX_BY_JOB: ChartSpec = {
    rows: INDEX_ROWS,
    x: 'job',
    y: 'change',
    order: ['import-orders', 'sync-inventory', 'rebuild-index', 'nightly-export'],
}
const ROWS_THROUGH_STEPS: ChartSpec = { rows: STEP_ROWS, x: 'step', y: 'rows', order: CARRY_STEPS }
const IMPORT_STEPS: ChartSpec = { ...ROWS_THROUGH_STEPS, rows: STEP_ROWS.filter((row) => row.job === 'import-orders') }
const REBUILD_STEPS: ChartSpec = { ...ROWS_THROUGH_STEPS, rows: STEP_ROWS.filter((row) => row.job === 'rebuild-index') }

const FAILED = RUN_ROWS.filter((row) => row.state === 'failed')

const PROJECT_JOB_STATE: ChartSpec = { rows: RUN_ROWS, path: ['project', 'job', 'state'], colors: STATE_COLORS }
const JOB_STEP: ChartSpec = { rows: FAILED, path: ['job', 'step'] }
const JOB_STEP_STATE: ChartSpec = { rows: RUN_ROWS, path: ['job', 'step', 'state'], colors: STATE_COLORS }
const TIME_BY_REGION: ChartSpec = { rows: RUN_ROWS, path: ['region', 'worker', 'state'], y: 'duration', colors: STATE_COLORS, unit: ' s' }

/** The rows the search index gained or lost each day over two weeks, joined into a running total. */
export const Waterfall: StoryObj = {
    render: () => (
        <Ground title="Search index, October" columns={1}>
            <Framed
                kind="waterfall"
                spec={INDEX_BY_DAY}
                title="Rows in the index"
                subtitle="change per day"
                label="The rows the index gained or lost each day, as a running total"
            />
        </Ground>
    ),
}

/** The month's change to the index by the job that made it: two jobs add rows and two prune them. */
export const ByJob: StoryObj = {
    name: 'By job',
    render: () => (
        <Ground title="Search index, October" columns={1}>
            <Framed
                kind="waterfall"
                spec={INDEX_BY_JOB}
                title="Rows in the index"
                subtitle="change per job"
                label="The rows each job added to or pruned from the index"
            />
        </Ground>
    ),
}

/** The rows every successful run carried through its steps, narrowing as rows drop out. */
export const Funnel: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed
                kind="funnel"
                spec={ROWS_THROUGH_STEPS}
                title="Rows through the steps"
                label="The rows left after each step, as a share of those fetched"
            />
        </Ground>
    ),
}

/** Two jobs' funnels side by side: import-orders keeps most of what it fetches, rebuild-index less. */
export const PerJob: StoryObj = {
    name: 'Per job',
    render: () => (
        <Ground title="Runs, October">
            <Framed kind="funnel" spec={IMPORT_STEPS} title="import-orders" label="The rows import-orders kept after each step" />
            <Framed kind="funnel" spec={REBUILD_STEPS} title="rebuild-index" label="The rows rebuild-index kept after each step" />
        </Ground>
    ),
}

/** Where the month's runs went: from each project through its jobs to how they ended. */
export const Sankey: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed
                kind="sankey"
                spec={PROJECT_JOB_STATE}
                title="Runs"
                subtitle="project, job, state"
                label="Runs from project to job to state"
                bodyClassName="h-72"
            />
        </Ground>
    ),
}

/** The failed runs alone, from each job to the step it stopped at. */
export const SankeyFailures: StoryObj = {
    name: 'Sankey failures',
    render: () => (
        <Ground title="Failures, October" columns={1}>
            <Framed kind="sankey" spec={JOB_STEP} title="Failed runs" subtitle="job, step" label="Failed runs from job to step" />
        </Ground>
    ),
}

/** Every run through the step it stopped at; runs that stopped nowhere pass straight to their state. */
export const SankeySkips: StoryObj = {
    name: 'Sankey skips',
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed
                kind="sankey"
                spec={JOB_STEP_STATE}
                title="Runs"
                subtitle="job, step, state"
                label="Runs from job through the step they stopped at to state"
                bodyClassName="h-72"
            />
        </Ground>
    ),
}

/** Time spent rather than runs counted: each band as wide as the seconds that took it. */
export const WeightedSankey: StoryObj = {
    name: 'Weighted sankey',
    render: () => (
        <Ground title="Run time, October" columns={1}>
            <Framed
                kind="sankey"
                spec={TIME_BY_REGION}
                title="Run time"
                subtitle="region, worker, state"
                label="Seconds of run time from region to worker to state"
                bodyClassName="h-72"
            />
        </Ground>
    ),
}
