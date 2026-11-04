/**
 * One step of a threshold scale: from `value` up, a reading takes the color token `color`. The
 * first step's `value` is ignored, so it covers everything below the second.
 */
export interface Threshold {
    value?: number
    /** A color token's name, such as `good`, `warning`, `critical` or `chart-2`. */
    color: string
}

/** The token a reading takes on a threshold scale, or undefined when it has none. */
export function thresholdColor(value: number | null | undefined, thresholds: readonly Threshold[] | undefined): string | undefined {
    if (thresholds === undefined || thresholds.length === 0) return undefined
    if (value === null || value === undefined || !Number.isFinite(value)) return thresholds[0].color
    let color = thresholds[0].color
    for (const step of thresholds.slice(1)) if (step.value !== undefined && value >= step.value) color = step.color
    return color
}

/** A token's name as a CSS value. */
export const tokenVar = (name: string) => `var(--${name})`

/** A number written for a reader with a fixed count of decimals and thousands grouped. */
export function formatValue(value: number, decimals?: number, locale = 'en-US'): string {
    const places = decimals ?? (Math.abs(value) >= 100 || Number.isInteger(value) ? 0 : 1)
    return value.toLocaleString(locale, { minimumFractionDigits: places, maximumFractionDigits: places })
}
