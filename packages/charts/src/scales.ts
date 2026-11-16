import type { EChartsCoreOption } from 'echarts/core'

import { numberOf } from './data'
import type { ChartKind } from './kinds'
import type { ChartBuilder, ChartSpec } from './kinds/spec'
import type { ChartLook } from './look'
import { binsFor } from './stats'

/** The least and greatest figure a scale must hold. */
type Extent = [number, number]

type Item = Record<string, unknown>

const listOf = (value: unknown): Item[] => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]) as Item[]

/** Twelve digits drop the noise of binary fractions, so 0.7 / 0.1 counts as 7 steps, not 7.000000000000001. */
const clean = (value: number) => Number(value.toPrecision(12))

/** A round step near a value, as a scale's ticks take: 1, 2, 3 or 5 times a power of ten. */
function niceStep(value: number): number {
    const power = 10 ** Math.floor(Math.log10(value))
    const fraction = value / power
    return (fraction < 1.5 ? 1 : fraction < 2.5 ? 2 : fraction < 4 ? 3 : fraction < 7 ? 5 : 10) * power
}

/** An extent widened to round ticks, about `count` of them (five by default), with the step between them. */
export function niceExtent([low, high]: Extent, count = 5): { min: number; max: number; interval: number } {
    if (low === high) return { min: low - 1, max: high + 1, interval: 1 }
    const interval = clean(niceStep((high - low) / count))
    return { min: clean(Math.floor(clean(low / interval)) * interval), max: clean(Math.ceil(clean(high / interval)) * interval), interval }
}

/**
 * Round ends for an extent in a given number of steps, so a second axis' ticks fall on the first's
 * lines: the smallest step of 1, 2, 3 or 5 times a power of ten that holds the extent.
 */
export function alignedExtent([low, high]: Extent, steps: number): { min: number; max: number; interval: number } {
    const count = Math.max(1, steps)
    const raw = (high - low) / count
    if (!(raw > 0)) return { min: low, max: low + count, interval: 1 }
    for (let power = 10 ** Math.floor(Math.log10(raw)); ; power *= 10)
        for (const factor of [1, 2, 3, 5]) {
            const interval = clean(factor * power)
            if (interval < raw * (1 - 1e-9)) continue
            const min = clean(Math.floor(clean(low / interval)) * interval)
            const max = clean(min + count * interval)
            if (max >= high - interval * 1e-9) return { min, max, interval }
        }
}

/** A data item's own value: the `value` of an object, or the item itself. */
const valueOf = (item: unknown): unknown =>
    item !== null && typeof item === 'object' && !Array.isArray(item) ? (item as Item).value : item

/** The dimensions of a series' array items that hold figures on its value axis: as its `encode` names them, or by its kind. */
function dimensionsOn(series: Item, valueOn: 'x' | 'y'): number[] {
    const encoded = (series.encode as Item | undefined)?.[valueOn]
    if (typeof encoded === 'number') return [encoded]
    if (Array.isArray(encoded)) return encoded.filter((dimension): dimension is number => typeof dimension === 'number')
    // A box's five figures, low to high; any other point is [category, figure] standing and [figure, category] sideways.
    if (series.type === 'boxplot') return [0, 1, 2, 3, 4]
    return [valueOn === 'x' ? 0 : 1]
}

/** The figures in a data item on a value axis: a number, or the figures of an array at the dimensions given. */
function figuresOf(item: unknown, dimensions: readonly number[]): number[] {
    const value = valueOf(item)
    if (typeof value === 'number') return [value]
    if (!Array.isArray(value)) return []
    return dimensions.map((dimension): unknown => value[dimension]).filter((figure): figure is number => typeof figure === 'number')
}

/** A point's x and y out of a data item, for a series on two value axes. */
function pointOf(item: unknown, series: Item): [unknown, unknown] | null {
    const value = valueOf(item)
    if (!Array.isArray(value)) return null
    const encode = series.encode as Item | undefined
    const at = (key: 'x' | 'y', fallback: number): unknown => {
        const dimension = encode?.[key]
        return value[typeof dimension === 'number' ? dimension : Array.isArray(dimension) ? (dimension[0] as number) : fallback]
    }
    return [at('x', 0), at('y', 1)]
}

