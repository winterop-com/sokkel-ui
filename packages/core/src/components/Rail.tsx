import { Tooltip } from '@base-ui/react/tooltip'
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from 'lucide-react'
import {
    Fragment,
    useContext,
    useEffect,
    useId,
    useRef,
    useState,
    type ComponentPropsWithRef,
    type KeyboardEvent,
    type MouseEvent,
    type ReactElement,
    type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { cn } from '../lib/cn'
import { useTrafficLights } from '../lib/desktop'
import { usePanelSize } from '../hooks/use-panel-size'
import { RailCollapsed, ShellDesktop, ShellDrawer, ShellFootCell, ShellRailMode } from './shell-context'
import { ResizeHandle } from './ResizeHandle'
import { Count } from './Count'
import { Dot } from './Dot'
import { GroupLabel } from './GroupLabel'
import { Link } from './Link'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

/** One place the rail leads to. */
export interface RailEntry {
    id: string
    label: string
    /**
     * A second line under the label in the expanded rail, saying what the place holds: "Every run,
     * newest first" under Runs. The collapsed rail's tooltip says it after the label, and
     * `placeCommands` gives it to the palette as the row's hint.
     */
    description?: string
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
    /** More words the palette finds the place by, beyond its label, through `placeCommands`; never drawn. */
    keywords?: readonly string[]
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
 * Content the expanded rail holds in place of its places, such as a music library's tree of artists
 * and albums, drawn under a row back to the places.
 */
export interface RailBody {
    /** What the body holds, scrolled by the rail between its search and its foot. */
    content: ReactNode
    /** A heading under the row back to the places, naming what the body holds. */
    title?: string
    /** What stands over the content without scrolling with it, such as the search over a tree. */
    search?: ReactNode
}

/** What the expanded rail shows between its head and its foot: its places, or its `body`. */
export type RailView = 'places' | 'body'

/** Whether a rail has a body and whether it is drawn collapsed, which decide what it shows. */
export interface RailState {
    body: boolean
    collapsed: boolean
}

/**
 * What the rail draws between its head and its foot: the places' icons while collapsed, since a
 * body has no icon form, else the body when it has one and shows it, else the places.
 */
export function railShows(state: RailState, view: RailView): 'icons' | RailView {
    if (state.collapsed) return 'icons'
    return state.body && view === 'body' ? 'body' : 'places'
}

/**
 * The view a rail holding its own goes to as its state changes: back to the body when a body is
 * given anew or the rail collapses, so a page that brings a body and an expanded rail both show it.
 */
export function railViewAfter(view: RailView, before: RailState, now: RailState): RailView {
    if ((now.body && !before.body) || (now.collapsed && !before.collapsed)) return 'body'
    return view
}

/**
 * The words the rail says; `unread` names the dot of an entry with something new and no count,
 * and `places` is the row over a body that goes back to the places.
 */
export interface RailWords {
    collapse: string
    expand: string
    resize: string
    unread: string
    places: string
}

const WORDS: RailWords = {
    collapse: 'Collapse the navigation',
    expand: 'Expand the navigation',
    resize: 'Resize the navigation',
    unread: 'Unread',
    places: 'All places',
}

export interface RailProps {
    /** The app's mark, drawn in a small tile; in a strip, the workspace's tile at the top. */
    mark?: ReactNode
    /** The app's name beside the mark; in a strip, the workspace tile's name. */
    name: string
    /**
     * Where the mark leads, the app's home: the expanded rail's mark and name, and a strip's tile,
     * are a link there. A collapsed rail's mark stays the control that
     * expands it.
     */
    markHref?: string
    groups: RailGroup[]
    /** `nav` is the app's navigation, expanded or collapsed; `strip` is a team chat's narrow column of labeled icons. */
    variant?: 'nav' | 'strip'
    collapsed?: boolean
    onCollapsedChange?: (collapsed: boolean) => void
    /** What stands in the rail's foot cell, normally the account control; in a strip, the items stacked at its foot. */
    foot?: ReactNode
    /** The expanded width in pixels, held from outside with `onSizeChange`. */
    size?: number
    onSizeChange?: (size: number) => void
    /** Whether the expanded rail's edge drags to resize it, and a collapsed rail's to expand it. */
    resizable?: boolean
    minSize?: number
    maxSize?: number
    /** The expanded width the rail starts at and a double click on the edge returns to. */
    defaultSize?: number
    words?: Partial<RailWords>
    /** The ids of the unfolded parents, held from outside with `onExpandedChange`. */
    expanded?: string[]
    onExpandedChange?: (expanded: string[]) => void
    /** The parents unfolded at the start, beside those holding the active entry. */
    defaultExpanded?: string[]
    /** The parent whose flyout stands open at the start in a collapsed rail or a strip. */
    defaultFlyout?: string
    /**
     * Content the expanded rail holds in place of `groups`, such as a music library's tree of
     * artists and albums with its search, under a row back to the places. The groups are still the
     * app's places: the collapsed rail draws their icons, and the palette lists them.
     */
    body?: RailBody
    /** Whether the expanded rail shows its places or its `body`, held from outside with `onViewChange`. */
    view?: RailView
    onViewChange?: (view: RailView) => void
}

/**
 * The app's left navigation: a head with the app's mark and the collapse control, the groups,
 * and a foot cell the shell's foot strip lines up with. In a shell with a `bottom` strip, such as
 * a player, the foot cell is drawn at the window's bottom edge under that strip, as wide as the rail.
 *
 * Expanded, an entry is its icon and its label, with its `description` on a quieter line under the
 * label when it has one, and the active one wears a slim accent bar on its left edge over a faint wash. Collapsed, the rail is icons alone, each naming itself in a
 * tooltip, the groups divided by a rule, and the mark itself is the control that expands it.
 *
 * As a `strip`, it is the narrow column a team chat keeps on its far left, beside its own list of
 * channels: each entry an icon with its short label under it, the active one's icon on a soft
 * wash, a count or an unread dot at the icon's upper corner, clear of the icon and of the column's
 * edge. The mark, when given, is the workspace's tile at the top, and `foot` stacks its items at
 * the bottom, such as an add button and the account's avatar. A strip neither collapses nor resizes.
 *
 * Expanded, its right edge drags to resize it, and a double click on the edge puts it back. Left
 * to itself it holds its own width, starting at `defaultSize`; `size` with `onSizeChange` holds
 * it from outside, and `resizable={false}` keeps it fixed. Collapsed, with `onCollapsedChange`,
 * its edge pulled outward expands it under the pointer, the width at release kept, and Enter, Space
 * or the right arrow on the edge expand it too.
 *
 * `markHref` makes the expanded rail's mark and name, and a strip's tile, a link to the app's home.
 *
 * In the shell's drawer on a narrow window the rail is drawn expanded, even where the app holds it
 * `collapsed`, its edge is not drawn, and the control at its head's end closes the drawer.
 *
 * An entry with `entries` is a parent. Expanded, a chevron at its row's end folds and unfolds its
 * entries, indented under it and lined up under its label; a parent without an `href` of its own
 * folds on a press anywhere on its row, and the keyboard's right and left arrows unfold and fold
 * it. A parent holding the active entry starts unfolded, its label set apart, and wears the accent
 * itself while folded. The rail holds which parents are unfolded, starting from `defaultExpanded`;
 * `expanded` with `onExpandedChange` holds them from outside. Collapsed or as a strip, a parent opens its
 * entries in a small flyout beside it; `defaultFlyout` names one that starts open.
 *
 * Each entry's link, and the mark's, is a `Link`, drawn as the app's `LinkProvider` says, so an app
 * sets its router's link once at its root.
 *
 * A screen in a `Shell` may narrow the rail to its icons while it is shown (`useRailMode`, or the
 * shell's `railMode`): the rail draws collapsed whatever the app holds, its mark and its edge still
 * widen it for the reader until the ask changes, and the app's own `collapsed` is left as it was.
 *
 * In a `Shell` with `desktop`, the rail's head is part of the window's title strip and drags the
 * window. With `trafficLights` the head leaves room at its start for the window's buttons; a
 * collapsed rail or a strip, narrower than that room, keeps its head empty under the buttons, its
 * mark just below it and its edge undrawn between them.
 *
 * With a `body`, the expanded rail holds the app's own content in place of its groups, such as a
 * music library's tree of artists and albums, keeping its head, width, edge and foot: a row at the
 * top ("All places", `words.places`) shows the places, its `title` under that row, its `search`
 * standing still over the content as the content scrolls. Shown the places, a place chosen there
 * brings the body back, and so does a body given anew, as a page that holds one is reached again.
 * Collapsed, the rail draws the places' icons, since a body has no icon form, and expanding it
 * shows the body. The body stays mounted while the places or the icons show, so it comes back as
 * it was left, a tree's open levels and its scroll with it. The shell's drawer draws the body, as
 * it draws the rail expanded. Left to itself the rail holds which it shows; `view` with
 * `onViewChange` holds it from outside. A strip draws no body.
 */
export function Rail({
    mark,
    name,
    markHref,
    groups,
    variant = 'nav',
    collapsed: kept = false,
    onCollapsedChange,
    foot,
    size,
    onSizeChange,
    resizable = true,
    minSize = 200,
    maxSize = 360,
    defaultSize = 240,
    words: given,
    expanded,
    onExpandedChange,
    defaultExpanded = [],
    defaultFlyout,
    body,
    view,
    onViewChange,
}: RailProps) {
    const aside = useRef<HTMLElement>(null)
    const footCell = useContext(ShellFootCell)
    const desktop = useContext(ShellDesktop)
    const drawer = useContext(ShellDrawer)
    // A screen narrowing the rail through the shell holds it in place of the app, until the reader widens it.
    const narrowed = useContext(ShellRailMode) === 'collapsed' && drawer === undefined
    const [widened, setWidened] = useState(false)
    const [narrowedBefore, setNarrowedBefore] = useState(narrowed)
    if (narrowedBefore !== narrowed) {
        setNarrowedBefore(narrowed)
        setWidened(false)
    }
    const collapsed = narrowed ? !widened : kept && drawer === undefined
    const setCollapsed = (next: boolean) => {
        if (narrowed) setWidened(!next)
        else onCollapsedChange?.(next)
    }
    const collapsible = narrowed || onCollapsedChange !== undefined
    const state = { body: body !== undefined, collapsed }
    const [ownView, setOwnView] = useState<RailView>('body')
    const [stateBefore, setStateBefore] = useState(state)
    if (stateBefore.body !== state.body || stateBefore.collapsed !== state.collapsed) {
        setStateBefore(state)
        setOwnView(railViewAfter(ownView, stateBefore, state))
    }
    const shows = railShows(state, view ?? ownView)
    const places = useRef<HTMLDivElement>(null)
    const backPressed = useRef(false)
    const setView = (next: RailView) => {
        backPressed.current = next === 'places'
        if (view === undefined) setOwnView(next)
        onViewChange?.(next)
    }
    // The back row goes as it is pressed, so the focus moves to the place shown, or else the first.
    useEffect(() => {
        const list = places.current
        if (!backPressed.current || list === null) return
        backPressed.current = false
        const target = list.querySelector<HTMLElement>('[aria-current="page"]') ?? list.querySelector<HTMLElement>('a, button')
        target?.focus()
    })
    const lights = useTrafficLights(desktop)
    const drag = desktop === undefined ? undefined : ''
    const words = { ...WORDS, ...given }
    const unread = words.unread
    const [ownOpen, setOwnOpen] = useState<string[]>(() => [
        ...new Set([
            ...defaultExpanded,
            ...groups
                .flatMap((group) => group.entries)
                .filter(holdsActive)
                .map((entry) => entry.id),
        ]),
    ])
    const unfolded = expanded ?? ownOpen
    const fold = (id: string, next: boolean) => {
        const rest = unfolded.filter((other) => other !== id)
        const list = next ? [...rest, id] : rest
        if (expanded === undefined) setOwnOpen(list)
        onExpandedChange?.(list)
    }
    const held = usePanelSize({
        size,
        onSizeChange,
        rest: defaultSize,
        fallback: defaultSize,
        min: minSize,
        max: maxSize,
    })
    if (variant === 'strip')
        return (
            <Strip
                mark={mark}
                name={name}
                markHref={markHref}
                groups={groups}
                foot={foot}
                unread={unread}
                flyout={defaultFlyout}
                drag={drag}
                lights={lights}
            />
        )
    // Collapsed, the rail is narrower than the window's buttons: its mark stands under the strip.
    const under = collapsed && lights
    const expand = (
        <button
            type="button"
            aria-label={words.expand}
            title={words.expand}
            className="group/mark relative mx-auto flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"
            onClick={() => setCollapsed(false)}
        >
            {mark !== undefined && <span className="group-hover/mark:opacity-0">{mark}</span>}
            <PanelLeftOpen className={cn('absolute size-4', mark !== undefined && 'opacity-0 group-hover/mark:opacity-100')} aria-hidden />
        </button>
    )
    const head = (
        <>
            {mark !== undefined && (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    {mark}
                </span>
            )}
            <span className="truncate text-title font-semibold tracking-tight">{name}</span>
        </>
    )
    return (
        <RailCollapsed value={narrowed ? collapsed : undefined}>
            <aside
                ref={aside}
                data-collapsed={collapsed || undefined}
                style={collapsed ? undefined : { width: held.style }}
                className={cn(
                    'flex h-full shrink-0 flex-col border-r border-border-strong bg-sidebar text-sidebar-foreground transition-[width] duration-200',
                    collapsed && 'w-[calc(3.5rem+1px)]',
                )}
            >
                <div
                    data-window-drag={drag}
                    className={cn(
                        'flex h-shell-top shrink-0 items-center gap-2 px-3',
                        lights && !collapsed && 'ps-(--spacing-traffic-lights)',
                        under && UNDRAWN_EDGE,
                    )}
                >
                    {collapsed ? (
                        !under && expand
                    ) : (
                        <>
                            {markHref === undefined
                                ? head
                                : renderLink(
                                      { id: 'home', label: name, href: markHref },
                                      head,
                                      'flex min-w-0 items-center gap-2 rounded-md pe-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                                  )}
                            {drawer !== undefined ? (
                                <button
                                    type="button"
                                    aria-label={drawer.label}
                                    title={drawer.label}
                                    className={HEAD_BUTTON}
                                    onClick={drawer.close}
                                >
                                    <X className="size-4" aria-hidden />
                                </button>
                            ) : (
                                collapsible && (
                                    <button
                                        type="button"
                                        aria-label={words.collapse}
                                        title={words.collapse}
                                        className={HEAD_BUTTON}
                                        onClick={() => setCollapsed(true)}
                                    >
                                        <PanelLeftClose className="size-4" aria-hidden />
                                    </button>
                                )
                            )}
                        </>
                    )}
                </div>
                {under && <div className="flex shrink-0 justify-center py-1">{expand}</div>}
                {body !== undefined && (
                    // Kept while the places or the icons show, so the body comes back as it was left.
                    <div data-rail-body="" hidden={shows !== 'body'} className="flex min-h-0 flex-1 flex-col">
                        <div className="flex shrink-0 flex-col px-2 pb-2">
                            <button type="button" className={rowClass('idle')} onClick={() => setView('places')}>
                                <ChevronLeft className="size-4 shrink-0" aria-hidden />
                                <span className="truncate">{words.places}</span>
                            </button>
                            {body.title !== undefined && (
                                <GroupLabel as="h2" className="truncate px-2 pt-4 pb-1.5">
                                    {body.title}
                                </GroupLabel>
                            )}
                            {body.search !== undefined && <div className="pt-1">{body.search}</div>}
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">{body.content}</div>
                    </div>
                )}
                <div
                    ref={places}
                    data-rail-places=""
                    hidden={shows === 'body'}
                    className="min-h-0 flex-1 overflow-y-auto pb-3"
                    // A place chosen while a body waits brings the body back, as the page that holds it is reached again.
                    onClick={
                        body === undefined
                            ? undefined
                            : (event) => {
                                  if ((event.target as HTMLElement).closest('a') !== null) setView('body')
                              }
                    }
                >
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
                                        <RailFlyout key={entry.id} entry={entry} unread={unread} defaultOpen={defaultFlyout === entry.id} />
                                    ) : (
                                        <RailParent
                                            key={entry.id}
                                            entry={entry}
                                            open={unfolded.includes(entry.id)}
                                            onOpen={(next) => fold(entry.id, next)}
                                            unread={unread}
                                        />
                                    )
                                ) : (
                                    <RailLink key={entry.id} entry={entry} collapsed={collapsed} unread={unread} />
                                ),
                            )}
                        </nav>
                    ))}
                </div>
                {foot !== undefined && footCell === null && (
                    <div className="flex h-shell-foot shrink-0 items-stretch border-t border-border-strong">{foot}</div>
                )}
            </aside>
            {/* The corner cell is the foot strip's start, so it stands on the foot's ground. */}
            {foot !== undefined &&
                footCell !== null &&
                createPortal(
                    <div className="flex h-shell-foot w-full items-stretch border-t border-r border-t-page-foot-line border-r-border-strong bg-page-foot-ground text-sidebar-foreground">
                        {foot}
                    </div>,
                    footCell,
                )}
            {resizable && held.changeable && (!collapsed || collapsible) && (
                // One handle through the change, so a drag that expands a collapsed rail goes on sizing it.
                <ResizeHandle
                    target={aside}
                    size={held.size}
                    onSize={held.set}
                    onReset={held.reset}
                    min={minSize}
                    max={maxSize}
                    label={collapsed ? words.expand : words.resize}
                    onExpand={collapsed ? () => setCollapsed(false) : undefined}
                />
            )}
        </RailCollapsed>
    )
}

