/**
 * `SchemaForm`'s key/value table for an object of any keys whose values are each one scalar, such
 * as headers, query parameters or environment variables.
 */
import { X } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { IconButton } from '../IconButton'
import { ISSUE_EDGE } from '../IssueMark'
import { Input } from '../ui/input'
import { fieldSchema, types, valueAt, type Path } from './issues'
import type { JsonSchema } from './read'
import type { SchemaFormState } from './SchemaForm'

/** One row of a map: its key as typed and its value. */
export interface MapRow {
    id: number
    key: string
    value: unknown
}

let lastId = 0

/** The rows of a map's value, one per key in its order. */
export function rowsOf(value: unknown): MapRow[] {
    const entries = value !== null && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : []
    return entries.map(([key, one]) => ({ id: (lastId += 1), key, value: one }))
}

/** The ids of the rows whose key an earlier row already has. */
export function repeatedKeys(rows: readonly MapRow[]): Set<number> {
    const seen = new Set<string>()
    const out = new Set<number>()
    for (const row of rows) {
        if (row.key === '') continue
        if (seen.has(row.key)) out.add(row.id)
        seen.add(row.key)
    }
    return out
}

/**
 * The map's value from its rows: a row without a key, or with a key an earlier row has, is left
 * out; a row without a value takes `blank` (an empty string for a map of text), else is left out.
 */
export function objectOf(rows: readonly MapRow[], blank?: unknown): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const row of rows) {
        const value = row.value ?? blank
        if (row.key === '' || row.key in out || value === undefined) continue
        out[row.key] = value
    }
    return out
}

export interface MapFieldProps {
    form: SchemaFormState
    path: Path
    at: JsonSchema
    readOnly: boolean
    /** The map's head, with Add when rows can be added. */
    head: (onAdd?: () => void) => ReactNode
    /** A row's value control, at the value's path while its key is settled. */
    control: (path: Path, held: { value: unknown; set: (value: unknown) => void }, name: string) => ReactNode
}

/** A map's rows, each a key and a value, with Add in its head and Remove on each row. */
export function MapField({ form, path, at, readOnly, head, control }: MapFieldProps) {
    const item = typeof at.additionalProperties === 'object' ? fieldSchema(at.additionalProperties, form.schema) : {}
    const blank = types(item).main[0] === 'string' && item.anyOf === undefined && item.oneOf === undefined ? '' : undefined
    const current = valueAt(form.value, path)
    const [rows, setRows] = useState(() => rowsOf(current))
    const [seen, setSeen] = useState(current)
    // A value changed from outside the table, not by its own rows, draws its rows again.
    if (seen !== current) {
        setSeen(current)
        if (JSON.stringify(objectOf(rows, blank)) !== JSON.stringify(current ?? {})) setRows(rowsOf(current))
    }
    const repeated = repeatedKeys(rows)
    const message = repeated.size > 0 ? form.words.repeatedKey : undefined
    const hold = useRef(form.hold)
    hold.current = form.hold
    useEffect(() => {
        hold.current(path, message)
        return () => hold.current(path, undefined)
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- the path is the same for the field's life
    }, [message])
    const update = (next: MapRow[]) => {
        setRows(next)
        form.set(path, objectOf(next, blank))
    }
    const change = (id: number, part: Partial<MapRow>) => update(rows.map((row) => (row.id === id ? { ...row, ...part } : row)))
    const flagged = form.shown(path).length > 0
    const base = form.id(path)
    return (
        <>
            {head(readOnly ? undefined : () => update([...rows, { id: (lastId += 1), key: '', value: undefined }]))}
            {rows.length > 0 && (
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-x-1.5 gap-y-2">
                    <span className="text-help text-muted-foreground">{form.words.key}</span>
                    <span className="text-help text-muted-foreground">{form.words.value}</span>
                    <span />
                    {rows.map((row, index) => {
                        const twice = repeated.has(row.id)
                        const settled = row.key !== '' && !twice
                        const name = settled ? row.key : `${form.words.value} ${String(index + 1)}`
                        return (
                            <Fragment key={row.id}>
                                <Input
                                    id={`${base}-key${String(row.id)}`}
                                    aria-label={`${form.words.key} ${String(index + 1)}`}
                                    aria-invalid={(twice && flagged) || undefined}
                                    value={row.key}
                                    readOnly={readOnly}
                                    spellCheck={false}
                                    onChange={(event) => change(row.id, { key: event.target.value })}
                                    onBlur={() => form.touch(path)}
                                    className={cn('font-mono', twice && flagged && ISSUE_EDGE.critical)}
                                />
                                {control(
                                    // A row whose key is not settled holds its value apart, at a place no issue reaches.
                                    settled ? [...path, row.key] : [...path, `#${String(row.id)}`],
                                    { value: row.value, set: (value) => change(row.id, { value }) },
                                    name,
                                )}
                                {readOnly ? (
                                    <span />
                                ) : (
                                    <IconButton
                                        label={`${form.words.remove} ${name}`}
                                        type="button"
                                        size="icon"
                                        onClick={() => update(rows.filter((one) => one.id !== row.id))}
                                    >
                                        <X aria-hidden />
                                    </IconButton>
                                )}
                            </Fragment>
                        )
                    })}
                </div>
            )}
        </>
    )
}
