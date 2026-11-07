import { aggregate, aggregateAt, numberOf } from '../data'
import { SERIES_ORDER, type ChartLook } from '../look'
import { stepAt } from '../stats'
import { written } from './categories'
import { fieldsOf, type ChartBuilder, type ChartSpec, type ChartStep } from './spec'

/**
 * The dial a gauge is drawn as, shared by the gauge kind and `GaugePanel` so both look the same: a
 * thick arc from `min` to `max` filled to the figure in `tone`, the steps' colors as a thin band
 * outside it, and the figure written in the middle in its tone, with `label` under it.
 */
export function dial(
    look: ChartLook,
    {
        value,
        min,
        max,
        steps,
        tone,
        write,
        label,
    }: {
        value: number | null
        min: number
        max: number
        /** The band's steps, each with a color token. */
        steps: readonly { value?: number; color: string }[]
        /** The arc's and the figure's color, resolved. */
        tone: string
        write: (value: number) => string
        label?: string
    },
) {
    const band = steps.map((step, index) => {
        const next = steps[index + 1]?.value
        const end = next === undefined ? 1 : Math.min(1, Math.max(0, (next - min) / (max - min)))
        return [end, look.token(step.color)] as [number, string]
    })
    const arc = {
        startAngle: 215,
        endAngle: -35,
        min,
        max,
        center: ['50%', '60%'],
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
    }
    return [
        {
            ...arc,
            name: 'thresholds',
            type: 'gauge',
            radius: '98%',
            silent: true,
            axisLine: { lineStyle: { width: 3, color: band } },
            progress: { show: false },
            title: { show: false },
            detail: { show: false },
            data: [{ value: max }],
        },
        {
            ...arc,
            name: label ?? 'value',
            type: 'gauge',
            radius: '88%',
            axisLine: { lineStyle: { width: 14, color: [[1, look.grid]] } },
            progress: { show: true, width: 14, itemStyle: { color: tone } },
            title: { show: label !== undefined, offsetCenter: [0, '46%'], fontSize: look.size.label, color: look.muted },
            detail: {
                offsetCenter: [0, '2%'],
                fontSize: look.size.stat,
                fontWeight: 600,
                fontFamily: look.font,
                color: tone,
                formatter: (shown: number) => (value === null ? '-' : write(shown)),
            },
            data: [{ value: value ?? min, name: label ?? '' }],
        },
    ]
}

/** The one figure a gauge shows: every row's `y` combined by `aggregate` (the sum by default), or the rows counted. */
export function gaugeFigure(spec: ChartSpec): number | null {
    const field = fieldsOf(spec)[0]
    if (field === undefined) return spec.rows.length
    const values = spec.rows.map((row) => numberOf(row[field])).filter((value): value is number => value !== null)
    return aggregate(values, aggregateAt(spec.aggregate, 0))
}

/** A step's color token, or the one `colors` names for `y`, or the first series color. */
const tokenOf = (spec: ChartSpec, step: ChartStep | undefined) => step?.color ?? spec.colors?.[fieldsOf(spec)[0] ?? ''] ?? SERIES_ORDER[0]

/**
 * One figure on a dial from `min` (0) to `max` (100): every row's `y` combined by `aggregate`, or the
 * rows counted. `steps` are its thresholds, drawn as a band around the dial, and the figure takes
 * the color of the step it reaches; without steps it takes the color `colors` names for `y`.
 * Reads `y`, `aggregate`, `steps`, `min`, `max`, `colors`, `format` and `unit`.
 */
export const gauge: ChartBuilder = (spec, look) => {
    const value = gaugeFigure(spec)
    const steps = spec.steps ?? []
    const tone = tokenOf(spec, steps[stepAt(value, steps)])
    return {
        series: dial(look, {
            value,
            min: spec.min ?? 0,
            max: spec.max ?? 100,
            steps: steps.length === 0 ? [{ color: tone }] : steps.map((step) => ({ value: step.value, color: tokenOf(spec, step) })),
            tone: look.token(tone),
            write: (shown) => written(spec, shown),
        }),
    }
}