const widen = (extent: Extent | null, value: number): Extent =>
    extent === null ? [value, value] : [Math.min(extent[0], value), Math.max(extent[1], value)]

/** What an option's figures span: on each x and y value axis by its index, each parallel axis, its color scale, and each radar spoke's end. */
interface Spans {
    x: (Extent | null)[]
    y: (Extent | null)[]
    parallel: (Extent | null)[]
    visual: Extent | null
    spokes: Map<string, number>
}

/** The extents an option's figures reach on each of its axes, stacked series summed as they are drawn. */
function spansOf(option: EChartsCoreOption): Spans {
    const spans: Spans = { x: [], y: [], parallel: [], visual: null, spokes: new Map() }
    const axes = { x: listOf(option.xAxis), y: listOf(option.yAxis) }
    const reach = (on: 'x' | 'y', index: number, value: number) => {
        spans[on][index] = widen(spans[on][index] ?? null, value)
    }
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
        if (series.coordinateSystem === 'calendar' || series.type === 'radar') continue
        const index = {
            x: typeof series.xAxisIndex === 'number' ? series.xAxisIndex : 0,
            y: typeof series.yAxisIndex === 'number' ? series.yAxisIndex : 0,
        }
        const onX = axes.x[index.x]?.type === 'value'
        const onY = axes.y[index.y]?.type === 'value'
        if (onX && onY) {
            for (const item of data) {
                const point = pointOf(item, series)
                if (point === null) continue
                if (typeof point[0] === 'number') reach('x', index.x, point[0])
                if (typeof point[1] === 'number') reach('y', index.y, point[1])
            }
            continue
        }
        if (!onX && !onY) continue
        const valueOn = onY ? 'y' : 'x'
        const dimensions = dimensionsOn(series, valueOn)
        const key = typeof series.stack === 'string' ? `${valueOn}${String(index[valueOn])}:${series.stack}` : null
        const all = series.stackStrategy === 'all'
        const sums = key === null ? null : (stacks.get(key) ?? { up: [], down: [] })
        if (key !== null && sums !== null) stacks.set(key, sums)
        data.forEach((item, at) => {
            const value = valueOf(item)
            if (sums !== null && typeof value === 'number') {
                const side = all || value >= 0 ? sums.up : sums.down
                side[at] = (side[at] ?? 0) + value
                reach(valueOn, index[valueOn], side[at])
                return
            }
            for (const figure of figuresOf(item, dimensions)) reach(valueOn, index[valueOn], figure)
        })
    }
    const visual = listOf(option.visualMap)[0]
    if (typeof visual?.min === 'number' && typeof visual.max === 'number') spans.visual = [visual.min, visual.max]
    for (const radar of listOf(option.radar))
        for (const spoke of listOf(radar.indicator))
            if (typeof spoke.name === 'string' && typeof spoke.max === 'number')
                spans.spokes.set(spoke.name, Math.max(spans.spokes.get(spoke.name) ?? spoke.max, spoke.max))
    return spans
}

const join = (a: Extent | null, b: Extent | null): Extent | null =>
    a === null ? b : b === null ? a : [Math.min(a[0], b[0]), Math.max(a[1], b[1])]

/** The extent each axis reaches across every option, by the axis' index. */
function joinAll(all: readonly (Extent | null)[][]): (Extent | null)[] {
    const count = all.reduce((most, extents) => Math.max(most, extents.length), 0)
    return Array.from({ length: count }, (_, index) => all.reduce<Extent | null>((sum, extents) => join(sum, extents[index] ?? null), null))
}

/** The extent an axis holds: zero stays in view unless the axis scales to its data. */
const held = (axis: Item, extent: Extent): Extent => (axis.scale === true ? extent : [Math.min(0, extent[0]), Math.max(0, extent[1])])

/** Whether an axis takes a shared extent: a value axis that sets neither end itself. */
const open = (axis: Item | undefined): axis is Item =>
    axis !== undefined && axis.type === 'value' && axis.min === undefined && axis.max === undefined

/**
 * An option's value axes of one kind, each with the extent shared at its index and round ticks. An
 * axis that aligns its ticks to the first (a two-axis chart's right axis) takes round ends in as many
 * steps as the first, so its ticks still fall on the first's lines.
 */
