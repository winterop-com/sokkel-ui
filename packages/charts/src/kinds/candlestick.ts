import { tooltipMarkup, type TooltipRow } from '../look'
import { farCorners, tickWriter } from './axes'
import { candleShape, rose, type Candle } from './legend-candles'
import { tones } from './legend-waterfall'
import { LABELS_BOTTOM, PANEL_BOTTOM, PANEL_RIGHT, panelLayout, panelZoom, sharedLabels, widestTick } from './panels'
import { categoryText, colorOf, unitAt, wordsOf, written, type ChartBuilder } from './spec'

interface Api {
    value: (dimension: number) => number
    coord: (point: [number, number]) => [number, number]
    size: (size: [number, number]) => [number, number]
    visual: (key: string) => string
}

/** Above the candles, where no panel's name is written. */
const TOP = 10
/** The widest a candle, a bar or a volume bar is drawn. */
const WIDEST = 14

/** An OHLC bar: a line from the low to the high, a tick left at the open and one right at the close. */
const ohlcBar = (_: unknown, api: Api) => {
    const index = api.value(0)
    const [open, close, low, high] = [api.value(1), api.value(2), api.value(3), api.value(4)]
    const [middle, top] = api.coord([index, high])
    const bottom = api.coord([index, low])[1]
    const tick = Math.min(WIDEST / 2, api.size([1, 0])[0] * 0.3)
    const color = api.visual('color')
    const line = (x1: number, y1: number, x2: number, y2: number) => ({
        type: 'line',
        shape: { x1, y1, x2, y2 },
        style: { stroke: color, lineWidth: 1.5 },
    })
    const at = (value: number) => api.coord([index, value])[1]
    return {
        type: 'group',
        children: [
            line(middle, top, middle, bottom),
            line(middle - tick, at(open), middle, at(open)),
            line(middle, at(close), middle + tick, at(close)),
        ],
    }
}

/**
 * Prices or readings over time as open, high, low and close: a candle per category of `x`, its body
 * from the open to the close and its wick from the low to the high, or with `ohlc.style` `bars` a
 * line from the low to the high with a tick left at the open and right at the close. A category
 * that closes at or above its open is a rise and takes the `good` tone, one below a fall in the
 * `critical` tone, unless `colors` names others for the words `Rise` and `Fall`. `ohlc.volume`
 * adds a panel of bars under the candles, each in its candle's tone, on the same axis; `averages`
 * draws a moving average of the closes over each span as a line; `zoom` opens it on a window with
 * a slider under it, and a drag or a pinch zooms both panels together, as a linked chart's do.
 * The value axis fits the figures in view. Figures are written with `format` and the first `unit`,
 * the volume with the second. Reads `x`, `ohlc`, `averages`, `order`,
 * `colors`, `palette`, `smooth`, `format`, `unit`, `fieldNames`, `zoom`, `words`, `labelEvery` and
 * `formatCategory`.
 */