/** An entry's link, holding `children`. */
const renderLink = (entry: RailEntry, children: ReactNode, className: string) => (
    <Link href={entry.href} className={className} aria-current={entry.active ? 'page' : undefined}>
        {children}
    </Link>
)

/** The control at the end of the expanded rail's head: collapse, or close in the shell's drawer. */
const HEAD_BUTTON =
    'ml-auto flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid'

/** Covers the rail's edge along its head, where the window's buttons straddle it, in the rail's own ground. */
const UNDRAWN_EDGE = 'relative after:absolute after:inset-y-0 after:-right-px after:w-px after:bg-sidebar'

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

/** An entry's words in an expanded row: its label, and its description on a quieter line under it. */
function EntryText({ entry, active = false }: { entry: RailEntry; active?: boolean }) {
    if (entry.description === undefined) return <span className="truncate">{entry.label}</span>
    return (
        <span className="flex min-w-0 flex-col">
            <span className="truncate">{entry.label}</span>
            <span
                className={cn('text-help text-pretty break-words', active ? 'text-sidebar-accent-foreground/75' : 'text-muted-foreground')}
            >
                {entry.description}
            </span>
        </span>
    )
}

/** An expanded row's contents: the entry's mark, its words, and what waits at its end. */
function RowFace({ entry, active, unread, end = true }: { entry: RailEntry; active: boolean; unread: string; end?: boolean }) {
    const described = entry.description !== undefined
    return (
        <>
            <EntryMark entry={entry} className={cn('size-4', described && 'mt-0.75')} />
            <EntryText entry={entry} active={active} />
            {end && <RowEnd entry={entry} unread={unread} />}
        </>
    )
}

