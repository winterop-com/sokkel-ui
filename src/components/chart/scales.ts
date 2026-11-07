import type { EChartsCoreOption } from 'echarts/core'

/** The least and greatest figure a scale must hold. */
type Extent = [number, number]

type Item = Record<string, unknown>

const listOf = (value: unknown): Item[] => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]) as Item[]

/** A round step near a value, as a scale's ticks take: 1, 2, 3 or 5 times a power of ten. */
function niceStep(value: number): number {
    const power = 10 ** Math.floor(Math.log10(value))
    const fraction = value / power
    return (fraction < 1.5 ? 1 : fraction < 2.5 ? 2 : fraction < 4 ? 3 : fraction < 7 ? 5 : 10) * power
}

/** An extent widened to round ticks, about `count` of them (five by default), with the step between them. */
export function niceExtent([low, high]: Extent, count = 5): { min: number; max: number; interval: number } {
    if (low === high) return { min: low - 1, max: high + 1, interval: 1 }
    // Twelve digits drop the noise of binary fractions, so 0.7 / 0.1 counts as 7 steps, not 7.000000000000001.
    const clean = (value: number) => Number(value.toPrecision(12))
    const interval = clean(niceStep((high - low) / count))
    return { min: clean(Math.floor(clean(low / interval)) * interval), max: clean(Math.ceil(clean(high / interval)) * interval), interval }
}

/** A figure out of a series' data item: a number, or the `value` of an object. */
function figureOf(item: unknown): unknown {
    return item !== null && typeof item === 'object' && !Array.isArray(item) ? (item as Item).value : item
}

const widen = (extent: Extent | null, value: number): Extent =>
    extent === null ? [value, value] : [Math.min(extent[0], value), Math.max(extent[1], value)]

/** What an option's figures span: on its x and y value axes, on each parallel axis, and on its color scale. */
interface Spans {
    x: Extent | null
    y: Extent | null
    parallel: (Extent | null)[]
    visual: Extent | null
}

/** The extents an option's figures reach, stacked series summed as they are drawn. */
function spansOf(option: EChartsCoreOption): Spans {
    const spans: Spans = { x: null, y: null, parallel: [], visual: null }
    const xAxis = listOf(option.xAxis)[0]
    const yAxis = listOf(option.yAxis)[0]
    const valueOn: 'x' | 'y' | 'both' | null =
        xAxis?.type === 'value' && yAxis?.type === 'value' ? 'both' : yAxis?.type === 'value' ? 'y' : xAxis?.type === 'value' ? 'x' : null
    const stacks = new Map<string, { up: number[]; down: number[] }>()
    for (const series of listOf(option.series)) {
        const data = listOf(series.data)
        if (series.type === 'parallel') {
            for (const row of data) {
                if (!Array.isArray(row)) continue
                row.forEach((value, index) => {
                    if (typeof value === 'number') spans.parallel[index] = widen(spans.parallel[index] ?? null, value)
                })
            }
            continue
        }
        if (valueOn === null || series.coordinateSystem === 'calendar') continue
        if (valueOn === 'both') {
            for (const item of data) {
                const point = figureOf(item)
                if (!Array.isArray(point)) continue
                if (typeof point[0] === 'number') spans.x = widen(spans.x, point[0])
                if (typeof point[1] === 'number') spans.y = widen(spans.y, point[1])
            }
            continue
        }
        const key = typeof series.stack === 'string' ? series.stack : null
        const all = series.stackStrategy === 'all'
        const sums = key === null ? null : (stacks.get(key) ?? { up: [], down: [] })
        if (key !== null && sums !== null) stacks.set(key, sums)
        data.forEach((item, index) => {
            const value = figureOf(item)
            if (typeof value !== 'number') return
            let reached = value
            if (sums !== null) {
                const side = all || value >= 0 ? sums.up : sums.down
                side[index] = (side[index] ?? 0) + value
                reached = side[index]
            }
            spans[valueOn] = widen(spans[valueOn], reached)
        })
    }
    const visual = listOf(option.visualMap)[0]
    if (typeof visual?.min === 'number' && typeof visual.max === 'number') spans.visual = [visual.min, visual.max]
    return spans
}

const join = (a: Extent | null, b: Extent | null): Extent | null =>
    a === null ? b : b === null ? a : [Math.min(a[0], b[0]), Math.max(a[1], b[1])]

/** An axis with the shared extent, unless it sets its own ends; zero stays in view unless the axis scales to its data. */
function fitAxis(axis: Item | undefined, extent: Extent | null): Item | undefined {
    if (axis === undefined || extent === null || axis.type !== 'value' || axis.min !== undefined || axis.max !== undefined) return axis
    const held: Extent = axis.scale === true ? extent : [Math.min(0, extent[0]), Math.max(0, extent[1])]
    return { ...axis, ...niceExtent(held) }
}

/** The option's first axis of a kind replaced, the rest kept. */
function withFirst(value: unknown, change: (axis: Item | undefined) => Item | undefined): unknown {
    if (value === undefined) return value
    if (!Array.isArray(value)) return change(value as Item)
    return [change(value[0] as Item), ...value.slice(1)]
}

/**
 * Charts drawn side by side on one scale: each option's value axes, parallel axes and color scale
 * widened to the extent every option's figures reach, with round ticks, so a bar of the same
 * height means the same figure in each. Axes that set their own ends, and kinds with no scale to
 * share, are left as they are.
 */
export function shareScales(options: readonly EChartsCoreOption[]): EChartsCoreOption[] {
    const all = options.map(spansOf)
    const x = all.reduce<Extent | null>((sum, spans) => join(sum, spans.x), null)
    const y = all.reduce<Extent | null>((sum, spans) => join(sum, spans.y), null)
    const visual = all.reduce<Extent | null>((sum, spans) => join(sum, spans.visual), null)
    const axes = Math.max(0, ...all.map((spans) => spans.parallel.length))
    const parallel = Array.from({ length: axes }, (_, index) =>
        all.reduce<Extent | null>((sum, spans) => join(sum, spans.parallel[index] ?? null), null),
    )
    return options.map((option) => {
        const visualMap = listOf(option.visualMap)[0]
        return {
            ...option,
            ...(option.xAxis === undefined ? {} : { xAxis: withFirst(option.xAxis, (axis) => fitAxis(axis, x)) }),
            ...(option.yAxis === undefined ? {} : { yAxis: withFirst(option.yAxis, (axis) => fitAxis(axis, y)) }),
            ...(visualMap === undefined || visual === null ? {} : { visualMap: { ...visualMap, min: visual[0], max: visual[1] } }),
            ...(option.parallelAxis === undefined
                ? {}
                : {
                      parallelAxis: listOf(option.parallelAxis).map((axis, index) =>
                          axis.type === 'value' && parallel[index] !== null && parallel[index] !== undefined
                              ? { ...axis, min: parallel[index][0], max: parallel[index][1] }
                              : axis,
                      ),
                  }),
        }
    })
}
