import type { LegendItem } from '../ChartLegend'
import { aggregate, aggregateAt, asShares, distinct, formatNumber, labelOf, numberOf, pivot } from '../data'
import { SERIES_ORDER, tokenColor } from '../look'
import { flows, nest, spread } from '../shapes'
import { binCounts, binsFor, niceCeil, runningTotals, type Bins } from '../stats'
import type { ChartKind } from '.'
import { fieldsOf, legendColor, paletteToken, unitAt, wordsOf, type ChartBand, type ChartSpec, type ChartStep } from './spec'

/** The rows as categories and series, as shares when the spec stacks them to 100%. */
export function shaped(spec: ChartSpec) {
    if (spec.x === undefined) throw new Error('This chart needs an x field.')
    const data = pivot({
        rows: spec.rows,
        x: spec.x,
        y: spec.y,
        series: spec.series,
        aggregate: spec.aggregate,
        order: spec.order,
        seriesOrder: spec.seriesOrder,
    })
    return spec.stack === 'percent' ? { ...data, series: asShares(data.series) } : data
}

/** One entry per series in the color the chart gives it, with its figures: the legend of a kind that lists nothing else. */
export function seriesLegend(spec: ChartSpec): LegendItem[] {
    if (spec.x === undefined) return []
    const data = pivot({
        rows: spec.rows,
        x: spec.x,
        y: spec.y,
        series: spec.series,
        aggregate: spec.aggregate,
        order: spec.order,
        seriesOrder: spec.seriesOrder,
    })
    return data.series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: legendColor(spec, entry.name, index, SERIES_ORDER),
        values: entry.values,
    }))
}

/** A ring's legend: its slices, each with its figure. */
export function donutLegend(spec: ChartSpec): LegendItem[] {
    const { categories, series } = shaped(spec)
    return categories.map((name, index) => ({
        key: name,
        label: name,
        color: legendColor(spec, name, index, SERIES_ORDER),
        values: [series[0]?.values[index] ?? null],
    }))
}

/** Each category's figure and target for a bullet chart, and where its scale starts and ends. */
export function bulletFigures(spec: ChartSpec) {
    const field = fieldsOf(spec)[0]
    if (spec.x === undefined || field === undefined) throw new Error('A bullet chart needs x and y fields.')
    const data = pivot({
        rows: spec.rows,
        x: spec.x,
        y: spec.value === undefined ? [field] : [field, spec.value],
        aggregate: spec.aggregate,
        order: spec.order,
    })
    const values = data.series[0]?.values ?? []
    const targets = spec.value === undefined ? [] : (data.series[1]?.values ?? [])
    const steps: readonly ChartStep[] = spec.steps ?? [{}]
    const largest = Math.max(
        0,
        ...values.map((value) => value ?? 0),
        ...targets.map((value) => value ?? 0),
        ...steps.map((step) => step.value ?? 0),
    )
    return { field, categories: data.categories, values, targets, steps, min: spec.min ?? 0, max: spec.max ?? niceCeil(largest) }
}

/** The CSS color of each bullet band: its own token, faintly, or a gray that lightens from the first band to the last. */
export function bandColors(steps: readonly ChartStep[]): string[] {
    return steps.map((step, index) => {
        const strength = steps.length <= 1 ? 22 : Math.round(30 - (20 * index) / (steps.length - 1))
        return `color-mix(in oklab, ${tokenColor(step.color ?? 'muted-foreground')} ${String(step.color === undefined ? strength : 26)}%, var(--card))`
    })
}

/** A bullet band's name: its label, or its place. */
export const bandName = (step: ChartStep, index: number) => step.label ?? `band-${String(index + 1)}`

/** A bullet chart's legend: the figure, the target where `value` names one, and each labeled band. */
export function bulletLegend(spec: ChartSpec): LegendItem[] {
    const words = wordsOf(spec)
    const { field, values, targets, steps } = bulletFigures(spec)
    const bands = bandColors(steps)
    return [
        { key: field, label: field, color: tokenColor(spec.colors?.[field] ?? SERIES_ORDER[0]), values },
        ...(spec.value === undefined ? [] : [{ key: words.target, label: words.target, color: 'var(--foreground)', values: targets }]),
        ...steps.flatMap((step, index) =>
            step.label === undefined ? [] : [{ key: bandName(step, index), label: step.label, color: bands[index] }],
        ),
    ]
}

