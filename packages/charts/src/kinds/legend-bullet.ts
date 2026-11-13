import type { LegendItem } from '../ChartLegend'
import { pivot } from '../data'
import { SERIES_ORDER, tokenColor } from '../look'
import { niceCeil } from '../stats'
import { fieldsOf, wordsOf, type ChartSpec, type ChartStep } from './spec'

/** Each category's figure and target for a bullet chart, and where its scale starts and ends. */
export function bulletFigures(spec: ChartSpec) {
    const field = fieldsOf(spec)[0]
    if (spec.x === undefined || field === undefined) throw new Error('A bullet chart needs x and y fields.')
    const data = pivot({
        rows: spec.rows,
        x: spec.x,
        y: spec.value === undefined ? [field] : [field, spec.value],
        aggregate: spec.aggregate,
        order: spec.order,
    })
    const values = data.series[0]?.values ?? []
    const targets = spec.value === undefined ? [] : (data.series[1]?.values ?? [])
    const steps: readonly ChartStep[] = spec.steps ?? [{}]
    const largest = Math.max(
        0,
        ...values.map((value) => value ?? 0),
        ...targets.map((value) => value ?? 0),
        ...steps.map((step) => step.value ?? 0),
    )
    return { field, categories: data.categories, values, targets, steps, min: spec.min ?? 0, max: spec.max ?? niceCeil(largest) }
}

/** The CSS color of each bullet band: its own token, faintly, or a gray that lightens from the first band to the last. */
export function bandColors(steps: readonly ChartStep[]): string[] {
    return steps.map((step, index) => {
        const strength = steps.length <= 1 ? 22 : Math.round(30 - (20 * index) / (steps.length - 1))
        return `color-mix(in oklab, ${tokenColor(step.color ?? 'muted-foreground')} ${String(step.color === undefined ? strength : 26)}%, var(--card))`
    })
}

/** A bullet band's name: its label, or its place. */
export const bandName = (step: ChartStep, index: number) => step.label ?? `band-${String(index + 1)}`

/** A bullet chart's legend: the figure, the target where `value` names one, and each labeled band. */
export function bulletLegend(spec: ChartSpec): LegendItem[] {
    const words = wordsOf(spec)
    const { field, values, targets, steps } = bulletFigures(spec)
    const bands = bandColors(steps)
    return [
        { key: field, label: field, color: tokenColor(spec.colors?.[field] ?? SERIES_ORDER[0]), values },
        ...(spec.value === undefined ? [] : [{ key: words.target, label: words.target, color: 'var(--foreground)', values: targets }]),
        ...steps.flatMap((step, index) =>
            step.label === undefined ? [] : [{ key: bandName(step, index), label: step.label, color: bands[index] }],
        ),
    ]
}
