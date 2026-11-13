import { aggregate, aggregateAt, numberOf } from '../data'
import { SERIES_ORDER, type ChartLook } from '../look'
import { stepAt } from '../stats'
import { tickWriter } from './axes'
import { written, fieldsOf, type ChartBuilder, type ChartSpec, type ChartStep, type GaugeDial } from './spec'

/** Where a dial's arc runs and sits: its angles, its center, and the radius of its band and of its thick arc. */
const GEOMETRY: Record<GaugeDial, { startAngle: number; endAngle: number; center: [string, string]; band: string; arc: string }> = {
    arc: { startAngle: 215, endAngle: -35, center: ['50%', '60%'], band: '98%', arc: '88%' },
    ring: { startAngle: 90, endAngle: -270, center: ['50%', '50%'], band: '98%', arc: '88%' },
    // A half circle as wide as about twice the box's height, its center near the bottom edge.
    half: { startAngle: 180, endAngle: 0, center: ['50%', '92%'], band: '176%', arc: '160%' },
    bands: { startAngle: 215, endAngle: -35, center: ['50%', '60%'], band: '98%', arc: '88%' },
    needle: { startAngle: 215, endAngle: -35, center: ['50%', '60%'], band: '88%', arc: '88%' },
}

/** Where a filled dial writes its figure, alone or over a label, and its label, from its center in shares of its radius. */
const PLACES: Record<'arc' | 'ring' | 'half', { figure: string; labeled: string; title: string }> = {
    arc: { figure: '2%', labeled: '2%', title: '46%' },
    ring: { figure: '0%', labeled: '-8%', title: '30%' },
    half: { figure: '-22%', labeled: '-30%', title: '-4%' },
}

/** How many equal parts a needle's scale splits `min` to `max` into, so each tick lands on a round figure. */
export function dialSplits(min: number, max: number): number {
    const span = max - min
    const round = (value: number) => {
        const mantissa = Number((value / 10 ** Math.floor(Math.log10(value))).toPrecision(12))
        return [1, 2, 2.5, 5].includes(mantissa)
    }
    return [5, 4, 6, 8, 3, 10].find((count) => span > 0 && round(span / count)) ?? 5
}

/**
 * The dial a gauge is drawn as. In its `arc`, `ring` and `half` shapes, a thick arc from `min` to
 * `max` is filled to the figure in `tone`, the steps' colors run as a thin band outside it, and the
 * figure is written in the middle in its tone, with `label` under it. `bands` draws the steps'
 * colors as the thick arc, with a pointer at the figure, and `needle` draws them as a thin arc over
 * ticks and round figures, with a needle at the figure.
 */
function dial(
    look: ChartLook,
    {
        value,
        min,
        max,
        steps,
        tone,
        write,
        tick,
        label,
        shape = 'arc',
        small = false,
    }: {
        value: number | null
        min: number
        max: number
        /** The band's steps, each with a color token. */
        steps: readonly { value?: number; color: string }[]
        /** The arc's and the figure's color, resolved. */
        tone: string
        write: (value: number) => string
        /** Writes a needle dial's ticks. */
        tick: (value: number) => string
        label?: string
        shape?: GaugeDial
        /** Writes the figure at the small chart figure size, for a dial in a small box. */
        small?: boolean
    },
) {
    const geometry = GEOMETRY[shape]
    const band = steps.map((step, index) => {
        const next = steps[index + 1]?.value
        const end = next === undefined ? 1 : Math.min(1, Math.max(0, (next - min) / (max - min)))
        return [end, look.token(step.color)] as [number, string]
    })
    const arc = {
        startAngle: geometry.startAngle,
        endAngle: geometry.endAngle,
        min,
        max,
        center: geometry.center,
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
    }
    const figure = {
        fontSize: small ? look.size.statSmall : look.size.stat,
        fontWeight: 600,
        fontFamily: look.font,
        color: tone,
        formatter: (shown: number) => (value === null ? '-' : write(shown)),
    }
    const title = { show: label !== undefined, fontSize: look.size.label, color: look.muted }
    const data = [{ value: value ?? min, name: label ?? '' }]
    if (shape === 'bands')
        return [
            {
                ...arc,
                name: label ?? 'value',
                type: 'gauge',
                radius: geometry.arc,
                axisLine: { lineStyle: { width: 14, color: band } },
                progress: { show: false },
                // A triangle inside the arc, pointing out at the figure's place on it.
                pointer: { show: true, icon: 'triangle', length: '16%', width: 14, offsetCenter: [0, '-58%'], itemStyle: { color: tone } },
                title: { ...title, offsetCenter: [0, '40%'] },
                detail: { ...figure, offsetCenter: [0, '4%'] },
                data,
            },
        ]
    if (shape === 'needle')
        return [
            {
                ...arc,
                name: label ?? 'value',
                type: 'gauge',
                radius: geometry.arc,
                splitNumber: dialSplits(min, max),
                axisLine: { lineStyle: { width: 3, color: band } },
                splitLine: { show: true, distance: 4, length: 10, lineStyle: { color: look.muted, width: 2 } },
                axisTick: { show: true, distance: 4, length: 5, splitNumber: 4, lineStyle: { color: look.faint, width: 1 } },
                axisLabel: {
                    show: true,
                    distance: 20,
                    color: look.muted,
                    fontFamily: look.font,
                    fontSize: look.size.small,
                    formatter: tick,
                },
                progress: { show: false },
                pointer: { show: true, length: '66%', width: 5, itemStyle: { color: look.foreground } },
                anchor: {
                    show: true,
                    showAbove: true,
                    size: 12,
                    itemStyle: { color: look.card, borderColor: look.foreground, borderWidth: 2 },
                },
                title: { ...title, offsetCenter: [0, '84%'] },
                detail: { ...figure, offsetCenter: [0, '58%'] },
                data,
            },
        ]
    const half = shape === 'half'
    const place = PLACES[shape === 'ring' || half ? shape : 'arc']
    return [
        {
            ...arc,
            name: 'thresholds',
            type: 'gauge',
            radius: geometry.band,
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
            radius: geometry.arc,
            axisLine: { lineStyle: { width: half ? 12 : 14, color: [[1, look.grid]] } },
            progress: { show: true, width: half ? 12 : 14, itemStyle: { color: tone } },
            title: { ...title, offsetCenter: [0, place.title] },
            detail: { ...figure, offsetCenter: [0, label === undefined ? place.figure : place.labeled] },
            data,
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
 * `dial` picks the shape: an open arc, a ring, a half circle for a stat tile, colored bands with a
 * pointer, or a needle over ticks. `total` is a word written under the figure, and `small` writes
 * the figure smaller, for a small box.
 * Reads `y`, `aggregate`, `steps`, `min`, `max`, `colors`, `format`, `unit`, `dial`, `total` and `small`.
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
            tick: tickWriter(spec.format),
            label: spec.total,
            shape: spec.dial,
            small: spec.small,
        }),
    }
}