type Figures = (number | null)[]

/** One fan: its median, its bands from the outermost in, the line before it and the dots against it. */
export interface Fan {
    /** The series' label, or the median's field where the chart draws one fan. */
    name: string
    median: Figures
    /** The median as drawn: from the last history figure before the forecast where `bridge` joins them, the median elsewhere. */
    line: Figures
    bands: { label: string; low: Figures; high: Figures }[]
    /** The history field on the rows before the forecast starts, null from there on. */
    history: Figures
    /** The points field, from where the forecast starts where a history is drawn, on every row where none is. */
    points: Figures
    /** The first category with a median or a band's figure, or -1 where the fan has none. */
    start: number
}

/** A band's name: its own label, or its fields' figures, `10-90` for `q10` and `q90`, or the fields where they have none. */
export function bandLabel(band: ChartBand): string {
    if (band.label !== undefined) return band.label
    const figure = (field: string) => /(\d+(?:\.\d+)?)$/.exec(field)?.[1]
    const low = figure(band.low)
    const high = figure(band.high)
    return low === undefined || high === undefined ? `${band.low}-${band.high}` : `${low}-${high}`
}

/**
 * The rows shaped as fans along `x`, one per label of `series` or one in all, each field read per
 * category and combined by `aggregate`. A category with no figure for a field stays null, so a
 * history row has no band and a forecast row no dot.
 */
export function fanShape(spec: ChartSpec): { categories: string[]; fans: Fan[] } {
    const median = fieldsOf(spec)[0]
    if (spec.x === undefined || median === undefined) throw new Error('A fan chart needs x and y fields.')
    const x = spec.x
    const categories = distinct(spec.rows, x, spec.order)
    const names = spec.series === undefined ? [median] : distinct(spec.rows, spec.series, spec.seriesOrder)
    const read = (field: string | undefined): Figures[] => {
        if (field === undefined) return names.map(() => categories.map(() => null))
        const data = pivot({
            rows: spec.rows,
            x,
            y: field,
            series: spec.series,
            aggregate: spec.aggregate,
            order: spec.order,
            seriesOrder: spec.seriesOrder,
        })
        return names.map((_, index) => data.series[index]?.values ?? categories.map(() => null))
    }
    const medians = read(median)
    const bands = (spec.bands ?? []).map((band) => ({ label: bandLabel(band), low: read(band.low), high: read(band.high) }))
    const histories = read(spec.history)
    const points = read(spec.points)
    return {
        categories,
        fans: names.map((name, index) => {
            const forecast = (at: number) =>
                medians[index][at] !== null || bands.some((band) => band.low[index][at] !== null || band.high[index][at] !== null)
            const start = categories.findIndex((_, at) => forecast(at))
            const before = (at: number) => (start === -1 ? true : at < start)
            const joint = spec.history === undefined || spec.bridge === false || start < 1 ? null : histories[index][start - 1]
            const line = medians[index].map((value, at) =>
                at === start - 1 && joint !== null && medians[index][start] !== null ? joint : value,
            )
            return {
                name,
                median: medians[index],
                line,
                bands: bands.map((band) => ({ label: band.label, low: band.low[index], high: band.high[index] })),
                history:
                    spec.history === undefined
                        ? categories.map(() => null)
                        : histories[index].map((value, at) => (before(at) ? value : null)),
                points: spec.history === undefined ? points[index] : points[index].map((value, at) => (before(at) ? null : value)),
                start,
            }
        }),
    }
}

/** What a fan's parts are called, the names the legend hides them by: one fan's by part, several fans' by series, all dots as one. */
export function partNames(spec: ChartSpec, fan: Fan) {
    const words = wordsOf(spec)
    const single = spec.series === undefined
    return {
        median: single ? words.median : fan.name,
        band: (label: string) => (single ? label : fan.name),
        observed: words.observed,
    }
}

