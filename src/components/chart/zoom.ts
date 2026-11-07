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

/**
 * The option with the zooms where the reader left them, when it is drawn again asking for the
 * window the last one asked for: hiding a series, a new theme or another setting keeps the part
 * in view. An option that asks for another window, or has other zooms, opens where it asks.
 */
export function keepZoom(
    previous: EChartsCoreOption | null,
    next: EChartsCoreOption,
    current: readonly { start?: number; end?: number }[],
): EChartsCoreOption {
    const zooms = zoomsOf(next)
    if (previous === null || zooms.length === 0 || current.length !== zooms.length) return next
    if (JSON.stringify(asked(previous)) !== JSON.stringify(asked(next))) return next
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
