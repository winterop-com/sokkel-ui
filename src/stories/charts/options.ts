import type { ChartLook } from '../../components/chart/look'
import {
    BUCKETS,
    BY_STATE,
    DURATIONS,
    FAILURES,
    HEATMAP,
    HISTOGRAM,
    HOURS,
    JOBS,
    QUEUE,
    RUNS,
    RUNS_BY_JOB,
    SCATTER,
    STATE_LABELS,
    STATE_TOTALS,
    STATES,
    TIMES,
    WORKERS,
} from '../fixtures/runs'
import type { StorySeries } from './Ground'

/** The chart stories' series and the options that draw them, built from the look so they follow the theme. */

export const TWO: StorySeries[] = [
    { name: 'Runs', token: 'chart-2', values: RUNS },
    { name: 'Failures', token: 'status-failed', values: FAILURES },
]

export const BY_JOB: StorySeries[] = JOBS.map((job, index) => ({
    name: job,
    token: ['chart-2', 'chart-3', 'chart-4', 'kind-teal', 'kind-pink'][index],
    values: RUNS_BY_JOB[job],
}))

export const PERCENTILES: StorySeries[] = [
    { name: 'p50', token: 'chart-3', values: DURATIONS.p50 },
    { name: 'p90', token: 'warning', values: DURATIONS.p90 },
    { name: 'p99', token: 'status-failed', values: DURATIONS.p99 },
]

export const BY_WORKER: StorySeries[] = WORKERS.map((worker, index) => ({
    name: worker,
    token: ['chart-2', 'chart-3', 'warning', 'chart-4'][index],
    values: QUEUE[worker],
}))

const STATE_TOKENS = { succeeded: 'status-succeeded', failed: 'status-failed', cancelled: 'status-cancelled', skipped: 'status-skipped' }

export const BY_STATE_SERIES: StorySeries[] = STATES.map((state) => ({
    name: STATE_LABELS[state],
    token: STATE_TOKENS[state],
    values: BY_STATE[state],
}))

export const STATE_SLICES: StorySeries[] = STATES.map((state) => ({
    name: STATE_LABELS[state],
    token: STATE_TOKENS[state],
    values: [STATE_TOTALS[state]],
}))

const TIME_AXIS = { type: 'category', data: TIMES, boundaryGap: false, axisLabel: { interval: 15 } }

/** Lines for the given series over the day. */
export function lines(series: readonly StorySeries[], unit = '') {
    return (look: ChartLook) => ({
        tooltip: { trigger: 'axis', valueFormatter: (value: number) => `${value}${unit}` },
        xAxis: TIME_AXIS,
        yAxis: { type: 'value', axisLabel: { formatter: `{value}${unit}` } },
        series: series.map((entry) => ({ name: entry.name, type: 'line', data: entry.values, color: look.token(entry.token) })),
    })
}

/** Filled areas for the given series over the day, stacked when asked, each fading toward the axis. */
export function areas(series: readonly StorySeries[], stacked = false) {
    return (look: ChartLook) => ({
        tooltip: { trigger: 'axis' },
        xAxis: TIME_AXIS,
        yAxis: { type: 'value' },
        series: series.map((entry) => {
            const color = look.token(entry.token)
            return {
                name: entry.name,
                type: 'line',
                stack: stacked ? 'total' : undefined,
                data: entry.values,
                color,
                lineStyle: { width: 1.25 },
                areaStyle: {
                    opacity: 1,
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: look.mix(color, stacked ? 55 : 40) },
                            { offset: 1, color: look.mix(color, stacked ? 30 : 4) },
                        ],
                    },
                },
            }
        }),
    })
}

/** Runs per hour, stacked by state. */
export function stackedBars(series: readonly StorySeries[]) {
    return (look: ChartLook) => ({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: { type: 'category', data: HOURS, axisLabel: { interval: 3 } },
        yAxis: { type: 'value' },
        series: series.map((entry, index) => ({
            name: entry.name,
            type: 'bar',
            stack: 'runs',
            data: entry.values,
            color: look.token(entry.token),
            barCategoryGap: '24%',
            itemStyle: { borderColor: look.card, borderWidth: 1, borderRadius: index === series.length - 1 ? [2, 2, 0, 0] : 0 },
        })),
    })
}

