import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, type ComponentProps } from 'react'

import { chartLegend } from '../../components/chart/Chart'
import { ChartFrame } from '../../components/chart/ChartFrame'
import { ChartGrid } from '../../components/chart/ChartGrid'
import type { ChartKind, ChartSpec } from '../../components/chart/kinds'
import { RUN_DAYS } from '../fixtures/runDays'
import { RUN_PROJECTS, RUN_ROWS, RUN_STATES, STATE_COLORS } from '../fixtures/runRows'
import { Ground } from './Ground'

/**
 * Small multiples: `ChartGrid` draws the same chart once per label of a field, from that label's
 * rows, on one scale and in one set of colors, so the charts compare at a glance and one legend
 * serves them all. In a `ChartFrame` with `fit`, the frame's legend hides and highlights a series
 * in every chart at once.
 */
const meta: Meta = { title: 'Charts/Multiples' }
export default meta

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function Multiple({
    kind,
    spec,
    facet,
    title,
    subtitle,
    label,
    columns,
    narrowest,
}: {
    kind: ChartKind
    spec: ChartSpec
    facet: string
    title: string
    subtitle: string
    label: string
    columns?: ComponentProps<typeof ChartGrid>['columns']
    narrowest?: ComponentProps<typeof ChartGrid>['narrowest']
}) {
    const legend = useMemo(() => chartLegend(kind, spec), [kind, spec])
    return (
        <ChartFrame title={title} subtitle={subtitle} legend={legend} fit exportable={false}>
            {(state) => (
                <ChartGrid
                    kind={kind}
                    label={label}
                    facet={facet}
                    columns={columns}
                    narrowest={narrowest}
                    hidden={state.hidden}
                    hovered={state.hovered}
                    {...spec}
                />
            )}
        </ChartFrame>
    )
}

const BY_WEEKDAY_STATE: ChartSpec = {
    rows: RUN_ROWS,
    x: 'weekday',
    order: WEEKDAYS,
    series: 'state',
    seriesOrder: [...RUN_STATES],
    colors: STATE_COLORS,
    stack: 'stacked',
}
const RUNS_AND_FAILURES: ChartSpec = { rows: RUN_DAYS, x: 'month', y: ['runs', 'failed'], colors: { failed: 'status-failed' } }
const WORKER_WEEKDAY: ChartSpec = { rows: RUN_ROWS, x: 'weekday', order: WEEKDAYS, series: 'worker' }
const STATE_SHARES: ChartSpec = { rows: RUN_ROWS, x: 'state', order: [...RUN_STATES], colors: STATE_COLORS }
const PROJECTS_REVERSED = [...RUN_PROJECTS].reverse()
const STATE_LEGEND = chartLegend('bar', BY_WEEKDAY_STATE)

/** Runs per weekday stacked by state, one chart per project on the same scale: larkspur's few runs look few. */
export const Bars: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Multiple
                kind="bar"
                spec={BY_WEEKDAY_STATE}
                facet="project"
                title="Runs"
                subtitle="per weekday, by project"
                label="Runs per weekday by state"
            />
        </Ground>
    ),
}

/** Runs and failures per month from January to October, one chart per project. */
export const Areas: StoryObj = {
    render: () => (
        <Ground title="Runs, 2026" columns={1}>
            <Multiple
                kind="area"
                spec={RUNS_AND_FAILURES}
                facet="project"
                title="Runs and failures"
                subtitle="per month, by project"
                label="Runs and failures per month"
            />
        </Ground>
    ),
}

/** Runs per worker and weekday, one grid per project, every cell shaded on the one scale. */
export const Grids: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Multiple
                kind="heatmap"
                spec={WORKER_WEEKDAY}
                facet="project"
                title="Runs"
                subtitle="per worker and weekday, by project"
                label="Runs per worker and weekday"
            />
        </Ground>
    ),
}

/** How each region's runs ended, one ring per region, the states in their own colors. */
export const Rings: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Multiple
                kind="donut"
                spec={STATE_SHARES}
                facet="region"
                title="Runs by state"
                subtitle="per region"
                label="Runs by state"
                columns={4}
                narrowest="sm"
            />
        </Ground>
    ),
}

/** A facet named in order: the projects in the order given rather than as the rows first name them. */
export const Ordered: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <ChartFrame title="Runs" subtitle="per weekday, larkspur first" legend={STATE_LEGEND} fit exportable={false}>
                {(state) => (
                    <ChartGrid
                        kind="bar"
                        label="Runs per weekday by state"
                        facet="project"
                        facetOrder={PROJECTS_REVERSED}
                        hidden={state.hidden}
                        hovered={state.hovered}
                        {...BY_WEEKDAY_STATE}
                    />
                )}
            </ChartFrame>
        </Ground>
    ),
}
