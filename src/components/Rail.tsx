import { Tooltip } from '@base-ui/react/tooltip'
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ResizeHandle } from './ResizeHandle'
import { Count } from './Count'
import { Dot } from './Dot'
import { GroupLabel } from './GroupLabel'

/** One place the rail leads to. */
export interface RailEntry {
    id: string
    label: string
    icon: LucideIcon
    href: string
    active?: boolean
    /** How many wait there, such as unread messages: at the row's end, or over the icon when the rail is collapsed. */
    count?: number
    /** A color drawn as a dot in place of the icon, for a label or a tag: a CSS color such as a token. */
    dot?: string
}

/** A titled group of entries; a group with no title stands at the top. */
export interface RailGroup {
    id: string
    title?: string
    entries: RailEntry[]
}

/**
 * The app's left navigation: a head with the app's mark and the collapse control, the groups,
 * and a foot cell the shell's foot strip lines up with.
 *
 * Expanded, an entry is its icon and its label, and the active one wears a slim accent bar on
 * its left edge over a faint wash. Collapsed, the rail is icons alone, each naming itself in a
 * tooltip, the groups divided by a rule, and the mark itself is the control that expands it.
 *
 * `renderLink` draws an entry's link, so an app passes its router's link; by default it is an
 * anchor.
 */
export function Rail({
    mark,
    name,
    groups,
    collapsed = false,
    onCollapsedChange,
    foot,
    renderLink = (entry, children, className) => (
        <a href={entry.href} className={className} aria-current={entry.active ? 'page' : undefined}>
            {children}
        </a>
    ),
    width,
    onWidthChange,
    minWidth = 200,
    maxWidth = 360,
    defaultWidth = 240,
    labels = { collapse: 'Collapse the navigation', expand: 'Expand the navigation', resize: 'Resize the navigation' },
}: {
    /** The app's mark, drawn in a small tile. */
    mark: ReactNode
    /** The app's name beside the mark. */
    name: string
    groups: RailGroup[]
    collapsed?: boolean
    onCollapsedChange?: (collapsed: boolean) => void
    /** What stands in the rail's foot cell, normally the account control. */
    foot?: ReactNode
    renderLink?: (entry: RailEntry, children: ReactNode, className: string) => ReactNode
    /** The expanded width in pixels; with `onWidthChange` the rail's edge drags to resize it. */
    width?: number
    onWidthChange?: (width: number) => void
    minWidth?: number
    maxWidth?: number
    /** The width a double click on the edge returns to. */
    defaultWidth?: number
    labels?: { collapse: string; expand: string; resize: string }
}) {
    const aside = useRef<HTMLElement>(null)
    const sized = width !== undefined && !collapsed
    return (
        <>
            <aside
                ref={aside}
                data-collapsed={collapsed || undefined}
                style={sized ? { width } : undefined}
                className={cn(
                    'flex h-full shrink-0 flex-col border-r border-border-strong bg-sidebar text-sidebar-foreground transition-[width] duration-200',
                    collapsed ? 'w-[calc(3.5rem+1px)]' : !sized && 'w-60',
                )}
            >
                <div className="flex h-shell-top shrink-0 items-center gap-2 px-3">
                    {collapsed ? (
                        <button
                            type="button"
                            aria-label={labels.expand}
                            title={labels.expand}
                            className="group/mark relative mx-auto flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"
                            onClick={() => onCollapsedChange?.(false)}
                        >
                            <span className="group-hover/mark:opacity-0">{mark}</span>
                            <PanelLeftOpen className="absolute size-4 opacity-0 group-hover/mark:opacity-100" aria-hidden />
                        </button>
                    ) : (
                        <>
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                {mark}
                            </span>
                            <span className="truncate text-base font-semibold tracking-tight">{name}</span>
                            {onCollapsedChange !== undefined && (
                                <button
                                    type="button"
                                    aria-label={labels.collapse}
                                    title={labels.collapse}
                                    className="ml-auto flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    onClick={() => onCollapsedChange(true)}
                                >
                                    <PanelLeftClose className="size-4" aria-hidden />
                                </button>
                            )}
                        </>
                    )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pb-3">
                    {groups.map((group) => (
                        <nav key={group.id} aria-label={group.title ?? name} className="flex flex-col gap-1 px-2">
                            {group.title !== undefined &&
                                (collapsed ? (
                                    <div className="flex items-center px-2 pt-4 pb-1.5" aria-hidden>
                                        <span className="flex h-(--text-xs--line-height) w-full items-center">
                                            <span className="h-px w-full bg-border-strong" />
                                        </span>
                                    </div>
                                ) : (
                                    <GroupLabel className="px-2 pt-4 pb-1.5">{group.title}</GroupLabel>
                                ))}
                            {group.entries.map((entry) => (
                                <RailLink key={entry.id} entry={entry} collapsed={collapsed} renderLink={renderLink} />
                            ))}
                        </nav>
                    ))}
                </div>
                {foot !== undefined && <div className="flex h-shell-foot shrink-0 items-stretch border-t border-border-strong">{foot}</div>}
            </aside>
            {sized && onWidthChange !== undefined && (
                <ResizeHandle
                    target={aside}
                    size={width}
                    onSize={onWidthChange}
                    min={minWidth}
                    max={maxWidth}
                    reset={defaultWidth}
                    label={labels.resize}
                />
            )}
        </>
    )
}

function RailLink({
    entry,
    collapsed,
    renderLink,
}: {
    entry: RailEntry
    collapsed: boolean
    renderLink: (entry: RailEntry, children: ReactNode, className: string) => ReactNode
}) {
    const Icon = entry.icon
    const mark =
        entry.dot === undefined ? (
            <Icon className="size-4 shrink-0" aria-hidden />
        ) : (
            <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden>
                <Dot color={entry.dot} />
            </span>
        )
    const counted = entry.count !== undefined && entry.count > 0
    if (collapsed) {
        return (
            <Tooltip.Root>
                <Tooltip.Trigger
                    render={(props) => (
                        <span {...props} className="mx-auto">
                            {renderLink(
                                entry,
                                <>
                                    {mark}
                                    {counted && <Count value={entry.count ?? 0} className="absolute -top-1 -right-1" />}
                                </>,
                                cn(
                                    'relative flex h-(--density-row) w-9 items-center justify-center rounded-md',
                                    entry.active
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                                ),
                            )}
                        </span>
                    )}
                />
                <Tooltip.Portal>
                    <Tooltip.Positioner side="right" sideOffset={8}>
                        <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-pop">
                            {entry.label}
                        </Tooltip.Popup>
                    </Tooltip.Positioner>
                </Tooltip.Portal>
            </Tooltip.Root>
        )
    }
    return renderLink(
        entry,
        <>
            {mark}
            <span className="truncate">{entry.label}</span>
            {counted && <span className="ml-auto text-xs font-semibold text-foreground tabular-nums">{entry.count}</span>}
        </>,
        cn(
            'flex h-(--density-row) items-center gap-3 rounded-l-sm rounded-r-md border-l-2 pr-3 pl-2.5 text-sm',
            entry.active
                ? 'border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
        ),
    )
}
