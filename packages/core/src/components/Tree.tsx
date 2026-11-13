import { ChevronRight, Ellipsis, RotateCw, type LucideIcon } from 'lucide-react'
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
    type TouchEvent as ReactTouchEvent,
} from 'react'

import { cn } from '../lib/cn'
import type { DataAction } from './DataTable'
import type { DragData } from './DragDrop'
import type { TreeDropAt } from './tree-drag'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from './ui/context-menu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
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
    /** An icon before the label, such as a folder or a file. */
    icon?: LucideIcon
    /** The icon an open branch shows in place of `icon`, such as an open folder. */
    openIcon?: LucideIcon
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
    /** The button at a row's end that opens its menu. */
    actions: string
    loading: string
    failed: string
    retry: string
    searching: string
    searchFailed: string
    empty: string
    /** Said to a screen reader once a row is moved from the keyboard: where it went, its place counted from 1. */
    moved: (item: string, into: string, place: number, count: number) => string
    /** What `moved` calls the top level. */
    topLevel: string
}

const WORDS: TreeWords = {
    actions: 'Actions',
    loading: 'Loading',
    failed: 'This level did not load.',
    retry: 'Try again',
    searching: 'Searching',
    searchFailed: 'The search did not answer.',
    empty: 'Nothing matches.',
    moved: (item, into, place, count) => `${item} moved to ${String(place)} of ${String(count)} in ${into}`,
    topLevel: 'the top level',
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

/** Where a row is held over another: before it, after it, or inside it (a branch only). */
export type TreeDropPart = 'before' | 'after' | 'inside'

/**
 * Which part of a row a point at `y` is in, given the row's top and height: a branch takes its
 * middle half as inside and its quarters as before and after; a leaf splits at its middle.
 */
export function dropPart(y: number, top: number, height: number, branch: boolean): TreeDropPart {
    const at = height > 0 ? (y - top) / height : 0.5
    if (!branch) return at < 0.5 ? 'before' : 'after'
    return at < 0.25 ? 'before' : at > 0.75 ? 'after' : 'inside'
}

/** The children of a branch, or the top level for null, as far as they are known. */
export function treeLevel(nodes: readonly TreeNode[], into: string | null, loads: TreeLoads = NO_LOADS): readonly TreeNode[] | undefined {
    if (into === null) return nodes
    const visit = (list: readonly TreeNode[]): readonly TreeNode[] | undefined | null => {
        for (const node of list) {
            if (node.id === into) return childrenOf(node, loads) ?? (node.hasChildren === true ? undefined : [])
            const found = visit(childrenOf(node, loads) ?? [])
            if (found !== null) return found
        }
        return null
    }
    return visit(nodes) ?? undefined
}

/** A node's parent (null for the top level) and its place among its parent's children, or null when the loaded tree does not hold it. */
export function treePlace(
    nodes: readonly TreeNode[],
    id: string,
    loads: TreeLoads = NO_LOADS,
): { parent: string | null; index: number } | null {
    const above = treeAncestors(nodes, id, loads)
    if (above === null) return null
    const parent = above[above.length - 1] ?? null
    const index = (treeLevel(nodes, parent, loads) ?? []).findIndex((node) => node.id === id)
    return { parent, index }
}

/**
 * The order an app keeps a tree's levels in, beyond the order the reader gives them. `band` names
 * the run of rows a node keeps to in its level, such as folders before notes: a node is put only
 * among the rows of its own band, a place beside a row of another band is not offered, and every
 * place is counted among its band alone. `sorted` says the app sorts each band itself, by name or
 * by date: a node then goes only into a branch or to the top level, never beside a row, and never
 * back into the level it is in.
 */
export interface TreeOrder {
    band?: (node: TreeNode) => string
    sorted?: boolean
}

/** Where a node lands: the branch it goes into (null for the top level) and its place among the children it joins, counted without it. */
export interface TreeTarget {
    into: string | null
    index: number
}

/** The node with `id`, as far as the tree is loaded. */
export function treeNode(nodes: readonly TreeNode[], id: string, loads: TreeLoads = NO_LOADS): TreeNode | undefined {
    for (const node of nodes) {
        if (node.id === id) return node
        const found = treeNode(childrenOf(node, loads) ?? [], id, loads)
        if (found !== undefined) return found
    }
    return undefined
}

/** The rows of a level a node is counted among: the others of its band, or every other without a band. */
function peers(level: readonly TreeNode[], id: string | null, band: string | undefined, order: TreeOrder | undefined): TreeNode[] {
    return level.filter((node) => node.id !== id && (band === undefined || order?.band?.(node) === band))
}

/** The band of the node with `id` under `order`, undefined without one. */
function bandOf(nodes: readonly TreeNode[], id: string | null, order: TreeOrder | undefined, loads: TreeLoads): string | undefined {
    if (id === null || order?.band === undefined) return undefined
    const node = treeNode(nodes, id, loads)
    return node === undefined ? undefined : order.band(node)
}

/**
 * Where a node dropped on a part of a row lands: at the end of the row's branch, or beside the row
 * in the row's own level. `id` is the node moved, left out of the count, or null for a thing from
 * outside the tree. Under an `order` the place is counted among the node's band, and a place beside
 * a row of another band, or beside any row in a sorted tree, is undefined. Undefined too when the
 * level is not loaded.
 */
export function treeTarget(
    nodes: readonly TreeNode[],
    id: string | null,
    row: Pick<TreeRow, 'node' | 'parent'>,
    part: TreeDropPart,
    loads: TreeLoads = NO_LOADS,
    order?: TreeOrder,
): TreeTarget | undefined {
    const into = part === 'inside' ? row.node.id : row.parent
    const level = treeLevel(nodes, into, loads)
    if (level === undefined) return part === 'inside' ? { into, index: 0 } : undefined
    const others = peers(level, id, bandOf(nodes, id, order, loads), order)
    if (part === 'inside') return { into, index: others.length }
    if (order?.sorted === true) return undefined
    const at = others.findIndex((node) => node.id === row.node.id)
    return at === -1 ? undefined : { into, index: part === 'before' ? at : at + 1 }
}

/** Where a node dropped on the tree's own ground lands: at the top level's end, among its band under an `order`. */
export function treeTopTarget(nodes: readonly TreeNode[], id: string | null, loads: TreeLoads = NO_LOADS, order?: TreeOrder): TreeTarget {
    return { into: null, index: peers(nodes, id, bandOf(nodes, id, order, loads), order).length }
}

/** A node's parent and its place among its parent's children, counted among its band under an `order`. */
function placeIn(nodes: readonly TreeNode[], id: string, loads: TreeLoads, order: TreeOrder | undefined) {
    const place = treePlace(nodes, id, loads)
    const band = bandOf(nodes, id, order, loads)
    if (place === null || band === undefined) return place
    const level = treeLevel(nodes, place.parent, loads) ?? []
    return { parent: place.parent, index: peers(level, null, band, order).findIndex((node) => node.id === id) }
}

/**
 * Whether a node may be moved to a place: never into itself or below itself, and never to where it
 * already is. A place in its own level reorders it, save in a sorted tree, where it changes nothing.
 */
export function canMoveTo(
    nodes: readonly TreeNode[],
    id: string,
    target: TreeTarget,
    loads: TreeLoads = NO_LOADS,
    order?: TreeOrder,
): boolean {
    if (target.into === id) return false
    const place = placeIn(nodes, id, loads, order)
    if (place === null) return false
    if (target.into !== null && (treeAncestors(nodes, target.into, loads) ?? []).includes(id)) return false
    if (order?.sorted === true && place.parent === target.into) return false
    return !(place.parent === target.into && place.index === target.index)
}

/** The way a key moves a node: a place up or down its level, into the branch above it, or out beside its parent. */
export type TreeKeyMove = 'up' | 'down' | 'in' | 'out'

/**
 * Where a node goes on a key, or undefined when it cannot go that way. Under an `order` it steps
 * among its band, goes in at its band's end, and out beside its parent when they share a band, else
 * to its band's start; in a sorted tree it only goes in and out, at its band's end.
 */
export function treeKeyTarget(
    nodes: readonly TreeNode[],
    id: string,
    by: TreeKeyMove,
    loads: TreeLoads = NO_LOADS,
    order?: TreeOrder,
): TreeTarget | undefined {
    const whole = treePlace(nodes, id, loads)
    const place = placeIn(nodes, id, loads, order)
    if (whole === null || place === null || whole.index === -1) return undefined
    const sorted = order?.sorted === true
    const band = bandOf(nodes, id, order, loads)
    const level = treeLevel(nodes, place.parent, loads) ?? []
    const count = peers(level, null, band, order).length
    if (by === 'up') return !sorted && place.index > 0 ? { into: place.parent, index: place.index - 1 } : undefined
    if (by === 'down') return !sorted && place.index < count - 1 ? { into: place.parent, index: place.index + 1 } : undefined
    if (by === 'in') {
        const above = level[whole.index - 1]
        const inside = above === undefined || !isBranch(above, loads) ? undefined : childrenOf(above, loads)
        return above === undefined || inside === undefined ? undefined : { into: above.id, index: peers(inside, id, band, order).length }
    }
    if (place.parent === null) return undefined
    const parent = placeIn(nodes, place.parent, loads, order)
    if (parent === null) return undefined
    if (sorted) return { into: parent.parent, index: peers(treeLevel(nodes, parent.parent, loads) ?? [], id, band, order).length }
    const above = treeNode(nodes, place.parent, loads)
    const together = band === undefined || (above !== undefined && order?.band?.(above) === band)
    return { into: parent.parent, index: together ? parent.index + 1 : 0 }
}

/**
 * The tree with the node `id` moved to `target`, for an app that holds its tree whole: taken from
 * where it is and put among the target's children at its place. A target that held no children
 * gets them.
 */
export function moveTreeNode(nodes: readonly TreeNode[], id: string, target: TreeTarget): TreeNode[] {
    let moved: TreeNode | undefined
    const without = (list: readonly TreeNode[]): TreeNode[] =>
        list.flatMap((node) => {
            if (node.id === id) {
                moved = node
                return []
            }
            return node.children === undefined ? [node] : [{ ...node, children: without(node.children) }]
        })
    const rest = without(nodes)
    if (moved === undefined) return [...nodes]
    const node = moved
    const put = (list: readonly TreeNode[]) => {
        const next = [...list]
        next.splice(Math.max(0, Math.min(target.index, list.length)), 0, node)
        return next
    }
    if (target.into === null) return put(rest)
    const into = (list: readonly TreeNode[]): TreeNode[] =>
        list.map((each) =>
            each.id === target.into
                ? { ...each, children: put(each.children ?? []) }
                : each.children === undefined
                  ? each
                  : { ...each, children: into(each.children) },
        )
    return into(rest)
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

/** A closed branch a row is dragged over opens after this many milliseconds, so a row can be moved deep in one drag. */
const OPEN_AFTER = 600

/** What a row's menu offers, from its button or a right-click. */
function MenuItems({ actions, kind }: { actions: readonly DataAction[]; kind: 'dropdown' | 'context' }) {
    const Item = kind === 'dropdown' ? DropdownMenuItem : ContextMenuItem
    const Separator = kind === 'dropdown' ? DropdownMenuSeparator : ContextMenuSeparator
    return actions.map((action) =>
        'separator' in action ? (
            <Separator key={action.id} />
        ) : (
            <Item
                key={action.id}
                variant={action.destructive === true ? 'destructive' : 'default'}
                disabled={action.disabled}
                // The press does the item's work alone, never the row's choice.
                onClick={(event) => {
                    event.stopPropagation()
                    action.onSelect()
                }}
            >
                {action.icon}
                {action.label}
            </Item>
        ),
    )
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
    /** What a row's menu offers, opened from a button at its end or a right-click: rename, move, delete. */
    actions?: (node: TreeNode) => DataAction[] | undefined
    /**
     * Lets a row be moved: dragged into a branch or beside any row, to reorder its level, or moved
     * from the keyboard with Alt (Option) and the arrows. Hears the node, the branch it goes into
     * (null for the top level), and its place among the children it joins, counted without it;
     * `moveTreeNode` applies it to a tree held whole.
     */
    onMove?: (id: string, into: string | null, index: number) => void
    /** Whether a node may go into a branch or the top level, beyond the tree's own rule that nothing goes into itself. */
    canMove?: (id: string, into: string | null) => boolean
    /**
     * Takes things dragged from another part inside the same `DragDrop`, such as a list's rows,
     * dropped into a branch or beside a row: the thing's data, the branch (null for the top level)
     * and the place among its children.
     */
    onDrop?: (drag: DragData, into: string | null, index: number) => void
    /** Which things from outside the tree `onDrop` and `nodeOf` take; every one without it. */
    accepts?: (drag: DragData) => boolean
    /**
     * Which of the tree's own nodes a thing dragged from another part is, such as a note listed beside
     * the tree: let go on the tree, it moves that node through `onMove`, counted out of its own level
     * as a dragged row is, in place of reaching `onDrop`.
     */
    nodeOf?: (drag: DragData) => string | undefined
    /**
     * The order the app keeps each level in, such as folders before notes (`band`) or sorted by name
     * (`sorted`): `onMove` then counts a place among the node's band, and a place the app's
     * order would not keep is never offered.
     */
    order?: TreeOrder
    /**
     * Why a node cannot be chosen, such as a place outside a form's assignment, or `undefined` when
     * it can. Such a row is drawn shut: quiet, with the reason at its end, never chosen, though a
     * branch still opens to what is under it.
     */
    unavailable?: (node: TreeNode) => string | undefined
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
 *
 * As a file tree, each node takes an `icon` (an open branch its `openIcon`), `actions` puts a menu
 * on each row, opened from a button at its end or a right-click, and `onMove` lets a row be dragged
 * into a branch (its middle) or beside a row (its upper or lower edge), a line showing where it
 * lands and a closed branch opening as a row is held over it. From the keyboard, Alt (Option) with
 * the up and down arrows moves the focused row a place in its level, with the right arrow into the
 * branch above it and with the left arrow out beside its parent. A node never goes into itself or
 * below itself, and `canMove` refuses more. Inside a `DragDrop` drawn around other parts, `onDrop`
 * takes their things, such as a list's files dropped into a folder, and `nodeOf` moves the node a
 * thing from another part stands for. An app that keeps its own order in each level, folders before
 * files or every level by name, says so in `order`, so places are counted in its terms and a drop
 * its order would undo is never offered.
 *
 * `unavailable` shuts the rows a reader may not choose and says why on each, such as the places
 * outside what a form is assigned to; their branches still open to the rows under them.
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
    actions,
    onMove,
    canMove,
    onDrop,
    accepts,
    nodeOf,
    order,
    unavailable,
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
    const [dropAt, setDropAt] = useState<TreeDropAt | undefined>(undefined)
    const show = useCallback(
        (at: TreeDropAt | undefined) => setDropAt((now) => (now?.id === at?.id && now?.part === at?.part ? now : at)),
        [],
    )
    const opening = useRef<{ id: string; timer: number } | null>(null)
    const stopOpening = () => {
        if (opening.current !== null) window.clearTimeout(opening.current.timer)
        opening.current = null
    }
    useEffect(() => stopOpening, [])
    /** A closed branch a row is held inside opens after a moment; null lets go of it. */
    const hold = (id: string | null) => {
        if (id === null || matches !== null || open.has(id)) return stopOpening()
        if (opening.current?.id === id) return
        stopOpening()
        opening.current = { id, timer: window.setTimeout(() => toggle(id, true), OPEN_AFTER) }
    }
    const drag = useTreeDrag(onMove !== undefined || onDrop !== undefined)
    const [said, setSaid] = useState('')
    /** Moves the focused row by a key, the focus staying on it. */
    const keyMove = (row: TreeRow, by: TreeKeyMove) => {
        if (onMove === undefined || row.trail !== undefined || matches !== null) return false
        const id = row.node.id
        const target = treeKeyTarget(nodes, id, by, loads, order)
        if (target === undefined || !canMoveTo(nodes, id, target, loads, order) || canMove?.(id, target.into) === false) return true
        if (target.into !== null) toggle(target.into, true)
        pendingFocus.current = id
        onMove(id, target.into, target.index)
        const band = order?.band?.(row.node)
        const level = (treeLevel(nodes, target.into, loads) ?? []).filter((node) => band === undefined || order?.band?.(node) === band)
        const count = level.some((node) => node.id === id) ? level.length : level.length + 1
        const parent =
            target.into === null ? words.topLevel : (items.find((each) => each.node.id === target.into)?.node.label ?? target.into)
        setSaid(words.moved(row.node.label, parent, target.index + 1, count))
        return true
    }

    const choose = (row: TreeRow) => {
        const id = row.node.id
        if (row.trail !== undefined) {
            const trail = row.trail
            setSeen((now) => new Map(now).set(id, trail))
            setOpen((now) => new Set([...now, ...trail.ancestors.map((ancestor) => ancestor.id)]))
            setReveal(id)
        }
        if (selection === 'none' || onSelect === undefined) return
        if (unavailable?.(row.node) !== undefined && !chosen.has(id)) return
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

    const tree = (root?: (element: HTMLElement | null) => void) => (
        <>
            <ul
                ref={(element) => {
                    list.current = element
                    root?.(element)
                }}
                role="tree"
                aria-label={label}
                aria-multiselectable={selection === 'multiple' || undefined}
                aria-busy={(remote && found?.state === 'loading') || undefined}
                data-drop={dropAt?.id === null ? '' : undefined}
                className={cn('flex flex-col text-sm', dropAt?.id === null && 'rounded-md ring-2 ring-ring ring-inset', className)}
                style={virtual ? { height: rows.length * rowHeight, paddingTop: first * rowHeight } : undefined}
                onKeyDown={(event) => {
                    if (current === undefined || !(event.target as HTMLElement).matches('[role="treeitem"]')) return
                    const index = items.indexOf(current)
                    const branch = current.trail === undefined && isBranch(current.node, loads)
                    const expanded = matches !== null || open.has(current.node.id)
                    if (event.altKey && event.key.startsWith('Arrow') && onMove !== undefined) {
                        const by = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowRight: 'in', ArrowLeft: 'out' } as const)[event.key]
                        if (by === undefined || !keyMove(current, by)) return
                    } else if (event.key === 'ArrowDown' && index < items.length - 1) move(items[index + 1])
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
                    const shut = unavailable?.(row.node)
                    const menu = actions?.(row.node)
                    const Icon = branch && expanded ? (row.node.openIcon ?? row.node.icon) : row.node.icon
                    const movable = onMove !== undefined && row.trail === undefined
                    const at = dropAt?.id === row.node.id ? dropAt.part : undefined
                    const draw = (dragProps: TreeRowDragProps = {}) => (
                        <li
                            key={row.node.id}
                            {...dragProps}
                            data-id={row.node.id}
                            data-drop={at}
                            role="treeitem"
                            aria-level={row.level}
                            aria-expanded={branch ? expanded : undefined}
                            aria-selected={selection === 'none' ? undefined : isChosen}
                            aria-disabled={shut !== undefined || undefined}
                            tabIndex={row === current ? 0 : -1}
                            onFocus={() => setFocus(row.node.id)}
                            onClick={() => choose(row)}
                            style={indent}
                            className={cn(
                                'group/row relative flex h-8 shrink-0 cursor-default items-center gap-1.5 rounded-md pr-2 outline-none select-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                                selection === 'single' && isChosen && 'bg-primary/12 font-medium text-primary-ink hover:bg-primary/18',
                                at === 'inside' && 'ring-2 ring-ring ring-inset',
                                dragProps['data-dragging'] === true && 'opacity-40',
                                menu !== undefined && 'pr-1',
                                shut !== undefined && !isChosen && 'text-muted-foreground',
                            )}
                        >
                            {(at === 'before' || at === 'after') && (
                                <span
                                    aria-hidden
                                    style={{ left: indent.paddingLeft }}
                                    className={cn(
                                        'pointer-events-none absolute right-0 h-0.5 rounded-full bg-primary',
                                        at === 'before' ? '-top-px' : '-bottom-px',
                                    )}
                                />
                            )}
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
                            {Icon !== undefined && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                            {selection === 'multiple' && (
                                <Checkbox
                                    checked={isChosen}
                                    indeterminate={!isChosen && holding.has(row.node.id)}
                                    disabled={shut !== undefined && !isChosen}
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
                            {shut !== undefined && (
                                <span title={shut} className="max-w-1/2 min-w-0 shrink truncate text-xs text-muted-foreground">
                                    {shut}
                                </span>
                            )}
                            {row.node.meta !== undefined && (
                                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{row.node.meta}</span>
                            )}
                            {menu !== undefined && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                tabIndex={-1}
                                                aria-label={words.actions}
                                                className="shrink-0 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
                                            />
                                        }
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <Ellipsis aria-hidden />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <MenuItems actions={menu} kind="dropdown" />
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </li>
                    )
                    const item =
                        drag === undefined || row.trail !== undefined ? (
                            draw()
                        ) : (
                            <drag.TreeDragRow key={row.node.id} row={row} movable={movable}>
                                {draw}
                            </drag.TreeDragRow>
                        )
                    if (menu === undefined) return item
                    return (
                        <ContextMenu key={row.node.id}>
                            <ContextMenuTrigger render={item} />
                            <ContextMenuContent className="w-48">
                                <MenuItems actions={menu} kind="context" />
                            </ContextMenuContent>
                        </ContextMenu>
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
            {onMove !== undefined && (
                <span aria-live="polite" className="sr-only">
                    {said}
                </span>
            )}
        </>
    )
    if (drag === undefined) return tree()
    return (
        <drag.TreeDragArea
            nodes={nodes}
            loads={loads}
            label={label}
            searching={matches !== null}
            onMove={onMove}
            canMove={canMove}
            onDrop={onDrop}
            accepts={accepts}
            nodeOf={nodeOf}
            order={order}
            show={show}
            hold={hold}
        >
            {tree}
        </drag.TreeDragArea>
    )
}

/** What a row takes from the drag layer: its element, the press that starts a drag, and whether it is dragged now. */
export interface TreeRowDragProps {
    ref?: (element: HTMLElement | null) => void
    onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void
    onTouchStart?: (event: ReactTouchEvent<HTMLElement>) => void
    'data-dragging'?: true
}

type TreeDragModule = typeof import('./tree-drag')
let treeDrag: TreeDragModule | undefined
let treeDragLoad: Promise<TreeDragModule> | undefined

/** The tree's drag layer, fetched the first time a tree that moves rows is drawn, so a tree that only picks never carries the drag engine. */
function useTreeDrag(wanted: boolean): TreeDragModule | undefined {
    const [loaded, setLoaded] = useState(treeDrag)
    useEffect(() => {
        if (!wanted || loaded !== undefined) return
        let live = true
        treeDragLoad ??= import('./tree-drag').then(
            (module) => (treeDrag = module),
            (error: unknown) => {
                treeDragLoad = undefined
                throw error
            },
        )
        treeDragLoad.then(
            (module) => {
                if (live) setLoaded(module)
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [wanted, loaded])
    return wanted ? (loaded ?? treeDrag) : undefined
}
