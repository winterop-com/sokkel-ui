import { ChevronRight, RotateCw } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Checkbox } from './ui/checkbox'
import { Spinner } from './ui/spinner'
import { Highlight } from './Highlight'
import { literalRanges } from '../lib/search'

/** One node of a tree: what it answers with, what it is called, and what is under it. */
export interface TreeNode {
    id: string
    label: string
    /** A short fact at the row's right end: a count, a code. */
    meta?: ReactNode
    children?: readonly TreeNode[]
    /** Has children not given in `children`, which the tree's `loadChildren` brings when the node is first opened. */
    hasChildren?: boolean
}

/** Where a node sits: the node and its ancestors, from the top level down to its parent. */
export interface TreeTrail {
    node: TreeNode
    ancestors: readonly TreeNode[]
}

/** How far a lazy node's children have come: asked for, here, or refused. */
export type TreeLoad = { state: 'loading' } | { state: 'done'; children: readonly TreeNode[] } | { state: 'failed' }

/** The children each lazy node has loaded so far, by its id. */
export type TreeLoads = ReadonlyMap<string, TreeLoad>

const NO_LOADS: TreeLoads = new Map()

/**
 * A visible row: the node, how deep it is, and its parent. A row with a `status` stands under its
 * node for children still loading or refused; a row with a `trail` is a search result.
 */
export interface TreeRow {
    node: TreeNode
    level: number
    parent: string | null
    status?: 'loading' | 'failed'
    trail?: TreeTrail
}

export interface TreeWords {
    loading: string
    failed: string
    retry: string
    searching: string
    searchFailed: string
    empty: string
}

const WORDS: TreeWords = {
    loading: 'Loading',
    failed: 'This level did not load.',
    retry: 'Try again',
    searching: 'Searching',
    searchFailed: 'The search did not answer.',
    empty: 'Nothing matches.',
}

/** A node's children as far as they are known: given, loaded, or not yet. */
export function childrenOf(node: TreeNode, loads: TreeLoads = NO_LOADS): readonly TreeNode[] | undefined {
    if (node.children !== undefined) return node.children
    const load = loads.get(node.id)
    return load?.state === 'done' ? load.children : undefined
}

/** Whether a node opens: it has children, or is marked as having some not loaded yet. */
export function isBranch(node: TreeNode, loads: TreeLoads = NO_LOADS): boolean {
    const children = childrenOf(node, loads)
    return children === undefined ? node.hasChildren === true : children.length > 0
}

/** The ids of every node whose label or one of whose descendants' labels matches the query, with their ancestors. */
export function treeMatches(nodes: readonly TreeNode[], query: string, loads: TreeLoads = NO_LOADS): Set<string> {
    const needle = query.trim().toLowerCase()
    const keep = new Set<string>()
    const visit = (node: TreeNode, path: string[]): boolean => {
        const own = node.label.toLowerCase().includes(needle)
        let below = false
        for (const child of childrenOf(node, loads) ?? []) below = visit(child, [...path, node.id]) || below
        if (own || below) {
            keep.add(node.id)
            for (const id of path) keep.add(id)
        }
        return own || below
    }
    for (const node of nodes) visit(node, [])
    return keep
}

/** The ids of a node's ancestors, from the top level down to its parent, or null when the loaded tree does not hold it. */
export function treeAncestors(nodes: readonly TreeNode[], id: string, loads: TreeLoads = NO_LOADS): string[] | null {
    const visit = (list: readonly TreeNode[], path: string[]): string[] | null => {
        for (const node of list) {
            if (node.id === id) return path
            const found = visit(childrenOf(node, loads) ?? [], [...path, node.id])
            if (found !== null) return found
        }
        return null
    }
    return visit(nodes, [])
}

/** The ids of every node with a chosen node somewhere under it. */
export function treeHolding(nodes: readonly TreeNode[], chosen: ReadonlySet<string>, loads: TreeLoads = NO_LOADS): Set<string> {
    const out = new Set<string>()
    const visit = (node: TreeNode): boolean => {
        let below = false
        for (const child of childrenOf(node, loads) ?? []) below = visit(child) || below
        if (below) out.add(node.id)
        return below || chosen.has(node.id)
    }
    for (const node of nodes) visit(node)
    return out
}

/**
 * The rows a reader sees: the open nodes' children in order, or every match and its ancestors while
 * searching. An open node whose children are not loaded yet shows a loading or a failed row under it.
 */