/** What a collapsed rail's tooltip says for an entry: its label, then its description. */
function TipText({ entry }: { entry: RailEntry }) {
    return (
        <>
            {entry.label}
            {entry.description !== undefined && <span className="text-muted-foreground"> {entry.description}</span>}
        </>
    )
}

/**
 * An expanded row's look: `active` wears the accent bar over a wash, `holding` sets a parent's label
 * apart. A `described` row grows to hold the description under its label, its icon level with the label.
 */
function rowClass(state: 'active' | 'holding' | 'idle', inset: 'none' | 'icon' | 'text' = 'none', described = false): string {
    return cn(
        'flex w-full gap-3 rounded-l-sm rounded-r-md border-l-2 pr-3 text-left text-sm',
        described ? 'min-h-(--density-row) items-start py-1.5' : 'h-(--density-row) items-center',
        inset === 'none' ? 'pl-2.5' : inset === 'icon' ? 'pl-9.5' : 'pl-5.5',
        state === 'active'
            ? 'border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground'
            : state === 'holding'
              ? 'border-transparent font-medium text-foreground hover:bg-hover'
              : 'border-transparent text-muted-foreground hover:bg-hover hover:text-foreground',
    )
}

/** What waits at an expanded row's end: its count, or its unread dot. */
function RowEnd({ entry, unread }: { entry: RailEntry; unread: string }) {
    const described = entry.description !== undefined
    if (entry.count !== undefined && entry.count > 0)
        return <span className={cn('ml-auto text-xs font-semibold text-foreground tabular-nums', described && 'mt-px')}>{entry.count}</span>
    if (entry.unread === true) return <UnreadDot label={unread} className={cn('ml-auto ring-0', described && 'mt-1.75')} />
    return null
}

