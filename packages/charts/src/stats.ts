import { quantile } from './data'

/** The step nearest to `raw` of 1, 2, 2.5, 5 and 10 times a power of ten: a step a reader counts in. */
export function niceStep(raw: number): number {
    if (!(raw > 0) || !Number.isFinite(raw)) return 1
    const power = 10 ** Math.floor(Math.log10(raw))
    const factors = [1, 2, 2.5, 5, 10]
    // Nearest by ratio, so 1.4 rounds to 1 and 1.5 to 2.
    const step = factors.reduce((best, factor) =>
        Math.abs(Math.log(raw / power / factor)) < Math.abs(Math.log(raw / power / best)) ? factor : best,
    )
    return step * power
}

/** `value` rounded up to a whole number of nice steps, for the end of an axis. */
export function niceCeil(value: number): number {
    if (!(value > 0) || !Number.isFinite(value)) return 1
    const step = niceStep(value / 5)
    return Math.ceil(value / step - 1e-9) * step
}

/** Equal bins over a range of numbers: where the first starts, how wide each is, and how many there are. */
export interface Bins {
    start: number
    width: number
    count: number
}

/**
 * Bins for these values on nice edges: about `how` of them when it is a number (by default one more
 * than the base-2 log of how many values there are, from 5 to 30), or each `how.width` wide.
 */
export function binsFor(values: readonly number[], how?: number | { width: number }): Bins {
    if (values.length === 0) return { start: 0, width: 1, count: 0 }
    const low = Math.min(...values)
    const high = Math.max(...values)
    const wanted = typeof how === 'number' ? how : Math.min(30, Math.max(5, Math.ceil(Math.log2(values.length) + 1)))
    const width = typeof how === 'object' && how.width > 0 ? how.width : niceStep((high - low || Math.abs(high) || 1) / Math.max(1, wanted))
    const start = Math.floor(low / width + 1e-9) * width
    return { start, width, count: Math.max(1, Math.ceil((high - start) / width - 1e-9)) }
}

/** The bin a value falls in: each bin holds its start and not its end, and the last holds its end too. */
export function binOf(value: number, bins: Bins): number {
    return Math.min(bins.count - 1, Math.max(0, Math.floor((value - bins.start) / bins.width + 1e-9)))
}

/** How many values fall in each bin. */
export function binCounts(values: readonly number[], bins: Bins): number[] {
    const counts = Array.from({ length: bins.count }, () => 0)
    for (const value of values) counts[binOf(value, bins)] += 1
    return counts
}

/**
 * The spread of some numbers as a box plot draws it: the quartiles and median, whiskers reaching the
 * furthest values within one and a half times the box's height of the box, and the values beyond
 * them as outliers.
 */
export interface Spread {
    low: number
    lower: number
    median: number
    upper: number
    high: number
    outliers: number[]
    count: number
}

/** The spread of the values, or null when there are none. */
export function spreadOf(values: readonly number[]): Spread | null {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const lower = quantile(sorted, 0.25) as number
    const median = quantile(sorted, 0.5) as number
    const upper = quantile(sorted, 0.75) as number
    const reach = (upper - lower) * 1.5
    const inside = sorted.filter((value) => value >= lower - reach && value <= upper + reach)
    return {
        low: inside[0],
        lower,
        median,
        upper,
        high: inside[inside.length - 1],
        outliers: sorted.filter((value) => value < lower - reach || value > upper + reach),
        count: sorted.length,
    }
}

/** One bar of a running total: where it starts and ends, and by how much it changed. */
export interface Stretch {
    from: number
    to: number
    change: number
}

/** Each change as a stretch from the running total before it to the one after; a missing change counts as none. */
export function runningTotals(changes: readonly (number | null)[]): Stretch[] {
    let total = 0
    return changes.map((value) => {
        const change = value ?? 0
        const from = total
        total += change
        return { from, to: total, change }
    })
}

/**
 * Which of a scale's steps a value falls on: the last whose `value` it reaches. The first step's
 * `value` is ignored, so it covers everything below the second, and a missing value takes it too.
 */
export function stepAt(value: number | null | undefined, steps: readonly { value?: number }[]): number {
    if (value === null || value === undefined || !Number.isFinite(value)) return 0
    let found = 0
    steps.forEach((step, index) => {
        if (index > 0 && step.value !== undefined && value >= step.value) found = index
    })
    return found
}
