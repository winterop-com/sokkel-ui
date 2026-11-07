import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { RUN_DAYS } from '../fixtures/runDays'
import { RUN_ROWS } from '../fixtures/runRows'
import { Framed, Ground } from './Ground'

/**
 * Days drawn from rows: a `calendar` takes Tidevann's runs and the field that holds their day, and
 * shades each day by its figure. One month is a wall calendar with its dates; more run as weeks
 * across, as a year is drawn.
 */
const meta: Meta = { title: 'Charts/Calendar' }
export default meta

const RUNS_BY_DAY: ChartSpec = { rows: RUN_ROWS, x: 'day' }
const SLOW_DAYS: ChartSpec = { rows: RUN_ROWS, x: 'day', y: 'duration', aggregate: 'p90', unit: ' s', colors: { value: 'warning' } }
const RUNS_THIS_YEAR: ChartSpec = { rows: RUN_DAYS, x: 'day', y: 'runs' }
const FAILED_THIS_YEAR: ChartSpec = { rows: RUN_DAYS, x: 'day', y: 'failed', colors: { value: 'status-failed' } }

/** October's runs per day: busy weekdays and quiet weekends. */
export const Month: StoryObj = {
    render: () => (
        <Ground title="Runs, October">
            <Framed
                kind="calendar"
                spec={RUNS_BY_DAY}
                title="Runs"
                subtitle="per day"
                label="Runs per day in October"
                bodyClassName="h-64"
            />
            <Framed
                kind="calendar"
                spec={SLOW_DAYS}
                title="Slow days"
                subtitle="90th percentile duration"
                label="Each day's 90th percentile run duration in October"
                bodyClassName="h-64"
            />
        </Ground>
    ),
}

/** Runs per day from January to October, weeks running across, with the summer lull and the autumn climb. */
export const Year: StoryObj = {
    render: () => (
        <Ground title="Runs, 2026" columns={1}>
            <Framed
                kind="calendar"
                spec={RUNS_THIS_YEAR}
                title="Runs"
                subtitle="per day"
                label="Runs per day in 2026"
                bodyClassName="h-44"
            />
        </Ground>
    ),
}

/** Failed runs per day in the failure color: the bad week in March stands out. */
export const Failures: StoryObj = {
    render: () => (
        <Ground title="Failures, 2026" columns={1}>
            <Framed
                kind="calendar"
                spec={FAILED_THIS_YEAR}
                title="Failed runs"
                subtitle="per day"
                label="Failed runs per day in 2026"
                bodyClassName="h-44"
            />
        </Ground>
    ),
}
