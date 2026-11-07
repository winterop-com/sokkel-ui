import { cn } from '../lib/cn'
import { CodeBlock, CodeBlockContent, CodeBlockHeader, CodeBlockLine, CodeBlockTitle } from './ui/code-block'

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

/**
 * Two versions of a text as one list of lines, the removed ones marked `-` and the added ones `+`:
 * a job definition before and after an edit, a config against the one it replaces. A count of each heads
 * it beside the title.
 */
export function DiffView({
    before,
    after,
    title,
    size = 'default',
    className,
}: {
    before: string
    after: string
    title?: string
    size?: 'default' | 'sm'
    className?: string
}) {
    const lines = diffLines(before, after)
    const added = lines.filter((line) => line.kind === 'added').length
    const removed = lines.filter((line) => line.kind === 'removed').length
    return (
        <CodeBlock size={size} className={className} data-plain="">
            <CodeBlockHeader>
                {title !== undefined && <CodeBlockTitle className="font-mono">{title}</CodeBlockTitle>}
                <span className="ml-auto flex gap-2 font-mono text-xs tabular-nums">
                    <span className="text-good">+{added}</span>
                    <span className="text-critical">-{removed}</span>
                </span>
            </CodeBlockHeader>
            <CodeBlockContent>
                {lines.map((line, index) => (
                    <CodeBlockLine
                        key={index}
                        variant={line.kind === 'same' ? 'default' : line.kind}
                        className={cn(
                            'pl-7 group-data-[size=sm]/code-block:pl-7 after:start-3',
                            line.kind === 'added' && 'bg-good/12 after:text-good',
                            line.kind === 'removed' && 'bg-critical/12',
                        )}
                    >
                        {line.text}
                    </CodeBlockLine>
                ))}
            </CodeBlockContent>
        </CodeBlock>
    )
}
