import { tokenColor, tooltipMarkup, type ChartLook } from '../look'
import { categoryAxis, edgeAxis, endsStack, fading, farCorners, markRoom, stepLines, tickWriter, valueLabels } from './axes'
import { shaped } from './legends'
import {
    categoryText,
    colorOf,
    isDashed,
    isFigure,
    measureName,
    paletteToken,
    stackOf,
    unitAt,
    type ChartBuilder,
    written,
    type ChartSpec,
} from './spec'

/** A value axis with nothing drawn: no line, labels or lines across, for a quiet chart. */
const HIDDEN_AXIS = { show: false, splitLine: { show: false } }

/** The value axis, hidden where the spec asks for a quiet chart. */
function quietValue<T extends object>(spec: ChartSpec, axis: T): T {
    return spec.quiet === true ? { ...axis, ...HIDDEN_AXIS } : axis
}

/** The category axis, its labels in the mono typeface where the spec asks for a quiet chart. */
function quietCategory<T extends { axisLabel?: object }>(spec: ChartSpec, look: ChartLook, axis: T): T {
    return spec.quiet === true ? { ...axis, axisLabel: { ...axis.axisLabel, fontFamily: look.mono } } : axis
}

/** The value axis' range: from `min` to `max`, or 0 to 100% in quarters where the figures stack to 100%. */
function valueRange(spec: ChartSpec) {
    return spec.stack === 'percent' ? { min: 0, max: 100, interval: 25 } : { min: spec.min, max: spec.max }
}

/** A tooltip listing every series with a figure at the category under the pointer; a series with none there draws nothing, so it is left out. */
function axisTooltip(spec: ChartSpec) {
    const unit = spec.stack === 'percent' ? { ...spec, format: (value: number) => value.toFixed(1), unit: '%' } : spec
    return {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (points: { axisValueLabel: string; seriesName: string; seriesIndex: number; value: number | null; color: string }[]) =>
            tooltipMarkup(
                categoryText(spec, points[0]?.axisValueLabel ?? ''),
                points
                    .filter((point) => isFigure(point.value))
                    .map((point) => ({
                        label: point.seriesName,
                        value: written(unit, point.value, spec.series === undefined ? point.seriesIndex : 0),
                        color: point.color,
                    })),
            ),
    }
}

/**
 * Bars per category, one bar per series side by side, stacked, or as shares of 100%; `stacks` puts
 * series in stacks of their own, and `gap` sets how close they stand. Each bar, or each stack, is
 * rounded at its far end, and stacked bars are parted by a line in the card's color. `quiet` hides
 * the value axis and its lines and writes the categories in mono; `baseline` draws a bar of zero as
 * a line one pixel high.
 */
export const bar: ChartBuilder = (spec, look) => {
    const { categories, series } = shaped(spec)
    const along = quietCategory(spec, look, categoryAxis(spec, categories))
    const valueAxis = quietValue(spec, { type: 'value', ...valueRange(spec), ...valueLabels(spec) })
    const baseline = spec.baseline === true
    const groups = series.map((entry) => stackOf(spec, entry.name))
    const stacked = groups.some((group) => group !== undefined)
    const horizontal = spec.horizontal === true
    const isEnd = (index: number, category: number, value: number) => endsStack(groups, series, index, category, value)
    return {
        tooltip: axisTooltip(spec),
        grid: { left: 4, right: 10, top: 10, bottom: 4 },
        xAxis: horizontal ? valueAxis : along,
        yAxis: horizontal ? { ...along, inverse: true } : valueAxis,
        series: series.map((entry, index) => ({
            type: 'bar',
            name: entry.name,
            data: entry.values.map((value, category) =>
                value === 0 && baseline
                    ? { value, itemStyle: { borderWidth: 0 } }
                    : value === null || value === 0 || !isEnd(index, category, value)
                      ? value
                      : { value, itemStyle: { borderRadius: farCorners(look.corner, horizontal, value) } },
            ),
            stack: groups[index],
            ...(baseline ? { barMinHeight: 1 } : {}),
            ...(spec.gap === 'tight' ? { barCategoryGap: '6%', barMaxWidth: 400 } : stacked ? { barCategoryGap: '24%' } : {}),
            itemStyle: {
                color: colorOf(spec, look, entry.name, index),
                ...(groups[index] === undefined ? {} : { borderColor: look.card, borderWidth: 1 }),
            },
        })),
    }
}

/**
 * A line per series across the categories, or areas filled under them, evenly or fading by `fill`;
 * `stacks` puts series in stacks of their own, a `dashed` series is drawn as a reference with no
 * area, the steps after the first are dashed lines across at their values, the `marks` dashed
 * lines down at their categories, and `min` and `max` fix the value axis. `quiet` hides the value
 * axis and its lines and writes the categories in mono.
 */
