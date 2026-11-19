import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { HARBOR_DAYS } from '../fixtures/harborLevels'
import { Framed, Ground } from './Ground'

/**
 * Readings over time as open, high, low and close, drawn from the water level at Tidevann's harbor
 * site: `Chart` with the candlestick kind draws a candle per day, its body from where the level
 * stood at midnight to where it stood at the next, its wick from low to high tide, a rise in the
 * good tone and a fall in the critical one. `ohlc.volume` adds a panel of bars under the candles on
 * the same axis, `averages` draws moving averages of the closes, and `zoom` opens on a window with
 * a slider. `ohlc.style` `bars` draws plain bars with ticks for the open and the close.
 */
const meta: Meta = { title: 'Charts/Candlestick' }
export default meta

const OCTOBER = HARBOR_DAYS.filter((day) => day.date.startsWith('Oct'))
const LEVEL = { open: 'open', high: 'high', low: 'low', close: 'close' } as const
const meters = (value: number) => value.toFixed(2)

const CANDLES: ChartSpec = { rows: OCTOBER, x: 'date', ohlc: LEVEL, format: meters, unit: ' m' }
const WITH_RAIN: ChartSpec = {
    rows: OCTOBER,
    x: 'date',
    ohlc: { ...LEVEL, volume: 'rain' },
    fieldNames: { rain: 'Rain' },
    unit: [' m', ' mm'],
}
const SEASON: ChartSpec = {
    rows: HARBOR_DAYS,
    x: 'date',
    ohlc: { ...LEVEL, volume: 'rain' },
    fieldNames: { rain: 'Rain' },
    unit: [' m', ' mm'],
    averages: [5, 20],
    zoom: ['Sep 1', 'Oct 29'],
}
const BARS: ChartSpec = { ...CANDLES, ohlc: { ...LEVEL, style: 'bars' } }

/** October's days at the harbor as candles: the storm in mid October lifts the level and widens the tides. */
export const Candles: StoryObj = {
    render: () => (
        <Ground title="Harbor, October" columns={1}>
            <Framed
                kind="candlestick"
                spec={CANDLES}
                title="Water level"
                subtitle="Harbor, per day"
                label="The harbor's daily water level in October as candles: open, high, low and close"
                bodyClassName="h-80"
            />
        </Ground>
    ),
}

/** The same days with the rain that fell at the site in a panel under the candles, each bar in its day's tone. */
export const WithVolume: StoryObj = {
    name: 'With volume',
    render: () => (
        <Ground title="Harbor, October" columns={1}>
            <Framed
                kind="candlestick"
                spec={WITH_RAIN}
                title="Water level and rain"
                subtitle="Harbor, per day"
                label="The harbor's daily water level in October as candles, with the day's rain under them"
                bodyClassName="h-96"
            />
        </Ground>
    ),
}

/**
 * August to October with the 5-day and 20-day averages of the closing level, opened on September
 * and October; the slider, a drag across the chart or a pinch moves both panels together.
 */
export const Averages: StoryObj = {
    name: 'Averages and zoom',
    render: () => (
        <Ground title="Harbor, August to October" columns={1}>
            <Framed
                kind="candlestick"
                spec={SEASON}
                title="Water level and rain"
                subtitle="Harbor, per day, September and October in view"
                label="The harbor's daily water level from August to October as candles with 5-day and 20-day averages, and the rain under them"
                bodyClassName="h-96"
            />
        </Ground>
    ),
}

/** October's days as OHLC bars: a line from low to high tide, a tick left at midnight's level and one right at the next. */
export const OhlcBars: StoryObj = {
    name: 'OHLC bars',
    render: () => (
        <Ground title="Harbor, October" columns={1}>
            <Framed
                kind="candlestick"
                spec={BARS}
                title="Water level"
                subtitle="Harbor, per day"
                label="The harbor's daily water level in October as OHLC bars"
                bodyClassName="h-80"
            />
        </Ground>
    ),
}
