/**
 * Numbers as a field writes them and reads them back, and stepped up and down by a fixed amount
 * within bounds.
 */

/** How a number field writes its value and reads back what is typed; `parse` gives null for text that is not a number. */
export interface NumberFormat {
    format: (value: number) => string
    parse: (text: string) => number | null
}

/** A plain number: digits with an optional sign, a point before the decimals and an exponent. */
export const NUMBER_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i

/**
 * The number typed in `text`, or null when it is not a finite one: digits with an optional sign, a
 * point before the decimals and an optional exponent (`1e-7`), as `writeNumber` writes them. Spaces
 * and underscores between the digits are dropped, and the minus sign (−) reads as a hyphen.
 */
export function readNumber(text: string): number | null {
    const typed = text.replace(/[\s_]/g, '').replace(/^−/, '-')
    if (!NUMBER_PATTERN.test(typed)) return null
    const value = Number(typed)
    return Number.isFinite(value) ? value : null
}

/** A number written plainly, with a point before its decimals and no digit groups. */
export function writeNumber(value: number): string {
    return String(value)
}

/** The plain format: `writeNumber` and `readNumber`. */
export const PLAIN_NUMBER: NumberFormat = { format: writeNumber, parse: readNumber }

/** Marks a locale writes around a number to keep its direction, which reading drops. */
const DIRECTION_MARKS = /[\u061c\u200e\u200f]/g

/**
 * A number written and read the way a locale writes it, with its decimal mark, its digit groups
 * and its digits: `3 600,5` in `nb-NO`. Reading takes the locale's decimal mark and drops its
 * groups where they stand between whole digits, so in `de-DE` `1.250,5` and `1250,5` read as
 * 1250.5 and `3.5` reads as no number; a locale that writes groups with a space also reads a plain
 * space. Reading takes the locale's own digits (`١٢٫٥` in `ar-EG`) as well as 0 to 9.
 */
export function localeNumber(locale: string, options: Intl.NumberFormatOptions = {}): NumberFormat {
    const writer = new Intl.NumberFormat(locale, { maximumFractionDigits: 20, ...options })
    const { numberingSystem } = writer.resolvedOptions()
    const marks = new Intl.NumberFormat(locale, { numberingSystem, useGrouping: true }).formatToParts(-12345.6)
    const mark = (type: string, fallback: string) => marks.find((part) => part.type === type)?.value ?? fallback
    const [group, decimal, minus] = [mark('group', ','), mark('decimal', '.'), mark('minusSign', '-')]
    const digitWriter = new Intl.NumberFormat(locale, { numberingSystem, useGrouping: false })
    const digits = new Map(Array.from({ length: 10 }, (_, digit) => [digitWriter.format(digit), String(digit)]))
    const spaced = /^\s$/.test(group)
    return {
        format: (value) => writer.format(value),
        parse: (text) => {
            let plain = [...text.replace(DIRECTION_MARKS, '').trim()].map((char) => digits.get(char) ?? char).join('')
            plain = plain.replace(minus, '-').replace(/^−/, '-')
            if (spaced) plain = plain.replace(/\s+/g, group)
            const [whole = '', fraction, ...rest] = plain.split(decimal)
            if (rest.length > 0) return null
            if (whole.includes(group)) {
                const groupAt = group.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                if (!new RegExp(`^[+-]?\\d{1,3}(${groupAt}\\d{2,3})*${groupAt}\\d{3}$`).test(whole)) return null
            }
            const read = whole.split(group).join('') + (fraction === undefined ? '' : `.${fraction}`)
            return readNumber(read)
        },
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
