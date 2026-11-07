import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec, ChartStep } from '@winterop-com/sokkel-ui-charts/kinds'
import { ChartPanel } from '@winterop-com/sokkel-ui-charts/dashboard/ChartPanel'
import { DashboardGrid } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { Columns } from '@winterop-com/sokkel-ui/Layout'
import { RUN_RATES } from '../fixtures/runMeasures'
import { Framed, Ground } from './Ground'

/**
 * One figure on a dial, or several on rings, drawn from Tidevann's month of runs: `Chart` with the
 * gauge kind picks the dial's shape by `dial` (the arc by default, a ring, a half circle for a stat tile, colored bands
 * with a pointer, a needle over ticks), and the rings kind fills one ring per series or field. Each
 * figure takes the color of the step it reaches.
 */
const meta: Meta = { title: 'Charts/Gauges' }
export default meta

const percent = (value: number) => value.toFixed(1)
const seconds = (value: number) => value.toFixed(0)

const HIGH_IS_GOOD: ChartStep[] = [{ color: 'critical' }, { value: 85, color: 'warning' }, { value: 90, color: 'good' }]
const WAIT_STEPS: ChartStep[] = [{ color: 'good' }, { value: 60, color: 'warning' }, { value: 90, color: 'critical' }]

const successOf = (field?: 'job' | 'project', name?: string): ChartSpec => ({
    rows: field === undefined ? RUN_RATES : RUN_RATES.filter((row) => row[field] === name),
    y: 'succeeded',
    aggregate: 'avg',
    steps: HIGH_IS_GOOD,
    format: percent,
    unit: '%',
})
const FAILURES: ChartSpec = {
    rows: RUN_RATES,
    y: 'failure rate',
    aggregate: 'avg',
    steps: [{ color: 'good' }, { value: 10, color: 'warning' }, { value: 15, color: 'critical' }],
    max: 25,
    format: percent,
    unit: '%',
}
const WAIT: ChartSpec = { rows: RUN_RATES, y: 'wait', aggregate: 'p90', steps: WAIT_STEPS, max: 120, format: seconds, unit: ' s' }

const ARCS = [
    { title: 'All jobs', spec: successOf() },
    { title: 'sync-inventory', spec: successOf('job', 'sync-inventory') },
    { title: 'rebuild-index', spec: successOf('job', 'rebuild-index') },
] satisfies { title: string; spec: ChartSpec }[]

const RINGS = [
    { title: 'All jobs', spec: { ...successOf(), dial: 'ring', total: 'succeeded' } },
    { title: 'sync-inventory', spec: { ...successOf('job', 'sync-inventory'), dial: 'ring', total: 'succeeded' } },
    { title: 'rebuild-index', spec: { ...successOf('job', 'rebuild-index'), dial: 'ring', total: 'succeeded' } },
] satisfies { title: string; spec: ChartSpec }[]

const TILES = [
    { title: 'Success rate', subtitle: 'all jobs', spec: successOf() },
    { title: 'Failure rate', subtitle: 'all jobs', spec: FAILURES },
    { title: 'Queue wait', subtitle: '90th percentile', spec: WAIT },
    { title: 'Success rate', subtitle: 'larkspur', spec: successOf('project', 'larkspur') },
] satisfies { title: string; subtitle: string; spec: ChartSpec }[]

const WAIT_BANDS: ChartSpec = { ...WAIT, dial: 'bands' }
const SUCCESS_BANDS: ChartSpec = { ...successOf(), dial: 'bands', min: 70 }
const WAIT_NEEDLE: ChartSpec = { ...WAIT, dial: 'needle' }
const SUCCESS_NEEDLE: ChartSpec = { ...successOf(), dial: 'needle', min: 70 }

const ringsBy = (series: 'project' | 'job'): ChartSpec => ({
    rows: RUN_RATES,
    y: 'succeeded',
    aggregate: 'avg',
    series,
    format: percent,
    unit: '%',
})
const BY_PROJECT = ringsBy('project')
const BY_JOB = ringsBy('job')

