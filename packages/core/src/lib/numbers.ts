/**
 * Numbers as a field writes them and reads them back, and stepped up and down by a fixed amount
 * within bounds.
 */

/** How a number field writes its value and reads back what is typed; `parse` gives null for text that is not a number. */
export interface NumberFormat {
    format: (value: number) => string
    parse: (text: string) => number | null
}

/**
 * The number typed in `text`, or null when it is not one: digits with an optional sign and a point
 * before the decimals, as `writeNumber` writes them. Spaces between the digits are dropped, and the
 * minus sign (−) reads as a hyphen.
 */
export function readNumber(text: string): number | null {
    const typed = text.replace(/[\s_]/g, '').replace(/^−/, '-')
    return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(typed) ? Number(typed) : null
}

/** A number written plainly, with a point before its decimals and no digit groups. */
export function writeNumber(value: number): string {
    return String(value)
}

/** The plain format: `writeNumber` and `readNumber`. */
export const PLAIN_NUMBER: NumberFormat = { format: writeNumber, parse: readNumber }

/**
 * A number written and read the way a locale writes it, with its decimal mark and its digit
 * groups: `3 600,5` in `nb-NO`. Reading drops the groups and takes the locale's decimal mark, so
 * in `de-DE` `1.250,5` reads as 1250.5.
 */
export function localeNumber(locale: string, options: Intl.NumberFormatOptions = {}): NumberFormat {
    const writer = new Intl.NumberFormat(locale, { maximumFractionDigits: 20, ...options })
    const parts = writer.formatToParts(-12345.6)
    const mark = (type: string, fallback: string) => parts.find((part) => part.type === type)?.value ?? fallback
    const [group, decimal, minus] = [mark('group', ','), mark('decimal', '.'), mark('minusSign', '-')]
    return {
        format: (value) => writer.format(value),
        parse: (text) => readNumber(text.split(group).join('').replace(minus, '-').replace(decimal, '.')),
    }
}

/** How many decimals a number is written with. */
function decimals(value: number): number {
    const written = String(value)
    const point = written.indexOf('.')
    return point < 0 ? 0 : written.length - point - 1
}

/** A number kept within `min` and `max`, either of which may be missing. */
export function clampNumber(value: number, min?: number, max?: number): number {
    return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value))
}

/**
 * The number `by` steps of `step` from `value`, on the grid of steps that starts at `min` (or 0),
 * kept within the bounds. A value between two steps moves to the next one in that direction, so
 * 7 steps up to 10 and down to 5 by fives; no value starts from 0, kept within the bounds.
 */
export function stepNumber(
    value: number | null,
    by: number,
    { step = 1, min, max }: { step?: number; min?: number; max?: number } = {},
): number {
    if (value === null) return clampNumber(0, min, max)
    const origin = min ?? 0
    const at = (value - origin) / step
    const near = Math.round(at)
    const steps = Math.abs(at - near) < 1e-9 ? near + by : by > 0 ? Math.floor(at) + by : Math.ceil(at) + by
    const places = Math.max(decimals(step), decimals(origin))
    return clampNumber(Number((origin + steps * step).toFixed(places)), min, max)
}
