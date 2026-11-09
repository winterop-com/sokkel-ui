import { Lock } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { TABLE_HEAD_TEXT } from '../lib/table'
import { DataTable, type DataColumn } from './DataTable'
import { Checkbox } from './ui/checkbox'
import { NativeSelect, NativeSelectOption } from './ui/native-select'

/** One role, a column of the matrix. A locked role is built in, and its column is read-only. */
export interface MatrixRole {
    id: string
    label: string
    /** The role's code, drawn in the code face under the label when it differs from it. */
    code?: string
    locked?: boolean
    /** A quiet line under the role's label, such as how many members hold it. */
    note?: ReactNode
}

/** One permission, a row of the matrix. */
export interface MatrixPermission {
    id: string
    label: string
    /** The permission's key, drawn in the code face beside its label. */
    code?: string
    description?: string
}

/** A titled run of rows: every permission over one kind of thing. */
export interface MatrixGroup {
    id: string
    label: string
    permissions: readonly MatrixPermission[]
}

/** The permissions each role holds, by role id. */
export type Grants = Readonly<Record<string, readonly string[]>>

export interface PermissionMatrixWords {
    permission: string
    /** The picker's name when one role shows at a time. */
    role: string
    builtIn: string
    changed: string
    toggle: (permission: string, role: string) => string
    held: (granted: number, total: number) => string
}

const WORDS: PermissionMatrixWords = {
    permission: 'Permission',
    role: 'Role',
    builtIn: 'Built in, read-only',
    changed: 'Changed',
    toggle: (permission, role) => `${permission} for ${role}`,
    held: (granted, total) => `${String(granted)} of ${String(total)}`,
}

const has = (grants: Grants | undefined, role: string, permission: string) => grants?.[role]?.includes(permission) === true

/** How many cells differ between two sets of grants, over the given roles and groups. */
export function countChanges(value: Grants, saved: Grants, roles: readonly MatrixRole[], groups: readonly MatrixGroup[]): number {
    let count = 0
    for (const role of roles)
        for (const group of groups)
            for (const permission of group.permissions)
                if (has(value, role.id, permission.id) !== has(saved, role.id, permission.id)) count += 1
    return count
}

export interface PermissionMatrixProps {
    roles: readonly MatrixRole[]
    groups: readonly MatrixGroup[]
    value: Grants
    /** The grants as last saved; cells that differ from it are marked. */
    saved?: Grants
    onChange?: (role: string, permission: string, granted: boolean) => void
    className?: string
    words?: Partial<PermissionMatrixWords>
}

/** One row of the matrix as the table holds it: a permission and the group it sits in. */
interface MatrixLine {
    permission: MatrixPermission
    group: string
}

/**
 * Roles against permissions as a grid of checkboxes, drawn by `DataTable`: a column per role, a
 * row per permission, the rows grouped by what they act on, each group's head counting what every
 * role holds of it and folding the group.
 *
 * A locked role is built in: its column is drawn with a lock and its boxes are read-only. Given
 * `saved`, a box that differs from it is marked as changed, so unsaved edits show where they are.
 * When the box is too narrow for every role's column, it shows one role at a time with a picker
 * above to choose which, so a phone reads one column instead of scrolling through all of them.
 */
