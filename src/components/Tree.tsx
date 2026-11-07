import { ChevronRight } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Checkbox } from './ui/checkbox'

/** One node of a tree: what it answers with, what it is called, and what is under it. */
export interface TreeNode {
    id: string
    label: string
    /** A short fact at the row's right end: a count, a code. */
    meta?: ReactNode
    children?: readonly TreeNode[]
}

/** A visible row: the node, how deep it is, and whether it has children. */
interface Row {
    node: TreeNode
    level: number
    parent: string | null
}

/** The ids of every node whose label or one of whose descendants' labels matches the query, with their ancestors. */
export function treeMatches(nodes: readonly TreeNode[], query: string): Set<string> {
    const needle = query.trim().toLowerCase()
    const keep = new Set<string>()
    const visit = (node: TreeNode, path: string[]): boolean => {
        const own = node.label.toLowerCase().includes(needle)
        let below = false
        for (const child of node.children ?? []) below = visit(child, [...path, node.id]) || below
        if (own || below) {
            keep.add(node.id)
            for (const id of path) keep.add(id)
        }
        return own || below
    }
    for (const node of nodes) visit(node, [])
    return keep
}

/** The ids of every node with a chosen node somewhere under it. */
export function treeHolding(nodes: readonly TreeNode[], chosen: ReadonlySet<string>): Set<string> {
    const out = new Set<string>()
    const visit = (node: TreeNode): boolean => {
        let below = false
        for (const child of node.children ?? []) below = visit(child) || below
        if (below) out.add(node.id)
        return below || chosen.has(node.id)
    }
    for (const node of nodes) visit(node)
    return out
}

/** The rows a reader sees: the open nodes' children in order, or every match and its ancestors while searching. */
export function visibleRows(nodes: readonly TreeNode[], open: ReadonlySet<string>, matches: ReadonlySet<string> | null): Row[] {
    const rows: Row[] = []
    const walk = (list: readonly TreeNode[], level: number, parent: string | null) => {
        for (const node of list) {
            if (matches !== null && !matches.has(node.id)) continue
            rows.push({ node, level, parent })
            const children = node.children ?? []
            if (children.length > 0 && (matches !== null || open.has(node.id))) walk(children, level + 1, node.id)
        }
    }
    walk(nodes, 1, null)
    return rows
}

function Marked({ text, query }: { text: string; query: string }) {
    const at = query === '' ? -1 : text.toLowerCase().indexOf(query.toLowerCase())
    if (at === -1) return <>{text}</>
    return (
        <>
            {text.slice(0, at)}
            <mark className="rounded-[2px] bg-primary/25 text-foreground">{text.slice(at, at + query.length)}</mark>
            {text.slice(at + query.length)}
        </>
    )
}

/**
 * A hierarchy a reader opens a level at a time: regions, folders, teams. The arrows move through
 * the visible rows, Right opens and Left closes or climbs to the parent, Enter or Space chooses.
 * While `query` is set, every match is shown under its ancestors with the match marked.
 *
 * `selection` is `single` (choose one row), `multiple` (a checkbox per row), or `none`.
 */
export function Tree({
    nodes,
    selection = 'single',
    selected = [],
    onSelect,
    query = '',
    defaultOpen = [],
    label,
    className,
}: {
    nodes: readonly TreeNode[]
    selection?: 'single' | 'multiple' | 'none'
    selected?: readonly string[]
    onSelect?: (ids: string[]) => void
    query?: string
    defaultOpen?: readonly string[]
    /** What the tree is, for a screen reader. */
    label: string
    className?: string
}) {
    const [open, setOpen] = useState<Set<string>>(() => new Set(defaultOpen))
    const matches = useMemo(() => (query.trim() === '' ? null : treeMatches(nodes, query)), [nodes, query])
    const rows = useMemo(() => visibleRows(nodes, open, matches), [nodes, open, matches])
    const [focus, setFocus] = useState<string | null>(null)
    const list = useRef<HTMLUListElement>(null)
    const chosen = new Set(selected)
    const holding = useMemo(
        () => (selection === 'multiple' ? treeHolding(nodes, new Set(selected)) : new Set<string>()),
        [nodes, selected, selection],
    )
    const current = rows.find((row) => row.node.id === focus) ?? rows[0]

    const toggle = (id: string, to?: boolean) =>
        setOpen((now) => {
            const next = new Set(now)
            if (to ?? !next.has(id)) next.add(id)
            else next.delete(id)
            return next
        })
    const choose = (id: string) => {
        if (selection === 'none' || onSelect === undefined) return
        if (selection === 'single') onSelect([id])
        else onSelect(chosen.has(id) ? selected.filter((each) => each !== id) : [...selected, id])
    }
    const move = (id: string) => {
        setFocus(id)
        list.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)?.focus()
    }

    return (
        <ul
            ref={list}
            role="tree"
            aria-label={label}
            aria-multiselectable={selection === 'multiple' || undefined}
            className={cn('flex flex-col text-sm', className)}
            onKeyDown={(event) => {
                if (current === undefined) return
                const index = rows.indexOf(current)
                const hasChildren = (current.node.children?.length ?? 0) > 0
                const expanded = matches !== null || open.has(current.node.id)
                if (event.key === 'ArrowDown' && index < rows.length - 1) move(rows[index + 1].node.id)
                else if (event.key === 'ArrowUp' && index > 0) move(rows[index - 1].node.id)
                else if (event.key === 'Home') move(rows[0].node.id)
                else if (event.key === 'End') move(rows[rows.length - 1].node.id)
                else if (event.key === 'ArrowRight' && hasChildren && !expanded) toggle(current.node.id, true)
                else if (event.key === 'ArrowRight' && hasChildren && index < rows.length - 1) move(rows[index + 1].node.id)
                else if (event.key === 'ArrowLeft' && hasChildren && expanded && matches === null) toggle(current.node.id, false)
                else if (event.key === 'ArrowLeft' && current.parent !== null) move(current.parent)
                else if (event.key === 'Enter' || event.key === ' ') choose(current.node.id)
                else return
                event.preventDefault()
            }}
        >
            {rows.map((row) => {
                const children = row.node.children ?? []
                const expanded = matches !== null || open.has(row.node.id)
                const isChosen = chosen.has(row.node.id)
                return (
                    <li
                        key={row.node.id}
                        data-id={row.node.id}
                        role="treeitem"
                        aria-level={row.level}
                        aria-expanded={children.length > 0 ? expanded : undefined}
                        aria-selected={selection === 'none' ? undefined : isChosen}
                        tabIndex={row === current ? 0 : -1}
                        onFocus={() => setFocus(row.node.id)}
                        onClick={() => choose(row.node.id)}
                        style={{ paddingLeft: `calc(${row.level - 1} * 1rem + 0.25rem)` }}
                        className={cn(
                            'flex h-8 cursor-default items-center gap-1.5 rounded-md pr-2 outline-none select-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                            selection === 'single' && isChosen && 'bg-primary/12 font-medium text-primary-ink hover:bg-primary/18',
                        )}
                    >
                        {children.length > 0 ? (
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
                        <span className="min-w-0 flex-1 truncate">
                            <Marked text={row.node.label} query={query.trim()} />
                        </span>
                        {row.node.meta !== undefined && (
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{row.node.meta}</span>
                        )}
                    </li>
                )
            })}
        </ul>
    )
}
