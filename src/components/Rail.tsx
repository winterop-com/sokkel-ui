import { Tooltip } from '@base-ui/react/tooltip'
import { ChevronRight, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react'
import {
    Fragment,
    useId,
    useRef,
    useState,
    type ComponentPropsWithRef,
    type KeyboardEvent,
    type MouseEvent,
    type ReactElement,
    type ReactNode,
} from 'react'

import { cn } from '../lib/cn'
import { usePanelSize } from '../hooks/use-panel-size'
import { ResizeHandle } from './ResizeHandle'
import { Count } from './Count'
import { Dot } from './Dot'
import { GroupLabel } from './GroupLabel'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

/** One place the rail leads to. */
export interface RailEntry {
    id: string
    label: string
    /** The entry's icon. Entries without one read as text, their labels lined up at the row's start. */
    icon?: LucideIcon
    /** Where the entry leads. A parent may have none; then its row folds and unfolds its entries. */
    href?: string
    active?: boolean
    /** How many wait there, such as unread messages: at the row's end, or over the icon when the rail is collapsed or a strip. */
    count?: number
    /** Something new there without a number: a small dot where a count would stand. A count, when given, wins. */
    unread?: boolean
    /** A color drawn as a dot in place of the icon, for a label or a tag: a CSS color such as a token. */
    dot?: string
    /**
     * The entries under this one, one level deep. Expanded, the row folds them under it behind a
     * chevron at its end; collapsed or in a strip, the entry opens them in a small flyout.
     */
    entries?: RailEntry[]
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
 * As a `strip`, it is the narrow column a team chat keeps on its far left, beside its own list of
 * channels: each entry an icon with its short label under it, the active one's icon on a soft
 * wash, a count or an unread dot at the icon's upper corner, clear of the icon and of the column's
 * edge. The mark, when given, is the workspace's tile at the top, and `foot` stacks its items at
 * the bottom, such as an add button and the account's avatar. A strip neither collapses nor resizes.
 *
 * Expanded, its right edge drags to resize it, and a double click on the edge puts it back. Left
 * to itself it holds its own width, starting at `defaultWidth`; `width` with `onWidthChange` holds
 * it from outside, and `resizable={false}` keeps it fixed. In the shell's drawer on a narrow window
 * the edge is not drawn.
 *
 * An entry with `entries` is a parent. Expanded, a chevron at its row's end folds and unfolds its
 * entries, indented under it and lined up under its label; a parent without an `href` of its own
 * folds on a press anywhere on its row, and the keyboard's right and left arrows unfold and fold
 * it. A parent holding the active entry starts unfolded, its label set apart, and wears the accent
 * itself while folded. The rail holds which parents are unfolded, starting from `defaultOpen`;
 * `open` with `onOpenChange` holds them from outside. Collapsed or as a strip, a parent opens its
 * entries in a small flyout beside it; `defaultFlyout` names one that starts open.
 *
 * `renderLink` draws an entry's link, so an app passes its router's link; by default it is an
 * anchor.
 */
export function Rail({
    mark,
    name,
    groups,
    variant = 'nav',
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
    resizable = true,
    minWidth = 200,
    maxWidth = 360,
    defaultWidth = 240,
    labels = { collapse: 'Collapse the navigation', expand: 'Expand the navigation', resize: 'Resize the navigation' },
    open,
    onOpenChange,
    defaultOpen = [],
    defaultFlyout,
}: {
    /** The app's mark, drawn in a small tile; in a strip, the workspace's tile at the top. */
    mark?: ReactNode
    /** The app's name beside the mark; in a strip, the workspace tile's name. */
    name: string
    groups: RailGroup[]
    /** `nav` is the app's navigation, expanded or collapsed; `strip` is a team chat's narrow column of labeled icons. */
    variant?: 'nav' | 'strip'
    collapsed?: boolean
    onCollapsedChange?: (collapsed: boolean) => void
    /** What stands in the rail's foot cell, normally the account control; in a strip, the items stacked at its foot. */
    foot?: ReactNode
    renderLink?: (entry: RailEntry, children: ReactNode, className: string) => ReactNode
    /** The expanded width in pixels, held from outside with `onWidthChange`. */
    width?: number
    onWidthChange?: (width: number) => void
    /** Whether the expanded rail's edge drags to resize it. */
    resizable?: boolean
    minWidth?: number
    maxWidth?: number
    /** The expanded width the rail starts at and a double click on the edge returns to. */
    defaultWidth?: number
    /** `unread` names the dot of an entry with something new and no count. */
    labels?: { collapse: string; expand: string; resize: string; unread?: string }
    /** The ids of the unfolded parents, held from outside with `onOpenChange`. */
    open?: string[]
    onOpenChange?: (open: string[]) => void
    /** The parents unfolded at the start, beside those holding the active entry. */
    defaultOpen?: string[]
    /** The parent whose flyout stands open at the start in a collapsed rail or a strip. */
    defaultFlyout?: string
}) {
    const aside = useRef<HTMLElement>(null)
    const unread = labels.unread ?? 'Unread'
    const [ownOpen, setOwnOpen] = useState<string[]>(() => [
        ...new Set([
            ...defaultOpen,
            ...groups
                .flatMap((group) => group.entries)
                .filter(holdsActive)
                .map((entry) => entry.id),
        ]),
    ])
    const unfolded = open ?? ownOpen
    const fold = (id: string, next: boolean) => {
        const rest = unfolded.filter((other) => other !== id)
        const list = next ? [...rest, id] : rest
        if (open === undefined) setOwnOpen(list)
        onOpenChange?.(list)
    }
    const held = usePanelSize({
        size: width,
        onSizeChange: onWidthChange,
        rest: defaultWidth,
        fallback: defaultWidth,
        min: minWidth,
        max: maxWidth,
    })
    if (variant === 'strip')
        return <Strip mark={mark} name={name} groups={groups} foot={foot} renderLink={renderLink} unread={unread} flyout={defaultFlyout} />
    return (
        <>
            <aside
                ref={aside}
                data-collapsed={collapsed || undefined}
                style={collapsed ? undefined : { width: held.style }}
                className={cn(
                    'flex h-full shrink-0 flex-col border-r border-border-strong bg-sidebar text-sidebar-foreground transition-[width] duration-200',
                    collapsed && 'w-[calc(3.5rem+1px)]',
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
                            {mark !== undefined && <span className="group-hover/mark:opacity-0">{mark}</span>}
                            <PanelLeftOpen
                                className={cn('absolute size-4', mark !== undefined && 'opacity-0 group-hover/mark:opacity-100')}
                                aria-hidden
                            />
                        </button>
                    ) : (
                        <>
                            {mark !== undefined && (
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                    {mark}
                                </span>
                            )}
                            <span className="truncate text-base font-semibold tracking-tight">{name}</span>
                            {onCollapsedChange !== undefined && (
                                <button
                                    type="button"
                                    aria-label={labels.collapse}
                                    title={labels.collapse}
                                    className="ml-auto flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/8 hover:text-foreground dark:hover:bg-foreground/12"
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
                            {group.entries.map((entry) =>
                                entry.entries !== undefined && entry.entries.length > 0 ? (
                                    collapsed ? (
                                        <RailFlyout
                                            key={entry.id}
                                            entry={entry}
                                            renderLink={renderLink}
                                            unread={unread}
                                            defaultOpen={defaultFlyout === entry.id}
                                        />
                                    ) : (
                                        <RailParent
                                            key={entry.id}
                                            entry={entry}
                                            open={unfolded.includes(entry.id)}
                                            onOpen={(next) => fold(entry.id, next)}
                                            renderLink={renderLink}
                                            unread={unread}
                                        />
                                    )
                                ) : (
                                    <RailLink key={entry.id} entry={entry} collapsed={collapsed} renderLink={renderLink} unread={unread} />
                                ),
                            )}
                        </nav>
                    ))}
                </div>
                {foot !== undefined && <div className="flex h-shell-foot shrink-0 items-stretch border-t border-border-strong">{foot}</div>}
            </aside>
            {!collapsed && resizable && held.changeable && (
                <ResizeHandle
                    target={aside}
                    size={held.size}
                    onSize={held.set}
                    onReset={held.reset}
                    min={minWidth}
                    max={maxWidth}
                    label={labels.resize}
                />
            )}
        </>
    )
}

type RenderLink = (entry: RailEntry, children: ReactNode, className: string) => ReactNode

/** Whether one of a parent's entries is the active one. */
function holdsActive(entry: RailEntry): boolean {
    return entry.entries?.some((child) => child.active === true) === true
}

/** The dot of an entry with something new and no count, ringed in the rail's ground so it reads as cut out. */
function UnreadDot({ label, className }: { label: string; className?: string }) {
    return (
        <span role="img" aria-label={label} className={cn('size-2 shrink-0 rounded-full bg-foreground ring-2 ring-sidebar', className)} />
    )
}

/** An entry's mark: its color dot, its icon, or, where a mark must stand and it has neither, its initial. */
function EntryMark({ entry, initial = false, className = 'size-4' }: { entry: RailEntry; initial?: boolean; className?: string }) {
    if (entry.dot !== undefined)
        return (
            <span className={cn('flex shrink-0 items-center justify-center', className)} aria-hidden>
                <Dot color={entry.dot} />
            </span>
        )
    const Icon = entry.icon
    if (Icon !== undefined) return <Icon className={cn('shrink-0', className)} aria-hidden />
    if (!initial) return null
    return (
        <span className={cn('flex shrink-0 items-center justify-center text-xs font-semibold', className)} aria-hidden>
            {entry.label.slice(0, 1)}
        </span>
    )
}

/** An expanded row's look: `active` wears the accent bar over a wash, `holding` sets a parent's label apart. */
function rowClass(state: 'active' | 'holding' | 'idle', inset: 'none' | 'icon' | 'text' = 'none'): string {
    return cn(
        'flex h-(--density-row) w-full items-center gap-3 rounded-l-sm rounded-r-md border-l-2 pr-3 text-left text-sm',
        inset === 'none' ? 'pl-2.5' : inset === 'icon' ? 'pl-9.5' : 'pl-5.5',
        state === 'active'
            ? 'border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground'
            : state === 'holding'
              ? 'border-transparent font-medium text-foreground hover:bg-foreground/8 dark:hover:bg-foreground/12'
              : 'border-transparent text-muted-foreground hover:bg-foreground/8 hover:text-foreground dark:hover:bg-foreground/12',
    )
}

/** What waits at an expanded row's end: its count, or its unread dot. */
function RowEnd({ entry, unread }: { entry: RailEntry; unread: string }) {
    if (entry.count !== undefined && entry.count > 0)
        return <span className="ml-auto text-xs font-semibold text-foreground tabular-nums">{entry.count}</span>
    if (entry.unread === true) return <UnreadDot label={unread} className="ml-auto ring-0" />
    return null
}

/** A parent in the expanded rail: its row with the chevron at its end, and its entries folded under it. */
function RailParent({
    entry,
    open,
    onOpen,
    renderLink,
    unread,
}: {
    entry: RailEntry
    open: boolean
    onOpen: (open: boolean) => void
    renderLink: RenderLink
    unread: string
}) {
    const id = useId()
    const control = useRef<HTMLButtonElement>(null)
    const holds = holdsActive(entry)
    const state = entry.active === true || (holds && !open) ? 'active' : holds ? 'holding' : 'idle'
    const marked = entry.icon !== undefined || entry.dot !== undefined
    const chevron = (
        <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} aria-hidden />
    )
    const keys = (event: KeyboardEvent<HTMLDivElement>) => {
        const inside = (event.target as HTMLElement).closest('[data-rail-children]') !== null
        if (event.key === 'ArrowRight' && !inside && !open) {
            event.preventDefault()
            onOpen(true)
        } else if (event.key === 'ArrowLeft' && (open || inside)) {
            event.preventDefault()
            onOpen(false)
            if (inside) control.current?.focus()
        }
    }
    const toggle = (event: MouseEvent) => {
        event.preventDefault()
        onOpen(!open)
    }
    return (
        <div className="flex flex-col gap-1" onKeyDown={keys}>
            {entry.href === undefined ? (
                <button ref={control} type="button" aria-expanded={open} aria-controls={id} className={rowClass(state)} onClick={toggle}>
                    <EntryMark entry={entry} />
                    <span className="truncate">{entry.label}</span>
                    <span className="ml-auto flex items-center gap-2">
                        <RowEnd entry={entry} unread={unread} />
                        {chevron}
                    </span>
                </button>
            ) : (
                <div className="relative">
                    {renderLink(
                        entry,
                        <>
                            <EntryMark entry={entry} />
                            <span className="truncate">{entry.label}</span>
                            <RowEnd entry={entry} unread={unread} />
                        </>,
                        cn(rowClass(state), 'pr-9'),
                    )}
                    <button
                        ref={control}
                        type="button"
                        aria-label={entry.label}
                        aria-expanded={open}
                        aria-controls={id}
                        className="absolute inset-y-0 right-1 my-auto flex size-7 items-center justify-center rounded-md hover:bg-foreground/8 dark:hover:bg-foreground/12"
                        onClick={toggle}
                    >
                        {chevron}
                    </button>
                </div>
            )}
            <div id={id} role="group" aria-label={entry.label} data-rail-children="" hidden={!open} className="flex flex-col gap-1">
                {open &&
                    (entry.entries ?? []).map((child) => (
                        <Fragment key={child.id}>
                            {renderLink(
                                child,
                                <>
                                    <EntryMark entry={child} />
                                    <span className="truncate">{child.label}</span>
                                    <RowEnd entry={child} unread={unread} />
                                </>,
                                rowClass(child.active === true ? 'active' : 'idle', marked ? 'icon' : 'text'),
                            )}
                        </Fragment>
                    ))}
            </div>
        </div>
    )
}

/** A parent's entries in a small flyout beside it, as a collapsed rail and a strip open them; a link chosen there closes it. */
function Flyout({
    entry,
    trigger,
    renderLink,
    unread,
    defaultOpen,
    sideOffset,
}: {
    entry: RailEntry
    trigger: (props: ComponentPropsWithRef<'button'>) => ReactElement
    renderLink: RenderLink
    unread: string
    defaultOpen: boolean
    sideOffset: number
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={(props) => trigger(props as ComponentPropsWithRef<'button'>)} />
            <PopoverContent
                side="right"
                align="start"
                sideOffset={sideOffset}
                aria-label={entry.label}
                initialFocus={(type) => type === 'keyboard'}
                className="w-auto min-w-44 gap-1 p-1"
                onClick={(event) => {
                    if ((event.target as HTMLElement).closest('a') !== null) setOpen(false)
                }}
            >
                <GroupLabel className="px-2.5 pt-1 pb-0.5">{entry.label}</GroupLabel>
                {(entry.entries ?? []).map((child) => (
                    <Fragment key={child.id}>
                        {renderLink(
                            child,
                            <>
                                <EntryMark entry={child} />
                                <span className="truncate">{child.label}</span>
                                <RowEnd entry={child} unread={unread} />
                            </>,
                            rowClass(child.active === true ? 'active' : 'idle'),
                        )}
                    </Fragment>
                ))}
            </PopoverContent>
        </Popover>
    )
}

/** A parent in the collapsed rail: its icon opens its entries in a flyout, and its tooltip names it. */
function RailFlyout({
    entry,
    renderLink,
    unread,
    defaultOpen,
}: {
    entry: RailEntry
    renderLink: RenderLink
    unread: string
    defaultOpen: boolean
}) {
    const active = entry.active === true || holdsActive(entry)
    const counted = entry.count !== undefined && entry.count > 0
    return (
        <Flyout
            entry={entry}
            renderLink={renderLink}
            unread={unread}
            defaultOpen={defaultOpen}
            sideOffset={12}
            trigger={(props) => (
                <Tooltip.Root>
                    <Tooltip.Trigger
                        render={
                            <button
                                {...props}
                                type="button"
                                aria-label={entry.label}
                                className={cn(
                                    'relative mx-auto flex h-(--density-row) w-9 items-center justify-center rounded-md',
                                    active
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-muted-foreground hover:bg-foreground/8 hover:text-foreground data-popup-open:bg-foreground/8 dark:hover:bg-foreground/12 dark:data-popup-open:bg-foreground/12',
                                )}
                            />
                        }
                    >
                        <EntryMark entry={entry} initial />
                        {counted ? (
                            <Count
                                value={entry.count ?? 0}
                                size="sm"
                                shape="round"
                                className="absolute -top-1 -right-1.5 ring-2 ring-sidebar"
                            />
                        ) : (
                            entry.unread === true && <UnreadDot label={unread} className="absolute top-1 right-1" />
                        )}
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                        <Tooltip.Positioner side="right" sideOffset={8}>
                            <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-pop">
                                {entry.label}
                            </Tooltip.Popup>
                        </Tooltip.Positioner>
                    </Tooltip.Portal>
                </Tooltip.Root>
            )}
        />
    )
}

function Strip({
    mark,
    name,
    groups,
    foot,
    renderLink,
    unread,
    flyout,
}: {
    mark?: ReactNode
    name: string
    groups: RailGroup[]
    foot?: ReactNode
    renderLink: RenderLink
    unread: string
    flyout?: string
}) {
    return (
        <aside
            data-variant="strip"
            className="flex h-full w-18 shrink-0 flex-col border-r border-border-strong bg-sidebar text-sidebar-foreground [--avatar-ring:var(--color-sidebar)]"
        >
            {mark !== undefined && (
                <div className="flex h-shell-top shrink-0 items-center justify-center">
                    <span title={name} className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        {mark}
                    </span>
                </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-2">
                {groups.map((group, index) => (
                    <nav key={group.id} aria-label={group.title ?? name} className="flex flex-col gap-3">
                        {index > 0 && <span className="mx-auto h-px w-8 shrink-0 bg-border-strong" aria-hidden />}
                        {group.entries.map((entry) =>
                            entry.entries !== undefined && entry.entries.length > 0 ? (
                                <Flyout
                                    key={entry.id}
                                    entry={entry}
                                    renderLink={renderLink}
                                    unread={unread}
                                    defaultOpen={flyout === entry.id}
                                    sideOffset={8}
                                    trigger={(props) => (
                                        <button
                                            {...props}
                                            type="button"
                                            className={stripClass(entry.active === true || holdsActive(entry))}
                                        >
                                            <StripFace entry={entry} active={entry.active === true || holdsActive(entry)} unread={unread} />
                                        </button>
                                    )}
                                />
                            ) : (
                                <StripLink key={entry.id} entry={entry} renderLink={renderLink} unread={unread} />
                            ),
                        )}
                    </nav>
                ))}
            </div>
            {foot !== undefined && <div className="flex shrink-0 flex-col items-center gap-3 px-1 pt-2 pb-3">{foot}</div>}
        </aside>
    )
}

function stripClass(active: boolean): string {
    return cn(
        'group/entry flex flex-col items-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
    )
}

/** A strip entry's face: its icon on a tile, a count or dot at the tile's corner, and its short label under it. */
function StripFace({ entry, active, unread }: { entry: RailEntry; active: boolean; unread: string }) {
    const counted = entry.count !== undefined && entry.count > 0
    return (
        <>
            <span
                className={cn(
                    'relative flex size-9 items-center justify-center rounded-md transition-colors',
                    active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'group-hover/entry:bg-foreground/8 group-data-popup-open/entry:bg-foreground/8 dark:group-hover/entry:bg-foreground/12 dark:group-data-popup-open/entry:bg-foreground/12',
                )}
            >
                {entry.dot === undefined ? <EntryMark entry={entry} initial className="size-5" /> : <Dot color={entry.dot} />}
                {counted ? (
                    <Count value={entry.count ?? 0} size="sm" shape="round" className="absolute -top-1 -right-1.5 ring-2 ring-sidebar" />
                ) : (
                    entry.unread === true && <UnreadDot label={unread} className="absolute top-0.5 right-0.5" />
                )}
            </span>
            <span className="max-w-full truncate px-0.5 text-2xs">{entry.label}</span>
        </>
    )
}

function StripLink({ entry, renderLink, unread }: { entry: RailEntry; renderLink: RenderLink; unread: string }) {
    const active = entry.active === true
    return renderLink(entry, <StripFace entry={entry} active={active} unread={unread} />, stripClass(active))
}

function RailLink({
    entry,
    collapsed,
    renderLink,
    unread,
}: {
    entry: RailEntry
    collapsed: boolean
    renderLink: RenderLink
    unread: string
}) {
    const counted = entry.count !== undefined && entry.count > 0
    const dotted = !counted && entry.unread === true
    if (collapsed) {
        return (
            <Tooltip.Root>
                <Tooltip.Trigger
                    render={(props) => (
                        <span {...props} className="mx-auto">
                            {renderLink(
                                entry,
                                <>
                                    <EntryMark entry={entry} initial />
                                    {counted && (
                                        <Count
                                            value={entry.count ?? 0}
                                            size="sm"
                                            shape="round"
                                            className="absolute -top-1 -right-1.5 ring-2 ring-sidebar"
                                        />
                                    )}
                                    {dotted && <UnreadDot label={unread} className="absolute top-1 right-1" />}
                                </>,
                                cn(
                                    'relative flex h-(--density-row) w-9 items-center justify-center rounded-md',
                                    entry.active
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-muted-foreground hover:bg-foreground/8 hover:text-foreground dark:hover:bg-foreground/12',
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
            <EntryMark entry={entry} />
            <span className="truncate">{entry.label}</span>
            <RowEnd entry={entry} unread={unread} />
        </>,
        rowClass(entry.active === true ? 'active' : 'idle'),
    )
}
