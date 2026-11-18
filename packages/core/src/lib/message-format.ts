/**
 * ICU MessageFormat, the subset a catalog of words needs: named arguments, `plural` and
 * `selectordinal` with `#`, `=n` and `offset:`, `select`, `number` (with `integer`, `percent` and the
 * skeletons `::compact-short`, `::compact-long`, `::percent`, `::integer` and `::.##`), and `date` and
 * `time` (with `short`, `medium`, `long`, `full` and a skeleton such as `::MMMd` or `::HHmm`).
 * A number in a plain argument is written in the locale, its thousands grouped, as ICU writes it; a
 * year or a code is written `{year, number, ::group-off}`.
 * Quoting follows ICU: `''` is an apostrophe and `'{…}'` is literal text. Plurals ask
 * `Intl.PluralRules` and numbers and dates `Intl`, in the locale given.
 */

/** The values a message's arguments take, by name. */
export type MessageValues = Readonly<Record<string, unknown>>

type Part =
    | string
    | { arg: string; type?: undefined }
    | { arg: string; type: 'number' | 'date' | 'time'; style: string }
    | { arg: string; type: 'plural' | 'selectordinal' | 'select'; offset: number; options: Record<string, Part[]> }
    | { pound: true }

/** A message read and ready to format. */
export interface CompiledMessage {
    format: (values: MessageValues, locale: string) => string
}

class Reader {
    at = 0
    constructor(readonly text: string) {}

    fail(why: string): never {
        throw new SyntaxError(`${why} at ${String(this.at)} in "${this.text}"`)
    }

    space() {
        while (/\s/.test(this.text[this.at] ?? '')) this.at++
    }

