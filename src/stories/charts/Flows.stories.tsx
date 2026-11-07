import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '../../components/chart/kinds'
import { RUN_ROWS, STATE_COLORS } from '../fixtures/runRows'
import { Framed, Ground } from './Ground'

/**
 * Flows drawn from rows: a `sankey` takes a month of Tidevann's runs and a `path` of stages, and
 * draws each run from its label at one stage to its label at the next, bands as wide as the runs
 * or a figure. The legend lists the first stage; hiding one takes its flows out.
 */
const meta: Meta = { title: 'Charts/Flows' }
export default meta

const FAILED = RUN_ROWS.filter((row) => row.state === 'failed')

const PROJECT_JOB_STATE: ChartSpec = { rows: RUN_ROWS, path: ['project', 'job', 'state'], colors: STATE_COLORS }
const JOB_STEP: ChartSpec = { rows: FAILED, path: ['job', 'step'] }
const JOB_STEP_STATE: ChartSpec = { rows: RUN_ROWS, path: ['job', 'step', 'state'], colors: STATE_COLORS }
const TIME_BY_REGION: ChartSpec = { rows: RUN_ROWS, path: ['region', 'worker', 'state'], y: 'duration', colors: STATE_COLORS, unit: ' s' }

/** Where the month's runs went: from each project through its jobs to how they ended. */
export const Stages: StoryObj = {
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
export const Failures: StoryObj = {
    render: () => (
        <Ground title="Failures, October" columns={1}>
            <Framed kind="sankey" spec={JOB_STEP} title="Failed runs" subtitle="job, step" label="Failed runs from job to step" />
        </Ground>
    ),
}

/** Every run through the step it stopped at; runs that stopped nowhere pass straight to their state. */
export const Skipped: StoryObj = {
    name: 'Skipped stage',
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
export const Weighted: StoryObj = {
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
