import { tooltipMarkup, type ChartLook, type TooltipRow } from '../look'
import { edgeAxis, markRoom, stepLines, valueLabels, written } from './categories'
import { fanShape, partNames, type Fan } from './legends'
import { categoryText, colorOf, type ChartBuilder, type ChartSpec } from './spec'

/** A band's opacity: deeper inward, where it also lies over the bands outside it. */
const bandOpacity = (index: number, count: number) => 0.12 + (0.1 * index) / Math.max(1, count - 1)

/**
 * A forecast against the truth, along `x`: per fan, `bands` from the outermost in as nested bands
 * deepening inward in the fan's color, the median (`y`) as a line through them, the `points` field
 * as dots in the foreground's color, and with `history`, that field as a solid line on the rows
 * before the forecast starts, the median drawn from its last figure so the two read as one line
 * (`bridge: false` starts the median on its own). `marks` draw a dashed line down at a category,
 * such as where the forecast starts. `series` draws a fan per label; rows may leave any field empty, and nothing is
 * drawn or joined across a gap. Reads `aggregate`, `order`, `seriesOrder`, `colors`, `palette`,
 * `smooth`, `bridge`, `format`, `unit`, `words` (`median`, `observed`) and `formatCategory`.
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
                data: entry.line,
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
                return tooltipMarkup(categoryText(spec, categories[index] ?? ''), fanTooltip(spec, look, fans, index, hidden))
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