/** How strongly a band's legend swatch mixes its fan's color into the card, deeper inward. */
const bandMix = (index: number, count: number) => Math.round(24 + (24 * index) / Math.max(1, count - 1))

/** A fan chart's legend: one fan's median, bands and truth, or each fan by its series and the truth once. */
export function fanLegend(spec: ChartSpec): LegendItem[] {
    const { fans } = fanShape(spec)
    const observed: LegendItem[] =
        spec.points === undefined && spec.history === undefined
            ? []
            : [{ key: wordsOf(spec).observed, label: wordsOf(spec).observed, color: 'var(--foreground)' }]
    if (spec.series !== undefined)
        return [
            ...fans.map((entry, index) => ({
                key: entry.name,
                label: entry.name,
                color: legendColor(spec, entry.name, index, SERIES_ORDER),
                values: entry.median,
            })),
            ...observed,
        ]
    const entry = fans[0]
    if (entry === undefined) return observed
    const token = spec.colors?.[entry.name] ?? paletteToken(spec, 0) ?? SERIES_ORDER[0]
    const names = partNames(spec, entry)
    return [
        { key: names.median, label: names.median, color: tokenColor(token), values: entry.median },
        ...entry.bands.map((band, at) => ({
            key: band.label,
            label: band.label,
            color: `color-mix(in oklab, ${tokenColor(token)} ${String(bandMix(at, entry.bands.length))}%, var(--card))`,
        })),
        ...observed.map((item) => ({ ...item, values: entry.history.map((value, at) => value ?? entry.points[at]) })),
    ]
}

/** The stages a sankey flows through, first to last. */
export function stagesOf(spec: ChartSpec): readonly string[] {
    if (spec.path === undefined || spec.path.length < 2) throw new Error('A sankey chart needs a path of at least two fields.')
    return spec.path
}

/** The field whose sum is a sankey link's width, or a nesting node's size, or none where rows are counted. */
export const weightOf = (spec: ChartSpec) => (typeof spec.y === 'string' ? spec.y : spec.y?.[0])

/** A sankey's legend: the labels of its first stage, each with its figure. */
export function sankeyLegend(spec: ChartSpec): LegendItem[] {
    const stages = stagesOf(spec)
    const flow = flows({ rows: spec.rows, path: stages.slice(0, 1), y: weightOf(spec) })
    const value = new Map(flow.nodes.map((node) => [node.name, node.value]))
    return distinct(spec.rows, stages[0], spec.order)
        .filter((name) => name !== '')
        .map((name, index) => ({
            key: name,
            label: name,
            color: legendColor(spec, name, index, SERIES_ORDER),
            values: [value.get(name) ?? null],
        }))
}

/** A funnel's stages in order with their figures, and each one's share of the first, in percent. */
export function funnelStages(spec: ChartSpec) {
    const { categories, series } = shaped({ ...spec, series: undefined, stack: undefined })
    const values = (series[0]?.values ?? []).map((value) => value ?? 0)
    const first = values[0] ?? 0
    return categories.map((name, index) => ({ name, value: values[index], share: first === 0 ? 0 : (values[index] / first) * 100 }))
}

/** A funnel stage's color as CSS: the token `colors` names for it, or the first series color fading with each stage. */
export function stageColor(spec: ChartSpec, name: string, index: number, count: number): string {
    const token = spec.colors?.[name]
    if (token !== undefined) return tokenColor(token)
    const strength = count <= 1 ? 80 : Math.round(80 - (45 * index) / (count - 1))
    return `color-mix(in oklab, var(--${SERIES_ORDER[0]}) ${String(strength)}%, var(--card))`
}

/** A funnel's legend: its stages, each with its figure. */
export function funnelLegend(spec: ChartSpec): LegendItem[] {
    const list = funnelStages(spec)
    return list.map((stage, index) => ({
        key: stage.name,
        label: stage.name,
        color: stageColor(spec, stage.name, index, list.length),
        values: [stage.value],
    }))
}

