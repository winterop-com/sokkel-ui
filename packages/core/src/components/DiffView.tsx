import { useMemo, useState, type ReactNode } from 'react'
import { UnfoldVerticalIcon } from 'lucide-react'

import { cn } from '../lib/cn'
import { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockHeader, CodeBlockLine, CodeBlockTitle } from './ui/code-block'

/** One line of a line diff: kept, added in the new text, or removed from the old. */
export interface DiffLine {
    kind: 'same' | 'added' | 'removed'
    text: string
}

/** The lines that turn `before` into `after`, by the longest run of lines the two share. */
export function diffLines(before: string, after: string): DiffLine[] {
    const a = before === '' ? [] : before.replace(/\n$/, '').split('\n')
    const b = after === '' ? [] : after.replace(/\n$/, '').split('\n')
    const rows = a.length + 1
    const cols = b.length + 1
    const shared = new Uint32Array(rows * cols)
    for (let i = a.length - 1; i >= 0; i -= 1) {
        for (let j = b.length - 1; j >= 0; j -= 1) {
            shared[i * cols + j] =
                a[i] === b[j] ? shared[(i + 1) * cols + j + 1] + 1 : Math.max(shared[(i + 1) * cols + j], shared[i * cols + j + 1])
        }
    }
    const out: DiffLine[] = []
    let i = 0
    let j = 0
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            out.push({ kind: 'same', text: a[i] })
            i += 1
            j += 1
        } else if (shared[(i + 1) * cols + j] >= shared[i * cols + j + 1]) {
            out.push({ kind: 'removed', text: a[i] })
            i += 1
        } else {
            out.push({ kind: 'added', text: b[j] })
            j += 1
        }
    }
    for (; i < a.length; i += 1) out.push({ kind: 'removed', text: a[i] })
    for (; j < b.length; j += 1) out.push({ kind: 'added', text: b[j] })
    return out
}

/** A row of a folded diff: a line drawn, with its place among the lines, or a run of unchanged lines folded into one row. */
export type DiffRow = { kind: 'line'; line: DiffLine; index: number } | { kind: 'fold'; start: number; count: number }

/**
 * The rows of a diff with the unchanged lines more than `context` lines from any change folded, a
 * run of them into one row that names where it starts and how many it holds. A run in `opened`,
 * by its start, is drawn whole, and a run of one line is drawn, since its row would take the same room.
 */
export function foldDiff(lines: readonly DiffLine[], context = 3, opened: ReadonlySet<number> = new Set()): DiffRow[] {
    const reach = Math.max(0, context)
    const near = Array.from({ length: lines.length }, () => false)
    let last = -Infinity
    for (let at = 0; at < lines.length; at += 1) {
        if (lines[at].kind !== 'same') last = at
        near[at] = at - last <= reach
    }
    let next = Infinity
    for (let at = lines.length - 1; at >= 0; at -= 1) {
        if (lines[at].kind !== 'same') next = at
        near[at] = near[at] || next - at <= reach
    }
    const rows: DiffRow[] = []
    let index = 0
    while (index < lines.length) {
        if (near[index]) {
            rows.push({ kind: 'line', line: lines[index], index })
            index += 1
            continue
        }
        let end = index
        while (end < lines.length && !near[end]) end += 1
        const count = end - index
        if (count > 1 && !opened.has(index)) rows.push({ kind: 'fold', start: index, count })
        else for (let at = index; at < end; at += 1) rows.push({ kind: 'line', line: lines[at], index: at })
        index = end
    }
    return rows
}

export interface DiffViewWords {
    /** Said in the header in place of the counts when the two texts are the same. */
    unchanged: string
    /** The row that stands for a folded run of unchanged lines, which opens it on a press. */
    folded: (count: number) => string
}

const WORDS: DiffViewWords = {
    unchanged: 'No changes',
    folded: (count) => (count === 1 ? '1 unchanged line' : `${count.toLocaleString('en')} unchanged lines`),
}

export interface DiffViewProps {
    before: string
    after: string
    title?: string
    size?: 'default' | 'sm'
    /** How many unchanged lines stay drawn on each side of a change; the rest fold. `Infinity` draws every line. */
    context?: number
    /** Drawn at the header's end, after the counts: a copy or an open button. */
    actions?: ReactNode
    className?: string
    words?: Partial<DiffViewWords>
}

/**
 * Two versions of a text as one list of lines, the removed ones marked `-` and the added ones `+`:
 * a job definition before and after an edit, a config against the one it replaces. A count of each heads
 * it beside the title, a side with none left out, and the words' `unchanged` said when nothing changed.
 * Unchanged lines further than `context` from a change fold into a row that opens them on a press,
 * so a long text opens on its changes.
 */
export function DiffView({ before, after, title, size = 'default', context = 3, actions, className, words: given }: DiffViewProps) {
    const words = { ...WORDS, ...given }
    const lines = useMemo(() => diffLines(before, after), [before, after])
    const [open, setOpen] = useState<{ of: readonly DiffLine[]; starts: ReadonlySet<number> }>({ of: lines, starts: new Set() })
    const opened = open.of === lines ? open.starts : new Set<number>()
    const rows = foldDiff(lines, context, opened)
    const added = lines.filter((line) => line.kind === 'added').length
    const removed = lines.filter((line) => line.kind === 'removed').length
    return (
        <CodeBlock size={size} className={className} data-plain="">
            <CodeBlockHeader>
                {title !== undefined && <CodeBlockTitle className="font-mono">{title}</CodeBlockTitle>}
                <span className="ml-auto flex gap-2 font-mono text-xs tabular-nums">
                    {added > 0 && <span className="text-good">+{added}</span>}
                    {removed > 0 && <span className="text-critical">-{removed}</span>}
                    {added === 0 && removed === 0 && <span className="font-sans">{words.unchanged}</span>}
                </span>
                {actions !== undefined && <CodeBlockActions className="ms-0">{actions}</CodeBlockActions>}
            </CodeBlockHeader>
            <CodeBlockContent>
                {rows.map((row) =>
                    row.kind === 'fold' ? (
                        <button
                            key={`fold-${row.start}`}
                            type="button"
                            data-slot="diff-view-fold"
                            className="relative -mx-3 block min-h-lh bg-muted/60 pl-7 text-start font-sans text-muted-foreground outline-none select-none group-data-[size=sm]/code-block:-mx-2.5 group-data-[size=sm]/code-block:pl-7 hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
                            onClick={() => setOpen({ of: lines, starts: new Set([...opened, row.start]) })}
                        >
                            <UnfoldVerticalIcon className="absolute start-2 top-1/2 size-3.5 -translate-y-1/2" aria-hidden />
                            {words.folded(row.count)}
                        </button>
                    ) : (
                        <CodeBlockLine
                            key={row.index}
                            variant={row.line.kind === 'same' ? 'default' : row.line.kind}
                            className={cn(
                                'pl-7 group-data-[size=sm]/code-block:pl-7 after:start-3',
                                row.line.kind === 'added' && 'bg-good/12 after:text-good',
                                row.line.kind === 'removed' && 'bg-critical/12',
                            )}
                        >
                            {row.line.text}
                        </CodeBlockLine>
                    ),
                )}
            </CodeBlockContent>
        </CodeBlock>
    )
}
