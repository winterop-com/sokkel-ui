import { ChevronsUpDown, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '../lib/cn'
import { INVALID_EDGE } from '../lib/issue-edge'
import { Tree, treeHolding, type TreeLoad, type TreeNode, type TreeTrail, type TreeWords } from './Tree'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

/**
 * Every node by id, with the labels of its ancestors, for the trigger to name a choice by its path:
 * the given nodes, the children loaded so far, and the trails of choices found by a search.
 */
function index(
    nodes: readonly TreeNode[],
    loaded: ReadonlyMap<string, readonly TreeNode[]>,
    trails: readonly TreeTrail[],
): Map<string, { node: TreeNode; path: string[] }> {
    const out = new Map<string, { node: TreeNode; path: string[] }>()
    for (const trail of trails) out.set(trail.node.id, { node: trail.node, path: trail.ancestors.map((each) => each.label) })
    const walk = (list: readonly TreeNode[], path: string[]) => {
        for (const node of list) {
            out.set(node.id, { node, path })
            walk(node.children ?? loaded.get(node.id) ?? [], [...path, node.label])
        }
    }
    walk(nodes, [])
    return out
}

export interface TreeSelectWords extends Omit<TreeWords, 'moved' | 'topLevel'> {
    placeholder: string
    search: string
    clear: string
    selected: (count: number) => string
}

const WORDS: TreeSelectWords = {
    placeholder: 'Choose',
    search: 'Search',
    clear: 'Clear',
    empty: 'Nothing matches.',
    selected: (count) => `${count} chosen`,
    actions: 'Actions',
    loading: 'Loading',
    failed: 'This level did not load.',
    retry: 'Try again',
    searching: 'Searching',
    searchFailed: 'The search did not answer.',
}

export interface TreeSelectProps {
    id?: string
    nodes: readonly TreeNode[]
    value: readonly string[]
    onValueChange: (ids: string[]) => void
    multiple?: boolean
    /** The branches unfolded when the popover first opens. */
    defaultExpanded?: readonly string[]
    /** Whether the popover is open, held from outside with `onOpenChange`. */
    open?: boolean
    /** Whether the popover starts open when `open` is not given. */
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    /** The search the popover opens with, for a still view of it. */
    defaultQuery?: string
    /** Brings the children of a node marked `hasChildren` when it is first opened. */
    loadChildren?: (node: TreeNode) => Promise<readonly TreeNode[]>
    /** Answers a query over the whole hierarchy with each match and its ancestors. */
    search?: (query: string) => Promise<readonly TreeTrail[]>
    /** Where chosen nodes not loaded yet sit, so the trigger names them by their path and the tree opens to them. */
    trails?: readonly TreeTrail[]
    /**
     * Why a node cannot be chosen, such as a place outside a form's assignment, or `undefined` when
     * it can. Its row is drawn shut with the reason at its end, and its branch still opens.
     */
    unavailable?: (node: TreeNode) => string | undefined
    /** The question may be left unanswered: the list opens with a row that clears the choice (`words.clear`). */
    optional?: boolean
    words?: Partial<TreeSelectWords>
    className?: string
    invalid?: boolean
}

/**
 * A field that picks from a hierarchy: the trigger reads like a select and names the choice with
 * its path, and the popover holds a search over a tree. `multiple` chooses several with checkboxes
 * and keeps the popover open; the trigger then lists the choices by name with their count at its
 * end. The tree opens on the branches that lead to a choice, and a parent holding some shows a dash.
 *
 * For a large hierarchy, `loadChildren` brings a level when it is first opened (kept for the next
 * time the popover opens), and `search` looks through the whole of it, listing each match with its
 * path. A choice not loaded yet is named by its path from `trails`, or from the search that found it.
 *
 * `unavailable` scopes the choice: a node it gives a reason for, such as a place outside a form's
 * assignment, is drawn shut with that reason and cannot be chosen, while its branch still opens.
 * `optional` starts the list with a Clear row, chosen while nothing is, that leaves the question
 * unanswered; without it the Clear button beside the search does that once something is chosen.
 *
 * Left to itself the popover opens and closes on its own, starting at `defaultOpen`; `open` with
 * `onOpenChange` holds it from outside.
 */
export function TreeSelect({
    id,
    nodes,
    value,
    onValueChange,
    multiple = false,
    defaultExpanded = [],
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    defaultQuery = '',
    loadChildren,
    search,
    trails = [],
    unavailable,
    optional = false,
    words: given,
    className,
    invalid = false,
}: TreeSelectProps) {
    const words = { ...WORDS, ...given }
    const [ownOpen, setOwnOpen] = useState(defaultOpen)
    const open = openProp ?? ownOpen
    const setOpen = (next: boolean) => {
        if (openProp === undefined) setOwnOpen(next)
        onOpenChange?.(next)
    }
    const [query, setQuery] = useState(defaultQuery)
    const [loaded, setLoaded] = useState<ReadonlyMap<string, readonly TreeNode[]>>(() => new Map())
    const [picked, setPicked] = useState<ReadonlyMap<string, TreeTrail>>(() => new Map())
    const found = useRef(new Map<string, TreeTrail>())
    const latest = useRef({ loadChildren, search })
    useEffect(() => {
        latest.current = { loadChildren, search }
    })
    // Loaded levels are kept here, so the tree the popover mounts next time has them at once.
    const load = useCallback(
        (node: TreeNode): Promise<readonly TreeNode[]> => {
            const kept = loaded.get(node.id)
            if (kept !== undefined) return Promise.resolve(kept)
            const ask = latest.current.loadChildren
            if (ask === undefined) return Promise.resolve([])
            return ask(node).then((children) => {
                setLoaded((now) => new Map(now).set(node.id, children))
                return children
            })
        },
        [loaded],
    )
    const find = useCallback((text: string): Promise<readonly TreeTrail[]> => {
        const ask = latest.current.search
        if (ask === undefined) return Promise.resolve([])
        return ask(text).then((answer) => {
            for (const trail of answer) found.current.set(trail.node.id, trail)
            return answer
        })
    }, [])
    const known = useMemo(() => [...trails, ...picked.values()], [trails, picked])
    const byId = useMemo(() => index(nodes, loaded, known), [nodes, loaded, known])
    const first = value.length > 0 ? byId.get(value[0]) : undefined
    const summary = value.length === 1 && first !== undefined ? first : null
    const names = value.map((each) => byId.get(each)?.node.label ?? each)
    // The tree reads this when the popover mounts it: the branches that lead to a choice start unfolded.
    const loads = useMemo(() => new Map<string, TreeLoad>([...loaded].map(([id, children]) => [id, { state: 'done', children }])), [loaded])
    const chosen = new Set(value)
    const unfolded = [
        ...new Set([
            ...defaultExpanded,
            ...treeHolding(nodes, chosen, loads),
            ...known.filter((trail) => chosen.has(trail.node.id)).flatMap((trail) => trail.ancestors.map((each) => each.id)),
        ]),
    ]

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                id={id}
                aria-invalid={invalid || undefined}
                className={cn(
                    'flex h-(--density-control) w-full min-w-0 items-center gap-2 rounded-control border border-input bg-field px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring max-md:min-h-finger',
                    INVALID_EDGE,
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
                        className="h-9 flex-1 text-base max-md:min-h-finger md:text-sm"
                    />
                    {value.length > 0 && !optional && (
                        <button
                            type="button"
                            onClick={() => onValueChange([])}
                            className="flex items-center gap-1 rounded-sm text-xs text-muted-foreground hover:text-foreground"
                        >
                            <X className="size-3.5" aria-hidden />
                            {words.clear}
                        </button>
                    )}
                </div>
                <div className="max-h-80 overflow-y-auto p-1">
                    {optional && query.trim() === '' && (
                        <button
                            type="button"
                            aria-pressed={value.length === 0}
                            onClick={() => {
                                onValueChange([])
                                setOpen(false)
                            }}
                            className={cn(
                                'flex h-8 w-full items-center gap-1.5 rounded-md pr-2 pl-1 text-left text-sm text-muted-foreground outline-none select-none hover:bg-hover focus-visible:ring-focus focus-visible:ring-ring focus-visible:ring-inset',
                                value.length === 0 && 'bg-primary/12 font-medium text-primary-ink hover:bg-primary/18',
                            )}
                        >
                            <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
                                <X className="size-3.5" />
                            </span>
                            {words.clear}
                        </button>
                    )}
                    <Tree
                        label={words.search}
                        nodes={nodes}
                        query={query}
                        defaultExpanded={unfolded}
                        selection={multiple ? 'multiple' : 'single'}
                        selected={value}
                        loadChildren={loadChildren === undefined ? undefined : load}
                        search={search === undefined ? undefined : find}
                        trails={known}
                        unavailable={unavailable}
                        words={words}
                        onSelect={(ids) => {
                            const trailed = ids.flatMap((each) => {
                                const trail = found.current.get(each)
                                return trail === undefined ? [] : [trail]
                            })
                            if (trailed.length > 0)
                                setPicked((now) => new Map([...now, ...trailed.map((trail) => [trail.node.id, trail] as const)]))
                            onValueChange(ids)
                            if (!multiple) {
                                setOpen(false)
                                setQuery('')
                            }
                        }}
                    />
                </div>
            </PopoverContent>
        </Popover>
    )
}
