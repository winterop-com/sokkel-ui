import { aggregateAt } from '../data'
import { tooltipMarkup } from '../look'
import { byDay, calendarRange } from '../shapes'
import { written } from './categories'
import { measureName, type ChartBuilder } from './spec'

/** Every day from `start` to `end`, both `YYYY-MM-DD`. */
function everyDay(start: string, end: string): string[] {
    const days: string[] = []
    const last = Date.parse(`${end}T00:00:00Z`)
    for (let at = Date.parse(`${start}T00:00:00Z`); at <= last; at += 86_400_000) days.push(new Date(at).toISOString().slice(0, 10))
    return days
}

/**
 * Days on a calendar, each cell shaded by its figure: the rows grouped by the date in `x`, a day or
 * a time, and each day's `y` combined by `aggregate`, or the rows counted without one. It shows the
 * whole months the days fall in: one month as a wall calendar with its dates, weeks running down,
 * and more than one with weeks running across, as a year is drawn. `horizontal` sets the way the
 * weeks run instead. The shade steps from the card to the color `colors.value` names, the second
 * chart color unless it names another.
 */
export const calendar: ChartBuilder = (spec, look) => {
    if (spec.x === undefined) throw new Error('A calendar needs an x field of dates.')
    const y = typeof spec.y === 'string' ? spec.y : spec.y?.[0]
    const days = byDay({ rows: spec.rows, x: spec.x, y, aggregate: aggregateAt(spec.aggregate, 0) })
    const range = calendarRange(days.map(([day]) => day))
    if (range === null) return { series: [] }
    const across = spec.horizontal ?? range.months > 1
    const values = days.map(([, value]) => value)
    const text = { color: look.muted, fontFamily: look.font, fontSize: look.size.small }
    return {
        tooltip: {
            trigger: 'item',
            formatter: (point: { value: [string, number] }) =>
                tooltipMarkup(point.value[0], [{ label: measureName(spec, y), value: written(spec, point.value[1]) }]),
        },
        calendar: {
            range: [range.start, range.end],
            orient: across ? 'horizontal' : 'vertical',
            cellSize: ['auto', 'auto'],
            left: across ? 24 : 4,
            right: 4,
            top: 20,
            bottom: 4,
            itemStyle: { color: look.mix('var(--muted-foreground)', 7), borderColor: look.card, borderWidth: across ? 2 : 3 },
            splitLine: { show: across, lineStyle: { color: look.border, width: 1 } },
            dayLabel: { ...text, firstDay: 1, margin: 6, position: 'start' },
            monthLabel: { ...text, show: across, margin: 6, position: 'start' },
            yearLabel: { show: false },
        },
        visualMap: {
            show: false,
            seriesIndex: 0,
            min: values.length === 0 ? 0 : Math.min(...values),
            max: values.length === 0 ? 1 : Math.max(...values),
            inRange: { color: look.ramp(spec.colors?.value ?? 'chart-2') },
        },
        series: [
            { type: 'heatmap', coordinateSystem: 'calendar', data: days },
            ...(across
                ? []
                : [
                      {
                          type: 'scatter',
                          coordinateSystem: 'calendar',
                          silent: true,
                          symbolSize: 0,
                          label: {
                              show: true,
                              color: look.foreground,
                              fontFamily: look.font,
                              fontSize: look.size.small,
                              formatter: (point: { value: [string] }) => String(Number(point.value[0].slice(8, 10))),
                          },
                          data: everyDay(range.start, range.end).map((day) => [day, 0]),
                      },
                  ]),
        ],
    }
}