/** The fields a nesting kind reads, outermost first. */
export function pathOf(spec: ChartSpec): readonly string[] {
    if (spec.path === undefined || spec.path.length === 0) throw new Error('This chart needs a path of fields.')
    return spec.path
}

/** A nesting kind's top branches in the legend's order: `order` first, then as the rows give them. */
export const topOf = (spec: ChartSpec) => distinct(spec.rows, pathOf(spec)[0], spec.order).filter((name) => name !== '')

/** A nesting kind's legend: its top branches, each with its figure. */
export function treeLegend(spec: ChartSpec): LegendItem[] {
    const tree = nest({ rows: spec.rows, path: pathOf(spec).slice(0, 1), y: weightOf(spec) })
    const value = new Map(tree.map((node) => [node.name, node.value]))
    return topOf(spec).map((name, index) => ({
        key: name,
        label: name,
        color: legendColor(spec, name, index, SERIES_ORDER),
        values: [value.get(name) ?? null],
    }))
}

/** A histogram's `x` numbers in bins, counted per group of `series`, and each bin's label. */
export function binned(spec: ChartSpec) {
    const x = spec.x
    if (x === undefined) throw new Error('A histogram needs an x field.')
    const numbers = (rows: readonly ChartSpec['rows'][number][]) =>
        rows.map((row) => numberOf(row[x])).filter((value): value is number => value !== null)
    const bins: Bins = binsFor(numbers(spec.rows), spec.bins)
    const write = (value: number) => (spec.format ?? formatNumber)(value)
    const labels = Array.from({ length: bins.count }, (_, index) => {
        const from = bins.start + index * bins.width
        return `${write(from)}–${write(from + bins.width)}${unitAt(spec)}`
    })
    const groups = spec.series === undefined ? [wordsOf(spec).count] : distinct(spec.rows, spec.series, spec.seriesOrder)
    const series = groups.map((name) => ({
        name,
        values: binCounts(
            numbers(spec.series === undefined ? spec.rows : spec.rows.filter((row) => labelOf(row[spec.series as string]) === name)),
            bins,
        ) as (number | null)[],
    }))
    return { labels, series: spec.stack === 'percent' ? asShares(series) : series }
}

/** A histogram's legend: its groups, each with its counts. */
export function histogramLegend(spec: ChartSpec): LegendItem[] {
    return binned(spec).series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: legendColor(spec, entry.name, index, SERIES_ORDER),
        values: entry.values,
    }))
}

/** A scatter's or a parallel chart's legend: its groups of `series`, or one for all. */
export function scatterLegend(spec: ChartSpec): LegendItem[] {
    const groups = spec.series === undefined ? ['All'] : distinct(spec.rows, spec.series, spec.seriesOrder)
    return groups.map((name, index) => ({ key: name, label: name, color: legendColor(spec, name, index, SERIES_ORDER) }))
}

/** One ring's figure, named by its field or its series. */
export interface RingFigure {
    name: string
    value: number | null
    /** Which `y` field's unit it is written with. */
    unit: number
}

/**
 * The figures a rings chart draws, from the outermost in: one per label of `series`, each its rows'
 * first `y` combined by `aggregate` (or its rows counted), or else one per `y` field, each combined
 * its own way, or else the rows counted.
 */
export function ringFigures(spec: ChartSpec): RingFigure[] {
    const fields = fieldsOf(spec)
    const combine = (rows: ChartSpec['rows'], field: string | undefined, index: number) =>
        field === undefined
            ? rows.length
            : aggregate(
                  rows.map((row) => numberOf(row[field])).filter((value): value is number => value !== null),
                  aggregateAt(spec.aggregate, index),
              )
    if (spec.series !== undefined) {
        const field = spec.series
        return distinct(spec.rows, field, spec.seriesOrder).map((name) => ({
            name,
            value: combine(
                spec.rows.filter((row) => labelOf(row[field]) === name),
                fields[0],
                0,
            ),
            unit: 0,
        }))
    }
    if (fields.length === 0) return [{ name: wordsOf(spec).count, value: spec.rows.length, unit: 0 }]
    return fields.map((field, index) => ({ name: field, value: combine(spec.rows, field, index), unit: index }))
}

