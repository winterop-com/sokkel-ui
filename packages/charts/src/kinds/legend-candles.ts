import type { LegendItem } from '../ChartLegend'
import { distinct, labelOf, numberOf, type Row } from '../data'
import { SERIES_ORDER, tokenColor } from '../look'
import { tones } from './legend-waterfall'
import { legendColor, wordsOf, type ChartSpec } from './spec'

/** One category's open, high, low and close, and its volume where the rows give one. */
export interface Candle {
    open: number
    high: number
    low: number
    close: number
    volume: number | null
}

/** Which fields hold a candle's figures. */
export interface CandleFields {
    open: string
    high: string
    low: string
    close: string
    volume?: string
}

/**
 * The rows as one candle per category of `x`, in the order the rows give them or `order` names: a
 * category of several rows opens at its first row's open and closes at its last row's close, its
 * high the highest and its low the lowest of them, and its volume their sum, so hourly readings
 * make daily candles. A category with no row holding all four figures has none.
 */
export function candlesOf(
    rows: readonly Row[],
    x: string,
    fields: CandleFields,
    order?: readonly string[],
): { categories: string[]; candles: (Candle | null)[] } {
    const categories = distinct(rows, x, order)
    const at = new Map(categories.map((name, index) => [name, index]))
    const candles: (Candle | null)[] = categories.map(() => null)
    for (const row of rows) {
        const index = at.get(labelOf(row[x]))
        const [open, high, low, close] = [fields.open, fields.high, fields.low, fields.close].map((field) => numberOf(row[field]))
        if (index === undefined || open === null || high === null || low === null || close === null) continue
        const volume = fields.volume === undefined ? null : numberOf(row[fields.volume])
        const held = candles[index]
        if (held === null) {
            candles[index] = { open, high: Math.max(high, open, close), low: Math.min(low, open, close), close, volume }
            continue
        }
        held.high = Math.max(held.high, high, close)
        held.low = Math.min(held.low, low, close)
        held.close = close
        held.volume = volume === null ? held.volume : (held.volume ?? 0) + volume
    }
    return { categories, candles }
}

/**
 * The mean of each figure and the `span - 1` before it, or null until `span` figures have come; a
 * missing figure counts toward none, so the mean of a window holding one is null too.
 */
export function movingAverage(values: readonly (number | null)[], span: number): (number | null)[] {
    const size = Math.max(1, Math.round(span))
    return values.map((_, index) => {
        if (index < size - 1) return null
        let sum = 0
        for (let at = index - size + 1; at <= index; at++) {
            const value = values[at]
            if (value === null) return null
            sum += value
        }
        return sum / size
    })
}

/** Whether a candle rose: it closed at or above its open. */
export const rose = (candle: Candle): boolean => candle.close >= candle.open

/**
 * A candlestick chart's candles, one per category, and its moving averages over the closes, each
 * named by the average word and its span, `Average 5`.
 */
export function candleShape(spec: ChartSpec) {
    if (spec.x === undefined || spec.ohlc === undefined) throw new Error('A candlestick chart needs an x field and ohlc fields.')
    const words = wordsOf(spec)
    const { categories, candles } = candlesOf(spec.rows, spec.x, spec.ohlc, spec.order)
    const closes = candles.map((candle) => candle?.close ?? null)
    const averages = (spec.averages ?? []).map((span) => ({
        span,
        name: `${words.average} ${String(span)}`,
        values: movingAverage(closes, span),
    }))
    return { categories, candles, averages }
}

/** A candlestick chart's legend: its rises and its falls, each with its changes from open to close, then its moving averages. */
export function candlestickLegend(spec: ChartSpec): LegendItem[] {
    if (spec.x === undefined || spec.ohlc === undefined) return []
    const words = wordsOf(spec)
    // Rises and falls take the waterfall's tones: what `colors` names for the words, or good and critical.
    const tone = tones(spec)
    const { candles, averages } = candleShape(spec)
    const drawn = candles.filter((candle): candle is Candle => candle !== null)
    const changes = (up: boolean) => drawn.filter((candle) => rose(candle) === up).map((candle) => candle.close - candle.open)
    return [
        { key: words.rise, label: words.rise, color: tokenColor(tone.rise), values: changes(true) },
        { key: words.fall, label: words.fall, color: tokenColor(tone.fall), values: changes(false) },
        ...averages.map((average, index) => ({
            key: average.name,
            label: average.name,
            color: legendColor(spec, average.name, index, SERIES_ORDER),
            values: average.values,
        })),
    ]
}