export function visibleRows(
    nodes: readonly TreeNode[],
    open: ReadonlySet<string>,
    matches: ReadonlySet<string> | null,
    loads: TreeLoads = NO_LOADS,
): TreeRow[] {
    const rows: TreeRow[] = []
    const walk = (list: readonly TreeNode[], level: number, parent: string | null) => {
        for (const node of list) {
            if (matches !== null && !matches.has(node.id)) continue
            rows.push({ node, level, parent })
            if (!isBranch(node, loads) || (matches === null && !open.has(node.id))) continue
            const children = childrenOf(node, loads)
            if (children !== undefined) walk(children, level + 1, node.id)
            else if (matches === null) {
                const status = loads.get(node.id)?.state === 'failed' ? 'failed' : 'loading'
                rows.push({ node, level: level + 1, parent: node.id, status })
            }
        }
    }
    walk(nodes, 1, null)
    return rows
}

/** Rows beyond this many are drawn only while in view. */
const VIRTUAL_FROM = 200
/** Rows drawn above and below the view, so a quick scroll finds them ready. */
const OVERSCAN = 12

/** The nearest ancestor that scrolls, or null when the window does. */
function scroller(element: HTMLElement): HTMLElement | null {
    for (let node = element.parentElement; node !== null; node = node.parentElement) {
        const overflow = getComputedStyle(node).overflowY
        if (overflow === 'auto' || overflow === 'scroll') return node
    }
    return null
}

/** How far down the list the view starts, and how tall it is, in pixels. */
function viewOf(list: HTMLElement, box: HTMLElement | null): { start: number; height: number } {
    const top = box === null ? 0 : box.getBoundingClientRect().top
    const height = box === null ? window.innerHeight : box.clientHeight
    return { start: top - list.getBoundingClientRect().top, height }
}

/** The text with every case-blind occurrence of the query marked. */
function Marked({ text, query }: { text: string; query: string }) {
    return <Highlight text={text} ranges={literalRanges(text, query)} />
}

type Found = { query: string; state: 'loading' | 'done' | 'failed'; trails: readonly TreeTrail[] }

export interface TreeProps {
    nodes: readonly TreeNode[]
    selection?: 'single' | 'multiple' | 'none'
    selected?: readonly string[]
    onSelect?: (ids: string[]) => void
    query?: string
    defaultExpanded?: readonly string[]
    /** Brings the children of a node marked `hasChildren`; a rejection shows a row to try again. */
    loadChildren?: (node: TreeNode) => Promise<readonly TreeNode[]>
    /** Answers a query over the whole hierarchy with each match and its ancestors; without it the query searches the loaded nodes. */
    search?: (query: string) => Promise<readonly TreeTrail[]>
    /** Where chosen nodes not loaded yet sit, so the parents above them show that they hold a choice. */
    trails?: readonly TreeTrail[]
    words?: Partial<TreeWords>
    /** What the tree is, for a screen reader. */
    label: string
    className?: string
}

/**
 * A hierarchy a reader opens a level at a time: regions, folders, teams. The arrows move through
 * the visible rows, Right opens and Left closes or climbs to the parent, Enter or Space chooses.
 * While `query` is set, every match is shown under its ancestors with the match marked.
 *
 * `selection` is `single` (choose one row), `multiple` (a checkbox per row), or `none`.
 *
 * For a hierarchy too large to hand over at once, a node marked `hasChildren` without `children`
 * loads them through `loadChildren` when it is first opened, with a loading row under it meanwhile
 * and a row to try again if the load fails. `search` answers a query over the whole hierarchy,
 * loaded or not: each match is listed with its path, and choosing one opens the tree down to it.
 * Past a few hundred visible rows, only those in view of the nearest scrolling box are drawn, so
 * tens of thousands stay smooth.
 *
 * A single choice made outside the tree, such as a place picked on a map beside it, opens the tree
 * down to the chosen node and scrolls to it.
 */
