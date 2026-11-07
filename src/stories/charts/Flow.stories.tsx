import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '../../components/chart/kinds'
import { CARRY_STEPS, INDEX_ROWS, STEP_ROWS } from '../fixtures/runMeasures'
import { Framed } from './Framed'
import { Ground } from './Ground'

/**
 * What adds up and what drops out, drawn from Tidevann's runs: `Chart` with the waterfall kind runs a
 * total across categories, rises and falls in their own tones, and the funnel kind narrows stages by
 * their figure, each with its share of the first.
 */
const meta: Meta = { title: 'Charts/Flow' }
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