function lines(filled: boolean): ChartBuilder {
    return (spec, look) => {
        const { categories, series } = shaped(spec)
        const marks = stepLines(spec, look)
        return {
            tooltip: { ...axisTooltip(spec), axisPointer: { type: 'line' } },
            grid: { left: 4, right: 10, top: markRoom(spec, look), bottom: 4 },
            xAxis: quietCategory(spec, look, edgeAxis(spec, categories)),
            yAxis: quietValue(spec, { type: 'value', ...valueRange(spec), ...valueLabels(spec) }),
            series: series.map((entry, index) => {
                const color = colorOf(spec, look, entry.name, index)
                const stack = stackOf(spec, entry.name)
                const dashed = isDashed(spec, entry.name)
                return {
                    type: 'line',
                    name: entry.name,
                    data: entry.values,
                    smooth: spec.smooth === true,
                    stack,
                    itemStyle: { color },
                    lineStyle: dashed ? { color, width: 1.25, type: 'dashed' } : { color },
                    areaStyle:
                        !filled || dashed || spec.fill === 'none'
                            ? undefined
                            : spec.fill === 'gradient'
                              ? { opacity: 1, color: fading(look, color, stack !== undefined) }
                              : { color, opacity: stack === undefined ? 0.15 : 0.55 },
                    markLine: index === 0 ? marks : undefined,
                }
            }),
        }
    }
}

export const line = lines(false)
export const area = lines(true)

/** Slices of a circle, one per category, each its share of the whole: a ring round a hole, or a full pie. */
const slices =
    (hole: boolean): ChartBuilder =>
    (spec, look) => {
        const { categories, series } = shaped(spec)
        const values = series[0]?.values ?? []
        const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
        return {
            ...(spec.total === undefined || !hole
                ? {}
                : {
                      title: {
                          show: true,
                          text: written(spec, total),
                          subtext: spec.total,
                          left: 'center',
                          top: 'center',
                          itemGap: 2,
                          textStyle: { fontSize: look.size.stat, fontWeight: 600, color: look.foreground },
                          subtextStyle: { fontSize: look.size.label, color: look.muted },
                      },
                  }),
            tooltip: {
                trigger: 'item',
                formatter: (point: { name: string; value: number; color: string }) =>
                    tooltipMarkup('', [
                        {
                            label: point.name,
                            value: `${written(spec, point.value)} (${total === 0 ? '0' : ((point.value / total) * 100).toFixed(1)}%)`,
                            color: point.color,
                        },
                    ]),
            },
            series: [
                {
                    type: 'pie',
                    radius: hole ? ['58%', '82%'] : [0, '82%'],
                    padAngle: 1,
                    label: { show: false },
                    data: categories.map((name, index) => ({
                        name,
                        value: values[index],
                        itemStyle: { color: colorOf(spec, look, name, index), borderColor: look.card, borderWidth: hole ? 2 : 1 },
                    })),
                },
            ],
        }
    }

/** A ring of slices, one per category, each its share of the whole, with the total in its middle when `total` names it. */
export const donut = slices(true)

/** A pie: slices of a whole circle, one per category, each its share of the whole; `total` is left to the ring. */
export const pie = slices(false)

/** A heatmap scale's colors: from the card to one token, or from the card through several in turn. */
function scaleColors(look: ChartLook, scale: string | readonly string[]): string[] {
    if (typeof scale === 'string') return look.ramp(scale, 7)
    const [first, ...rest] = scale
    return [look.mix(tokenColor(first), 10), look.mix(tokenColor(first), 45), look.token(first), ...rest.map(look.token)]
}

/**
 * A grid of cells, `x` along and `series` down, each cell's color its combined `y`, on a scale
 * from `min` to `max` (the smallest and largest figure by default) through the tokens of `scale`,
 * shown beside the grid with its ends written by `showScale`.
 */
export const heatmap: ChartBuilder = (spec, look) => {
    const { categories, series } = shaped(spec)
    const cells = series.flatMap((entry, row) => entry.values.map((value, column) => [column, row, value]))
    const values = cells.map((cell) => cell[2]).filter((value): value is number => typeof value === 'number')
    const scale = spec.scale ?? spec.colors?.value ?? paletteToken(spec, 0) ?? 'chart-2'
    const low = spec.min ?? (values.length === 0 ? 0 : Math.min(...values))
    const high = spec.max ?? (values.length === 0 ? 1 : Math.max(...values))
    return {
        tooltip: {
            trigger: 'item',
            formatter: (point: { value: [number, number, number | null] }) =>
                tooltipMarkup(`${categoryText(spec, categories[point.value[0]])}, ${series[point.value[1]].name}`, [
                    {
                        label: spec.y === undefined ? measureName(spec, undefined) : measureName(spec, String(spec.y)),
                        value: written(spec, point.value[2]),
                    },
                ]),
        },
        grid: { left: 4, right: spec.showScale === true ? 44 : 10, top: 10, bottom: 4 },
        xAxis: { ...categoryAxis(spec, categories), splitArea: { show: false } },
        yAxis: { type: 'category', data: series.map((entry) => entry.name), inverse: true },
        visualMap: {
            show: spec.showScale === true,
            calculable: false,
            orient: 'vertical',
            right: 0,
            top: 4,
            bottom: 20,
            itemWidth: 8,
            itemHeight: 100,
            min: low,
            max: high,
            text: [high, low].map(tickWriter(spec.format, unitAt(spec))),
            textGap: 4,
            inRange: { color: scaleColors(look, scale) },
        },
        series: [
            {
                type: 'heatmap',
                data: cells,
                itemStyle: { borderColor: look.card, borderWidth: 1, borderRadius: look.corner },
                emphasis: { itemStyle: { borderColor: look.foreground } },
            },
        ],
    }
}
