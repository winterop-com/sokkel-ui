import type { HeatCell } from '@winterop-com/sokkel-ui-charts/dashboard/HeatmapPanel'
import type { PanelSeries } from '@winterop-com/sokkel-ui-charts/dashboard/series'
import type { TimeRangeValue } from '@winterop-com/sokkel-ui/dashboard/TimeRange'
import type { LogLine } from '@winterop-com/sokkel-ui/LogView'

import type { Panel } from './model'
import { before, change, clockOf, coarse, type Query, readSeries, reduce, spanOf, timeLabel, type Zone } from './query'
import { type Label, logsUntil, metricOf, type Variables } from './source'

/** One group's values over the range, read as one each way, for a table. */
export interface GroupRow {
    name: string
    last: number
    mean: number
    max: number
    min: number
}

/** What a panel draws, by its kind, with the unit and decimals it writes figures in. */
export type PanelData = { unit: string; decimals: number; empty: boolean } & (
    | { kind: 'timeseries' | 'bar'; x: string[]; series: PanelSeries[] }
    | { kind: 'stat'; value: number | null; sparkline: number[]; delta: string | undefined; good: boolean | undefined }
    | { kind: 'gauge'; value: number | null }
    | { kind: 'bargauge'; bars: { name: string; value: number | null }[] }
    | { kind: 'heatmap'; x: string[]; y: string[]; cells: HeatCell[] }
    | { kind: 'table'; rows: GroupRow[] }
    | { kind: 'logs'; lines: LogLine[] }
)

/** The variables as a filter: each one set to a value, and none left at `all`. */
export function variablesFilter(vars: Variables): Partial<Record<Label, string>> {
    return { service: vars.service, host: vars.host, project: vars.project }
}

/** The one filter a log panel reads by, its own and the variables', or null when they cannot both hold. */
export function logFilter(panel: Panel, vars: Variables): Partial<Record<Label, string>> | null {
    const filter = variablesFilter(vars)
    for (const [label, value] of Object.entries(panel.filter)) {
        if (value === undefined || value === '' || value === 'all') continue
        const chosen = filter[label as Label]
        if (chosen !== undefined && chosen !== 'all' && chosen !== value) return null
        filter[label as Label] = value
    }
    return filter
}

/** What a panel asks the source for, under the dashboard's variables. */
export function queryOf(panel: Panel, vars: Variables): Query {
    const one = panel.kind === 'stat' || panel.kind === 'gauge'
    return {
        metric: panel.metric,
        aggregation: panel.aggregation,
        groupBy: one ? 'none' : panel.groupBy,
        filters: [panel.filter, variablesFilter(vars)],
    }
}

/** Reads what a panel draws over its range, up to the second `at`. */
export function panelData(panel: Panel, vars: Variables, range: TimeRangeValue, at: number, zone: Zone): PanelData {
    const metric = metricOf(panel.metric)
    const unit = panel.unit ?? metric.unit
    const decimals = panel.decimals ?? metric.decimals
    const query = queryOf(panel, vars)
    const span = spanOf(range, at)
    const shared = { unit, decimals }
    const colored = (series: { name: string; values: number[] }[]): PanelSeries[] =>
        series.map((one) => (series.length === 1 ? { ...one, color: panel.color } : one))
    switch (panel.kind) {
        case 'timeseries': {
            const series = readSeries(query, span)
            return {
                ...shared,
                kind: 'timeseries',
                empty: series.length === 0,
                x: span.times.map((time) => timeLabel(time, span, zone)),
                series: colored(series),
            }
        }
        case 'bar': {
            const wide = coarse(span, 20)
            const series = readSeries(query, wide)
            return {
                ...shared,
                kind: 'bar',
                empty: series.length === 0,
                x: wide.times.map((time) => timeLabel(time, wide, zone)),
                series: colored(series),
            }
        }
        case 'stat': {
            const series = readSeries(query, span)[0]
            const value = series === undefined ? null : reduce(series.values, panel.reduce)
            const earlier = readSeries(query, before(span))[0]
            const delta = change(value, earlier === undefined ? null : reduce(earlier.values, panel.reduce))
            const good =
                delta === undefined || metric.rising === undefined || delta === '0.0%'
                    ? undefined
                    : metric.rising === 'good'
                      ? delta.startsWith('+')
                      : delta.startsWith('-')
            return { ...shared, kind: 'stat', empty: series === undefined, value, sparkline: series?.values ?? [], delta, good }
        }
        case 'gauge': {
            const series = readSeries(query, span)[0]
            return {
                ...shared,
                kind: 'gauge',
                empty: series === undefined,
                value: series === undefined ? null : reduce(series.values, panel.reduce),
            }
        }
        case 'bargauge': {
            const series = readSeries(query, span)
            return {
                ...shared,
                kind: 'bargauge',
                empty: series.length === 0,
                bars: series.map((one) => ({ name: one.name, value: reduce(one.values, panel.reduce) })),
            }
        }
        case 'heatmap': {
            const wide = coarse(span, 30)
            const series = readSeries(query, wide)
            return {
                ...shared,
                kind: 'heatmap',
                empty: series.length === 0,
                x: wide.times.map((time) => timeLabel(time, wide, zone)),
                y: series.map((one) => one.name),
                cells: series.flatMap((one, row) => one.values.map((value, column): HeatCell => [column, row, value])),
            }
        }
        case 'table': {
            const series = readSeries(query, span)
            return {
                ...shared,
                kind: 'table',
                empty: series.length === 0,
                rows: series.map((one) => ({
                    name: one.name,
                    last: reduce(one.values, 'last') ?? 0,
                    mean: reduce(one.values, 'mean') ?? 0,
                    max: reduce(one.values, 'max') ?? 0,
                    min: reduce(one.values, 'min') ?? 0,
                })),
            }
        }
        case 'logs': {
            const filter = logFilter(panel, vars)
            const lines =
                filter === null
                    ? []
                    : logsUntil(span.end, span.start, filter).map((line): LogLine => ({
                          at: clockOf(line.second, zone),
                          level: line.level,
                          source: line.host,
                          text: line.text,
                      }))
            return { ...shared, kind: 'logs', empty: lines.length === 0, lines }
        }
    }
}
