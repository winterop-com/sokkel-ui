/** The axes, ticks, marks and bar ends the builders share, apart from any builder, so a kind loads only its own. */

import { formatNumber, formatTick, type Series } from '../data'
import type { ChartLook } from '../look'
import { categoryLabels, unitAt, written, type ChartSpec } from './spec'

const FIGURE = /\d[\d,]*(?:\.\d+)?/

/**
 * A tick written by a chart's `format`, short: the figure `format` writes for the tick's value is
 * swapped for `formatTick`'s, keeping the words around it, so `1,500 GB` reads `1.5K GB`. Where
 * `format` writes another figure, as one that changes the unit does (`1.5 TB`), its text is kept.
 */
export function compactWritten(text: string, value: number): string {
    const match = FIGURE.exec(text)
    if (match === null) return text
    const figure = Number(match[0].replaceAll(',', ''))
    const size = Math.abs(value)
    if (Math.abs(figure - size) > Math.max(0.5, size * 0.01)) return text
    return `${text.slice(0, match.index)}${formatTick(size)}${text.slice(match.index + match[0].length)}`
}

/** How a value axis writes its ticks: through the chart's `format` where it has one, short, then the unit. */
export function tickWriter(format: ((value: number) => string) | undefined, unit = ''): (value: number) => string {
    if (format === undefined) return (value) => `${formatTick(value)}${unit}`
    return (value) => `${compactWritten(format(value), value)}${unit}`
}

/** The category axis, its labels every `labelEvery`th category when the spec asks, written by `formatCategory`. */
export function categoryAxis(spec: ChartSpec, categories: string[]) {
    return {
        type: 'category',
        data: categories,
        axisLabel: { ...(spec.labelEvery === undefined ? {} : { interval: spec.labelEvery - 1 }), ...categoryLabels(spec) },
    }
}

/**
 * The value axis' labels: written by the spec's `format`, short, with its unit where it has one,
 * or `%` where the figures stack to 100%.
 */
export function valueLabels(spec: ChartSpec) {
    if (spec.stack === 'percent') return { axisLabel: { formatter: (value: number) => `${formatNumber(value)}%` } }
    return valueTicks(spec)
}

/** A value axis' ticks, written as the tooltips write its figures, short: by the spec's `format`, then the unit of `left` or the spec's. */
export function valueTicks(spec: ChartSpec) {
    return { axisLabel: { formatter: tickWriter(spec.format, spec.axes?.left?.unit ?? unitAt(spec)) } }
}

/** The spec's steps after the first, each a dashed line across the chart at its value, in its color and labeled with its figure. */
function stepMarks(spec: ChartSpec, look: ChartLook) {
    return (spec.steps ?? [])
        .slice(1)
        .filter((step) => step.value !== undefined)
        .map((step) => {
            const color = step.color === undefined ? look.muted : look.token(step.color)
            return {
                yAxis: step.value,
                lineStyle: { color, type: 'dashed', width: 1 },
                label: {
                    show: true,
                    position: 'insideEndTop',
                    formatter: () => written(spec, step.value),
                    color,
                    fontFamily: look.font,
                    fontSize: look.size.small,
                },
            }
        })
}

/** The spec's marks, each a dashed line down the chart at its category, in its color and labeled at its top. */
function categoryMarks(spec: ChartSpec, look: ChartLook) {
    return (spec.marks ?? []).map((mark) => {
        const color = mark.color === undefined ? look.muted : look.token(mark.color)
        return {
            xAxis: mark.x,
            lineStyle: { color, type: 'dashed', width: 1 },
            label: {
                show: mark.label !== undefined,
                position: 'end',
                formatter: () => mark.label ?? '',
                color,
                fontFamily: look.font,
                fontSize: look.size.small,
            },
        }
    })
}

/** The room above the grid a chart leaves for its marks' labels. */
export const markRoom = (spec: ChartSpec, look: ChartLook): number =>
    spec.marks?.some((mark) => mark.label !== undefined) === true ? look.size.small + 12 : 10

/**
 * The spec's lines across and down the chart: the steps after the first, dashed across at their
 * values, and the marks, dashed down at their categories.
 */
export function stepLines(spec: ChartSpec, look: ChartLook) {
    const data = [...stepMarks(spec, look), ...categoryMarks(spec, look)]
    if (data.length === 0) return undefined
    return { silent: true, symbol: 'none', data }
}

/**
 * Whether a bar ends its stack in its category: it stands alone, or it is the last of its stack
 * with a figure on its side of zero.
 */
export function endsStack(
    groups: readonly (string | undefined)[],
    series: readonly Series[],
    index: number,
    category: number,
    value: number,
) {
    const group = groups[index]
    if (group === undefined) return true
    const sign = Math.sign(value)
    return series.findLastIndex((entry, at) => groups[at] === group && Math.sign(entry.values[category] ?? 0) === sign) === index
}

/** A bar's corners, rounded at its far end from the axis. */
export function farCorners(corner: number, horizontal: boolean, value: number) {
    if (horizontal) return value < 0 ? [corner, 0, 0, corner] : [0, corner, corner, 0]
    return value < 0 ? [0, 0, corner, corner] : [corner, corner, 0, 0]
}

/** An area's color fading from its line toward the axis, deeper where areas stack; upward where the area hangs from the top. */
export function fading(look: ChartLook, color: string, stacked: boolean, hang = false) {
    return {
        type: 'linear',
        x: 0,
        y: hang ? 1 : 0,
        x2: 0,
        y2: hang ? 0 : 1,
        colorStops: [
            { offset: 0, color: look.mix(color, stacked ? 55 : 40) },
            { offset: 1, color: look.mix(color, stacked ? 30 : 4) },
        ],
    }
}

/**
 * A category axis whose points sit on its ends, as a line's do. Where the chart picks which labels
 * show, the first and last always do, aligned inward so neither runs past the chart's edge, and a
 * label too close to them gives way.
 */
export function edgeAxis(spec: ChartSpec, categories: string[]) {
    if (spec.labelEvery !== undefined) return { ...categoryAxis(spec, categories), boundaryGap: false }
    return {
        type: 'category',
        data: categories,
        boundaryGap: false,
        axisLabel: {
            showMinLabel: true,
            showMaxLabel: true,
            alignMinLabel: 'left',
            alignMaxLabel: 'right',
            hideOverlap: true,
            ...categoryLabels(spec),
        },
    }
}