/** The success rate of all jobs and of two of them on the default arc, and the queue wait on a larger one, each in the color of the step it reaches. */
export const Arc: StoryObj = {
    render: () => (
        <Ground title="Goals, October" columns={1}>
            <Columns count={3} min="md" gap="md">
                {ARCS.map((entry) => (
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
                spec={WAIT}
                title="Queue wait"
                subtitle="90th percentile, all runs"
                label="The 90th percentile of queue wait across all runs"
                bodyClassName="h-56"
            />
        </Ground>
    ),
}

/** Each success rate as a ring filling to its share, the figure in its middle in the color of the step it reaches. */
export const Ring: StoryObj = {
    render: () => (
        <Ground title="Goals, October" columns={1}>
            <Columns count={3} min="md" gap="md">
                {RINGS.map((entry) => (
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
        </Ground>
    ),
}

/** Half circles low enough for a row of stat tiles, each figure inside its arc. */
export const Half: StoryObj = {
    render: () => (
        <Ground title="Goals, October" columns={1}>
            <DashboardGrid dense>
                {TILES.map((tile) => (
                    <ChartPanel
                        key={`${tile.title} ${tile.subtitle}`}
                        kind="gauge"
                        title={tile.title}
                        subtitle={tile.subtitle}
                        span="quarter"
                        bodyClassName="h-24"
                        dial="half"
                        {...tile.spec}
                    />
                ))}
            </DashboardGrid>
        </Ground>
    ),
}

/** The queue wait's 90th percentile pointed at on an arc of its bands, from quick to too slow, and the success rate on its thresholds from 70%. */
export const Bands: StoryObj = {
    render: () => (
        <Ground title="Goals, October" columns={1}>
            <Columns count={2} min="md" gap="md">
                <Framed
                    kind="gauge"
                    spec={WAIT_BANDS}
                    title="Queue wait"
                    subtitle="90th percentile, all runs"
                    label="The 90th percentile of queue wait on its bands"
                    bodyClassName="h-56"
                />
                <Framed
                    kind="gauge"
                    spec={SUCCESS_BANDS}
                    title="Success rate"
                    subtitle="all jobs"
                    label="The success rate of all jobs on its thresholds"
                    bodyClassName="h-56"
                />
            </Columns>
        </Ground>
    ),
}

/** A needle over a scale with ticks and round figures, its thresholds as the scale's colors. */
export const Needle: StoryObj = {
    render: () => (
        <Ground title="Goals, October" columns={1}>
            <Columns count={2} min="md" gap="md">
                <Framed
                    kind="gauge"
                    spec={WAIT_NEEDLE}
                    title="Queue wait"
                    subtitle="90th percentile, all runs"
                    label="The 90th percentile of queue wait on a dial"
                    bodyClassName="h-56"
                />
                <Framed
                    kind="gauge"
                    spec={SUCCESS_NEEDLE}
                    title="Success rate"
                    subtitle="all jobs"
                    label="The success rate of all jobs on a dial"
                    bodyClassName="h-56"
                />
            </Columns>
        </Ground>
    ),
}

/** One ring per project and one per job, each filling to its success rate, the figures in the middle in their rings' colors. */
export const Rings: StoryObj = {
    render: () => (
        <Ground title="Goals, October" columns={1}>
            <Columns count={2} min="md" gap="md">
                <Framed
                    kind="rings"
                    spec={BY_PROJECT}
                    title="Success rate"
                    subtitle="by project"
                    label="The success rate of each project as a ring"
                    bodyClassName="h-64"
                />
                <Framed
                    kind="rings"
                    spec={BY_JOB}
                    title="Success rate"
                    subtitle="by job"
                    label="The success rate of each job as a ring"
                    bodyClassName="h-64"
                />
            </Columns>
        </Ground>
    ),
}