    word(): string {
        this.space()
        const start = this.at
        while (this.at < this.text.length && !/[\s,{}#]/.test(this.text[this.at] as string)) this.at++
        if (this.at === start) this.fail('Expected a name')
        return this.text.slice(start, this.at)
    }

    expect(char: string) {
        this.space()
        if (this.text[this.at] !== char) this.fail(`Expected "${char}"`)
        this.at++
    }

    /** Text and arguments up to the closing brace of a branch, or the end. */
    parts(inPlural: boolean, nested: boolean): Part[] {
        const parts: Part[] = []
        let text = ''
        const flush = () => {
            if (text !== '') parts.push(text)
            text = ''
        }
        while (this.at < this.text.length) {
            const char = this.text[this.at] as string
            if (char === "'") {
                const next = this.text[this.at + 1]
                if (next === "'") {
                    text += "'"
                    this.at += 2
                } else if (next === '{' || next === '}' || (next === '#' && inPlural)) {
                    const end = this.text.indexOf("'", this.at + 1)
                    const close = end === -1 ? this.text.length : end
                    text += this.text.slice(this.at + 1, close).replace(/''/g, "'")
                    this.at = close + 1
                } else {
                    text += "'"
                    this.at++
                }
            } else if (char === '{') {
                flush()
                this.at++
                parts.push(this.argument(inPlural))
            } else if (char === '}') {
                if (!nested) this.fail('Unmatched "}"')
                break
            } else if (char === '#' && inPlural) {
                flush()
                parts.push({ pound: true })
                this.at++
            } else {
                text += char
                this.at++
            }
        }
        flush()
        return parts
    }

    argument(inPlural: boolean): Part {
        const arg = this.word()
        this.space()
        if (this.text[this.at] === '}') {
            this.at++
            return { arg }
        }
        this.expect(',')
        const type = this.word()
        this.space()
        if (type === 'number' || type === 'date' || type === 'time') {
            let style = ''
            if (this.text[this.at] === ',') {
                this.at++
                const close = this.text.indexOf('}', this.at)
                if (close === -1) this.fail('Unclosed argument')
                style = this.text.slice(this.at, close).trim()
                this.at = close
            }
            this.expect('}')
            return { arg, type, style }
        }
        if (type !== 'plural' && type !== 'selectordinal' && type !== 'select') this.fail(`Unknown type "${type}"`)
        this.expect(',')
        let offset = 0
        const options: Record<string, Part[]> = {}
        for (;;) {
            this.space()
            if (this.text[this.at] === '}') {
                this.at++
                break
            }
            const key = this.word()
            if (key.startsWith('offset:')) {
                offset = Number(key.slice('offset:'.length))
                continue
            }
            this.expect('{')
            options[key] = this.parts(type !== 'select' || inPlural, true)
            this.expect('}')
        }
        if (!options.other) this.fail(`"${arg}" has no "other" branch`)
        return { arg, type, offset, options }
    }
}

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.PluralRules>()

function cached<T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.PluralRules>(key: string, make: () => T): T {
    let found = cache.get(key) as T | undefined
    if (found === undefined) {
        found = make()
        cache.set(key, found)
    }
    return found
}

/** The `Intl.NumberFormat` options a number style or skeleton names. */
function numberOptions(style: string): Intl.NumberFormatOptions {
    const options: Intl.NumberFormatOptions = {}
    for (const token of style.replace(/^::/, '').split(/\s+/)) {
        if (token === 'integer') options.maximumFractionDigits = 0
        else if (token === 'percent') options.style = 'percent'
        else if (token === 'compact-short' || token === 'K') options.notation = 'compact'
        else if (token === 'compact-long' || token === 'KK') Object.assign(options, { notation: 'compact', compactDisplay: 'long' })
        else if (token === 'group-off') options.useGrouping = false
        else if (/^\.0*#*$/.test(token)) {
            options.minimumFractionDigits = token.replace(/#/g, '').length - 1
            options.maximumFractionDigits = token.length - 1
        }
    }
    return options
}

const DATE_STYLES = new Set(['short', 'medium', 'long', 'full'])

/** The `Intl.DateTimeFormat` options a date or time style or skeleton names. */
function dateOptions(type: 'date' | 'time', style: string): Intl.DateTimeFormatOptions {
    if (DATE_STYLES.has(style)) return type === 'date' ? { dateStyle: style as 'short' } : { timeStyle: style as 'short' }
    if (!style.startsWith('::')) return type === 'date' ? { dateStyle: 'medium' } : { timeStyle: 'short' }
    const options: Intl.DateTimeFormatOptions = {}
    const numeric = (count: number) => (count === 2 ? '2-digit' : 'numeric')
    const named = (count: number) => (count === 4 ? 'long' : count === 5 ? 'narrow' : 'short')
    for (const [run] of style.slice(2).matchAll(/(.)\1*/g)) {
        const count = run.length
        switch (run[0]) {
            case 'y':
                options.year = numeric(count)
                break
            case 'M':
            case 'L':
                options.month = count >= 3 ? named(count) : numeric(count)
                break
            case 'd':
                options.day = numeric(count)
                break
            case 'E':
            case 'c':
                options.weekday = named(count)
                break
            case 'H':
                Object.assign(options, { hour: numeric(count), hourCycle: 'h23' })
                break
            case 'h':
                Object.assign(options, { hour: numeric(count), hourCycle: 'h12' })
                break
            case 'j':
                options.hour = numeric(count)
                break
            case 'm':
                options.minute = numeric(count)
                break
            case 's':
                options.second = numeric(count)
                break
        }
    }
    return options
}

function formatNumber(value: number, locale: string, style: string): string {
    return cached(`n${locale}|${style}`, () => new Intl.NumberFormat(locale, numberOptions(style))).format(value)
}

function render(parts: readonly Part[], values: MessageValues, locale: string, pound?: number): string {
    let out = ''
    for (const part of parts) {
        if (typeof part === 'string') {
            out += part
            continue
        }
        if ('pound' in part) {
            out += pound === undefined ? '#' : formatNumber(pound, locale, '')
            continue
        }
        const value = values[part.arg]
        switch (part.type) {
            case undefined:
                // A number in a plain argument is written as the locale writes numbers, as ICU does.
                out +=
                    value === undefined || value === null ? '' : typeof value === 'number' ? formatNumber(value, locale, '') : String(value)
                break
            case 'number':
                out += formatNumber(Number(value), locale, part.style)
                break
            case 'date':
            case 'time': {
                const date = value instanceof Date ? value : new Date(value as number)
                out += cached(
                    `d${locale}|${part.type}|${part.style}`,
                    () => new Intl.DateTimeFormat(locale, dateOptions(part.type as 'date', part.style)),
                ).format(date)
                break
            }
            case 'select':
                out += render(part.options[String(value)] ?? part.options.other ?? [], values, locale, pound)
                break
            default: {
                const number = Number(value) - part.offset
                const exact = part.options[`=${String(Number(value))}`]
                const category = cached(
                    `p${locale}|${part.type}`,
                    () => new Intl.PluralRules(locale, { type: part.type === 'plural' ? 'cardinal' : 'ordinal' }),
                ).select(number)
                out += render(exact ?? part.options[category] ?? part.options.other ?? [], values, locale, number)
            }
        }
    }
    return out
}

/** Reads a message once, to format many times; throws a `SyntaxError` on a message it cannot read. */
export function compileMessage(message: string): CompiledMessage {
    const reader = new Reader(message)
    const parts = reader.parts(false, false)
    return { format: (values, locale) => render(parts, values, locale) }
}

/** The names of a message's arguments, in the order they first appear. */
export function messageArguments(message: string): string[] {
    const names: string[] = []
    const walk = (parts: readonly Part[]) => {
        for (const part of parts) {
            if (typeof part === 'string' || 'pound' in part) continue
            if (!names.includes(part.arg)) names.push(part.arg)
            if ('options' in part) for (const branch of Object.values(part.options)) walk(branch)
        }
    }
    walk(new Reader(message).parts(false, false))
    return names
}

/** A message formatted once, in a locale (`en-US` when none is given). */
export function formatMessage(message: string, values: MessageValues = {}, locale = 'en-US'): string {
    return compileMessage(message).format(values, locale)
}