/** A rings chart's legend: its rings, each with its figure. */
export function ringsLegend(spec: ChartSpec): LegendItem[] {
    return ringFigures(spec).map((figure, index) => ({
        key: figure.name,
        label: figure.name,
        color: legendColor(spec, figure.name, index, SERIES_ORDER),
        values: [figure.value],
    }))
}

/** A rose's legend: its groups of `series`, or none where it draws one. */
export function roseLegend(spec: ChartSpec): LegendItem[] {
    const { series } = shaped({ ...spec, stack: undefined })
    if (series.length <= 1) return []
    return series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: legendColor(spec, entry.name, index, SERIES_ORDER),
        values: entry.values,
    }))
}

/** The spread a range chart draws, from its x, y and series fields. */
export function spreadOf(spec: ChartSpec) {
    if (spec.x === undefined || spec.y === undefined) throw new Error('A range chart needs x and y fields.')
    return spread({
        rows: spec.rows,
        x: spec.x,
        y: spec.y,
        series: spec.series,
        aggregate: spec.aggregate,
        order: spec.order,
        seriesOrder: spec.seriesOrder,
    })
}

/** A range chart's legend: its series, each with its middle line's figures. */
export function rangeLegend(spec: ChartSpec): LegendItem[] {
    return spreadOf(spec).series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: legendColor(spec, entry.name, index, SERIES_ORDER),
        values: entry.middle,
    }))
}

/** A waterfall's changes per category, the stretch of the running total each one covers, and the total. */
export function stretches(spec: ChartSpec) {
    const { categories, series } = shaped({ ...spec, series: undefined, stack: undefined })
    const steps = runningTotals(series[0]?.values ?? [])
    const total = steps.length === 0 ? 0 : steps[steps.length - 1].to
    return { categories, steps, total }
}

/** The tokens of a waterfall's rises, falls and total: what `colors` names for each word, or good, critical and the first series color. */
export function tones(spec: ChartSpec) {
    const words = wordsOf(spec)
    return {
        rise: spec.colors?.[words.rise] ?? 'good',
        fall: spec.colors?.[words.fall] ?? 'critical',
        total: spec.colors?.[words.total] ?? 'chart-2',
    }
}

/** A waterfall's legend: its rises, its falls and its total. */
export function waterfallLegend(spec: ChartSpec): LegendItem[] {
    const words = wordsOf(spec)
    const tone = tones(spec)
    const { steps, total } = stretches(spec)
    return [
        {
            key: words.rise,
            label: words.rise,
            color: tokenColor(tone.rise),
            values: steps.filter((step) => step.change >= 0).map((step) => step.change),
        },
        {
            key: words.fall,
            label: words.fall,
            color: tokenColor(tone.fall),
            values: steps.filter((step) => step.change < 0).map((step) => step.change),
        },
        { key: words.total, label: words.total, color: tokenColor(tone.total), values: [total] },
    ]
}

const none = (): LegendItem[] => []

/**
 * Every kind's legend, by its name: what a `ChartFrame` lists for a chart of that kind. It holds no
 * builder, so a page that lists a legend carries none of the kinds' option code.
 */
export const LEGENDS: Record<ChartKind, (spec: ChartSpec) => LegendItem[]> = {
    bar: seriesLegend,
    line: seriesLegend,
    area: seriesLegend,
    donut: donutLegend,
    pie: donutLegend,
    heatmap: none,
    scatter: scatterLegend,
    histogram: histogramLegend,
    boxplot: none,
    waterfall: waterfallLegend,
    funnel: funnelLegend,
    bullet: bulletLegend,
    radar: seriesLegend,
    rose: roseLegend,
    gauge: none,
    rings: ringsLegend,
    dual: seriesLegend,
    treemap: treeLegend,
    sunburst: treeLegend,
    sankey: sankeyLegend,
    calendar: none,
    parallel: scatterLegend,
    stream: seriesLegend,
    step: seriesLegend,
    range: rangeLegend,
    fan: fanLegend,
    linked: seriesLegend,
}
