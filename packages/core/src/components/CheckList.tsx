import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { cn } from '../lib/cn'

export type CheckStatus = 'ok' | 'warn' | 'fail'

/** One health check: what was checked, what it found, and what to do when it is not ok. */
export interface Check {
    name: string
    status: CheckStatus
    detail?: string
    hint?: string
    /** The name of the check this one nests under. */
    group?: string
}

/** A check with the checks nested under it. */
export interface CheckNode {
    check: Check
    children: Check[]
}

const SEVERITY: Record<CheckStatus, number> = { ok: 0, warn: 1, fail: 2 }

const DOT: Record<CheckStatus, string> = { ok: 'bg-good', warn: 'bg-warning', fail: 'bg-critical' }

/**
 * The checks as a two-level tree by each check's `group`. A check naming a group that is not in
 * the list stays at the top level rather than being dropped, and the order is the order given.
 */
export function checkTree(checks: readonly Check[]): CheckNode[] {
    const names = new Set(checks.map((check) => check.name))
    const nested = (check: Check) => check.group !== undefined && check.group !== check.name && names.has(check.group)
    const nodes = checks.filter((check) => !nested(check)).map((check) => ({ check, children: [] as Check[] }))
    const byName = new Map(nodes.map((node) => [node.check.name, node]))
    for (const check of checks) if (nested(check)) byName.get(check.group as string)?.children.push(check)
    return nodes
}

/** The worst status among some checks, `ok` for none. */
export function worstStatus(checks: readonly Check[]): CheckStatus {
    return checks.reduce<CheckStatus>((worst, check) => (SEVERITY[check.status] > SEVERITY[worst] ? check.status : worst), 'ok')
}

function Line({ check, status }: { check: Check; status: CheckStatus }) {
    return (
        <>
            <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[status])} aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-sm">{check.name}</span>
                {check.detail !== undefined && <span className="text-xs break-words text-muted-foreground">{check.detail}</span>}
                {check.hint !== undefined && <span className="text-xs break-words text-warning-ink">{check.hint}</span>}
            </span>
        </>
    )
}

function Group({ node }: { node: CheckNode }) {
    const status = worstStatus([node.check, ...node.children])
    const [open, setOpen] = useState(status !== 'ok')
    return (
        <li>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                className="flex w-full items-start gap-2.5 px-3 py-2 outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
                <Line check={node.check} status={status} />
                <ChevronRight
                    className={cn('mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
                    aria-hidden
                />
            </button>
            {open && (
                <ul className="ml-[17px] border-l border-border">
                    {node.children.map((child) => (
                        <li key={child.name} className="flex items-start gap-2.5 px-3 py-1.5">
                            <Line check={child} status={child.status} />
                        </li>
                    ))}
                </ul>
            )}
        </li>
    )
}

export interface CheckListProps {
    checks: readonly Check[]
    className?: string
}

/**
 * A health report: each check with its verdict as a dot, its finding, and a hint when it needs
 * attention. A check with checks under it wears the worst of them and opens to show them; one
 * that is not ok starts open.
 */
export function CheckList({ checks, className }: CheckListProps) {
    return (
        <ul className={cn('flex flex-col', className)}>
            {checkTree(checks).map((node) =>
                node.children.length > 0 ? (
                    <Group key={node.check.name} node={node} />
                ) : (
                    <li key={node.check.name} className="flex items-start gap-2.5 px-3 py-2">
                        <Line check={node.check} status={node.check.status} />
                    </li>
                ),
            )}
        </ul>
    )
}
