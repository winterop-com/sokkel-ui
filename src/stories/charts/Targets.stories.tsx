import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec, ChartStep } from '../../components/chart/kinds'
import { Columns } from '../../components/Layout'
import { JOB_GOALS, RUN_RATES } from '../fixtures/runMeasures'
import { Framed, Ground } from './Ground'

/**
 * Figures against what they aim for, drawn from Tidevann's month: `Chart` with the bullet kind sets
 * each job's figure against its target and qualitative bands, and the gauge kind puts one figure on
 * a dial colored by the threshold it reaches.
 */
const meta: Meta = { title: 'Charts/Targets' }
export default meta

const percent = (value: number) => value.toFixed(1)

const QUALITY: ChartStep[] = [{ label: 'Poor' }, { value: 80, label: 'Fair' }, { value: 90, label: 'Good' }]
const SUCCESS: ChartSpec = {
    rows: JOB_GOALS,
    x: 'job',
    y: 'success rate',
    value: 'target',
    steps: QUALITY,
    max: 100,
    format: percent,
    unit: '%',
}
const SUCCESS_UPRIGHT: ChartSpec = { ...SUCCESS, horizontal: false }
const WAIT: ChartSpec = {
    rows: JOB_GOALS,
    x: 'job',
    y: 'queue wait',
    value: 'budget',
    steps: [
        { color: 'good', label: 'Quick' },
        { value: 30, color: 'warning', label: 'Slow' },
        { value: 45, color: 'critical', label: 'Too slow' },
    ],
    max: 60,
    colors: { 'queue wait': 'chart-4' },
    unit: ' s',
}

const HIGH_IS_GOOD: ChartStep[] = [{ color: 'critical' }, { value: 85, color: 'warning' }, { value: 90, color: 'good' }]
const successOf = (job?: string): ChartSpec => ({
    rows: job === undefined ? RUN_RATES : RUN_RATES.filter((row) => row.job === job),
    y: 'succeeded',
    aggregate: 'avg',
    steps: HIGH_IS_GOOD,
    format: percent,
    unit: '%',
})
const GAUGES = [
    { title: 'All jobs', spec: successOf() },
    { title: 'sync-inventory', spec: successOf('sync-inventory') },
    { title: 'rebuild-index', spec: successOf('rebuild-index') },
]
const WAIT_GAUGE: ChartSpec = {
    rows: RUN_RATES,
    y: 'wait',
    aggregate: 'p90',
    steps: [{ color: 'good' }, { value: 60, color: 'warning' }, { value: 90, color: 'critical' }],
    max: 120,
    format: (value) => value.toFixed(0),
    unit: ' s',
}

/** Each job's success rate as a bar against its target's tick, over bands from poor to good in grays. */
export const Bullet: StoryObj = {
    render: () => (
        <Ground title="Goals, October" columns={1}>
            <Framed
                kind="bullet"
                spec={SUCCESS}
                title="Success rate"
                subtitle="against target"
                label="Each job's success rate against its target"
            />
        </Ground>
    ),
}

/** Each job's average queue wait against its budget, over bands tinted from good to critical. */
export const Tinted: StoryObj = {
    render: () => (
        <Ground title="Goals, October" columns={1}>
            <Framed
                kind="bullet"
                spec={WAIT}
                title="Queue wait"
                subtitle="against budget"
                label="Each job's average queue wait against its budget"
            />
        </Ground>
    ),
}

/** The success rates standing up, a column per job. */
export const Upright: StoryObj = {
    render: () => (
        <Ground title="Goals, October" columns={1}>
            <Framed
                kind="bullet"
                spec={SUCCESS_UPRIGHT}
                title="Success rate"
                subtitle="against target"
                label="Each job's success rate against its target"
                bodyClassName="h-72"
            />
        </Ground>
    ),
}

/** The success rate of all jobs and of two of them, each dial in the color of the threshold it reaches. */
export const Gauges: StoryObj = {
    render: () => (
        <Ground title="Goals, October" columns={1}>
            <Columns count={3} min="md" gap="md">
                {GAUGES.map((entry) => (
                    <Framed
                        key={entry.title}
                        kind="gauge"
                        spec={entry.spec}
                        title={entry.title}
                        subtitle="success rate"
                        label={`The success rate of ${entry.title}`}
                        bodyClassName="h-40"
                    />
                ))}
            </Columns>
            <Framed
                kind="gauge"
                spec={WAIT_GAUGE}
                title="Queue wait"
                subtitle="90th percentile, all runs"
                label="The 90th percentile of queue wait across all runs"
                bodyClassName="h-56"
            />
        </Ground>
    ),
}
