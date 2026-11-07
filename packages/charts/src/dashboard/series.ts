import type { LegendItem } from '../ChartLegend'
import { SERIES_ORDER, type ChartLook } from '../look'
import { formatValue, tokenVar } from '@winterop-com/sokkel-ui/dashboard/thresholds'

/** One series of a dashboard chart panel. `name` names it in the legend, the tooltip and `hidden`. */
export interface PanelSeries {
    name: string
    values: readonly (number | null)[]
    /** A color token's name; series take the categorical order when omitted. */
    color?: string
    /** Series with the same stack are drawn on top of each other. */
    stack?: string
    /** A dashed line, for a reference such as a target or the previous period. */
    dashed?: boolean
}

/** The token a series is drawn in. */
export const seriesToken = (series: PanelSeries, index: number) => series.color ?? SERIES_ORDER[index % SERIES_ORDER.length]

/** The legend items for a panel's series. */
export const legendItems = (series: readonly PanelSeries[]): LegendItem[] =>
    series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: tokenVar(seriesToken(entry, index)),
        values: entry.values.map((value) => value ?? undefined),
    }))

/** Writes a value with its unit, by `format` when given. */
export function valueWriter(unit = '', decimals?: number, format?: (value: number) => string): (value: number) => string {
    return (value) => (format !== undefined ? format(value) : `${formatValue(value, decimals)}${unit}`)
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/** An axis label: the value written short, with its unit. */
export const axisWriter =
    (unit = '') =>
    (value: number) =>
        `${compact.format(value)}${unit}`

/** The axis settings every dashboard chart panel shares. */
export function axes(look: ChartLook, x: readonly string[], unit?: string, labelEvery?: number) {
    const write = axisWriter(unit)
    return {
        xAxis: {
            type: 'category',
            data: x,
            axisLabel: { interval: labelEvery === undefined ? 'auto' : labelEvery - 1, hideOverlap: true },
            axisLine: { lineStyle: { color: look.border } },
        },
        yAxis: { type: 'value', axisLabel: { formatter: (value: number) => write(value), hideOverlap: true }, splitNumber: 4 },
    }
}
