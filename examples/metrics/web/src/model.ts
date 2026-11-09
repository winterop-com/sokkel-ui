import type { PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import type { Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'

import type { Aggregation, Label, MetricId } from './source'

/** How a panel draws its query. */
export type PanelKind = 'timeseries' | 'stat' | 'gauge' | 'bargauge' | 'bar' | 'heatmap' | 'table' | 'logs'

export const KINDS: readonly { value: PanelKind; label: string }[] = [
    { value: 'timeseries', label: 'Time series' },
    { value: 'stat', label: 'Stat' },
    { value: 'gauge', label: 'Gauge' },
    { value: 'bargauge', label: 'Bar gauge' },
    { value: 'bar', label: 'Bars' },
    { value: 'heatmap', label: 'Heatmap' },
    { value: 'table', label: 'Table' },
    { value: 'logs', label: 'Logs' },
]

/** How a series over the range is read as one value. */
export type Reduce = 'last' | 'mean' | 'max' | 'min'

export const REDUCES: readonly { value: Reduce; label: string }[] = [
    { value: 'last', label: 'Last' },
    { value: 'mean', label: 'Mean' },
    { value: 'max', label: 'Max' },
    { value: 'min', label: 'Min' },
]

/** What a group of series is split by, or `none` for one series. */
export type GroupBy = 'none' | Label

export interface Panel {
    id: string
    title: string
    kind: PanelKind
    metric: MetricId
    aggregation: Aggregation
    groupBy: GroupBy
    reduce: Reduce
    /** Labels the panel always filters by, before the dashboard's variables. */
    filter: Partial<Record<Label, string>>
    /** The unit written after each figure; the metric's own when null. */
    unit: string | null
    /** Decimals; the metric's own when null. */
    decimals: number | null
    thresholds: Threshold[]
    /** The color token of a single series, a tile or a dial with no thresholds. */
    color: string
    span: PanelSpan
    /** A time series' fill under its lines. */
    fill: 'none' | 'gradient' | 'solid'
    stacked: boolean
    /** Where a stat tile shows its threshold color. */
    colorMode: 'value' | 'background' | 'none'
    /** A gauge's and a bar gauge's ends. */
    min: number
    max: number
}

export interface Dashboard {
    id: string
    title: string
    description: string
    panels: Panel[]
}

export const SPANS: readonly { value: PanelSpan; label: string }[] = [
    { value: 'sixth', label: '1/6' },
    { value: 'quarter', label: '1/4' },
    { value: 'third', label: '1/3' },
    { value: 'half', label: '1/2' },
    { value: 'two-thirds', label: '2/3' },
    { value: 'full', label: 'Full' },
]

/** The colors a panel can be drawn in, as theme tokens. */
export const COLORS: readonly { value: string; label: string }[] = [
    { value: 'chart-1', label: 'Chart 1' },
    { value: 'chart-2', label: 'Chart 2' },
    { value: 'chart-3', label: 'Chart 3' },
    { value: 'chart-4', label: 'Chart 4' },
    { value: 'chart-5', label: 'Chart 5' },
    { value: 'good', label: 'Good' },
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'critical', label: 'Critical' },
]

let made = 0

/** A fresh id for a panel. */
export function panelId(): string {
    made += 1
    return `panel-${Date.now().toString(36)}-${String(made)}`
}

/** A panel with every field filled, from the fields given. */
export function panel(fields: Partial<Panel> & Pick<Panel, 'title' | 'kind' | 'metric'>): Panel {
    return {
        id: panelId(),
        aggregation: 'avg',
        groupBy: 'none',
        reduce: 'last',
        filter: {},
        unit: null,
        decimals: null,
        thresholds: [],
        color: 'chart-2',
        span: fields.kind === 'stat' || fields.kind === 'gauge' ? 'sixth' : 'half',
        fill: 'gradient',
        stacked: false,
        colorMode: 'value',
        min: 0,
        max: 100,
        ...fields,
    }
}

/** A panel as it starts in the editor: requests over time, summed by service. */
export function newPanel(): Panel {
    return panel({ title: 'New panel', kind: 'timeseries', metric: 'requests', aggregation: 'sum', groupBy: 'service' })
}
