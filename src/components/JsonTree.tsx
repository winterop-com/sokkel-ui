import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { cn } from '../lib/cn'

function Scalar({ value }: { value: unknown }) {
    if (value === null) return <span className="text-muted-foreground">null</span>
    if (typeof value === 'string') return <span className="break-all text-kind-green-ink">"{value}"</span>
    if (typeof value === 'number') return <span className="text-kind-blue-ink tabular-nums">{value}</span>
    if (typeof value === 'boolean') return <span className="text-kind-violet-ink">{String(value)}</span>
    return <span className="text-muted-foreground">{String(value)}</span>
}

function Node({ name, value, depth, open }: { name?: string; value: unknown; depth: number; open: number }) {
    const nested = value !== null && typeof value === 'object'
    const [expanded, setExpanded] = useState(depth < open)
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
    return (
        <div>
            <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
                className="flex items-center rounded-sm text-left outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
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
                            <span className="px-1 text-faint">{list ? entries.length : `${entries.length} keys`}</span>
                            {end}
                        </>
                    )}
                </span>
            </button>
            {expanded && (
                <>
                    <div className="ml-[7px] border-l border-border pl-1">
                        {entries.map(([childName, child]) => (
                            <Node key={childName} name={list ? undefined : childName} value={child} depth={depth + 1} open={open} />
                        ))}
                    </div>
                    <div className="pl-4 text-muted-foreground">{end}</div>
                </>
            )}
        </div>
    )
}

/**
 * A JSON value as a tree that folds: objects and lists open to `open` levels deep, and a folded
 * one shows how many entries it holds. Strings, numbers and booleans are inked by type.
 */
export function JsonTree({ value, open = 2, className }: { value: unknown; open?: number; className?: string }) {
    return (
        <div className={cn('font-mono text-xs leading-5', className)}>
            <Node value={value} depth={0} open={open} />
        </div>
    )
}
