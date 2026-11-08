import { ListFilter, Plus } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import {
    FILTER_OPERATORS,
    filterComplete,
    newFilter,
    withOperator,
    type Filter,
    type FilterOperator,
    type FilterRule,
    type FilterType,
} from '../lib/filters'
import { returnFocusOnKeyboard } from '../lib/focus'
import { FilterChip, saidOptions, type FilterOption } from './FilterChip'
import { OptionList } from './option-list'
import { Segmented } from './Segmented'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

export type { Filter, FilterOperator, FilterOption, FilterType }

/** One field a listing filters on: what it is called, what it holds, and how a row gives it. */
export interface FilterField<T = unknown> extends FilterRule<T> {
    id: string
    label: string
    type: FilterType
    /** A set's values, which its editor lists to tick, with a search over a long list. */
    options?: readonly FilterOption[]
    /** The operators offered, in order, the first the one a new filter starts with; the type's own by default. */
    operators?: readonly FilterOperator[]
    /** Drawn before the label in the menu of fields and on the chip. */
    icon?: ReactNode
    /** A number's unit, said after it on the chip and in its field: `s`, `rows`. */
    unit?: string
    /** Says one of the field's values on the chip, such as a number in its own format; a date and a number have defaults in the words. */
    format?: (value: string) => string
}

export interface FilterBarWords {
    /** The button that adds the first filter. */
    add: string
    /** The same button once filters are set, drawn as an icon. */
    addMore: string
    /** The search over the menu of fields. */
    fields: string
    /** Said when the search matches no field. */
    noField: string
    /** Removes every filter. */
    clear: string
    /** A chip's remove button. */
    remove: (field: string) => string
    /** The bar's accessible name. */
    label: string
    /** How each operator is said, in the editor and on the chip. */
    operators: Readonly<Record<FilterOperator, string>>
    /** The editor's operator choice, for a screen reader. */
    operator: string
    /** The value's field, for a screen reader. */
    value: string
    /** A range's two fields. */
    from: string
    to: string
    /** A date range open at its end or its start, said on the chip: `from Nov 2`, `until Nov 8`. */
    since: string
    until: string
    /** The search over a set's values. */
    search: string
    /** Said when the search matches no value. */
    empty: string
    /** Said after the first value when more than two are chosen: `failed +2`. */
    more: (count: number) => string
    /** A number said on the chip, with the field's unit. */
    number: (value: string, unit?: string) => string
    /** A day (`YYYY-MM-DD`) said on the chip. */
    date: (value: string) => string
    /** A range's two ends said on the chip. */
    range: (from: string, to: string) => string
}

const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

const WORDS: FilterBarWords = {
    add: 'Filter',
    addMore: 'Add filter',
    fields: 'Filter by',
    noField: 'No field matches.',
    clear: 'Clear all',
    remove: (field) => `Remove ${field}`,
    label: 'Filters',
    operators: {
        is: 'is',
        isNot: 'is not',
        contains: 'contains',
        oneOf: 'is any of',
        noneOf: 'is none of',
        between: 'between',
        atLeast: 'at least',
        atMost: 'at most',
        after: 'after',
        before: 'before',
    },
    operator: 'Compare',
    value: 'Value',
    from: 'From',
    to: 'To',
    since: 'from',
    until: 'until',
    search: 'Search',
    empty: 'Nothing matches.',
    more: (count) => `+${String(count)}`,
    number: (value, unit) => {
        const number = Number(value)
        const said = value.trim() !== '' && Number.isFinite(number) ? number.toLocaleString('en-US') : value
        return unit === undefined ? said : `${said} ${unit}`
    },
    date: (value) => {
        const [year, month, day] = value.split('-').map(Number)
        if (year === undefined || month === undefined || day === undefined || [year, month, day].some(Number.isNaN)) return value
        return DAY.format(new Date(year, month - 1, day))
    },
    range: (from, to) => `${from} – ${to}`,
}

/** How a filter is said on its chip: the operator in the quiet ink, then its value. */
export function saidFilter<T>(filter: Filter, field: FilterField<T>, words: FilterBarWords = WORDS): { operator: string; value: string } {
    const one = (value: string) =>
        field.format?.(value) ??
        (field.type === 'date' ? words.date(value) : field.type === 'number' ? words.number(value, field.unit) : value)
    const chosen = filter.values.filter((value) => value !== '')
    switch (filter.operator) {
        case 'oneOf':
        case 'noneOf': {
            const value = saidOptions(field.options ?? chosen.map((each) => ({ value: each })), chosen, words.more) ?? ''
            const single = chosen.length === 1
            const operator = filter.operator === 'oneOf' ? (single ? 'is' : 'oneOf') : single ? 'isNot' : 'noneOf'
            return { operator: words.operators[operator], value }
        }
        case 'between': {
            const [from = '', to = ''] = filter.values.map((value) => value.trim())
            if (from !== '' && to !== '') {
                // A number range says its unit once, at its end.
                const ends = field.type === 'number' && field.format === undefined ? [words.number(from), one(to)] : [one(from), one(to)]
                return { operator: '', value: words.range(ends[0], ends[1]) }
            }
            const date = field.type === 'date'
            if (from !== '') return { operator: date ? words.since : words.operators.atLeast, value: one(from) }
            return { operator: date ? words.until : words.operators.atMost, value: to === '' ? '' : one(to) }
        }
        default:
            return { operator: words.operators[filter.operator], value: chosen[0] === undefined ? '' : one(chosen[0]) }
    }
}

