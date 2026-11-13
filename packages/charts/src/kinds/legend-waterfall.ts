import type { LegendItem } from '../ChartLegend'
import { tokenColor } from '../look'
import { runningTotals } from '../stats'
import { shaped } from './legend-series'
import { wordsOf, type ChartSpec } from './spec'

/** A waterfall's changes per category, the stretch of the running total each one covers, and the total. */
export function stretches(spec: ChartSpec) {
    const { categories, series } = shaped({ ...spec, series: undefined, stack: undefined })
    const steps = runningTotals(series[0]?.values ?? [])
    const total = steps.length === 0 ? 0 : steps[steps.length - 1].to
    return { categories, steps, total }
}

/** The tokens of a waterfall's rises, falls and total: what `colors` names for each word, or good, critical and the first series color. */
export function tones(spec: ChartSpec) {
    const words = wordsOf(spec)
    return {
        rise: spec.colors?.[words.rise] ?? 'good',
        fall: spec.colors?.[words.fall] ?? 'critical',
        total: spec.colors?.[words.total] ?? 'chart-2',
    }
}

/** A waterfall's legend: its rises, its falls and its total. */
export function waterfallLegend(spec: ChartSpec): LegendItem[] {
    const words = wordsOf(spec)
    const tone = tones(spec)
    const { steps, total } = stretches(spec)
    return [
        {
            key: words.rise,
            label: words.rise,
            color: tokenColor(tone.rise),
            values: steps.filter((step) => step.change >= 0).map((step) => step.change),
        },
        {
            key: words.fall,
            label: words.fall,
            color: tokenColor(tone.fall),
            values: steps.filter((step) => step.change < 0).map((step) => step.change),
        },
        { key: words.total, label: words.total, color: tokenColor(tone.total), values: [total] },
    ]
}
