import type { EChartsCoreOption } from 'echarts/core'

function zoomsOf(option: EChartsCoreOption | null): Record<string, unknown>[] {
    const zooms = option?.dataZoom
    if (zooms === undefined || zooms === null) return []
    return (Array.isArray(zooms) ? zooms : [zooms]) as Record<string, unknown>[]
}

/** The window each zoom of an option opens on: from and to in percent, or the first and last value in view. */
function asked(option: EChartsCoreOption | null): Record<string, unknown>[] {
    return zoomsOf(option).map(({ start, end, startValue, endValue }) => ({ start, end, startValue, endValue }))
}

const AXES = ['xAxis', 'yAxis', 'singleAxis', 'angleAxis', 'radiusAxis'] as const

/**
 * What an option draws along: the distinct categories of its axes, or where it has none, the
 * distinct data of its series. Hiding a panel or a series, or a new theme, leaves it the same.
 */
function along(option: EChartsCoreOption): string {
    const axes = AXES.flatMap((key) => {
        const axis = option[key]
        return axis === undefined || axis === null ? [] : Array.isArray(axis) ? axis : [axis]
    }) as { data?: unknown }[]
    const categories = axes.flatMap((axis) => (Array.isArray(axis.data) ? [JSON.stringify(axis.data)] : []))
    if (categories.length > 0) return JSON.stringify([...new Set(categories)].sort())
    const series =
        option.series === undefined || option.series === null ? [] : Array.isArray(option.series) ? option.series : [option.series]
    return JSON.stringify([...new Set((series as { data?: unknown }[]).map((entry) => JSON.stringify(entry.data ?? null)))].sort())
}

/**
 * The option with the zooms where the reader left them, when it is drawn again along the same
 * categories or data and asks for the window the last one asked for: hiding a series, a new theme
 * or another setting keeps the part in view. An option drawn along other data, asking for another
 * window, or with other zooms, opens where it asks, as a kept share of another axis would show a
 * part nobody picked.
 */
export function keepZoom(
    previous: EChartsCoreOption | null,
    next: EChartsCoreOption,
    current: readonly { start?: number; end?: number }[],
): EChartsCoreOption {
    const zooms = zoomsOf(next)
    if (previous === null || zooms.length === 0 || current.length !== zooms.length) return next
    if (JSON.stringify(asked(previous)) !== JSON.stringify(asked(next))) return next
    if (along(previous) !== along(next)) return next
    return {
        ...next,
        dataZoom: zooms.map((zoom, index) => {
            const { start, end } = current[index]
            if (start === undefined || end === undefined) return zoom
            const { startValue: _from, endValue: _to, ...rest } = zoom
            return { ...rest, start, end }
        }),
    }
}