export interface FilterBarProps<T = unknown> {
    fields: readonly FilterField<T>[]
    /** The filters, one to a field, held by the app; a filter still without a value is among them while its editor is open. */
    filters?: readonly Filter[]
    defaultFilters?: readonly Filter[]
    onFiltersChange?: (filters: Filter[]) => void
    /** Opens the menu of fields at first. */
    defaultMenuOpen?: boolean
    /** The field whose filter's editor is open at first. */
    defaultEditing?: string
    /** The bar's words, any of them; the operators one by one. */
    words?: Partial<Omit<FilterBarWords, 'operators'> & { operators: Partial<FilterBarWords['operators']> }>
    className?: string
}

/**
 * Filters on a listing, each a chip that says what it keeps: the field, how it compares and the
 * value. Filter adds one from a menu of the fields with a search over them; choosing a field adds
 * its filter and opens its editor at once, and choosing one already set opens its chip. The editor
 * offers the field's operators over its value: is, is not and contains for text, any of and none of
 * for a set (its values ticked from a list with a search), and between, at least and at most for a
 * number, between, after and before for a date. Changes apply as they are made, and closing an
 * editor with nothing filled in takes its filter away. Clear all removes every filter.
 *
 * The bar holds no rows. In a `DataTable`'s `toolbar`, a listing filtered in the browser passes its
 * rows through `filterRows` from `lib/filters` with the same fields; one filtered on a server sends
 * it the filters, `activeFilters` leaving out one still being filled in. Held by the app through
 * `filters`, or by the bar from `defaultFilters`. The chips wrap onto more lines when the bar runs
 * out of room.
 */
export function FilterBar<T = unknown>({
    fields,
    filters,
    defaultFilters,
    onFiltersChange,
    defaultMenuOpen = false,
    defaultEditing,
    words: given,
    className,
}: FilterBarProps<T>) {
    const words = { ...WORDS, ...given, operators: { ...WORDS.operators, ...given?.operators } }
    const [own, setOwn] = useState<readonly Filter[]>(defaultFilters ?? [])
    const held = filters ?? own
    const change = (next: Filter[]) => {
        if (filters === undefined) setOwn(next)
        onFiltersChange?.(next)
    }
    const [menuOpen, setMenuOpen] = useState(defaultMenuOpen)
    const [editing, setEditing] = useState<string | null>(defaultEditing ?? null)
    const picked = useRef(false)
    const fieldOf = (id: string) => fields.find((field) => field.id === id)

    const pick = (id: string) => {
        const field = fieldOf(id)
        if (field === undefined) return
        picked.current = true
        setMenuOpen(false)
        if (!held.some((filter) => filter.field === id)) change([...held, newFilter(field.id, field.type, field.operators)])
        setEditing(id)
    }
    const update = (next: Filter) => change(held.map((filter) => (filter.field === next.field ? next : filter)))
    const remove = (id: string) => change(held.filter((filter) => filter.field !== id))
    const close = (id: string) => {
        setEditing((now) => (now === id ? null : now))
        const filter = held.find((one) => one.field === id)
        if (filter !== undefined && !filterComplete(filter)) remove(id)
    }

    return (
        <div
            role="group"
            aria-label={words.label}
            data-slot="filter-bar"
            className={cn('flex min-w-0 flex-wrap items-center gap-2', className)}
        >
            {held.map((filter) => {
                const field = fieldOf(filter.field)
                if (field === undefined) return null
                const said = filterComplete(filter) ? saidFilter(filter, field, words) : undefined
                return (
                    <FilterChip
                        key={field.id}
                        facet={field.label}
                        icon={field.icon}
                        operator={said?.operator === '' ? undefined : said?.operator}
                        value={said?.value}
                        editor={
                            <FilterEditor field={field} filter={filter} onChange={update} onDone={() => close(field.id)} words={words} />
                        }
                        open={editing === field.id}
                        onOpenChange={(open) => (open ? setEditing(field.id) : close(field.id))}
                        onClear={() => remove(field.id)}
                        words={{ clear: words.remove }}
                    />
                )
            })}
            {/* Add and Clear all wrap onto a line together, after the last chip. */}
            <span className="flex items-center gap-2">
                <Popover
                    open={menuOpen}
                    onOpenChange={(open) => {
                        if (open) picked.current = false
                        setMenuOpen(open)
                    }}
                >
                    <PopoverTrigger
                        render={
                            <Button
                                variant="ghost"
                                size={held.length === 0 ? 'default' : 'icon'}
                                aria-label={held.length === 0 ? undefined : words.addMore}
                                title={held.length === 0 ? undefined : words.addMore}
                                className="size-auto h-(--density-control) min-w-(--density-control) text-muted-foreground"
                            />
                        }
                    >
                        {held.length === 0 ? <ListFilter aria-hidden /> : <Plus aria-hidden />}
                        {held.length === 0 && words.add}
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        aria-label={words.addMore}
                        finalFocus={(type) => !picked.current && returnFocusOnKeyboard(type)}
                        className="w-64 max-w-(--available-width) gap-0 overflow-hidden p-0"
                    >
                        <OptionList
                            options={fields.map((field) => ({ value: field.id, label: field.label, icon: field.icon }))}
                            value={[]}
                            marks="none"
                            onValueChange={([id]) => {
                                if (id !== undefined) pick(id)
                            }}
                            words={{ search: words.fields, empty: words.noField }}
                            className="max-h-[min(24rem,var(--available-height))]"
                        />
                    </PopoverContent>
                </Popover>
                {held.length > 0 && (
                    <Button variant="ghost" className="h-(--density-control) text-muted-foreground" onClick={() => change([])}>
                        {words.clear}
                    </Button>
                )}
            </span>
        </div>
    )
}