/** A parent in the expanded rail: its row with the chevron at its end, and its entries folded under it. */
function RailParent({ entry, open, onOpen, unread }: { entry: RailEntry; open: boolean; onOpen: (open: boolean) => void; unread: string }) {
    const id = useId()
    const control = useRef<HTMLButtonElement>(null)
    const holds = holdsActive(entry)
    const state = entry.active === true || (holds && !open) ? 'active' : holds ? 'holding' : 'idle'
    const marked = entry.icon !== undefined || entry.dot !== undefined
    const described = entry.description !== undefined
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
                <button
                    ref={control}
                    type="button"
                    aria-expanded={open}
                    aria-controls={id}
                    className={rowClass(state, 'none', described)}
                    onClick={toggle}
                >
                    <RowFace entry={entry} active={state === 'active'} unread={unread} end={false} />
                    <span className={cn('ml-auto flex items-center gap-2', described && 'mt-0.75')}>
                        <RowEnd entry={entry} unread={unread} />
                        {chevron}
                    </span>
                </button>
            ) : (
                <div className="relative">
                    {renderLink(
                        entry,
                        <RowFace entry={entry} active={state === 'active'} unread={unread} />,
                        cn(rowClass(state, 'none', described), 'pr-9'),
                    )}
                    <button
                        ref={control}
                        type="button"
                        aria-label={entry.label}
                        aria-expanded={open}
                        aria-controls={id}
                        className={cn(
                            'absolute right-1 flex size-7 items-center justify-center rounded-md hover:bg-hover',
                            described ? 'top-1' : 'inset-y-0 my-auto',
                        )}
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
                                <RowFace entry={child} active={child.active === true} unread={unread} />,
                                rowClass(
                                    child.active === true ? 'active' : 'idle',
                                    marked ? 'icon' : 'text',
                                    child.description !== undefined,
                                ),
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
    unread,
    defaultOpen,
    sideOffset,
}: {
    entry: RailEntry
    trigger: (props: ComponentPropsWithRef<'button'>) => ReactElement
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
                            <RowFace entry={child} active={child.active === true} unread={unread} />,
                            rowClass(child.active === true ? 'active' : 'idle', 'none', child.description !== undefined),
                        )}
                    </Fragment>
                ))}
            </PopoverContent>
        </Popover>
    )
}

