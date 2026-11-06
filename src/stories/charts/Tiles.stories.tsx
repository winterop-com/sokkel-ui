import type { Meta, StoryObj } from '@storybook/react-vite'

import { DashboardGrid } from '../../components/dashboard/DashboardGrid'
import { StatPanel } from '../../components/dashboard/StatPanel'
import type { Threshold } from '../../components/dashboard/thresholds'
import { WEEKLY_FAILURE_RATE, WEEKLY_RUNS, WEEKLY_SUCCESS_RATE } from '../fixtures/scores'
import { Ground } from './Ground'

/** Single values with a target: the reading, its trend behind it, the change, and a meter toward what it aims for. */
const meta: Meta = { title: 'Charts/Tiles' }
export default meta

const SUCCESS: Threshold[] = [{ color: 'critical' }, { value: 97, color: 'warning' }, { value: 98.5, color: 'good' }]
const FAILURES: Threshold[] = [{ color: 'good' }, { value: 1.5, color: 'warning' }, { value: 2.5, color: 'critical' }]
const COVERAGE: Threshold[] = [{ color: 'critical' }, { value: 60, color: 'warning' }, { value: 80, color: 'good' }]

/** Four tiles with targets: a rate short of its target, one under its ceiling, a count past its goal, and one filled by its band. */
export const Targets: StoryObj = {
    render: () => (
        <Ground title="This week" columns={1}>
            <DashboardGrid dense>
                <StatPanel
                    title="Success rate"
                    value={WEEKLY_SUCCESS_RATE[WEEKLY_SUCCESS_RATE.length - 1]}
                    unit="%"
                    decimals={1}
                    thresholds={SUCCESS}
                    sparkline={WEEKLY_SUCCESS_RATE}
                    delta="+0.2%"
                    good
                    target={99}
                    targetRange={[95, 100]}
                    span="quarter"
                />
                <StatPanel
                    title="Failure rate"
                    value={WEEKLY_FAILURE_RATE[WEEKLY_FAILURE_RATE.length - 1]}
                    unit="%"
                    decimals={2}
                    thresholds={FAILURES}
                    sparkline={WEEKLY_FAILURE_RATE}
                    delta="-0.12%"
                    good
                    target={1.5}
                    targetRange={[0, 3]}
                    span="quarter"
                />
                <StatPanel
                    title="Runs"
                    value={WEEKLY_RUNS[WEEKLY_RUNS.length - 1]}
                    color="chart-2"
                    sparkline={WEEKLY_RUNS}
                    delta="+3%"
                    good
                    target={26000}
                    span="quarter"
                />
                <StatPanel
                    title="Jobs covered"
                    value={72}
                    unit="%"
                    thresholds={COVERAGE}
                    colorMode="background"
                    target={80}
                    targetRange={[0, 100]}
                    note="18 of 25 jobs"
                    span="quarter"
                />
            </DashboardGrid>
        </Ground>
    ),
}
