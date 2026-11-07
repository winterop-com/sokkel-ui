import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, useState } from 'react'

import type { Aggregate } from '@winterop-com/sokkel-ui-charts/data'
import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { RUN_ROWS, RUN_STATES, STATE_COLORS } from '../fixtures/runRows'
import { Framed, Ground } from './Ground'

/**
 * Charts drawn from rows: `Chart` takes a month of Tidevann's runs and the fields to read, and the
 * kind says how. The same rows are a bar, a line, a ring or a grid by changing the kind and the
 * fields alone.
 */
const meta: Meta = { title: 'Charts/Chart' }
export default meta

const STATE_ORDER = [...RUN_STATES]

const BY_JOB_STATE: ChartSpec = {
    rows: RUN_ROWS,
    x: 'job',
    series: 'state',
    seriesOrder: STATE_ORDER,
    colors: STATE_COLORS,
    stack: 'stacked',
}
const SHARE_BY_PROJECT: ChartSpec = {
    rows: RUN_ROWS,
    x: 'project',
    series: 'state',
    seriesOrder: STATE_ORDER,
    colors: STATE_COLORS,
    stack: 'percent',
    horizontal: true,
}
const DURATION_BY_DAY: ChartSpec = { rows: RUN_ROWS, x: 'day', y: 'duration', series: 'job', aggregate: 'avg', unit: ' s' }
const ROWS_BY_DAY: ChartSpec = { rows: RUN_ROWS, x: 'day', y: 'rows', series: 'project', stack: 'stacked' }
const BY_STATE: ChartSpec = { rows: RUN_ROWS, x: 'state', order: STATE_ORDER, colors: STATE_COLORS }
const BY_HOUR_WEEKDAY: ChartSpec = {
    rows: RUN_ROWS,
    x: 'hour',
    series: 'weekday',
    order: Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`),
    seriesOrder: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}
const DURATION_AGAINST_ROWS: ChartSpec = { rows: RUN_ROWS, x: 'rows', y: 'duration', series: 'project', value: 'wait' }

/** Runs per job, stacked by state in the states' own colors. */
export const Stacked: StoryObj = {
    render: () => (
        <Ground title="Runs, October">
            <Framed kind="bar" spec={BY_JOB_STATE} title="Runs by job" subtitle="by state" label="Runs per job, stacked by state" />
            <Framed
                kind="bar"
                spec={SHARE_BY_PROJECT}
                title="State share"
                subtitle="per project"
                label="Each project's runs as shares by state"
            />
        </Ground>
    ),
}

/** The month as lines and areas: each job's average duration, and the rows each project moved, stacked. */
export const OverTime: StoryObj = {
    name: 'Over time',
    render: () => (
        <Ground title="Runs, October">
            <Framed
                kind="line"
                spec={DURATION_BY_DAY}
                title="Duration"
                subtitle="average per day"
                label="Average run duration per job and day"
            />
            <Framed kind="area" spec={ROWS_BY_DAY} title="Rows moved" subtitle="per day" label="Rows moved per day, stacked by project" />
        </Ground>
    ),
}

/** A ring of runs by state, and when the runs start: hour against weekday. */
export const Shares: StoryObj = {
    render: () => (
        <Ground title="Runs, October">
            <Framed kind="donut" spec={BY_STATE} title="Runs by state" label="Runs by state" />
            <Framed
                kind="heatmap"
                spec={BY_HOUR_WEEKDAY}
                title="When runs start"
                subtitle="hour by weekday"
                label="Runs by hour and weekday"
            />
        </Ground>
    ),
}

/** Each run as a point: the rows it moved against how long it took, sized by how long it waited. */
export const Points: StoryObj = {
    render: () => (
        <Ground title="Runs, October" columns={1}>
            <Framed
                kind="scatter"
                spec={DURATION_AGAINST_ROWS}
                title="Duration against rows"
                subtitle="sized by queue wait"
                label="Each run's duration against its rows"
            />
        </Ground>
    ),
}

const KIND_OPTIONS = [
    { value: 'bar', label: 'Bars' },
    { value: 'line', label: 'Lines' },
    { value: 'area', label: 'Areas' },
    { value: 'heatmap', label: 'Grid' },
] as const
const GROUPS = [
    { value: 'job', label: 'Job' },
    { value: 'project', label: 'Project' },
    { value: 'worker', label: 'Worker' },
    { value: 'region', label: 'Region' },
    { value: 'weekday', label: 'Weekday' },
    { value: 'day', label: 'Day' },
] as const
const MEASURES = [
    { value: 'count', label: 'Runs' },
    { value: 'duration', label: 'Duration' },
    { value: 'rows', label: 'Rows moved' },
    { value: 'wait', label: 'Queue wait' },
] as const
const SPLITS = [{ value: 'none', label: 'Nothing' }, ...GROUPS, { value: 'state', label: 'State' }] as const

function Picker<T extends string>({
    id,
    label,
    value,
    items,
    onChange,
}: {
    id: string
    label: string
    value: T
    items: readonly { value: T; label: string }[]
    onChange: (value: T) => void
}) {
    return (
        <Field id={id} label={label}>
            <Select items={items} value={value} onValueChange={(next) => next !== null && onChange(next as T)}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Field>
    )
}

/** Pick the kind, what runs along the axis, what is measured and what splits it: the chart follows. */
export const Explore: StoryObj = {
    render: function Render() {
        const [kind, setKind] = useState<(typeof KIND_OPTIONS)[number]['value']>('bar')
        const [x, setX] = useState<string>('job')
        const [measure, setMeasure] = useState<string>('duration')
        const [split, setSplit] = useState<string>('state')
        const [how, setHow] = useState<Aggregate>('avg')
        const spec = useMemo<ChartSpec>(
            () => ({
                rows: RUN_ROWS,
                x,
                y: measure === 'count' ? undefined : measure,
                series: split === 'none' || split === x ? undefined : split,
                aggregate: measure === 'count' ? 'count' : how,
                seriesOrder: split === 'state' ? STATE_ORDER : undefined,
                colors: split === 'state' ? STATE_COLORS : undefined,
                unit: measure === 'duration' || measure === 'wait' ? ' s' : undefined,
            }),
            [x, measure, split, how],
        )
        const title = `${MEASURES.find((entry) => entry.value === measure)?.label ?? ''} by ${GROUPS.find((entry) => entry.value === x)?.label.toLowerCase() ?? ''}`
        return (
            <Ground title="Explore runs" columns={1}>
                <Stack gap="lg">
                    <Segmented label="Kind" value={kind} options={KIND_OPTIONS} onChoose={setKind} />
                    <Columns count={4} min="sm" gap="md">
                        <Picker id="explore-x" label="Along" value={x} items={GROUPS} onChange={setX} />
                        <Picker id="explore-measure" label="Measure" value={measure} items={MEASURES} onChange={setMeasure} />
                        <Picker
                            id="explore-how"
                            label="Combined as"
                            value={how}
                            items={[
                                { value: 'avg', label: 'Average' },
                                { value: 'sum', label: 'Total' },
                                { value: 'median', label: 'Median' },
                                { value: 'p90', label: '90th percentile' },
                                { value: 'max', label: 'Largest' },
                            ]}
                            onChange={(next) => setHow(next as Aggregate)}
                        />
                        <Picker id="explore-split" label="Split by" value={split} items={SPLITS} onChange={setSplit} />
                    </Columns>
                    <Framed kind={kind} spec={spec} title={title} label={title} />
                </Stack>
            </Ground>
        )
    },
}