export function Tree({
    nodes,
    selection = 'single',
    selected = [],
    onSelect,
    query = '',
    defaultExpanded = [],
    loadChildren,
    search,
    trails = [],
    words: given,
    label,
    className,
}: TreeProps) {
    const words = { ...WORDS, ...given }
    const [open, setOpen] = useState<Set<string>>(() => new Set(defaultExpanded))
    const [loads, setLoads] = useState<Map<string, TreeLoad>>(() => new Map())
    const asked = useRef(new Set<string>())
    const loader = useRef(loadChildren)
    const searcher = useRef(search)
    useEffect(() => {
        loader.current = loadChildren
        searcher.current = search
    })

    const needle = query.trim()
    const remote = search !== undefined && needle !== ''
    const [found, setFound] = useState<Found | null>(null)
    const [attempt, setAttempt] = useState(0)
    const [seen, setSeen] = useState<ReadonlyMap<string, TreeTrail>>(() => new Map())
    useEffect(() => {
        const ask = searcher.current
        if (!remote || ask === undefined) return
        let current = true
        setFound((before) => ({ query: needle, state: 'loading', trails: before?.trails ?? [] }))
        ask(needle).then(
            (answer) => {
                if (current) setFound({ query: needle, state: 'done', trails: answer })
            },
            () => {
                if (current) setFound((before) => ({ query: needle, state: 'failed', trails: before?.trails ?? [] }))
            },
        )
        return () => {
            current = false
        }
    }, [remote, needle, attempt])

    const matches = useMemo(() => (needle === '' || remote ? null : treeMatches(nodes, needle, loads)), [nodes, needle, remote, loads])
    const rows = useMemo<TreeRow[]>(
        () =>
            remote
                ? (found?.trails ?? []).map((trail) => ({ node: trail.node, level: 1, parent: null, trail }))
                : visibleRows(nodes, open, matches, loads),
        [remote, found, nodes, open, matches, loads],
    )
    const items = useMemo(() => rows.filter((row) => row.status === undefined), [rows])

    // Every open lazy node in view asks for its children once; a retry clears the refusal and asks again.
    useEffect(() => {
        const load = loader.current
        if (load === undefined) return
        for (const row of rows) {
            if (row.status !== 'loading' || asked.current.has(row.node.id)) continue
            const node = row.node
            asked.current.add(node.id)
            setLoads((now) => new Map(now).set(node.id, { state: 'loading' }))
            load(node).then(
                (children) => setLoads((now) => new Map(now).set(node.id, { state: 'done', children })),
                () => setLoads((now) => new Map(now).set(node.id, { state: 'failed' })),
            )
        }
    }, [rows])
    const retry = (id: string) => {
        asked.current.delete(id)
        setLoads((now) => {
            const next = new Map(now)
            next.delete(id)
            return next
        })
    }

    const [focus, setFocus] = useState<string | null>(null)
    const list = useRef<HTMLUListElement>(null)
    const chosen = new Set(selected)
    const holding = useMemo(() => {
        if (selection !== 'multiple') return new Set<string>()
        const picked = new Set(selected)
        const out = treeHolding(nodes, picked, loads)
        for (const trail of [...trails, ...seen.values()]) {
            if (picked.has(trail.node.id)) for (const ancestor of trail.ancestors) out.add(ancestor.id)
        }
        return out
    }, [nodes, selected, selection, loads, trails, seen])
    const current = items.find((row) => row.node.id === focus) ?? items[0]

    // Only the rows in view are drawn once there are many, measured against the nearest scrolling box.
    const virtual = rows.length > VIRTUAL_FROM
    const [rowHeight, setRowHeight] = useState(32)
    const [view, setView] = useState({ start: 0, height: 800 })
    useLayoutEffect(() => {
        const element = list.current
        if (!virtual || element === null) return
        const box = scroller(element)
        const measure = () => {
            const row = element.querySelector<HTMLElement>('[role="treeitem"]')
            if (row !== null && row.offsetHeight > 0) setRowHeight(row.offsetHeight)
            const next = viewOf(element, box)
            setView((now) => (now.start === next.start && now.height === next.height ? now : next))
        }
        let frame = 0
        const later = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(measure)
        }
        measure()
        const target = box ?? window
        target.addEventListener('scroll', later, { passive: true })
        const observer = new ResizeObserver(later)
        observer.observe(box ?? document.documentElement)
        return () => {
            cancelAnimationFrame(frame)
            target.removeEventListener('scroll', later)
            observer.disconnect()
        }
    }, [virtual])
    const first = virtual ? Math.max(0, Math.floor(view.start / rowHeight) - OVERSCAN) : 0
    const last = virtual ? Math.min(rows.length, Math.ceil((view.start + view.height) / rowHeight) + OVERSCAN) : rows.length
    const shown = virtual ? rows.slice(first, Math.max(first, last)) : rows

    /** Scrolls the nearest scrolling box until the row at `index` is in view. */
    const bringIntoView = useCallback(
        (index: number) => {
            const element = list.current
            if (!virtual || element === null) return
            const box = scroller(element)
            const { start, height } = viewOf(element, box)
            const top = index * rowHeight
            const by = top < start ? top - start : top + rowHeight > start + height ? top + rowHeight - start - height : 0
            if (by === 0) return
            if (box === null) window.scrollBy(0, by)
            else box.scrollTop += by
        },
        [virtual, rowHeight],
    )

    // Focus waits for its row to be drawn, which in a long tree comes after the scroll that reaches it.
    const pendingFocus = useRef<string | null>(null)
    useEffect(() => {
        const id = pendingFocus.current
        if (id === null) return
        const element = list.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)
        if (element === null || element === undefined) return
        pendingFocus.current = null
        element.focus({ preventScroll: true })
    })

    // The choice is scrolled to once its row is drawn, and so is a search result chosen, once the
    // search is cleared and the tree has opened down to it.
    const [reveal, setReveal] = useState<string | null>(selection === 'single' ? (selected[0] ?? null) : null)
    useEffect(() => {
        if (reveal === null || remote) return
        const index = rows.findIndex((row) => row.status === undefined && row.node.id === reveal)
        if (index === -1) return
        setReveal(null)
        setFocus(reveal)
        // Only a scrolling box around the tree moves, never the page it stands on.
        const element = list.current
        const box = element === null ? null : scroller(element)
        if (element === null || box === null) return
        const { start, height } = viewOf(element, box)
        const drawn = element.querySelector<HTMLElement>(`[data-id="${CSS.escape(reveal)}"]`)
        const top = drawn === null ? index * rowHeight : drawn.getBoundingClientRect().top - element.getBoundingClientRect().top
        const tall = drawn?.offsetHeight ?? rowHeight
        if (top < start || top + tall > start + height) box.scrollTop += top - start - (height - tall) / 2
    }, [reveal, remote, rows, rowHeight])

    // A choice that changes from outside opens the levels above it and is scrolled to.
    const choice = selection === 'single' ? (selected[0] ?? null) : null
    const lastChoice = useRef(choice)
    useEffect(() => {
        if (choice === lastChoice.current) return
        lastChoice.current = choice
        if (choice === null) return
        const above = treeAncestors(nodes, choice, loads)
        if (above === null) return
        setOpen((now) => (above.every((id) => now.has(id)) ? now : new Set([...now, ...above])))
        setReveal(choice)
    }, [choice, nodes, loads])

    const toggle = (id: string, to?: boolean) =>
        setOpen((now) => {
            const next = new Set(now)
            if (to ?? !next.has(id)) next.add(id)
            else next.delete(id)
            return next
        })
    const choose = (row: TreeRow) => {
        const id = row.node.id
        if (row.trail !== undefined) {
            const trail = row.trail
            setSeen((now) => new Map(now).set(id, trail))
            setOpen((now) => new Set([...now, ...trail.ancestors.map((ancestor) => ancestor.id)]))
            setReveal(id)
        }
        if (selection === 'none' || onSelect === undefined) return
        if (selection === 'single') onSelect([id])
        else onSelect(chosen.has(id) ? selected.filter((each) => each !== id) : [...selected, id])
    }
    const move = (row: TreeRow) => {
        setFocus(row.node.id)
        pendingFocus.current = row.node.id
        bringIntoView(rows.indexOf(row))
        list.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(row.node.id)}"]`)?.focus()
    }
    const parentRow = (row: TreeRow) => items.find((each) => each.node.id === row.parent)

    const note = remote
        ? found === null || (found.state === 'loading' && found.trails.length === 0)
            ? 'searching'
            : found.state === 'failed'
              ? 'searchFailed'
              : found.state === 'done' && found.trails.length === 0
                ? 'empty'
                : null
        : needle !== '' && rows.length === 0
          ? 'empty'
          : null

    return (
        <>
            <ul
                ref={list}
                role="tree"
                aria-label={label}
                aria-multiselectable={selection === 'multiple' || undefined}
                aria-busy={(remote && found?.state === 'loading') || undefined}
                className={cn('flex flex-col text-sm', className)}
                style={virtual ? { height: rows.length * rowHeight, paddingTop: first * rowHeight } : undefined}
                onKeyDown={(event) => {
                    if (current === undefined || !(event.target as HTMLElement).matches('[role="treeitem"]')) return
                    const index = items.indexOf(current)
                    const branch = current.trail === undefined && isBranch(current.node, loads)
                    const expanded = matches !== null || open.has(current.node.id)
                    if (event.key === 'ArrowDown' && index < items.length - 1) move(items[index + 1])
                    else if (event.key === 'ArrowUp' && index > 0) move(items[index - 1])
                    else if (event.key === 'Home' && items.length > 0) move(items[0])
                    else if (event.key === 'End' && items.length > 0) move(items[items.length - 1])
                    else if (event.key === 'ArrowRight' && branch && !expanded) toggle(current.node.id, true)
                    else if (
                        event.key === 'ArrowRight' &&
                        branch &&
                        index < items.length - 1 &&
                        items[index + 1].parent === current.node.id
                    )
                        move(items[index + 1])
                    else if (event.key === 'ArrowLeft' && branch && expanded && matches === null) toggle(current.node.id, false)
                    else if (event.key === 'ArrowLeft' && current.parent !== null) {
                        const parent = parentRow(current)
                        if (parent !== undefined) move(parent)
                    } else if (event.key === 'Enter' || event.key === ' ') choose(current)
                    else return
                    event.preventDefault()
                }}
            >
                {shown.map((row) => {
                    const indent = { paddingLeft: `calc(${row.level - 1} * 1rem + 0.25rem)` }
                    if (row.status !== undefined) {
                        return (
                            <li
                                key={`${row.node.id}:status`}
                                role="none"
                                style={indent}
                                className="flex h-8 shrink-0 items-center gap-1.5 pr-2 text-muted-foreground select-none"
                            >
                                {row.status === 'loading' ? (
                                    <>
                                        <span className="flex size-5 shrink-0 items-center justify-center">
                                            <Spinner className="size-3.5" aria-label={words.loading} />
                                        </span>
                                        <span className="truncate">{words.loading}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="size-5 shrink-0" aria-hidden />
                                        <span className="min-w-0 flex-1 truncate text-critical">{words.failed}</span>
                                        <button
                                            type="button"
                                            onClick={() => retry(row.node.id)}
                                            className="flex shrink-0 items-center gap-1 rounded-sm text-xs text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                                        >
                                            <RotateCw className="size-3.5" aria-hidden />
                                            {words.retry}
                                        </button>
                                    </>
                                )}
                            </li>
                        )
                    }
                    const branch = row.trail === undefined && isBranch(row.node, loads)
                    const expanded = matches !== null || open.has(row.node.id)
                    const isChosen = chosen.has(row.node.id)
                    return (
                        <li
                            key={row.node.id}
                            data-id={row.node.id}
                            role="treeitem"
                            aria-level={row.level}
                            aria-expanded={branch ? expanded : undefined}
                            aria-selected={selection === 'none' ? undefined : isChosen}
                            tabIndex={row === current ? 0 : -1}
                            onFocus={() => setFocus(row.node.id)}
                            onClick={() => choose(row)}
                            style={indent}
                            className={cn(
                                'flex h-8 shrink-0 cursor-default items-center gap-1.5 rounded-md pr-2 outline-none select-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                                selection === 'single' && isChosen && 'bg-primary/12 font-medium text-primary-ink hover:bg-primary/18',
                            )}
                        >
                            {branch ? (
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    aria-hidden
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        if (matches === null) toggle(row.node.id)
                                    }}
                                    className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                                >
                                    <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
                                </button>
                            ) : (
                                <span className="size-5 shrink-0" aria-hidden />
                            )}
                            {selection === 'multiple' && (
                                <Checkbox
                                    checked={isChosen}
                                    indeterminate={!isChosen && holding.has(row.node.id)}
                                    tabIndex={-1}
                                    aria-hidden
                                    className="pointer-events-none"
                                />
                            )}
                            {row.trail === undefined ? (
                                <span className="min-w-0 flex-1 truncate">
                                    <Marked text={row.node.label} query={needle} />
                                </span>
                            ) : (
                                <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                                    <span className="max-w-2/3 shrink-0 truncate">
                                        <Marked text={row.node.label} query={needle} />
                                    </span>
                                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                                        {row.trail.ancestors.map((ancestor) => ancestor.label).join(' / ')}
                                    </span>
                                </span>
                            )}
                            {row.node.meta !== undefined && (
                                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{row.node.meta}</span>
                            )}
                        </li>
                    )
                })}
            </ul>
            {note === 'searchFailed' ? (
                <div className="flex min-h-9 items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                    <span className="min-w-0 flex-1 text-critical">{words.searchFailed}</span>
                    <button
                        type="button"
                        onClick={() => setAttempt((count) => count + 1)}
                        className="flex shrink-0 items-center gap-1 rounded-sm text-xs text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                    >
                        <RotateCw className="size-3.5" aria-hidden />
                        {words.retry}
                    </button>
                </div>
            ) : note === 'searching' ? (
                <p className="flex min-h-9 items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                    <Spinner className="size-3.5" aria-label={words.searching} />
                    {words.searching}
                </p>
            ) : note === 'empty' ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">{words.empty}</p>
            ) : null}
        </>
    )
}