function fitAxes(value: unknown, extents: readonly (Extent | null)[]): unknown {
    const fitted: Item[] = []
    listOf(value).forEach((axis, index) => {
        const extent = extents[index] ?? null
        const first = fitted[0]
        if (!open(axis) || extent === null) fitted.push(axis)
        else if (index > 0 && axis.alignTicks === true && typeof first.interval === 'number') {
            const steps = Math.round(((first.max as number) - (first.min as number)) / first.interval)
            fitted.push({ ...axis, ...alignedExtent(held(axis, extent), steps), alignTicks: false })
        } else fitted.push({ ...axis, ...niceExtent(held(axis, extent)) })
    })
    return Array.isArray(value) ? fitted : fitted[0]
}

/** A radar's spokes each ending where that spoke ends furthest across the charts. */
function fitRadar(value: unknown, spokes: ReadonlyMap<string, number>): unknown {
    const fit = (radar: Item) => ({
        ...radar,
        indicator: listOf(radar.indicator).map((spoke) => ({ ...spoke, max: spokes.get(spoke.name as string) ?? spoke.max })),
    })
    return Array.isArray(value) ? listOf(value).map(fit) : fit(value as Item)
}

/**
 * Charts drawn side by side on one scale: each option's value axes (each by its index, so a
 * two-axis chart's right axis is shared with the others' right axes), parallel axes, color scale
 * and radar spokes widened to the extent every option's figures reach, with round ticks, so a bar
 * of the same height means the same figure in each. Axes that set their own ends, and kinds with
 * no scale to share, are left as they are.
 */
export function shareScales(options: readonly EChartsCoreOption[]): EChartsCoreOption[] {
    const all = options.map(spansOf)
    const x = joinAll(all.map((spans) => spans.x))
    const y = joinAll(all.map((spans) => spans.y))
    const parallel = joinAll(all.map((spans) => spans.parallel))
    const visual = all.reduce<Extent | null>((sum, spans) => join(sum, spans.visual), null)
    const spokes = new Map<string, number>()
    for (const spans of all) for (const [name, max] of spans.spokes) spokes.set(name, Math.max(spokes.get(name) ?? max, max))
    return options.map((option) => {
        const visualMap = listOf(option.visualMap)[0]
        return {
            ...option,
            ...(option.xAxis === undefined ? {} : { xAxis: fitAxes(option.xAxis, x) }),
            ...(option.yAxis === undefined ? {} : { yAxis: fitAxes(option.yAxis, y) }),
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
            ...(option.radar === undefined || spokes.size === 0 ? {} : { radar: fitRadar(option.radar, spokes) }),
        }
    })
}

/** The end of an option's value axis, where a kind fixes it itself. */
function valueEnd(option: EChartsCoreOption): number | null {
    const axis = [...listOf(option.xAxis), ...listOf(option.yAxis)].find((each) => each.type === 'value')
    return typeof axis?.max === 'number' ? axis.max : null
}

/**
 * Charts of one kind built side by side on one scale, one per spec. What a kind fixes from its own
 * figures before it draws is fixed from all of them first: a histogram's bins from every chart's
 * numbers, a bullet chart's end from the furthest any chart reaches. Then `shareScales` shares the
 * axes, the color scale and the radar spokes.
 */
export function buildShared(
    kind: ChartKind,
    specs: readonly ChartSpec[],
    build: ChartBuilder,
    look: ChartLook,
    hidden?: ReadonlySet<string>,
): EChartsCoreOption[] {
    let shaped = specs
    const x = specs[0]?.x
    if (kind === 'histogram' && x !== undefined) {
        const numbers = specs.flatMap((spec) => spec.rows.map((row) => numberOf(row[x])).filter((value): value is number => value !== null))
        const bins = binsFor(numbers, specs[0].bins)
        if (bins.count > 0) shaped = specs.map((spec) => ({ ...spec, bins }))
    }
    let options = shaped.map((spec) => build(spec, look, hidden))
    if (kind === 'bullet' && specs.every((spec) => spec.max === undefined)) {
        const end = options.reduce<number | null>((most, option) => {
            const own = valueEnd(option)
            return own === null ? most : Math.max(most ?? own, own)
        }, null)
        if (end !== null) options = shaped.map((spec) => build({ ...spec, max: end }, look, hidden))
    }
    return shareScales(options)
}
