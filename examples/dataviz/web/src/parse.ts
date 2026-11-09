import type { Column, ColumnType, DataRow } from './model'
import { REGION_NAMES } from './seed'

/** A table read from a file or pasted text, before it becomes a dataset: its columns' names and each row's values as text. */
export interface ParsedTable {
    names: string[]
    rows: string[][]
}

/** What reading gave: the table, or why it could not be read. */
export type ParseResult = { ok: true; table: ParsedTable; format: 'csv' | 'tsv' | 'json' } | { ok: false; error: string }

/** The delimiter a text of rows uses: the one that splits its first line the most. */
function delimiterOf(text: string): string {
    const first = text.split(/\r?\n/, 1)[0] ?? ''
    const counts = [',', ';', '\t'].map((mark) => [mark, first.split(mark).length] as const)
    return counts.reduce((best, next) => (next[1] > best[1] ? next : best))[0]
}

/** Rows of delimited text, with quoted values that may hold the delimiter, quotes doubled and line breaks. */
export function readDelimited(text: string, delimiter = delimiterOf(text)): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let value = ''
    let quoted = false
    for (let at = 0; at < text.length; at += 1) {
        const char = text[at]
        if (quoted) {
            if (char === '"' && text[at + 1] === '"') {
                value += '"'
                at += 1
            } else if (char === '"') quoted = false
            else value += char
            continue
        }
        if (char === '"' && value === '') quoted = true
        else if (char === delimiter) {
            row.push(value)
            value = ''
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && text[at + 1] === '\n') at += 1
            row.push(value)
            rows.push(row)
            row = []
            value = ''
        } else value += char
    }
    if (value !== '' || row.length > 0) {
        row.push(value)
        rows.push(row)
    }
    return rows.filter((one) => one.some((cell) => cell.trim() !== ''))
}

/** Text of a JSON value as a cell holds it. */
function cellText(value: unknown): string {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
}

/** A JSON document as a table: an array of objects, an array of arrays under a header row, or either under `rows` or `data`. */
function readJson(text: string): ParseResult {
    let parsed: unknown
    try {
        parsed = JSON.parse(text)
    } catch (error) {
        return { ok: false, error: `This is not JSON that can be read: ${error instanceof Error ? error.message : String(error)}` }
    }
    const holder = parsed as { rows?: unknown; data?: unknown }
    const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(holder.rows)
          ? holder.rows
          : Array.isArray(holder.data)
            ? holder.data
            : undefined
    if (list === undefined || list.length === 0)
        return { ok: false, error: 'The JSON holds no list of rows: give an array of objects, or one under "rows".' }
    if (list.every(Array.isArray)) {
        const [head, ...rest] = list as unknown[][]
        return { ok: true, format: 'json', table: { names: head.map(cellText), rows: rest.map((row) => row.map(cellText)) } }
    }
    if (!list.every((row) => row !== null && typeof row === 'object'))
        return { ok: false, error: 'Every row of the JSON must be an object of named values.' }
    const names: string[] = []
    for (const row of list as Record<string, unknown>[]) for (const key of Object.keys(row)) if (!names.includes(key)) names.push(key)
    return {
        ok: true,
        format: 'json',
        table: { names, rows: (list as Record<string, unknown>[]).map((row) => names.map((name) => cellText(row[name]))) },
    }
}

/** Reads text as a table: JSON when it opens like JSON, otherwise rows split by commas, semicolons or tabs, the first row naming the columns. */
export function parseTable(text: string): ParseResult {
    const trimmed = text.trim()
    if (trimmed === '') return { ok: false, error: 'There is nothing to read.' }
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) return readJson(trimmed)
    const delimiter = delimiterOf(trimmed)
    const [head, ...rows] = readDelimited(trimmed, delimiter)
    if (head === undefined || rows.length === 0)
        return { ok: false, error: 'A table needs a row of column names and at least one row of values.' }
    const width = head.length
    return {
        ok: true,
        format: delimiter === '\t' ? 'tsv' : 'csv',
        table: {
            names: head.map((name) => name.trim()),
            rows: rows.map((row) => Array.from({ length: width }, (_, at) => (row[at] ?? '').trim())),
        },
    }
}