export const candlestick: ChartBuilder = (spec, look) => {
    const words = wordsOf(spec)
    const { categories, candles, averages } = candleShape(spec)
    const ohlc = spec.ohlc ?? { open: '', high: '', low: '', close: '' }
    const tone = tones(spec)
    const colors = { rise: look.token(tone.rise), fall: look.token(tone.fall) }
    const toneOf = (candle: Candle) => (rose(candle) ? colors.rise : colors.fall)
    const volumeName = ohlc.volume === undefined ? undefined : (spec.fieldNames?.[ohlc.volume] ?? ohlc.volume)
    const panels = volumeName === undefined ? 1 : 2
    const zoomed = spec.zoom !== undefined

    const priceTicks = tickWriter(spec.format, unitAt(spec, 0), spec.locale)
    const volumeTicks = tickWriter(spec.format, unitAt(spec, 1), spec.locale)
    const prices = candles.flatMap((candle) => (candle === null ? [] : [candle.low, candle.high]))
    const volumes = candles.map((candle) => candle?.volume ?? null)
    const left =
        12 +
        Math.max(
            widestTick(prices, priceTicks, look.size.label, true),
            volumeName === undefined ? 0 : widestTick(volumes, volumeTicks, look.size.label),
        )
    const layout = panelLayout(panels === 2 ? [3, 1] : [1], TOP, zoomed ? PANEL_BOTTOM : LABELS_BOTTOM)
    const axes = Array.from({ length: panels }, (_, index) => index)
    const labels = sharedLabels(spec)

    const at = new Map(categories.map((name, index) => [name, index]))
    const averageColor = averages.map((average, index) => colorOf(spec, look, average.name, index))
    const tooltip = (points: { axisValueLabel: string; seriesName: string }[]) => {
        const category = points[0]?.axisValueLabel ?? ''
        const index = at.get(category)
        const candle = index === undefined ? null : candles[index]
        const shown = new Set(points.map((point) => point.seriesName))
        const rows: TooltipRow[] = []
        if (candle !== null && shown.has(rose(candle) ? words.rise : words.fall)) {
            const color = toneOf(candle)
            rows.push(
                { label: words.open, value: written(spec, candle.open), color },
                { label: words.high, value: written(spec, candle.high) },
                { label: words.low, value: written(spec, candle.low) },
                { label: words.close, value: written(spec, candle.close) },
            )
        }
        averages.forEach((average, which) => {
            const value = index === undefined ? null : average.values[index]
            if (shown.has(average.name) && value !== null)
                rows.push({ label: average.name, value: written(spec, value), color: averageColor[which] })
        })
        if (volumeName !== undefined && candle?.volume !== null && candle?.volume !== undefined && shown.has(volumeName))
            rows.push({ label: volumeName, value: written(spec, candle.volume, 1) })
        return rows.length === 0 ? '' : tooltipMarkup(categoryText(spec, category), rows)
    }

    const marks = (name: string, up: boolean) => {
        const color = up ? colors.rise : colors.fall
        const data = candles.flatMap((candle, index) =>
            candle === null || rose(candle) !== up ? [] : [[index, candle.open, candle.close, candle.low, candle.high]],
        )
        const common = { name, xAxisIndex: 0, yAxisIndex: 0, encode: { x: 0, y: [1, 2, 3, 4] }, data }
        if (ohlc.style === 'bars') return { ...common, type: 'custom', renderItem: ohlcBar, itemStyle: { color } }
        return {
            ...common,
            type: 'candlestick',
            barWidth: '60%',
            barMaxWidth: WIDEST,
            itemStyle: { color, color0: color, borderColor: color, borderColor0: color, borderWidth: 1 },
        }
    }

    return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'line' }, formatter: tooltip },
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        ...(zoomed ? { dataZoom: panelZoom(spec, look, { axes, left, shade: look.muted }) } : {}),
        grid: axes.map((index) => ({ left, right: PANEL_RIGHT, ...layout[index], outerBoundsMode: 'none' })),
        xAxis: axes.map((index) => ({
            type: 'category',
            gridIndex: index,
            data: categories,
            boundaryGap: true,
            axisLabel: index === panels - 1 ? labels : { show: false },
        })),
        yAxis: [
            { type: 'value', gridIndex: 0, scale: true, splitNumber: 4, axisLabel: { formatter: priceTicks, hideOverlap: true } },
            ...(volumeName === undefined
                ? []
                : [
                      {
                          type: 'value',
                          gridIndex: 1,
                          splitNumber: 2,
                          name: volumeName,
                          nameLocation: 'end',
                          nameGap: 8,
                          nameTextStyle: { align: 'left', padding: 0 },
                          axisLabel: { formatter: volumeTicks, hideOverlap: true },
                      },
                  ]),
        ],
        series: [
            marks(words.rise, true),
            marks(words.fall, false),
            ...averages.map((average, index) => ({
                type: 'line',
                name: average.name,
                xAxisIndex: 0,
                yAxisIndex: 0,
                data: average.values,
                smooth: spec.smooth === true,
                showSymbol: false,
                connectNulls: false,
                itemStyle: { color: averageColor[index] },
                lineStyle: { color: averageColor[index], width: 1.25 },
            })),
            ...(volumeName === undefined
                ? []
                : [
                      {
                          type: 'bar',
                          name: volumeName,
                          xAxisIndex: 1,
                          yAxisIndex: 1,
                          barWidth: '60%',
                          barMaxWidth: WIDEST,
                          data: candles.map((candle) =>
                              candle === null || candle.volume === null
                                  ? null
                                  : {
                                        value: candle.volume,
                                        itemStyle: {
                                            color: look.mix(toneOf(candle), 45),
                                            borderRadius: farCorners(look.corner, false, candle.volume),
                                        },
                                    },
                          ),
                      },
                  ]),
        ],
    }
}
