import type { ChartLook } from '../look'
import { tooltipMarkup } from '../look'
import { niceCeil } from '../stats'
import { shaped, written } from './categories'
import { colorOf, type ChartBuilder } from './spec'

/** The spokes and rings of a radar chart, shared by the radar kind and `RadarPanel` so both look the same. */
export function radarGrid(
    look: ChartLook,
    {
        spokes,
        shape = 'polygon',
        rings = 4,
    }: { spokes: readonly { name: string; max: number }[]; shape?: 'polygon' | 'circle'; rings?: number },
) {
    return {
        indicator: spokes.map((spoke) => ({ name: spoke.name, max: spoke.max })),
        shape,
        radius: '68%',
        center: ['50%', '52%'],
        splitNumber: rings,
        axisName: { color: look.muted, fontFamily: look.font, fontSize: look.size.label },
        axisNameGap: 6,
        axisLine: { lineStyle: { color: look.grid } },
        splitLine: { lineStyle: { color: look.grid } },
        splitArea: { show: false },
    }
}

/**
 * One polygon of a radar chart as its own series, so a legend beside the chart can hide and
 * emphasize it by name: faintly filled in its color, or a dashed outline for a reference.
 */
export function radarPolygon({
    name,
    values,
    color,
    dashed = false,
    fill = true,
}: {
    name: string
    values: readonly (number | null)[]
    /** The resolved color. */
    color: string
    dashed?: boolean
    fill?: boolean
}) {
    return {
        name,
        type: 'radar',
        color,
        symbol: dashed ? 'none' : 'circle',
        symbolSize: 4,
        emphasis: { focus: 'series' },
        blur: { lineStyle: { opacity: 0.2 }, areaStyle: { opacity: 0.04 }, itemStyle: { opacity: 0.25 } },
        lineStyle: { width: 1.5, type: dashed ? 'dashed' : 'solid' },
        areaStyle: fill && !dashed ? { color, opacity: 0.14 } : undefined,
        data: [{ name, value: values }],
    }
}

/**
 * The categories of `x` as spokes around a center and one polygon per series, each spoke's figure
 * its `y` combined by `aggregate`, or the rows counted. Every spoke shares one scale, from 0 to
 * `max` or a round number above the largest figure. Reads `x`, `y`, `series`, `aggregate`,
 * `order`, `seriesOrder`, `max`, `colors`, `format` and `unit`.
 */
export const radar: ChartBuilder = (spec, look) => {
    const { categories, series } = shaped({ ...spec, stack: undefined })
    const largest = Math.max(0, ...series.flatMap((entry) => entry.values.map((value) => value ?? 0)))
    const rim = spec.max ?? niceCeil(largest)
    return {
        tooltip: {
            trigger: 'item',
            formatter: (point: { seriesName: string; value: (number | null)[]; color: string }) =>
                tooltipMarkup(
                    point.seriesName,
                    categories.map((name, index) => ({ label: name, value: written(spec, point.value[index]) })),
                ),
        },
        radar: radarGrid(look, { spokes: categories.map((name) => ({ name, max: rim })) }),
        series: series.map((entry, index) =>
            radarPolygon({ name: entry.name, values: entry.values, color: colorOf(spec, look, entry.name, index) }),
        ),
    }
}
