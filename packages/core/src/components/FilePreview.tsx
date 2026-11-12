import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Code } from './Code'
import { DataTable, type DataColumn } from './DataTable'
import { FileTypeIcon, type FileKind } from './FileList'
import { JsonTree } from './JsonTree'

export type { FileKind } from './FileList'

export interface FilePreviewWords {
    rows: (shown: number, total: number) => string
    /** Said under a table cut off at `maxRows` before the end was counted. */
    firstRows: (shown: number) => string
    unreadable: string
    none: string
    /** Said over a file longer than `maxLength`, of which only the start is shown. */
    cut: string
}

const WORDS: FilePreviewWords = {
    rows: (shown, total) => (shown === total ? `${total} rows` : `First ${shown} of ${total} rows`),
    firstRows: (shown) => `First ${shown} rows`,
    unreadable: 'This JSON does not parse; its text is shown.',
    none: 'No preview for this kind of file.',
    cut: 'Only the start of this file is shown.',
}

/** The cells of a CSV text: commas split, double quotes hold commas and doubled quotes. With `limit`, it stops after that many rows. */
export function parseCsv(text: string, limit = Infinity): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let quoted = false
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i]
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') {
                cell += '"'
                i += 1
            } else if (char === '"') quoted = false
            else cell += char
        } else if (char === '"') quoted = true
        else if (char === ',') {
            row.push(cell)
            cell = ''
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && text[i + 1] === '\n') i += 1
            row.push(cell)
            rows.push(row)
            row = []
            cell = ''
            if (rows.length >= limit) return rows
        } else cell += char
    }
    if (cell !== '' || row.length > 0) {
        row.push(cell)
        rows.push(row)
    }
    return rows
}

const NUMBER = /^-?[\d.,]+$/

/** One line of a CSV, keyed by its place among the lines. */
interface CsvLine {
    at: number
    cells: readonly string[]
}

function CsvTable({ text, cut, maxRows, words }: { text: string; cut: boolean; maxRows: number; words: FilePreviewWords }) {
    // One row past the head and the rows shown says whether more follow, without reading the rest.
    const parsed = parseCsv(text, maxRows + 2)
    const read = cut && parsed.length < maxRows + 2 ? parsed.slice(0, -1) : parsed
    const [head = [], ...body] = read
    const more = body.length > maxRows || cut
    const shown: CsvLine[] = body.slice(0, maxRows).map((cells, at) => ({ at, cells }))
    // A column whose every filled cell is a number lines up at its end.
    const columns: DataColumn<CsvLine>[] = head.map((name, index) => ({
        id: String(index),
        header: name,
        width: 'minmax(7rem,1fr)',
        align:
            shown.some((line) => (line.cells[index] ?? '') !== '') &&
            shown.every((line) => (line.cells[index] ?? '') === '' || NUMBER.test(line.cells[index] ?? ''))
                ? 'end'
                : 'start',
        cell: (line) => line.cells[index],
    }))
    return (
        <DataTable
            columns={columns}
            rows={shown}
            rowKey={(line) => String(line.at)}
            variant="list"
            stackBelow={false}
            foot={<span className="font-mono text-xs">{more ? words.firstRows(shown.length) : words.rows(shown.length, body.length)}</span>}
        />
    )
}

function Json({ text, cut, room, words }: { text: string; cut: boolean; room: string; words: FilePreviewWords }) {
    let value: unknown
    try {
        if (cut) throw new Error('cut')
        value = JSON.parse(text)
    } catch {
        return (
            <div className={cn('flex flex-col gap-2', room === FILL && FILL)}>
                {!cut && <p className="text-xs text-muted-foreground">{words.unreadable}</p>}
                <Code value={text} language={cut ? 'json' : undefined} size="sm" className={room} />
            </div>
        )
    }
    return (
        <div className={cn('overflow-auto rounded-surface border border-border-strong bg-card p-3 font-mono text-xs', room)}>
            <JsonTree value={value} />
        </div>
    )
}

/** The room a JSON or text body takes: up to 28rem, scrolling past it, or its container's height. */
const CAPPED = 'max-h-[28rem]'
const FILL = 'min-h-0 flex-1'

export interface FilePreviewProps {
    name: string
    kind: FileKind
    /** An image's address or data URI. */
    src?: string
    /** The contents of a table, JSON, text or code file. */
    text?: string
    /** The highlighting for text or code; read from the name's extension when absent. */
    language?: string
    /** How many rows of a CSV the table shows; the rest of the file is not read. */
    maxRows?: number
    /**
     * The most characters of `text` read: 1,000,000 when left out. A longer file shows its start,
     * JSON as text, and says it is cut.
     */
    maxLength?: number
    /** JSON, text and code fill the container's height and scroll in it, in place of stopping at 28rem. */
    fill?: boolean
    /** What shows for a kind with no preview. */
    fallback?: ReactNode
    className?: string
    words?: Partial<FilePreviewWords>
}

/**
 * What a file holds, drawn for its kind: an image whole on a checkered ground, a CSV as a small
 * table of its first rows, JSON as a tree to open, and text or code highlighted, both up to 28rem
 * tall and scrolling past it (or filling the container with `fill`). Only the first `maxLength`
 * characters are read. Any other kind shows its icon and says it has no preview.
 */
export function FilePreview({
    name,
    kind,
    src,
    text: whole,
    language,
    maxRows = 12,
    maxLength = 1_000_000,
    fill = false,
    fallback,
    className,
    words: given,
}: FilePreviewProps) {
    const words = { ...WORDS, ...given }
    const cut = whole !== undefined && whole.length > maxLength
    const text = cut ? whole.slice(0, maxLength) : whole
    const room = fill ? FILL : CAPPED
    const body = (() => {
        if (kind === 'image' && src !== undefined) {
            return (
                <div className="flex items-center justify-center overflow-hidden rounded-surface border border-border-strong bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-[length:16px_16px]">
                    <img src={src} alt={name} className="max-h-[28rem] max-w-full object-contain" />
                </div>
            )
        }
        if (kind === 'table' && text !== undefined) return <CsvTable text={text} cut={cut} maxRows={maxRows} words={words} />
        if (kind === 'json' && text !== undefined) return <Json text={text} cut={cut} room={room} words={words} />
        if ((kind === 'text' || kind === 'code') && text !== undefined) {
            return (
                <Code
                    value={text}
                    language={language ?? /\.(\w+)$/.exec(name)?.[1] ?? 'text'}
                    title={name}
                    size="sm"
                    lineNumbers
                    className={room}
                />
            )
        }
        return (
            fallback ?? (
                <div className="flex flex-col items-center gap-2 rounded-surface border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted-foreground">
                    <FileTypeIcon kind={kind} className="size-8 stroke-[1.25]" />
                    {words.none}
                </div>
            )
        )
    })()
    return (
        <div className={cn('min-w-0', fill && 'flex h-full min-h-0 flex-col', className)}>
            {cut && kind !== 'table' && <p className="mb-2 text-xs text-muted-foreground">{words.cut}</p>}
            {body}
        </div>
    )
}