/** Names made unique and never empty: a blank becomes `Column 3`, a repeat `Name 2`. */
export function uniqueNames(names: readonly string[]): string[] {
    const seen = new Set<string>()
    return names.map((raw, index) => {
        const base = raw.trim() === '' ? `Column ${String(index + 1)}` : raw.trim()
        let name = base
        for (let count = 2; seen.has(name.toLowerCase()); count += 1) name = `${base} ${String(count)}`
        seen.add(name.toLowerCase())
        return name
    })
}

const NUMBER = /^[-+]?(\d+|\d{1,3}(,\d{3})+)(\.\d+)?([eE][-+]?\d+)?$/
const DAY = /^\d{4}-\d{2}-\d{2}/
const MONTH = /^\d{4}-\d{2}$/
const REGIONS = new Set(REGION_NAMES.map((name) => name.toLowerCase()))

/** A number from a cell's text, with thousands commas allowed, or null. */
export function numberOf(text: string): number | null {
    const trimmed = text.trim()
    if (!NUMBER.test(trimmed)) return null
    const value = Number(trimmed.replaceAll(',', ''))
    return Number.isFinite(value) ? value : null
}

/** A day as `YYYY-MM-DD` from a cell's text (a date, a time, or a month), or null. */
export function dayOf(text: string): string | null {
    const trimmed = text.trim()
    if (MONTH.test(trimmed)) return `${trimmed}-01`
    if (!DAY.test(trimmed)) return null
    const day = trimmed.slice(0, 10)
    const date = new Date(`${day}T00:00:00Z`)
    return Number.isNaN(date.getTime()) ? null : day
}

/** Whether a text names one of the map's regions. */
export const isRegion = (text: string): boolean => REGIONS.has(text.trim().toLowerCase())

/** The type a column's values read as best: every value a number or a date, most of them regions, or text. */
export function guessType(values: readonly string[]): ColumnType {
    const filled = values.filter((value) => value.trim() !== '')
    if (filled.length === 0) return 'text'
    if (filled.every((value) => numberOf(value) !== null)) return 'number'
    if (filled.every((value) => dayOf(value) !== null)) return 'date'
    if (filled.filter(isRegion).length >= filled.length * 0.8) return 'region'
    return 'text'
}

/** Columns for a parsed table: unique names and guessed types, with ids `c1`, `c2` in order. */
export function columnsOf(table: ParsedTable): Column[] {
    return uniqueNames(table.names).map((name, at) => ({
        id: `c${String(at + 1)}`,
        name,
        type: guessType(table.rows.map((row) => row[at] ?? '')),
    }))
}

/** A cell's text kept as its type writes it: numbers without thousands commas, dates as `YYYY-MM-DD`. */
export function normalize(text: string, type: ColumnType): string {
    if (type === 'number') {
        const value = numberOf(text)
        return value === null ? text.trim() : String(value)
    }
    if (type === 'date') return dayOf(text) ?? text.trim()
    return text.trim()
}

/** The rows of a parsed table, keyed by the columns' ids, each value kept as its column's type writes it. */
export function rowsOf(table: ParsedTable, columns: readonly Column[], prefix: string): DataRow[] {
    return table.rows.map((row, index): DataRow => ({
        id: `${prefix}-r${String(index + 1)}`,
        ...Object.fromEntries(columns.map((column, at) => [column.id, normalize(row[at] ?? '', column.type)])),
    }))
}

/** A value written for CSV: quoted when it holds a comma, a quote or a line break. */
function csvCell(value: string): string {
    return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/** A table as CSV text: a header row of names, then a row per record. */
export function toCsv(names: readonly string[], rows: readonly (readonly (string | number | null)[])[]): string {
    const line = (cells: readonly (string | number | null)[]) => cells.map((cell) => csvCell(cell === null ? '' : String(cell))).join(',')
    return [line(names), ...rows.map(line)].join('\r\n') + '\r\n'
}

/** A file name from a title: lowercase words joined by dashes. */
export function fileName(title: string): string {
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    return slug === '' ? 'chart' : slug
}

/** Saves a file to the reader's computer, as the browser's download does. */
export function download(name: string, content: Blob | string, type = 'text/plain'): void {
    const blob = typeof content === 'string' ? new Blob([content], { type }) : content
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Saves a data URL, such as a chart's PNG, as a file. */
export function downloadUrl(name: string, url: string): void {
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.append(link)
    link.click()
    link.remove()
}
