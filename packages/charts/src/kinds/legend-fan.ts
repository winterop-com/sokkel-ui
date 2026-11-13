import type { LegendItem } from '../ChartLegend'
import { distinct, pivot } from '../data'
import { SERIES_ORDER, tokenColor } from '../look'
import { fieldsOf, legendColor, paletteToken, wordsOf, type ChartBand, type ChartSpec } from './spec'

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