export function PermissionMatrix({ roles, groups, value, saved, onChange, className, words: given }: PermissionMatrixProps) {
    const words = { ...WORDS, ...given }
    // One role at a time once the permission column and every role's column no longer fit.
    const box = useRef<HTMLDivElement>(null)
    const [width, setWidth] = useState(1200)
    useLayoutEffect(() => {
        const element = box.current
        if (element === null) return
        const update = () => setWidth(element.clientWidth)
        update()
        const observer = new ResizeObserver(update)
        observer.observe(element)
        return () => observer.disconnect()
    }, [])
    const rem = typeof document === 'undefined' ? 16 : Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const one = roles.length > 1 && width < (11 + roles.length * 7) * rem
    const [picked, setPicked] = useState(roles[0]?.id ?? '')
    const shown = one ? roles.filter((role) => role.id === picked).slice(0, 1) : roles
    const lines = useMemo(
        () => groups.flatMap((group) => group.permissions.map((permission): MatrixLine => ({ permission, group: group.id }))),
        [groups],
    )
    const labels = useMemo(() => new Map(groups.map((group) => [group.id, group.label])), [groups])
    const columns: DataColumn<MatrixLine>[] = [
        {
            id: 'permission',
            header: words.permission,
            width: 'minmax(11rem,1fr)',
            cell: ({ permission }) => (
                <span className="flex min-w-0 flex-col">
                    <span className="flex min-w-0 items-baseline gap-2">
                        <span className="truncate">{permission.label}</span>
                        {permission.code !== undefined && (
                            <span className="hidden truncate font-mono text-xs text-faint md:inline">{permission.code}</span>
                        )}
                    </span>
                    {permission.description !== undefined && (
                        <span className="truncate text-xs text-muted-foreground">{permission.description}</span>
                    )}
                </span>
            ),
        },
        ...shown.map((role): DataColumn<MatrixLine> => {
            const locked = role.locked === true
            const changed = ({ permission }: MatrixLine) =>
                saved !== undefined && has(value, role.id, permission.id) !== has(saved, role.id, permission.id)
            return {
                id: `role:${role.id}`,
                header: role.label,
                head: (
                    <span className="flex min-w-0 flex-col items-center text-center">
                        <span className="flex max-w-full items-center justify-center gap-1">
                            {locked && (
                                <span title={words.builtIn} className="inline-flex text-faint">
                                    <Lock className="size-3 shrink-0" aria-hidden />
                                    <span className="sr-only">{words.builtIn}</span>
                                </span>
                            )}
                            <span className="truncate">{role.label}</span>
                        </span>
                        {role.code !== undefined && role.code !== role.label && (
                            <span className="max-w-full truncate font-mono text-xs font-normal text-muted-foreground normal-case">
                                {role.code}
                            </span>
                        )}
                        {role.note !== undefined && (
                            <span className="max-w-full truncate text-xs font-normal text-muted-foreground normal-case">{role.note}</span>
                        )}
                    </span>
                ),
                width: 'minmax(6rem,7rem)',
                align: 'center',
                fill: (line) => (changed(line) ? { color: 'var(--warning)' } : undefined),
                aggregate: (rows) => (
                    <span className="text-xs font-normal text-muted-foreground">
                        {words.held(rows.filter(({ permission }) => has(value, role.id, permission.id)).length, rows.length)}
                    </span>
                ),
                cell: (line) => {
                    const { permission } = line
                    const isChanged = changed(line)
                    return (
                        <span data-changed={isChanged || undefined} className="relative inline-flex items-center justify-center p-1">
                            <Checkbox
                                checked={has(value, role.id, permission.id)}
                                readOnly={locked}
                                aria-label={words.toggle(permission.label, role.label)}
                                className={cn(locked && 'cursor-default opacity-60')}
                                onCheckedChange={(next) => {
                                    if (!locked) onChange?.(role.id, permission.id, next)
                                }}
                            />
                            {isChanged && (
                                <span
                                    className="absolute -top-0.5 -right-1.5 size-1.5 rounded-full bg-warning"
                                    title={words.changed}
                                    aria-label={words.changed}
                                />
                            )}
                        </span>
                    )
                },
            }
        }),
    ]
    return (
        <div
            ref={box}
            className={cn(
                'flex min-h-0 min-w-60 flex-col overflow-hidden rounded-surface border border-border-strong bg-card [contain:inline-size]',
                className,
            )}
        >
            {one && (
                <div className="flex shrink-0 items-center gap-2 border-b border-border px-(--density-panel-pad) py-2">
                    <span className={TABLE_HEAD_TEXT}>{words.role}</span>
                    <NativeSelect size="sm" aria-label={words.role} value={picked} onChange={(event) => setPicked(event.target.value)}>
                        {roles.map((role) => (
                            <NativeSelectOption key={role.id} value={role.id}>
                                {role.label}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </div>
            )}
            <DataTable
                columns={columns}
                rows={lines}
                rowKey={({ permission }) => permission.id}
                groupBy="group"
                groupLabel={(key) => labels.get(key) ?? key}
                rowHeight="auto"
                bar={false}
                hover={false}
                stackBelow={false}
                minWidth="auto"
                framed={false}
            />
        </div>
    )
}
