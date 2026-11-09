import type { RangePreset, TimeRangeValue } from '@winterop-com/sokkel-ui/dashboard/TimeRange'

import type { GroupBy, Reduce } from './model'
import {
    combine,
    HOSTS,
    JOBS,
    type Aggregation,
    type Label,
    matches,
    type Metric,
    metricOf,
    type MetricId,
    PROJECTS,
    SERVICES,
    type SeriesLabels,
} from './source'

/** The ranges a dashboard offers, by how far back they reach. */
export const PRESETS: readonly (RangePreset & { seconds: number })[] = [
    { id: '5m', label: 'Last 5 minutes', seconds: 300 },
    { id: '15m', label: 'Last 15 minutes', seconds: 900 },
    { id: '1h', label: 'Last hour', seconds: 3600 },
    { id: '6h', label: 'Last 6 hours', seconds: 6 * 3600 },
    { id: '24h', label: 'Last 24 hours', seconds: 24 * 3600 },
]

/** The intervals a dashboard refreshes by itself at, in seconds; 0 is never. */
export const INTERVALS = [0, 5, 10, 30] as const

/** Where the times on an axis are read: the browser's own zone, or UTC. */
export type Zone = 'local' | 'utc'

/** The seconds a dashboard covers and the steps it reads them at. */
export interface Span {
    start: number
    end: number
    step: number
    times: number[]
}

const NICE = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10_800, 21_600, 43_200, 86_400]

/** Whether a custom range's end is a whole day picked from the calendar, rather than a time pinned by a link. */
const wholeDay = (date: Date) => date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0

/** The seconds a range covers at a moment: a preset reaches back from it, a custom range runs from its first day to the end of its last, never past it. */
export function bounds(range: TimeRangeValue, now: number): { start: number; end: number } {
    if ('preset' in range) {
        const preset = PRESETS.find((one) => one.id === range.preset) ?? PRESETS[1]
        return { start: now - preset.seconds, end: now }
    }
    const start = Math.floor(range.from.getTime() / 1000)
    const to = wholeDay(range.to) ? range.to.getTime() / 1000 + 86_399 : range.to.getTime() / 1000
    return { start, end: Math.max(start + 60, Math.min(now, Math.floor(to))) }
}

/** The span of a range at a moment, read in about `points` steps of a round length, each on a multiple of it so a moving range keeps its steps. */
export function spanOf(range: TimeRangeValue, now: number, points = 150): Span {
    const { start, end } = bounds(range, now)
    const raw = (end - start) / points
    const step = NICE.find((nice) => nice >= raw) ?? 86_400
    const times: number[] = []
    for (let time = Math.ceil(start / step) * step; time <= end; time += step) times.push(time)
    return { start, end, step, times }
}

/** The same span read in fewer, wider steps, for bars and heatmap cells. */
export function coarse(span: Span, points = 24): Span {
    const raw = (span.end - span.start) / points
    const step = NICE.find((nice) => nice >= raw) ?? 86_400
    const times: number[] = []
    for (let time = Math.ceil(span.start / step) * step; time <= span.end; time += step) times.push(time)
    return { ...span, step, times }
}

/** A second written for an axis: with seconds for a short range, the day for one past a day. */
export function timeLabel(second: number, span: Span, zone: Zone): string {
    const date = new Date(second * 1000)
    const long = span.end - span.start > 2 * 86_400
    const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: span.end - span.start <= 600 ? '2-digit' : undefined,
        month: long ? 'short' : undefined,
        day: long ? 'numeric' : undefined,
        hourCycle: 'h23',
        timeZone: zone === 'utc' ? 'UTC' : undefined,
    }
    return new Intl.DateTimeFormat('en-US', options).format(date)
}

/** A moment written for a reader, with its seconds. */
export function clockOf(second: number, zone: Zone): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
        timeZone: zone === 'utc' ? 'UTC' : undefined,
    }).format(new Date(second * 1000))
}

/** What a panel or a rule asks the source for. */
export interface Query {
    metric: MetricId
    aggregation: Aggregation
    groupBy: GroupBy
    /** Filters a series must pass, each: the panel's own, the dashboard's variables. */
    filters: readonly Partial<Record<Label, string>>[]
}

export interface SeriesData {
    name: string
    values: number[]
}

const ORDER: Record<Label, readonly string[]> = {
    service: SERVICES,
    host: HOSTS.map((host) => host.id),
    project: PROJECTS,
    job: JOBS,
}

/** A series' value over one step, the mean of three readings across it so a wide step is not one second's flicker. */
function sample(metric: Metric, labels: SeriesLabels, time: number, step: number): number {
    if (step <= 10) return metric.value(labels, time)
    const third = step / 3
    return (metric.value(labels, time) + metric.value(labels, time - third) + metric.value(labels, time - 2 * third)) / 3
}

/** The groups of series a query reads, by name, in the order the labels are known in. */
export function groupsOf(query: Query): { name: string; members: SeriesLabels[] }[] {
    const metric = metricOf(query.metric)
    const kept = metric.series.filter((series) => query.filters.every((filter) => matches(series, filter)))
    if (query.groupBy === 'none') return kept.length === 0 ? [] : [{ name: metric.label, members: kept }]
    const label = query.groupBy
    const names = [...new Set(kept.map((series) => series[label] ?? '-'))]
    const known = ORDER[label]
    names.sort((left, right) => known.indexOf(left) - known.indexOf(right))
    return names.map((name) => ({ name, members: kept.filter((series) => (series[label] ?? '-') === name) }))
}

/** A query's series over a span: one per group, each step combining the group's series. */
export function readSeries(query: Query, span: Span): SeriesData[] {
    const metric = metricOf(query.metric)
    return groupsOf(query).map((group) => ({
        name: group.name,
        values: span.times.map(
            (time) =>
                combine(
                    group.members.map((member) => sample(metric, member, time, span.step)),
                    query.aggregation,
                ) ?? 0,
        ),
    }))
}

/** A query's one value at a second, as an alert rule reads it. */
export function readNow(query: Omit<Query, 'groupBy'>, second: number): number | null {
    const metric = metricOf(query.metric)
    const kept = metric.series.filter((series) => query.filters.every((filter) => matches(series, filter)))
    return combine(
        kept.map((series) => metric.value(series, second)),
        query.aggregation,
    )
}

/** A series read as one value. */
export function reduce(values: readonly number[], how: Reduce): number | null {
    if (values.length === 0) return null
    if (how === 'last') return values[values.length - 1] ?? null
    if (how === 'max') return Math.max(...values)
    if (how === 'min') return Math.min(...values)
    return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** The change from one value to another, written for a reader: `+4.2%`. */
export function change(now: number | null, before: number | null): string | undefined {
    if (now === null || before === null || before === 0) return undefined
    const share = ((now - before) / Math.abs(before)) * 100
    if (Math.abs(share) < 0.05) return '0.0%'
    return `${share > 0 ? '+' : ''}${share.toFixed(1)}%`
}

/** The span just before another, as long as it, for a change against the range before. */
export function before(span: Span): Span {
    const length = span.end - span.start
    return { ...span, start: span.start - length, end: span.end - length, times: span.times.map((time) => time - length) }
}
