import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec, ChartStep } from '@winterop-com/sokkel-ui-charts/kinds'
import { JOB_GOALS } from '../fixtures/runMeasures'
import { Framed, Ground } from './Ground'

/**
 * Figures against what they aim for, drawn from Tidevann's month: `Chart` with the bullet kind sets
 * each job's figure against its target and qualitative bands. One figure on a dial is in
 * Charts/Gauges.
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
