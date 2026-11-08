/**
 * Filters on a listing: what a `FilterBar` holds, and how rows are matched against it in the
 * browser. A server applies the same filters itself from the state the app hands it.
 */

/** What a field holds, which decides the operators it offers and the editor it opens. */
export type FilterType = 'text' | 'set' | 'number' | 'date'

/**
 * How a filter compares: `is`, `isNot` and `contains` for text; `oneOf` and `noneOf` for a set;
 * `between`, `atLeast` and `atMost` for a number; `between`, `after` and `before` for a date.
 */
export type FilterOperator = 'is' | 'isNot' | 'contains' | 'oneOf' | 'noneOf' | 'between' | 'atLeast' | 'atMost' | 'after' | 'before'

/** The operators each type offers, the first the one a new filter starts with. */
export const FILTER_OPERATORS: Readonly<Record<FilterType, readonly FilterOperator[]>> = {
    text: ['contains', 'is', 'isNot'],
    set: ['oneOf', 'noneOf'],
    number: ['between', 'atLeast', 'atMost'],
    date: ['between', 'after', 'before'],
}

/**
 * One filter: the field it is on, how it compares, and what with. Values are strings, so a filter
 * keeps and travels as it is: a number in plain decimals (`60`), a date as `YYYY-MM-DD`. `between`
 * holds its two ends, either one empty for an open end; a set holds the values chosen.
 */
export interface Filter {
    field: string
    operator: FilterOperator
    values: readonly string[]
}

/** A field's value in a row, as `filterRows` reads it: text, a number, a date, or the values of a set. */
export type FilterValue = string | number | Date | readonly string[] | null | undefined

/** What `filterRows` needs of a field: its id, its type, and how to read it from a row. */
export interface FilterRule<T> {
    id: string
    type: FilterType
    /** The field's value in a row; a field without one leaves the rows as they are. */
    value?: (row: T) => FilterValue
}

/** Whether a filter says enough to filter by: a value, one end of a range, or a chosen value. */
export function filterComplete(filter: Filter): boolean {
    const [first = '', second = ''] = filter.values
    switch (filter.operator) {
        case 'oneOf':
        case 'noneOf':
            return filter.values.some((value) => value !== '')
        case 'between':
            return first.trim() !== '' || second.trim() !== ''
        default:
            return first.trim() !== ''
    }
}

/** The filters that say enough to filter by, as a server should be asked for them. */
export function activeFilters(filters: readonly Filter[]): Filter[] {
    return filters.filter(filterComplete)
}

/** A number from a filter's value or a row's, or undefined when it is none. */
function numberOf(value: string | number | Date | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') return undefined
    const number = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Number(value)
    return Number.isFinite(number) ? number : undefined
}

/** A day as `YYYY-MM-DD`: a date in local time, a string as its first ten characters, a number as milliseconds. */
export function dayOf(value: string | number | Date | null | undefined): string | undefined {
    if (value === null || value === undefined || value === '') return undefined
    if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return undefined
    const pad = (part: number) => String(part).padStart(2, '0')
    return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A row's value as the strings it holds, for text and sets. */
function textsOf(value: FilterValue): string[] {
    if (value === null || value === undefined) return []
    if (Array.isArray(value)) return value as string[]
    if (value instanceof Date) return [dayOf(value) ?? '']
    return [String(value)]
}

const fold = (text: string) => text.trim().toLocaleLowerCase('en-US')

/**
 * Whether a row's value passes one filter. Text compares without case; a set passes `oneOf` when
 * any of its values was chosen; a number or a day passes a range with its ends included, `after`
 * and `before` leaving the day itself out. A value a range cannot read fails it. A filter that
 * does not say enough passes everything.
 */
export function matchesFilter(value: FilterValue, filter: Filter, type: FilterType): boolean {
    if (!filterComplete(filter)) return true
    const [first = '', second = ''] = filter.values
    if (type === 'text' || type === 'set') {
        const texts = textsOf(value).map(fold)
        const wanted = filter.values.filter((one) => one !== '').map(fold)
        switch (filter.operator) {
            case 'is':
                return texts.includes(wanted[0])
            case 'isNot':
                return !texts.includes(wanted[0])
            case 'contains':
                return texts.some((text) => text.includes(wanted[0]))
            case 'oneOf':
                return texts.some((text) => wanted.includes(text))
            case 'noneOf':
                return !texts.some((text) => wanted.includes(text))
            default:
                return true
        }
    }
    const read = type === 'date' ? dayOf : numberOf
    const own = read(Array.isArray(value) ? undefined : (value as string | number | Date | null | undefined))
    const from = read(first)
    const to = read(second)
    if (own === undefined) return false
    switch (filter.operator) {
        case 'between':
            return (from === undefined || own >= from) && (to === undefined || own <= to)
        case 'atLeast':
            return from === undefined || own >= from
        case 'atMost':
            return from === undefined || own <= from
        case 'after':
            return from === undefined || own > from
        case 'before':
            return from === undefined || own < from
        case 'is':
            return from === undefined || own === from
        case 'isNot':
            return from === undefined || own !== from
        default:
            return true
    }
}

/**
 * The rows that pass every filter, in their order, for a listing filtered in the browser. A filter
 * on a field the app did not name, or on one without a `value`, leaves the rows as they are.
 */
export function filterRows<T>(rows: readonly T[], filters: readonly Filter[], fields: readonly FilterRule<T>[]): T[] {
    const rules = activeFilters(filters).flatMap((filter) => {
        const field = fields.find((one) => one.id === filter.field)
        const read = field?.value
        return field === undefined || read === undefined ? [] : [{ filter, type: field.type, read }]
    })
    if (rules.length === 0) return [...rows]
    return rows.filter((row) => rules.every((rule) => matchesFilter(rule.read(row), rule.filter, rule.type)))
}

/** A filter as one string that two equal filters share, its set's values in one order. */
function filterKey(filter: Filter): string {
    const set = filter.operator === 'oneOf' || filter.operator === 'noneOf'
    const values = filter.values.map((value) => value.trim())
    return JSON.stringify([filter.field, filter.operator, set ? [...values].filter((value) => value !== '').sort() : values])
}

/** Whether two lists of filters filter alike: the same complete filters, in any order. */
export function sameFilters(a: readonly Filter[], b: readonly Filter[]): boolean {
    const keys = (filters: readonly Filter[]) => activeFilters(filters).map(filterKey).sort()
    const [left, right] = [keys(a), keys(b)]
    return left.length === right.length && left.every((key, index) => key === right[index])
}

/** A new filter on a field, with the first of the operators it offers and no value yet. */
export function newFilter(field: string, type: FilterType, operators: readonly FilterOperator[] = FILTER_OPERATORS[type]): Filter {
    return { field, operator: operators[0] ?? FILTER_OPERATORS[type][0], values: [] }
}

/**
 * A filter moved to another operator, keeping what still fits: the chosen values between a set's
 * operators, the first end between a range and a bound, and the text between text operators.
 */
export function withOperator(filter: Filter, operator: FilterOperator): Filter {
    if (operator === filter.operator) return filter
    const range = (one: FilterOperator) => one === 'between'
    if (range(operator) && !range(filter.operator)) return { ...filter, operator, values: [filter.values[0] ?? '', ''] }
    if (!range(operator) && range(filter.operator)) {
        const kept = filter.values.find((value) => value.trim() !== '') ?? ''
        return { ...filter, operator, values: kept === '' ? [] : [kept] }
    }
    return { ...filter, operator }
}
