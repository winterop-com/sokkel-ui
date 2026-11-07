import { distinct, formatNumber, labelOf, numberOf } from '../data'
import { tooltipMarkup } from '../look'
import { spreadOf } from '../stats'
import { written } from './categories'
import { fieldsOf, wordsOf, type ChartBuilder } from './spec'

/**
 * The spread of `y` in each category of `x`: a box from the lower to the upper quartile with the
 * median across it, whiskers out to the furthest values within one and a half box heights, and
 * the values beyond as points. Boxes stand up, or run sideways with `horizontal`. The boxes take
 * the color `colors` names for `y`, or the first series color. Reads `x`, `y`, `order`,
 * `horizontal`, `colors`, `format`, `unit` and `words`.
 */
export const boxplot: ChartBuilder = (spec, look) => {
    const x = spec.x
    const y = fieldsOf(spec)[0]
    if (x === undefined || y === undefined) throw new Error('A box plot needs x and y fields.')
    const words = wordsOf(spec)
    const categories = distinct(spec.rows, x, spec.order)
    const at = new Map(categories.map((name, index) => [name, index]))
    const buckets: number[][] = categories.map(() => [])
    for (const row of spec.rows) {
        const value = numberOf(row[y])
        const index = at.get(labelOf(row[x]))
        if (value !== null && index !== undefined) buckets[index].push(value)
    }
    const spreads = buckets.map(spreadOf)
    const token = spec.colors?.[y]
    const color = token === undefined ? look.series[0] : look.token(token)
    const categoryAxis = { type: 'category', data: categories }
    const valueAxis = { type: 'value', scale: true }
    return {
        tooltip: {
            trigger: 'item',
            formatter: (point: { seriesType: string; dataIndex: number; value: number[] }) => {
                if (point.seriesType !== 'boxplot') {
                    const [where, value] = spec.horizontal === true ? [point.value[1], point.value[0]] : point.value
                    return tooltipMarkup(categories[where] ?? '', [{ label: words.outlier, value: written(spec, value) }])
                }
                const spread = spreads[point.dataIndex]
                if (spread === null) return ''
                return tooltipMarkup(categories[point.dataIndex], [
                    { label: words.high, value: written(spec, spread.high) },
                    { label: words.upper, value: written(spec, spread.upper) },
                    { label: words.median, value: written(spec, spread.median) },
                    { label: words.lower, value: written(spec, spread.lower) },
                    { label: words.low, value: written(spec, spread.low) },
                    { label: words.count, value: formatNumber(spread.count) },
                ])
            },
        },
        grid: { left: 4, right: 10, top: 10, bottom: 4 },
        xAxis: spec.horizontal === true ? valueAxis : categoryAxis,
        yAxis: spec.horizontal === true ? { ...categoryAxis, inverse: true } : valueAxis,
        series: [
            {
                type: 'boxplot',
                name: y,
                boxWidth: [8, 40],
                itemStyle: { color: look.mix(color, 22), borderColor: color, borderWidth: 1.25 },
                emphasis: { itemStyle: { color: look.mix(color, 36), borderColor: color, borderWidth: 1.5 } },
                data: spreads.map((spread) =>
                    spread === null ? [] : [spread.low, spread.lower, spread.median, spread.upper, spread.high],
                ),
            },
            {
                type: 'scatter',
                name: words.outlier,
                symbolSize: 5,
                itemStyle: { color: look.card, borderColor: color, borderWidth: 1.25, opacity: 1 },
                data: spreads.flatMap((spread, index) =>
                    (spread?.outliers ?? []).map((value) => (spec.horizontal === true ? [value, index] : [index, value])),
                ),
            },
        ],
    }
}
