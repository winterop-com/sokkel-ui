import { Lock } from 'lucide-react'
import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { TABLE_HEAD_TEXT } from '../lib/table'
import { GroupLabel } from './GroupLabel'
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

/**
 * Roles against permissions as a grid of checkboxes: a column per role, a row per permission, the
 * rows grouped by what they act on with each group's row counting what every role holds of it.
 *
 * A locked role is built in: its column is drawn with a lock and its boxes are read-only. Given
 * `saved`, a box that differs from it is marked as changed, so unsaved edits show where they are.
 * When the box is too narrow for every role's column, it shows one role at a time with a picker
 * above to choose which, so a phone reads one column instead of scrolling through all of them.
 */
export function PermissionMatrix({ roles, groups, value, saved, onChange, className, words: given }: PermissionMatrixProps) {
    const words = { ...WORDS, ...given }
    const stuck = 'sticky left-0 z-10 bg-card'
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
    return (
        <div
            ref={box}
            className={cn('min-w-60 overflow-hidden rounded-surface border border-border-strong bg-card [contain:inline-size]', className)}
        >
            {one && (
                <div className="flex items-center gap-2 border-b border-border px-(--density-panel-pad) py-2">
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
            {/* Relative, so the labels drawn for screen readers only stay inside the scroll and never widen the page. */}
            <div className="relative overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-border-strong bg-panel-ground">
                            <th
                                scope="col"
                                className={cn(
                                    stuck,
                                    'bg-panel-ground px-(--density-panel-pad) py-2 text-left align-bottom',
                                    TABLE_HEAD_TEXT,
                                )}
                            >
                                {words.permission}
                            </th>
                            {shown.map((role) => (
                                <th
                                    key={role.id}
                                    scope="col"
                                    className={cn(
                                        'w-28 min-w-24 border-l border-border px-2 py-2 text-center align-bottom',
                                        TABLE_HEAD_TEXT,
                                    )}
                                >
                                    <span className="flex items-center justify-center gap-1">
                                        {role.locked === true && (
                                            <span title={words.builtIn} className="inline-flex text-faint">
                                                <Lock className="size-3 shrink-0" aria-hidden />
                                                <span className="sr-only">{words.builtIn}</span>
                                            </span>
                                        )}
                                        <span className="truncate">{role.label}</span>
                                    </span>
                                    {role.code !== undefined && role.code !== role.label && (
                                        <span className="block truncate font-mono text-xs font-normal text-muted-foreground">
                                            {role.code}
                                        </span>
                                    )}
                                    {role.note !== undefined && (
                                        <span className="block truncate text-xs font-normal text-muted-foreground">{role.note}</span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map((group) => (
                            <Fragment key={group.id}>
                                <tr className="border-b border-border bg-muted/40">
                                    <th
                                        scope="rowgroup"
                                        className={cn(
                                            stuck,
                                            'bg-[color-mix(in_oklab,var(--muted)_40%,var(--card))] px-(--density-panel-pad) py-1.5 text-left',
                                        )}
                                    >
                                        <GroupLabel as="span">{group.label}</GroupLabel>
                                    </th>
                                    {shown.map((role) => (
                                        <td
                                            key={role.id}
                                            className="border-l border-border px-2 py-1.5 text-center text-xs text-muted-foreground tabular-nums"
                                        >
                                            {words.held(
                                                group.permissions.filter((permission) => has(value, role.id, permission.id)).length,
                                                group.permissions.length,
                                            )}
                                        </td>
                                    ))}
                                </tr>
                                {group.permissions.map((permission) => (
                                    <tr key={permission.id} className="border-b border-border last:border-b-0">
                                        <th
                                            scope="row"
                                            className={cn(stuck, 'max-w-72 min-w-44 px-(--density-panel-pad) py-2 text-left font-normal')}
                                        >
                                            <span className="flex items-baseline gap-2">
                                                <span className="truncate">{permission.label}</span>
                                                {permission.code !== undefined && (
                                                    <span className="hidden truncate font-mono text-xs text-faint md:inline">
                                                        {permission.code}
                                                    </span>
                                                )}
                                            </span>
                                            {permission.description !== undefined && (
                                                <span className="block truncate text-xs text-muted-foreground">
                                                    {permission.description}
                                                </span>
                                            )}
                                        </th>
                                        {shown.map((role) => {
                                            const granted = has(value, role.id, permission.id)
                                            const changed = saved !== undefined && granted !== has(saved, role.id, permission.id)
                                            const locked = role.locked === true
                                            return (
                                                <td
                                                    key={role.id}
                                                    data-changed={changed || undefined}
                                                    className={cn(
                                                        'relative border-l border-border px-2 py-2 text-center',
                                                        changed && 'bg-warning/12',
                                                    )}
                                                >
                                                    <span className="inline-flex items-center justify-center">
                                                        <Checkbox
                                                            checked={granted}
                                                            readOnly={locked}
                                                            aria-label={words.toggle(permission.label, role.label)}
                                                            className={cn(locked && 'cursor-default opacity-60')}
                                                            onCheckedChange={(next) => {
                                                                if (!locked) onChange?.(role.id, permission.id, next)
                                                            }}
                                                        />
                                                    </span>
                                                    {changed && (
                                                        <span
                                                            className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-warning"
                                                            title={words.changed}
                                                            aria-label={words.changed}
                                                        />
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
