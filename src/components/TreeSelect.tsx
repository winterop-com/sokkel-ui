import { ChevronsUpDown, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn } from '../lib/cn'
import { Tree, treeHolding, type TreeNode } from './Tree'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

/** Every node by id, with the labels of its ancestors, for the trigger to name a choice by its path. */
function index(nodes: readonly TreeNode[]): Map<string, { node: TreeNode; path: string[] }> {
    const out = new Map<string, { node: TreeNode; path: string[] }>()
    const walk = (list: readonly TreeNode[], path: string[]) => {
        for (const node of list) {
            out.set(node.id, { node, path })
            walk(node.children ?? [], [...path, node.label])
        }
    }
    walk(nodes, [])
    return out
}

export interface TreeSelectWords {
    placeholder: string
    search: string
    clear: string
    empty: string
    selected: (count: number) => string
}

const WORDS: TreeSelectWords = {
    placeholder: 'Choose',
    search: 'Search',
    clear: 'Clear',
    empty: 'Nothing matches.',
    selected: (count) => `${count} chosen`,
}

/**
 * A field that picks from a hierarchy: the trigger reads like a select and names the choice with
 * its path, and the popover holds a search over a tree. `multiple` chooses several with checkboxes
 * and keeps the popover open; the trigger then lists the choices by name with their count at its
 * end. The tree opens on the branches that lead to a choice, and a parent holding some shows a dash.
 */
export function TreeSelect({
    id,
    nodes,
    value,
    onChange,
    multiple = false,
    defaultOpen = [],
    open: openProp,
    words = WORDS,
    className,
    invalid = false,
}: {
    id?: string
    nodes: readonly TreeNode[]
    value: readonly string[]
    onChange: (ids: string[]) => void
    multiple?: boolean
    /** The nodes open when the popover first opens. */
    defaultOpen?: readonly string[]
    /** Holds the popover open, for a static view of it. */
    open?: boolean
    words?: TreeSelectWords
    className?: string
    invalid?: boolean
}) {
    const [open, setOpen] = useState(openProp ?? false)
    const [query, setQuery] = useState('')
    const byId = useMemo(() => index(nodes), [nodes])
    const first = value.length > 0 ? byId.get(value[0]) : undefined
    const summary = value.length === 1 && first !== undefined ? first : null
    const names = value.map((each) => byId.get(each)?.node.label ?? each)
    // The tree reads this when the popover mounts it: the branches that lead to a choice start unfolded.
    const unfolded = [...new Set([...defaultOpen, ...treeHolding(nodes, new Set(value))])]

    return (
        <Popover open={openProp ?? open} onOpenChange={setOpen}>
            <PopoverTrigger
                id={id}
                aria-invalid={invalid || undefined}
                className={cn(
                    'flex h-8 w-full min-w-0 items-center gap-2 rounded-control border border-input bg-field px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring aria-invalid:border-destructive',
                    className,
                )}
            >
                <span className="flex min-w-0 flex-1 items-baseline gap-1.5 truncate">
                    {value.length === 0 ? (
                        <span className="text-muted-foreground">{words.placeholder}</span>
                    ) : summary !== null ? (
                        <>
                            <span className="truncate">{summary.node.label}</span>
                            {summary.path.length > 0 && (
                                <span className="truncate text-xs text-muted-foreground">{summary.path.join(' / ')}</span>
                            )}
                        </>
                    ) : (
                        <span className="truncate" title={names.join(', ')}>
                            {names.join(', ')}
                        </span>
                    )}
                </span>
                {value.length > 1 && (
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums" aria-label={words.selected(value.length)}>
                        {value.length}
                    </span>
                )}
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </PopoverTrigger>
            <PopoverContent align="start" className="flex w-(--anchor-width) min-w-72 flex-col gap-0 p-0">
                <div className="flex items-center gap-2 border-b border-border px-2.5">
                    <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <Input
                        bare
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={words.search}
                        aria-label={words.search}
                        className="h-9 flex-1 text-sm"
                    />
                    {value.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="flex items-center gap-1 rounded-sm text-xs text-muted-foreground hover:text-foreground"
                        >
                            <X className="size-3.5" aria-hidden />
                            {words.clear}
                        </button>
                    )}
                </div>
                <div className="max-h-80 overflow-y-auto p-1">
                    <Tree
                        label={words.search}
                        nodes={nodes}
                        query={query}
                        defaultOpen={unfolded}
                        selection={multiple ? 'multiple' : 'single'}
                        selected={value}
                        onSelect={(ids) => {
                            onChange(ids)
                            if (!multiple && openProp === undefined) setOpen(false)
                        }}
                    />
                    <TreeEmpty nodes={nodes} query={query} words={words} />
                </div>
            </PopoverContent>
        </Popover>
    )
}

/** The empty line, shown only when nothing anywhere in the tree matches. */
function TreeEmpty({ nodes, query, words }: { nodes: readonly TreeNode[]; query: string; words: TreeSelectWords }) {
    const any = (list: readonly TreeNode[]): boolean =>
        list.some((node) => node.label.toLowerCase().includes(query.trim().toLowerCase()) || any(node.children ?? []))
    if (query.trim() === '' || any(nodes)) return null
    return <p className="px-2 py-6 text-center text-sm text-muted-foreground">{words.empty}</p>
}