/** A parent in the collapsed rail: its icon opens its entries in a flyout, and its tooltip names it. */
function RailFlyout({ entry, unread, defaultOpen }: { entry: RailEntry; unread: string; defaultOpen: boolean }) {
    const active = entry.active === true || holdsActive(entry)
    const counted = entry.count !== undefined && entry.count > 0
    return (
        <Flyout
            entry={entry}
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
                                        : 'text-muted-foreground hover:bg-hover hover:text-foreground data-popup-open:bg-hover',
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
                                <TipText entry={entry} />
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
    markHref,
    groups,
    foot,
    unread,
    flyout,
    drag,
    lights,
}: {
    mark?: ReactNode
    name: string
    markHref?: string
    groups: RailGroup[]
    foot?: ReactNode
    unread: string
    flyout?: string
    drag?: string
    lights: boolean
}) {
    const face = mark !== undefined && (
        <span title={name} className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            {mark}
        </span>
    )
    const tile =
        face !== false && markHref !== undefined
            ? renderLink(
                  { id: 'home', label: name, href: markHref },
                  face,
                  'rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              )
            : face
    return (
        <aside
            data-variant="strip"
            className="flex h-full w-18 shrink-0 flex-col border-r border-border-strong bg-sidebar text-sidebar-foreground [--avatar-ring:var(--color-sidebar)]"
        >
            {(mark !== undefined || lights) && (
                <div
                    data-window-drag={drag}
                    className={cn('flex h-shell-top shrink-0 items-center justify-center', lights && UNDRAWN_EDGE)}
                >
                    {!lights && tile}
                </div>
            )}
            {lights && tile !== false && <div className="flex shrink-0 justify-center py-1">{tile}</div>}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-2">
                {groups.map((group, index) => (
                    <nav key={group.id} aria-label={group.title ?? name} className="flex flex-col gap-3">
                        {index > 0 && <span className="mx-auto h-px w-8 shrink-0 bg-border-strong" aria-hidden />}
                        {group.entries.map((entry) =>
                            entry.entries !== undefined && entry.entries.length > 0 ? (
                                <Flyout
                                    key={entry.id}
                                    entry={entry}
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
                                <StripLink key={entry.id} entry={entry} unread={unread} />
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
                        : 'group-hover/entry:bg-hover group-data-popup-open/entry:bg-hover',
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

function StripLink({ entry, unread }: { entry: RailEntry; unread: string }) {
    const active = entry.active === true
    return renderLink(entry, <StripFace entry={entry} active={active} unread={unread} />, stripClass(active))
}

function RailLink({ entry, collapsed, unread }: { entry: RailEntry; collapsed: boolean; unread: string }) {
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
                                        : 'text-muted-foreground hover:bg-hover hover:text-foreground',
                                ),
                            )}
                        </span>
                    )}
                />
                <Tooltip.Portal>
                    <Tooltip.Positioner side="right" sideOffset={8}>
                        <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-pop">
                            <TipText entry={entry} />
                        </Tooltip.Popup>
                    </Tooltip.Positioner>
                </Tooltip.Portal>
            </Tooltip.Root>
        )
    }
    return renderLink(
        entry,
        <RowFace entry={entry} active={entry.active === true} unread={unread} />,
        rowClass(entry.active === true ? 'active' : 'idle', 'none', entry.description !== undefined),
    )
}
