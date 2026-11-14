import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { cn } from '../lib/cn'

/** The words a JSON tree says: how many keys a folded object holds, and the step that shows more of a long one. */
export interface JsonTreeWords {
    keys: (count: number) => string
    /** The step under a long list or object's shown entries, `count` the entries a press adds. */
    more: (count: number) => string
}

const WORDS: JsonTreeWords = {
    keys: (count) => `${String(count)} ${count === 1 ? 'key' : 'keys'}`,
    more: (count) => `Show ${count.toLocaleString('en-US')} more`,
}

function Scalar({ value }: { value: unknown }) {
    if (value === null) return <span className="text-muted-foreground">null</span>
    if (typeof value === 'string') return <span className="break-all text-kind-green-ink">"{value}"</span>
    if (typeof value === 'number') return <span className="text-kind-blue-ink tabular-nums">{value}</span>
    if (typeof value === 'boolean') return <span className="text-kind-violet-ink">{String(value)}</span>
    return <span className="text-muted-foreground">{String(value)}</span>
}

interface NodeProps {
    name?: string
    value: unknown
    depth: number
    open: number
    limit: number
    words: JsonTreeWords
}

function Node({ name, value, depth, open, limit, words }: NodeProps) {
    const nested = value !== null && typeof value === 'object'
    const [expanded, setExpanded] = useState(depth < open)
    const [shown, setShown] = useState(limit)
    const key = name !== undefined && <span className="text-foreground">{name}: </span>
    if (!nested) {
        return (
            <div className="pl-4">
                {key}
                <Scalar value={value} />
            </div>
        )
    }
    const list = Array.isArray(value)
    const entries = list ? value.map((item, index) => [String(index), item] as const) : Object.entries(value as Record<string, unknown>)
    const [start, end] = list ? ['[', ']'] : ['{', '}']
    const step = Math.min(limit, entries.length - shown)
    return (
        <div>
            <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
                className="flex items-center rounded-sm text-left outline-none hover:bg-hover focus-visible:ring-focus focus-visible:ring-ring"
            >
                <ChevronRight
                    className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-90')}
                    aria-hidden
                />
                {key}
                <span className="text-muted-foreground">
                    {start}
                    {!expanded && (
                        <>
                            <span className="px-1 text-faint">{list ? entries.length : words.keys(entries.length)}</span>
                            {end}
                        </>
                    )}
                </span>
            </button>
            {expanded && (
                <>
                    <div className="ml-[7px] border-l border-border pl-1">
                        {entries.slice(0, shown).map(([childName, child]) => (
                            <Node
                                key={childName}
                                name={list ? undefined : childName}
                                value={child}
                                depth={depth + 1}
                                open={open}
                                limit={limit}
                                words={words}
                            />
                        ))}
                        {step > 0 && (
                            <button
                                type="button"
                                onClick={() => setShown(shown + limit)}
                                className="ml-4 rounded-sm text-left text-primary-ink outline-none hover:underline focus-visible:ring-focus focus-visible:ring-ring"
                            >
                                {words.more(step)}
                            </button>
                        )}
                    </div>
                    <div className="pl-4 text-muted-foreground">{end}</div>
                </>
            )}
        </div>
    )
}

export interface JsonTreeProps {
    value: unknown
    open?: number
    /** How many entries an opened list or object shows before a step that shows as many more. */
    limit?: number
    className?: string
    words?: Partial<JsonTreeWords>
}

/**
 * A JSON value as a tree that folds: objects and lists open to `open` levels deep, and a folded
 * one shows how many entries it holds. Strings, numbers and booleans are inked by type. An opened
 * list or object draws its first `limit` entries, 100 by default, and a step under them ("Show 100
 * more", `words.more`) that draws as many more, so a long response opens at once.
 */
export function JsonTree({ value, open = 2, limit = 100, className, words: given }: JsonTreeProps) {
    const words = { ...WORDS, ...given }
    return (
        <div className={cn('font-mono text-xs leading-5', className)}>
            <Node value={value} depth={0} open={open} limit={Math.max(1, Math.floor(limit))} words={words} />
        </div>
    )
}
