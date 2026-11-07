import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '../../components/chart/kinds'
import { RUN_ROWS, STATE_COLORS } from '../fixtures/runRows'
import { Framed, Ground } from './Ground'

/**
 * Nested groups drawn from rows: `treemap` boxes and `sunburst` rings take a month of Tidevann's
 * runs and a `path` of fields, outermost first, and size each group by its runs or by a figure.
 * The legend lists the top groups; hiding one takes its branch out.
 */
const meta: Meta = { title: 'Charts/Hierarchy' }
export default meta

const BY_PROJECT_JOB: ChartSpec = { rows: RUN_ROWS, path: ['project', 'job'] }
const BY_PROJECT_JOB_STATE: ChartSpec = { rows: RUN_ROWS, path: ['project', 'job', 'state'], colors: STATE_COLORS }
const ROWS_BY_REGION_WORKER: ChartSpec = { rows: RUN_ROWS, path: ['region', 'worker'], y: 'rows' }

/** Runs per project, each project's box split by its jobs, in shades of the project's color. */
export const Treemap: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed kind="treemap" spec={BY_PROJECT_JOB} title="Runs" subtitle="by project and job" label="Runs by project and job" />
        </Ground>
    ),
}

/** Three levels: each job's runs split by how they ended, in the states' own colors. */
export const NestedTreemap: StoryObj = {
    name: 'Nested treemap',
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed
                kind="treemap"
                spec={BY_PROJECT_JOB_STATE}
                title="Runs"
                subtitle="by project, job and state"
                label="Runs by project, job and state"
                bodyClassName="h-80"
            />
        </Ground>
    ),
}

/** The same three levels as rings, projects in the middle and states outside; a click on a slice opens it. */
export const Sunburst: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed
                kind="sunburst"
                spec={BY_PROJECT_JOB_STATE}
                title="Runs"
                subtitle="by project, job and state"
                label="Runs by project, job and state, as rings"
                bodyClassName="h-80"
            />
        </Ground>
    ),
}

/** Rows moved per region and worker, sized by the rows rather than counted, as boxes and as rings. */
export const Weighted: StoryObj = {
    render: () => (
        <Ground title="Rows moved, October">
            <Framed
                kind="treemap"
                spec={ROWS_BY_REGION_WORKER}
                title="Rows moved"
                subtitle="by region and worker"
                label="Rows moved by region and worker"
                bodyClassName="h-72"
            />
            <Framed
                kind="sunburst"
                spec={ROWS_BY_REGION_WORKER}
                title="Rows moved"
                subtitle="by region and worker"
                label="Rows moved by region and worker, as rings"
                bodyClassName="h-72"
            />
        </Ground>
    ),
}
