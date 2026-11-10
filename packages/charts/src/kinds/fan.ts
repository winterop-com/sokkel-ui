import { distinct, pivot } from '../data'
import { SERIES_ORDER, tooltipMarkup, type ChartLook, type TooltipRow } from '../look'
import { edgeAxis, markRoom, stepLines, valueLabels, written } from './categories'
import { colorOf, fieldsOf, legendColor, paletteToken, wordsOf, type ChartBand, type ChartBuilder, type ChartSpec } from './spec'
import type { LegendItem } from '../ChartLegend'

type Figures = (number | null)[]

/** One fan: its median, its bands from the outermost in, the line before it and the dots against it. */
export interface Fan {
    /** The series' label, or the median's field where the chart draws one fan. */
    name: string
    median: Figures
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
            return {
                name,
                median: medians[index],
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
function partNames(spec: ChartSpec, fan: Fan) {
    const words = wordsOf(spec)
    const single = spec.series === undefined
    return {
        median: single ? words.median : fan.name,
        band: (label: string) => (single ? label : fan.name),
        observed: words.observed,
    }
}

/** A band's opacity: deeper inward, where it also lies over the bands outside it. */
const bandOpacity = (index: number, count: number) => 0.12 + (0.1 * index) / Math.max(1, count - 1)

/** How strongly a band's legend swatch mixes its fan's color into the card, deeper inward. */
const bandMix = (index: number, count: number) => Math.round(24 + (24 * index) / Math.max(1, count - 1))

/**
 * A forecast against the truth, along `x`: per fan, `bands` from the outermost in as nested bands
 * deepening inward in the fan's color, the median (`y`) as a line through them, the `points` field
 * as dots in the foreground's color, and with `history`, that field as a solid line on the rows
 * before the forecast starts. `marks` draw a dashed line down at a category, such as where the
 * forecast starts. `series` draws a fan per label; rows may leave any field empty, and nothing is
 * drawn or joined across a gap. Reads `aggregate`, `order`, `seriesOrder`, `colors`, `palette`,
 * `smooth`, `format`, `unit` and `words` (`median`, `observed`).
 */
export const fan: ChartBuilder = (spec, look, hidden) => {
    const { categories, fans } = fanShape(spec)
    const smooth = spec.smooth === true
    const several = spec.series !== undefined
    const lines = stepLines(spec, look)
    const series = fans.flatMap((entry, index) => {
        const color = colorOf(spec, look, entry.name, index)
        const names = partNames(spec, entry)
        const bands = entry.bands.flatMap((band, at) => {
            const stack = {
                type: 'line',
                name: names.band(band.label),
                stack: `fan-${String(index)}-${String(at)}`,
                stackStrategy: 'all',
                symbol: 'none',
                silent: true,
                smooth,
            }
            return [
                { ...stack, data: band.low, lineStyle: { opacity: 0 }, itemStyle: { color } },
                {
                    ...stack,
                    data: band.low.map((low, row) => (low === null || band.high[row] === null ? null : (band.high[row] as number) - low)),
                    lineStyle: { opacity: 0 },
                    itemStyle: { color },
                    areaStyle: { color, opacity: bandOpacity(at, entry.bands.length) },
                },
            ]
        })
        const dot = { color: look.foreground, borderColor: several ? color : look.card, borderWidth: several ? 2 : 1 }
        return [
            ...bands,
            {
                type: 'line',
                name: names.median,
                data: entry.median,
                smooth,
                symbol: 'none',
                itemStyle: { color },
                lineStyle: { color, width: 2 },
            },
            ...(spec.history === undefined
                ? []
                : [
                      {
                          type: 'line',
                          name: names.observed,
                          data: entry.history,
                          smooth,
                          symbol: 'none',
                          itemStyle: { color: look.foreground },
                          lineStyle: { color: look.foreground, width: 1.5 },
                      },
                  ]),
            ...(spec.points === undefined
                ? []
                : [{ type: 'scatter', name: names.observed, data: entry.points, symbolSize: 7, itemStyle: dot, z: 4 }]),
        ]
    })
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'line' },
            formatter: (points: { axisValue?: string; dataIndex: number }[]) => {
                const first = points[0]
                const index = first?.axisValue === undefined ? (first?.dataIndex ?? 0) : categories.indexOf(first.axisValue)
                return tooltipMarkup(categories[index] ?? '', fanTooltip(spec, look, fans, index, hidden))
            },
        },
        grid: { left: 4, right: 10, top: markRoom(spec, look), bottom: 4 },
        xAxis: edgeAxis(spec, categories),
        yAxis: { type: 'value', scale: true, ...valueLabels(spec) },
        series: lines === undefined ? series : [...series, { type: 'line', name: '', data: [], silent: true, markLine: lines }],
    }
}

/** A fan chart's tooltip rows at one category: each fan's median, its bands' ranges and the truth, leaving out what the legend hides. */
export function fanTooltip(
    spec: ChartSpec,
    look: ChartLook,
    fans: readonly Fan[],
    index: number,
    hidden?: ReadonlySet<string>,
): TooltipRow[] {
    const bare = { ...spec, unit: '' }
    const shown = (name: string) => hidden?.has(name) !== true
    const several = spec.series !== undefined
    return fans.flatMap((entry, at) => {
        const names = partNames(spec, entry)
        const color = colorOf(spec, look, entry.name, at)
        const median = entry.median[index]
        const truth = entry.history[index] ?? entry.points[index]
        const rows: TooltipRow[] = []
        if (several && shown(entry.name) && (median !== null || truth !== null))
            rows.push({ label: entry.name, value: written(spec, median), color })
        if (!several && shown(names.median) && median !== null) rows.push({ label: names.median, value: written(spec, median), color })
        for (const band of entry.bands) {
            const low = band.low[index]
            const high = band.high[index]
            if (!shown(names.band(band.label)) || low === null || high === null) continue
            rows.push({ label: band.label, value: `${written(bare, low)} to ${written(spec, high)}` })
        }
        if (truth !== null && truth !== undefined && shown(names.observed))
            rows.push({ label: names.observed, value: written(spec, truth), color: several ? undefined : look.foreground })
        return rows
    })
}

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
        { key: names.median, label: names.median, color: `var(--${token})`, values: entry.median },
        ...entry.bands.map((band, at) => ({
            key: band.label,
            label: band.label,
            color: `color-mix(in oklab, var(--${token}) ${String(bandMix(at, entry.bands.length))}%, var(--card))`,
        })),
        ...observed.map((item) => ({ ...item, values: entry.history.map((value, at) => value ?? entry.points[at]) })),
    ]
}