/** Runs per hour and duration bucket, shaded from the card to a token. */
export function heatmap(token = 'warning') {
    return (look: ChartLook) => ({
        tooltip: {
            position: 'top',
            formatter: (params: { value: [number, number, number] }) =>
                `${HOURS[params.value[0]]}<br/>${BUCKETS[params.value[1]]}: <b>${params.value[2]}</b> runs`,
        },
        grid: { right: 56 },
        xAxis: { type: 'category', data: HOURS, axisLabel: { interval: 3 }, splitArea: { show: false } },
        yAxis: { type: 'category', data: BUCKETS, axisLabel: { interval: 0 } },
        visualMap: {
            min: 0,
            max: Math.max(...HEATMAP.map((cell) => cell[2])),
            calculable: false,
            orient: 'vertical',
            right: 0,
            top: 'center',
            itemWidth: 10,
            itemHeight: 120,
            inRange: { color: look.ramp(token, 7) },
        },
        series: [{ name: 'Runs', type: 'heatmap', data: HEATMAP, itemStyle: { borderColor: look.card, borderWidth: 1, borderRadius: 2 } }],
    })
}

/** Runs per duration bucket, as tall bars. */
export function histogram(token = 'chart-2') {
    return (look: ChartLook) => ({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: { type: 'category', data: BUCKETS },
        yAxis: { type: 'value' },
        series: [
            {
                name: 'Runs',
                type: 'bar',
                data: HISTOGRAM,
                color: look.token(token),
                barCategoryGap: '8%',
                barMaxWidth: 400,
                itemStyle: { borderRadius: [2, 2, 0, 0] },
            },
        ],
    })
}

/** A gauge from 0 to 100, its arc colored by thresholds. */
export function gauge(name: string, value: number, steps: readonly [number, string][]) {
    return (look: ChartLook) => {
        const color = steps.reduce((current, [from, token]) => (value >= from ? look.token(token) : current), look.token(steps[0][1]))
        return {
            series: [
                {
                    name,
                    type: 'gauge',
                    startAngle: 210,
                    endAngle: -30,
                    min: 0,
                    max: 100,
                    radius: '92%',
                    center: ['50%', '58%'],
                    progress: { show: true, width: 12, roundCap: false, itemStyle: { color } },
                    axisLine: { lineStyle: { width: 12, color: [[1, look.grid]] } },
                    pointer: { show: false },
                    axisTick: { show: false },
                    splitLine: { show: false },
                    axisLabel: { show: false },
                    anchor: { show: false },
                    title: { show: true, offsetCenter: [0, '42%'], fontSize: look.size.label, color: look.muted },
                    detail: {
                        valueAnimation: false,
                        offsetCenter: [0, '0%'],
                        fontSize: look.size.stat,
                        fontWeight: 600,
                        color,
                        formatter: '{value}%',
                    },
                    data: [{ value, name }],
                },
            ],
        }
    }
}

/** The day's runs by state as a ring, the total in its middle. */
export function donut(series: readonly StorySeries[]) {
    return (look: ChartLook) => {
        const total = series.reduce((sum, entry) => sum + (entry.values?.[0] ?? 0), 0)
        return {
            tooltip: { trigger: 'item', valueFormatter: (value: number) => value.toLocaleString('en-US') },
            title: {
                show: true,
                text: total.toLocaleString('en-US'),
                subtext: 'runs',
                left: 'center',
                top: 'center',
                itemGap: 2,
                textStyle: { fontSize: look.size.stat, fontWeight: 600, color: look.foreground },
                subtextStyle: { fontSize: look.size.label, color: look.muted },
            },
            series: [
                {
                    name: 'Runs',
                    type: 'pie',
                    radius: ['58%', '82%'],
                    padAngle: 1,
                    label: { show: false },
                    data: series.map((entry) => ({
                        name: entry.name,
                        value: entry.values?.[0] ?? 0,
                        itemStyle: { color: look.token(entry.token) },
                    })),
                },
            ],
        }
    }
}

/** Each run of import-orders, by rows read and seconds taken. */
export function scatter(token = 'chart-4') {
    return (look: ChartLook) => ({
        tooltip: {
            trigger: 'item',
            formatter: (params: { value: [number, number] }) => `${params.value[0].toLocaleString('en-US')} rows<br/>${params.value[1]}s`,
        },
        xAxis: {
            type: 'value',
            name: 'Rows read',
            nameLocation: 'middle',
            nameGap: 22,
            splitLine: { show: true, lineStyle: { color: look.grid } },
        },
        yAxis: { type: 'value', name: 'Seconds', axisLabel: { formatter: '{value}s' } },
        grid: { bottom: 26, top: 22 },
        series: [
            {
                name: 'import-orders',
                type: 'scatter',
                data: SCATTER,
                color: look.token(token),
                itemStyle: { opacity: 0.7, borderColor: look.card, borderWidth: 1 },
            },
        ],
    })
}