interface FilterEditorProps<T> {
    field: FilterField<T>
    filter: Filter
    onChange: (filter: Filter) => void
    onDone: () => void
    words: FilterBarWords
}

/** A filter's editor: its operators over its value, which applies as it is changed. */
function FilterEditor<T>({ field, filter, onChange, onDone, words }: FilterEditorProps<T>) {
    const operators = field.operators ?? FILTER_OPERATORS[field.type]
    const setValues = (values: readonly string[]) => onChange({ ...filter, values })
    const done = (event: { key: string; preventDefault: () => void }) => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        onDone()
    }
    const input = (at: number, label: string, first: boolean) => {
        const value = filter.values[at] ?? ''
        const number = field.type === 'number'
        const invalid = number && value.trim() !== '' && !Number.isFinite(Number(value))
        const control = (
            <Input
                data-autofocus={first ? '' : undefined}
                type={field.type === 'date' ? 'date' : 'text'}
                inputMode={number ? 'decimal' : undefined}
                aria-label={label}
                aria-invalid={invalid || undefined}
                placeholder={operators.includes('between') && filter.operator === 'between' ? label : undefined}
                value={value}
                onChange={(event) => {
                    const next = [...filter.values]
                    while (next.length <= at) next.push('')
                    next[at] = event.target.value
                    setValues(next)
                }}
                onKeyDown={done}
                className={cn('min-w-0 flex-1', number && field.unit !== undefined && 'pr-8')}
            />
        )
        if (!number || field.unit === undefined) return control
        return (
            <span className="relative flex min-w-0 flex-1 items-center">
                {control}
                <span aria-hidden className="pointer-events-none absolute right-2.5 text-sm text-muted-foreground">
                    {field.unit}
                </span>
            </span>
        )
    }
    let body: ReactNode
    if (field.type === 'set') {
        body = (
            <OptionList
                options={field.options ?? []}
                multiple
                value={filter.values}
                onValueChange={setValues}
                words={{ search: words.search, empty: words.empty }}
                className="max-h-[min(20rem,calc(var(--available-height)-3rem))]"
            />
        )
    } else if (filter.operator === 'between') {
        body = (
            <div className="flex items-center gap-2 p-2">
                {input(0, words.from, true)}
                <span aria-hidden className="text-muted-foreground">
                    –
                </span>
                {input(1, words.to, false)}
            </div>
        )
    } else {
        body = <div className="p-2">{input(0, words.value, true)}</div>
    }
    return (
        <div className="flex min-h-0 flex-col">
            {operators.length > 1 && (
                <div className="border-b border-border p-2">
                    <Segmented
                        label={words.operator}
                        value={filter.operator}
                        options={operators.map((operator) => ({ value: operator, label: words.operators[operator] }))}
                        onValueChange={(operator) => onChange(withOperator(filter, operator))}
                        fill
                    />
                </div>
            )}
            {body}
        </div>
    )
}
