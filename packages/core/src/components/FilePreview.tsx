import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Code } from './Code'
import { FileTypeIcon, type FileKind } from './FileList'
import { JsonTree } from './JsonTree'

export interface FilePreviewWords {
    rows: (shown: number, total: number) => string
    unreadable: string
    none: string
}

const WORDS: FilePreviewWords = {
    rows: (shown, total) => (shown === total ? `${total} rows` : `First ${shown} of ${total} rows`),
    unreadable: 'This JSON does not parse; its text is shown.',
    none: 'No preview for this kind of file.',
}

/** The cells of a CSV text: commas split, double quotes hold commas and doubled quotes. */
export function parseCsv(text: string): string[][] {
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
        } else cell += char
    }
    if (cell !== '' || row.length > 0) {
        row.push(cell)
        rows.push(row)
    }
    return rows
}

function CsvTable({ text, maxRows, words }: { text: string; maxRows: number; words: FilePreviewWords }) {
    const [head = [], ...body] = parseCsv(text)
    const shown = body.slice(0, maxRows)
    return (
        <div className="flex min-w-0 flex-col overflow-hidden rounded-surface border border-border-strong bg-card">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                    <thead>
                        <tr className="border-b border-border-strong bg-panel-ground text-left text-muted-foreground">
                            {head.map((cell, index) => (
                                <th key={index} className="px-2.5 py-1.5 font-medium whitespace-nowrap">
                                    {cell}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {shown.map((row, index) => (
                            <tr key={index} className="border-b border-border last:border-b-0">
                                {head.map((_, column) => (
                                    <td
                                        key={column}
                                        className={cn(
                                            'px-2.5 py-1 whitespace-nowrap',
                                            /^-?[\d.,]+$/.test(row[column] ?? '') && 'text-right tabular-nums',
                                        )}
                                    >
                                        {row[column]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="border-t border-border-strong px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
                {words.rows(shown.length, body.length)}
            </div>
        </div>
    )
}

function Json({ text, words }: { text: string; words: FilePreviewWords }) {
    let value: unknown
    try {
        value = JSON.parse(text)
    } catch {
        return (
            <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">{words.unreadable}</p>
                <Code value={text} size="sm" />
            </div>
        )
    }
    return (
        <div className="overflow-x-auto rounded-surface border border-border-strong bg-card p-3 font-mono text-xs">
            <JsonTree value={value} />
        </div>
    )
}

/**
 * What a file holds, drawn for its kind: an image whole on a checkered ground, a CSV as a small
 * table of its first rows, JSON as a tree to open, and text or code highlighted. Any other kind
 * shows its icon and says it has no preview.
 */
export function FilePreview({
    name,
    kind,
    src,
    text,
    language,
    maxRows = 12,
    fallback,
    className,
    words: given,
}: {
    name: string
    kind: FileKind
    /** An image's address or data URI. */
    src?: string
    /** The contents of a table, JSON, text or code file. */
    text?: string
    /** The highlighting for text or code; read from the name's extension when absent. */
    language?: string
    /** How many rows of a CSV the table shows. */
    maxRows?: number
    /** What shows for a kind with no preview. */
    fallback?: ReactNode
    className?: string
    words?: Partial<FilePreviewWords>
}) {
    const words = { ...WORDS, ...given }
    const body = (() => {
        if (kind === 'image' && src !== undefined) {
            return (
                <div className="flex items-center justify-center overflow-hidden rounded-surface border border-border-strong bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-[length:16px_16px]">
                    <img src={src} alt={name} className="max-h-[28rem] max-w-full object-contain" />
                </div>
            )
        }
        if (kind === 'table' && text !== undefined) return <CsvTable text={text} maxRows={maxRows} words={words} />
        if (kind === 'json' && text !== undefined) return <Json text={text} words={words} />
        if ((kind === 'text' || kind === 'code') && text !== undefined) {
            return <Code value={text} language={language ?? /\.(\w+)$/.exec(name)?.[1] ?? 'text'} title={name} size="sm" lineNumbers />
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
    return <div className={cn('min-w-0', className)}>{body}</div>
}
