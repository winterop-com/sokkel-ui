import { Menu, PanelRight } from 'lucide-react'
import {
    Fragment,
    lazy,
    Suspense,
    useCallback,
    useContext,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type Key,
    type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { cn } from '../lib/cn'
import { CommandRegistry, useCommandRegistry } from '../hooks/use-commands'
import { useIsMobile, useMedia } from '../hooks/use-mobile'
import { useOverlay } from '../hooks/use-overlay'
import { ShortcutRegistry } from '../hooks/use-shortcuts'
import { trafficLightsStyle, useTrafficLights, windowPressHandler, type DesktopWindow } from '../lib/desktop'
import { useDesktopFullscreen } from '../lib/fullscreen'
import type { ShortcutGroup } from '../lib/shortcut-groups'
import { createShortcutRegistry, paletteMayOpen, type KeyBinding } from '../lib/shortcuts'

export { overSearch } from '../lib/shortcuts'
import type { CommandPaletteWords, PaletteFilter, PaletteFoot, PaletteGroup, PaletteSearch } from './CommandPalette'
import type { ShortcutsDialogWords } from './ShortcutsDialog'
import { PanelTabStrip, type PanelStrip, type PanelTabs } from './panel-strip'
import { STATUS_STRIP } from './StatusLine'
import {
    ShellDesktop,
    ShellDrawer,
    ShellFootCell,
    ShellPalette,
    ShellPaletteOpen,
    ShellPanelStrip,
    ShellRailAsk,
    ShellRailMode,
    ShellScroller,
    ShellShortcuts,
    ShellHeadSlot,
    ShellTopSlot,
    ShellTrail,
    ShellTrailAsk,
    type RailMode,
    type ShellSlot,
    type StatedTrail,
} from './shell-context'

export type { ShortcutGroup } from '../lib/shortcut-groups'
export type { RailMode } from './shell-context'

// The palette and the shortcuts load when they first open, so an app's start carries neither.
const CommandPalette = lazy(() => import('./CommandPalette').then((module) => ({ default: module.CommandPalette })))
const ShortcutsDialog = lazy(() => import('./ShortcutsDialog').then((module) => ({ default: module.ShortcutsDialog })))

export interface ShellProps {
    rail: ReactNode
    /**
     * Draws the rail narrowed to its icons (`collapsed`) or not at all (`hidden`), whatever the app
     * holds, as a work page with list and detail panes of its own wants; a screen asks the same from
     * inside with `useRailMode`. Left off, the rail is as the app holds it.
     */
    railMode?: RailMode
    /**
     * What the top bar holds: a search, the version, the theme control. A screen draws its own in
     * its place while it is mounted with `ShellTop`, or states only its trail with `useShellTrail`,
     * which a `TopBar` here draws in place of its own.
     */
    top?: ReactNode
    /** What the foot strip holds to the right of the rail's foot cell, if anything. */
    foot?: ReactNode
    /** A side panel as the shell's right column, full height, its header level with the top bar. */
    panel?: ReactNode
    /** A strip across the whole window between the content and the foot, under the rail and the panel. */
    bottom?: ReactNode
    /** A strip between the top bar and the content, such as a `Banner`, that does not scroll with the content. */
    banner?: ReactNode
    /**
     * Below `md`, draws a `SidePanel`'s tabs as a strip at the foot of the screen in place of the
     * panel's toggle: a tab raises the panel as a sheet on that tab, the open tab lowers it again.
     */
    panelStrip?: boolean
    /** Whether the panel shows; held inside the shell when not given. */
    panelOpen?: boolean
    onPanelOpenChange?: (open: boolean) => void
    /** Whether the rail's drawer on a narrow window is open; held inside the shell when not given. */
    drawerOpen?: boolean
    onDrawerOpenChange?: (open: boolean) => void
    /** The app's current route, such as the location's path or key: the drawer closes when it changes. */
    route?: string
    /** The command palette's groups; the shell opens it on ⌘K or Ctrl+K and from the top bar's search. No palette without it. */
    palette?: readonly PaletteGroup[]
    /** Whether the palette is open; held inside the shell when not given. */
    paletteOpen?: boolean
    /** Whether the palette starts open. */
    defaultPaletteOpen?: boolean
    onPaletteOpenChange?: (open: boolean) => void
    /**
     * Asked first whenever the palette would open (its keys, the top bar, `useShell`'s
     * `openPalette`), with the layer standing over the page: the dialog, sheet or menu open on top,
     * or an overlay from `useOverlay`, and null where nothing does. True opens it, over that layer
     * too, as over an app's own search the palette replaces; false keeps it closed, as over an app's
     * own full-screen view. `overSearch(over)` says whether the layer is a `Search`'s results.
     * Without it the palette opens where nothing stands over the page, and over a `Search`'s
     * results alone, which close as it opens.
     */
    mayOpenPalette?: (over: Element | null) => boolean
    paletteWords?: Partial<CommandPaletteWords>
    /** The app's search, whose results the palette lists under its commands. */
    paletteSearch?: PaletteSearch
    /** How the palette matches its commands to what is typed, as `CommandPalette`'s `filter`. */
    paletteFilter?: PaletteFilter
    /** The strip at the palette's foot, with the app's mark and name and the keys it answers, as `CommandPalette`'s `foot`. */
    paletteFoot?: PaletteFoot
    /**
     * The keys the app answers itself, listed in the shortcuts dialog after the keys bound with
     * `useShortcuts`; given, even empty, the shell holds the dialog and opens it on `?`.
     */
    shortcuts?: readonly ShortcutGroup[]
    /** Whether the shortcuts dialog is open; held inside the shell when not given. */
    shortcutsOpen?: boolean
    /** Whether the shortcuts dialog starts open. */
    defaultShortcutsOpen?: boolean
    onShortcutsOpenChange?: (open: boolean) => void
    shortcutsWords?: Partial<ShortcutsDialogWords>
    /** The desktop window the shell stands in, when its native title bar is hidden; leave it off in a browser. */
    desktop?: DesktopWindow
    /** Keys the content: a new value mounts the page afresh, its state let go, as after a reconnect. */
    contentKey?: Key
    /**
     * The route shown, such as its path. Given, each change moves the focus to the new page's main
     * heading (its first shown `h1`), so a reader who opened a search result or ran a command starts
     * on the page rather than in the field they left. A page still loading is waited for, up to 3
     * seconds and until the reader presses a key or the pointer. Off when not given.
     */
    routeKey?: Key
    children: ReactNode
    words?: Partial<ShellWords>
}

/** The `h1`s a page's area holds, each with its words. */
export type HeadingMarks = readonly (readonly [HTMLElement, string | null])[]

/** The `h1`s in a page's area now, each with its words. */
export const headingMarks = (area: ParentNode | null): HeadingMarks =>
    [...(area?.querySelectorAll('h1') ?? [])].map((h) => [h, h.textContent])

/**
 * Moves the focus to the first `h1` in a page's area a reader can see (laid out, outside any inert
 * or `aria-hidden` part) that is none of `before`, the headings shown before the route changed,
 * unless its words changed. It is focusable only until the focus leaves it unless it was already;
 * false when the area has none.
 */
export function focusHeading(area: ParentNode | null, before: HeadingMarks = []): boolean {
    const heading = headingMarks(area).find(
        ([h, words]) =>
            h.getClientRects().length > 0 && !h.closest('[inert],[aria-hidden=true]') && !before.some(([b, w]) => b === h && w === words),
    )?.[0]
    if (!heading) return false
    if (!heading.hasAttribute('tabindex')) {
        heading.tabIndex = -1
        heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true })
    }
    heading.focus()
    return true
}

/**
 * Focuses a new page's heading (`focusHeading`) once it shows, looking again every 50 ms while the
 * page loads, for `wait` ms at most and until the reader presses a key or the pointer. Returns the
 * way to stop looking.
 */
export function awaitHeading(area: HTMLElement, before?: HeadingMarks, wait = 3000): () => void {
    const done = new AbortController()
    const stop = () => done.abort()
    const look = () => (focusHeading(area, before) || (wait -= 50) < 0) && stop()
    const timer = setInterval(look, 50)
    done.signal.onabort = () => clearInterval(timer)
    for (const type of ['keydown', 'pointerdown']) addEventListener(type, stop, { capture: true, signal: done.signal })
    look()
    return stop
}

/**
 * The app's frame: the rail on the left, a thin top bar over the content, the content as the one
 * thing that scrolls, and an optional foot strip.
 *
 * The top bar and the rail's head are the same height, so the shell reads as one strip across the
 * window; the rule under the top bar ends at the rail's edge, as the rail's head draws none, in the
 * frame and in the drawer. With a `foot`, a `StatusLine`, which draws the foot strip itself in the
 * room the shell gives it, the rail's foot cell (the `AccountMenu`) sits in the window's bottom-left
 * corner level with the strip, so the account and the status read as one bar across the window's
 * foot, under the rail, the content and the panel.
 *
 * A `bottom` strip docks between the content and the foot, across the whole window under the rail
 * and the panel, for what belongs to the whole app rather than one screen, such as a player. The
 * rail's foot cell stays at the window's bottom edge under it, beside the foot strip, a status
 * line's empty strip when there is no `foot` and the rail has a foot.
 *
 * A `banner`, such as a `Banner` saying the server is not answering, stands between the top bar and
 * the content: it does not scroll with the content and covers none of it.
 *
 * Below the `md` breakpoint the rail leaves the frame: a menu button at the start of the top bar
 * opens it as a drawer over the content, drawn expanded even where the app holds it `collapsed`,
 * its head's end closing it. A press outside it, on a link or Escape closes it, and so does a
 * change of the app's `route`, so a page reached from the palette or by the app's own navigation
 * closes it too; `drawerOpen` with `onDrawerOpenChange` holds it from outside. The drawer and the
 * panel's sheet are marked `data-overlay`, so the panels' resize edges are not drawn there; while
 * either is open over the content, the content is out of reach (`useOverlay`).
 *
 * The frame keeps clear of a phone's notch and home indicator by the safe-area insets, on all four
 * sides. They are zero unless the app's page opts in to drawing under them with
 * `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, which
 * a web app added to a home screen wants.
 *
 * A panel is shown or hidden by a toggle held in the window's top-right corner: at the end of the top bar while the
 * panel is closed, in the corner of the panel's header while it is open. From the `lg` breakpoint it is
 * the right column; below it, an open panel slides over the content from the right and a press
 * outside it or Escape closes it. The panel eases in and out either way, as far as the document's motion allows.
 * Left to itself it starts open on a wide window and closed on a narrow one;
 * `panelOpen` with `onPanelOpenChange` holds it from outside, which is how a panel's own close
 * button closes it.
 *
 * With `panelStrip`, below `md` a `SidePanel`'s tabs stand in a strip at the foot of the screen, under
 * the foot, in place of the toggle: pressing a tab raises the panel as a sheet from the strip on that
 * tab, another tab switches the sheet to it, and the open tab, a press above the sheet or Escape
 * lowers it. The strip stays in reach while the sheet is up, and each tab is a finger's height.
 *
 * With `palette`, the shell holds the app's command palette: ⌘K on a Mac and Ctrl+K elsewhere open
 * it, from a field too, and close it again; so does the top bar's palette button, unless the app
 * gives `TopBar` its own `onSearch`. Left to itself it does not open over a dialog, a menu or an
 * overlay, but it does open over a `Search`'s results, such as the top bar's, which close as it
 * opens, the palette taking the search's place. `mayOpenPalette`, asked first with the layer on
 * top, decides in its place: no over an app's own full-screen view, yes over an app's own search
 * that the palette replaces (the app closes that in `onPaletteOpenChange`), and `overSearch` tells
 * it a `Search`'s results. `paletteOpen` with `onPaletteOpenChange` holds it from
 * outside, and `paletteFilter` chooses how it matches its commands. `placeCommands` makes its
 * places from the rail's groups and `appearanceCommands` its scheme, density and theme, from
 * `useAppearance` or from callbacks of an app that keeps its look itself. A screen adds its own
 * groups while it is mounted with `useCommands`, listed with the shell's by their `rank`.
 *
 * The shell answers the keys screens bind with `useShortcuts` while they are mounted, its own (the
 * palette's, the shortcuts') yielding to theirs, and keeps them quiet while the palette or the
 * shortcuts dialog is open. With `shortcuts`, it holds the shortcuts dialog: `?` outside a field
 * opens it, bound once here however many account menus the frame draws, and so does the account
 * menu's Keyboard shortcuts, listing every key bound with a label and the groups given for keys the
 * app answers itself; `shortcutsOpen` with `onShortcutsOpenChange` holds it from outside, as a
 * palette row that opens it does. A screen inside opens either with `useShell`. `useScrollMemory`
 * keeps the content's place per screen, and a new `contentKey` mounts the content afresh, as after
 * the server has come back. Given `routeKey`, each new route moves the focus to the page's main
 * heading (`awaitHeading`), out of the search field or the palette it was opened from, once the page
 * shows it.
 *
 * A screen holds its own head above the scroller with `ShellHead`, such as its `PageHeader` and its
 * tabs, so they stay in view while the content under them scrolls; the content stays the one
 * scroller, so `useScrollMemory` keeps its place. The scroller's track is thin and keeps its room
 * whether or not the content scrolls, and the head keeps the same room, so both end at one right edge.
 *
 * `railMode` narrows the rail to its icons or hides it whatever the app holds, for a work page with
 * list and detail panes of its own, and a screen asks the same while it is mounted with
 * `useRailMode`, the latest screen's ask going before the prop; once nothing asks, the rail is as the
 * app holds it again. Narrowed, its mark still widens it for the reader until the ask changes, and
 * the account in its foot follows it. Hidden, the top bar's menu button opens it as the drawer at
 * every width. With no ask, the rail narrows to its icons while the panel is open on a window under
 * `xl`, so the content between them keeps its room.
 *
 * With `desktop`, the shell stands in a desktop window whose native title bar is hidden: its top
 * strip, the rail's head and the top bar (and an open panel's header), is the window's drag
 * region, and `trafficLights` leaves room at its start for the window's own buttons: in the
 * rail's head, or in the top bar where no rail shows or a collapsed rail is narrower than the room.
 * `setFullscreen` hands every part that goes full screen the window's own (`lib/fullscreen`).
 */
export function Shell({
    rail,
    railMode: givenRailMode,
    top,
    foot,
    panel,
    bottom,
    banner,
    panelStrip = false,
    panelOpen,
    onPanelOpenChange,
    drawerOpen,
    onDrawerOpenChange,
    route,
    palette,
    paletteOpen,
    defaultPaletteOpen = false,
    onPaletteOpenChange,
    mayOpenPalette,
    paletteWords,
    paletteSearch,
    paletteFilter,
    paletteFoot,
    shortcuts,
    shortcutsOpen,
    defaultShortcutsOpen = false,
    onShortcutsOpenChange,
    shortcutsWords,
    desktop,
    contentKey,
    routeKey,
    children,
    words: given,
}: ShellProps) {
    const words = { ...SHELL_WORDS, ...given }
    // What screens ask of the rail while they are mounted, the latest last.
    const [railAsks, setRailAsks] = useState<readonly { id: string; mode: RailMode }[]>([])
    const askRail = useCallback((id: string, mode: RailMode) => {
        setRailAsks((asks) => [...asks.filter((ask) => ask.id !== id), { id, mode }])
        return () => setRailAsks((asks) => asks.filter((ask) => ask.id !== id))
    }, [])
    const railMode = railAsks.at(-1)?.mode ?? givenRailMode
    // The screens that draw the top bar, and the head above the scroller, while they are mounted.
    const [topSlot, setTopTarget] = useSlot()
    const topShown = topSlot.shown
    const [headSlot, setHeadTarget] = useSlot()
    // The trails screens state for the top bar while they are mounted, the latest last.
    const [trails, setTrails] = useState<readonly { id: string; stated: StatedTrail }[]>([])
    const stateTrail = useCallback((id: string, stated: StatedTrail) => {
        setTrails((now) => [...now.filter((one) => one.id !== id), { id, stated }])
        return () => setTrails((now) => now.filter((one) => one.id !== id))
    }, [])
    const trailShown = trails.at(-1)?.stated
    const railHidden = railMode === 'hidden'
    const [ownDrawer, setOwnDrawer] = useState(false)
    const drawer = drawerOpen ?? ownDrawer
    const setDrawer = useCallback(
        (next: boolean) => {
            if (drawerOpen === undefined) setOwnDrawer(next)
            onDrawerOpenChange?.(next)
        },
        [drawerOpen, onDrawerOpenChange],
    )
    const closeDrawer = useCallback(() => setDrawer(false), [setDrawer])
    const drawerContext = useMemo(() => ({ close: closeDrawer, label: words.close }), [closeDrawer, words.close])
    // A change of route closes the drawer, however the app navigated.
    const routeSeen = useRef(route)
    useEffect(() => {
        if (routeSeen.current === route) return
        routeSeen.current = route
        if (drawer) setDrawer(false)
    }, [route, drawer, setDrawer])
    const [footCell, setFootCell] = useState<HTMLDivElement | null>(null)
    const wide = useMedia(WIDE, true)
    const [ownOpen, setOwnOpen] = useState<boolean | null>(null)
    const open = panelOpen ?? ownOpen ?? wide
    const roomy = useMedia(ROOMY, true)
    const crowded = panel !== undefined && open && wide && !roomy
    const setOpen = (next: boolean) => {
        if (panelOpen === undefined) setOwnOpen(next)
        onPanelOpenChange?.(next)
    }
    // A panel opened over a narrow window closes when the window is widened to the column, and
    // is not carried back over the content when it narrows again.
    const [wasWide, setWasWide] = useState(wide)
    if (wasWide !== wide) {
        setWasWide(wide)
        if (panelOpen === undefined) setOwnOpen(null)
    }
    // With a foot or a bottom strip the frame is a grid, so the rail's foot can sit in the corner cell.
    const docked = bottom !== undefined || foot !== undefined
    const commandRegistry = useCommandRegistry()
    const screenGroups = commandRegistry.groups
    const groups = useMemo(() => (palette === undefined ? [] : [...screenGroups, ...palette]), [palette, screenGroups])
    const lights = useTrafficLights(desktop)
    useDesktopFullscreen(desktop)
    const [shortcutRegistry] = useState(() => createShortcutRegistry())
    const [paletteIsOpen, paletteShown, setOwnPaletteOpen] = useOpened(paletteOpen, defaultPaletteOpen)
    const [shortcutsIsOpen, shortcutsShown, setOwnShortcutsOpen] = useOpened(shortcutsOpen, defaultShortcutsOpen)
    const held = {
        palette: paletteOpen !== undefined,
        isOpen: paletteIsOpen,
        onPaletteOpenChange,
        mayOpenPalette,
        shortcuts: shortcutsOpen !== undefined,
        onShortcutsOpenChange,
    }
    const latest = useRef(held)
    useEffect(() => {
        latest.current = held
    })
    // Opening asks `mayOpenPalette` with the layer on top, or else opens where nothing but a search's results stands over the page.
    const setPalette = useCallback(
        (next: boolean) => {
            if (next) {
                if (latest.current.isOpen) return
                if (!paletteMayOpen(shortcutRegistry, latest.current.mayOpenPalette)) return
            }
            if (!latest.current.palette) setOwnPaletteOpen(next)
            latest.current.onPaletteOpenChange?.(next)
        },
        [shortcutRegistry],
    )
    const openPalette = useCallback(() => setPalette(true), [setPalette])
    // The keys close an open palette and open a closed one.
    const togglePalette = useCallback(() => setPalette(!latest.current.isOpen), [setPalette])
    const commands = palette !== undefined && paletteShown && (
        <Suspense fallback={null}>
            <CommandPalette
                open={paletteIsOpen}
                onOpenChange={setPalette}
                groups={groups}
                search={paletteSearch}
                filter={paletteFilter}
                foot={paletteFoot}
                words={paletteWords}
            />
        </Suspense>
    )
    const setShortcuts = useCallback((next: boolean) => {
        if (!latest.current.shortcuts) setOwnShortcutsOpen(next)
        latest.current.onShortcutsOpenChange?.(next)
    }, [])
    const openShortcuts = useCallback(() => setShortcuts(true), [setShortcuts])
    const keys = shortcuts !== undefined && shortcutsShown && (
        <Suspense fallback={null}>
            <ShortcutsDialog open={shortcutsIsOpen} onOpenChange={setShortcuts} groups={shortcuts} words={shortcutsWords} />
        </Suspense>
    )
    useEffect(() => shortcutRegistry.listen(window), [shortcutRegistry])
    useEffect(() => {
        shortcutRegistry.surface('palette', paletteIsOpen)
        shortcutRegistry.surface('shortcuts', shortcutsIsOpen)
    }, [shortcutRegistry, paletteIsOpen, shortcutsIsOpen])
    const hasPalette = palette !== undefined
    const hasShortcuts = shortcuts !== undefined
    useEffect(() => {
        const own: KeyBinding[] = []
        if (hasPalette)
            own.push({
                id: 'palette',
                key: 'k',
                mod: true,
                alsoCtrl: true,
                inFields: true,
                inDialogs: true,
                label: words.openPalette,
                run: togglePalette,
            })
        if (hasShortcuts) own.push({ id: 'shortcuts', key: '?', label: words.openShortcuts, run: openShortcuts })
        shortcutRegistry.set('shell', own, { fallback: true })
    }, [shortcutRegistry, hasPalette, hasShortcuts, words.openPalette, words.openShortcuts, togglePalette, openShortcuts])
    const mobile = useIsMobile()
    // The side panel's tabs, handed up for the strip, and the ids the strip and the panel share.
    const [stripTabs, setStripTabs] = useState<PanelTabs | null>(null)
    const stripBase = useId()
    const stripping = panelStrip && panel !== undefined && mobile && stripTabs !== null && stripTabs.tabs.length > 0
    const stripContext = useMemo<PanelStrip | undefined>(
        () =>
            panelStrip
                ? { publish: setStripTabs, shown: stripping, tabId: (id) => `${stripBase}-tab-${id}`, panelId: `${stripBase}-panel` }
                : undefined,
        [panelStrip, stripping, stripBase],
    )
    // A hidden rail opens as the drawer at every width.
    const drawerRef = useOverlay(drawer && (mobile || railHidden), { onClose: closeDrawer })
    const panelRef = useOverlay(panel !== undefined && !wide && open, { onClose: () => setOpen(false), inert: false })
    const [main, setMain] = useState<HTMLElement | null>(null)
    // The page's area, its head and its scroller, where its heading is looked for.
    const [page, setPage] = useState<HTMLElement | null>(null)
    // The headings shown as the route changes are read before the new page draws, so none is taken for the new one's.
    const [moved, setMoved] = useState<[Key | undefined, HeadingMarks?]>([routeKey])
    if (moved[0] !== routeKey) setMoved([routeKey, headingMarks(page)])
    useEffect(() => (page && moved[1] ? awaitHeading(page, moved[1]) : undefined), [moved, page])

    const toggle = panel !== undefined && !stripping && (
        <button
            type="button"
            aria-label={open ? words.hidePanel : words.showPanel}
            aria-pressed={open}
            title={open ? words.hidePanel : words.showPanel}
            data-window-no-drag
            className={cn(
                'absolute top-[calc(env(safe-area-inset-top)+(var(--spacing-shell-top)-var(--density-control))/2)] right-[calc(env(safe-area-inset-right)+0.5rem)] z-dialog flex size-(--density-control) items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid',
                open && 'text-foreground',
            )}
            onClick={() => setOpen(!open)}
        >
            <PanelRight className="size-4" aria-hidden />
        </button>
    )
    const drawn = drawer && (
        <div ref={drawerRef} className={cn('fixed inset-0 z-drawer outline-none', !railHidden && 'md:hidden')}>
            <button type="button" aria-label={words.close} className="absolute inset-0 bg-scrim" onClick={closeDrawer} />
            <div
                data-overlay
                className="absolute inset-y-0 left-0 flex bg-sidebar pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] shadow-pop"
                onClick={(event) => {
                    if ((event.target as HTMLElement).closest('a')) closeDrawer()
                }}
            >
                <ShellDrawer value={drawerContext}>{rail}</ShellDrawer>
            </div>
        </div>
    )
    // The foot's room; the status line in it draws the strip.
    const strip = foot !== undefined && (
        <footer className={cn('flex min-w-0 shrink-0', docked && 'col-start-2 row-start-3 peer-empty:col-span-full')}>{foot}</footer>
    )
    const content = (
        <div className="flex min-w-0 flex-1 flex-col">
            {(top !== undefined || topShown !== undefined) && (
                <header
                    data-window-drag={desktop === undefined ? undefined : ''}
                    className={cn(
                        'flex h-shell-top shrink-0 items-center gap-2 border-b border-border-strong bg-sidebar px-3',
                        panel !== undefined && !(open && wide) && !stripping && 'pr-12',
                        // The room for the window's buttons is the rail's to leave where a rail shows, and
                        // the top bar's where none does or a collapsed rail or a strip is narrower than it.
                        lights &&
                            'ps-(--spacing-traffic-lights) md:group-has-[[data-shell-rail]>aside]/shell:ps-3 md:group-has-[[data-shell-rail]>aside[data-collapsed]]/shell:ps-[max(0.75rem,calc(var(--spacing-traffic-lights)-3.5rem-1px))] md:group-has-[[data-shell-rail]>aside[data-variant=strip]]/shell:ps-[max(0.75rem,calc(var(--spacing-traffic-lights)-4.5rem))]',
                    )}
                >
                    <button
                        type="button"
                        aria-label={words.menu}
                        title={words.menu}
                        aria-expanded={drawer}
                        className={cn(
                            // As the rail's collapse control: the hover's ground and ink, and the button's own focus look.
                            'flex size-(--density-control) items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid max-md:size-finger',
                            !railHidden && 'md:hidden',
                        )}
                        onClick={() => setDrawer(true)}
                    >
                        <Menu className="size-4" aria-hidden />
                    </button>
                    {/* A screen's `ShellTop` draws into this box, in place of `top`, while it is mounted. */}
                    <div ref={setTopTarget} className="contents" />
                    {topShown === undefined && <ShellTrail value={trailShown}>{top}</ShellTrail>}
                </header>
            )}
            {banner !== undefined && banner !== null && banner !== false && <div className="shrink-0">{banner}</div>}
            <div ref={setPage} className="flex min-h-0 flex-1 flex-col">
                {/* A screen's `ShellHead` draws into this box, held above the scroller, while it is mounted. */}
                <div
                    ref={setHeadTarget}
                    className="@container scroller-thin shrink-0 overflow-hidden border-border empty:hidden has-[>[data-shell-head-rule]]:border-b"
                />
                <main className="@container relative scroller-thin min-h-0 flex-1 overflow-y-auto" ref={setMain}>
                    <Fragment key={contentKey}>{children}</Fragment>
                </main>
            </div>
            {!docked && strip}
        </div>
    )
    const panels = (
        <>
            {panel !== undefined && wide && (
                // The column eases between none and the panel's own width; the panel inside keeps its width throughout.
                <div
                    inert={!open}
                    aria-hidden={!open || undefined}
                    className={cn(
                        'grid min-h-0 transition-[grid-template-columns] duration-base ease-motion',
                        open ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]',
                    )}
                >
                    <div className="flex min-w-0 overflow-hidden">
                        <div className="flex w-max">{panel}</div>
                    </div>
                </div>
            )}
            {panel !== undefined && !wide && (
                <div
                    ref={panelRef}
                    inert={!open}
                    aria-hidden={!open || undefined}
                    className={cn(
                        'fixed inset-0 z-drawer outline-none',
                        // The sheet rises from the strip, which stays in reach under it.
                        stripping && 'bottom-[calc(var(--spacing-shell-tabs)+env(safe-area-inset-bottom))] overflow-hidden',
                        !open && 'pointer-events-none',
                    )}
                >
                    <button
                        type="button"
                        aria-label={words.hidePanel}
                        tabIndex={open ? undefined : -1}
                        className={cn('absolute inset-0 bg-scrim transition-opacity duration-base', open ? 'opacity-100' : 'opacity-0')}
                        onClick={() => setOpen(false)}
                    />
                    <div
                        data-overlay
                        className={cn(
                            'absolute flex bg-sidebar pr-[env(safe-area-inset-right)] shadow-pop transition-transform duration-base ease-motion',
                            stripping
                                ? 'inset-x-0 top-[calc(env(safe-area-inset-top)+var(--spacing-shell-top))] bottom-0 overflow-hidden rounded-t-surface pl-[env(safe-area-inset-left)]'
                                : 'inset-y-0 right-0 max-w-[calc(100vw-3rem)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] [&>*]:max-w-full',
                            !open && 'shadow-none',
                            open ? 'translate-0' : stripping ? 'translate-y-full' : 'translate-x-full',
                        )}
                    >
                        {panel}
                    </div>
                </div>
            )}
        </>
    )

    const pressTab = (id: string) => {
        if (stripTabs === null) return
        if (open && id === stripTabs.active) {
            setOpen(false)
            return
        }
        if (id !== stripTabs.active) stripTabs.choose(id)
        if (!open) setOpen(true)
    }
    const tabStrip = (inGrid: boolean) =>
        stripping &&
        stripTabs !== null &&
        stripContext && (
            <PanelTabStrip
                {...stripTabs}
                {...stripContext}
                open={open}
                label={words.panelTabs}
                onPress={pressTab}
                className={inGrid ? 'col-span-full row-start-4' : undefined}
            />
        )

    // A press anywhere in the frame is handed to the window when it lands in the top strip.
    const frame = { style: trafficLightsStyle(desktop), onMouseDown: windowPressHandler(desktop) }
    const provide = (node: ReactNode) => (
        <ShortcutRegistry value={shortcutRegistry}>
            <ShellPalette value={palette === undefined ? undefined : openPalette}>
                <ShellPaletteOpen value={palette !== undefined && paletteIsOpen}>
                    <ShellShortcuts value={shortcuts === undefined ? undefined : openShortcuts}>
                        <ShellDesktop value={desktop}>
                            <ShellRailAsk value={askRail}>
                                <ShellRailMode value={railMode ?? (crowded ? 'collapsed' : undefined)}>
                                    <ShellScroller value={main}>
                                        <ShellPanelStrip value={stripContext}>
                                            <ShellTopSlot value={topSlot}>
                                                <ShellHeadSlot value={headSlot}>
                                                    <ShellTrailAsk value={stateTrail}>
                                                        <CommandRegistry value={commandRegistry.registry}>{node}</CommandRegistry>
                                                    </ShellTrailAsk>
                                                </ShellHeadSlot>
                                            </ShellTopSlot>
                                        </ShellPanelStrip>
                                    </ShellScroller>
                                </ShellRailMode>
                            </ShellRailAsk>
                        </ShellDesktop>
                    </ShellShortcuts>
                </ShellPaletteOpen>
                {commands}
                {keys}
            </ShellPalette>
        </ShortcutRegistry>
    )

    if (!docked)
        return provide(
            <div
                {...frame}
                className="group/shell relative flex h-svh min-h-0 flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] text-foreground"
            >
                {toggle}
                <div className="flex min-h-0 flex-1">
                    {!railHidden && (
                        <div data-shell-rail className="hidden md:flex">
                            {rail}
                        </div>
                    )}
                    {drawn}
                    {content}
                    {panels}
                </div>
                {tabStrip(false)}
            </div>,
        )

    // The rail's column is as wide as the rail, so the foot cell under the bottom strip follows the
    // rail's width as it is dragged or collapsed; the cell hides while the rail has no foot in it.
    return provide(
        <div
            {...frame}
            className="group/shell relative grid h-svh min-h-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto_auto_auto] overflow-hidden bg-background pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] text-foreground"
        >
            {toggle}
            {!railHidden && (
                <div data-shell-rail className="col-start-1 row-start-1 hidden min-h-0 md:flex">
                    <ShellFootCell value={footCell}>{rail}</ShellFootCell>
                </div>
            )}
            {drawn}
            <div className="col-start-2 row-start-1 flex min-h-0 min-w-0">
                {content}
                {panels}
            </div>
            <div className="col-span-full row-start-2 min-w-0">{bottom}</div>
            <div ref={setFootCell} className="peer col-start-1 row-start-3 hidden w-0 min-w-full md:flex md:empty:hidden" />
            {strip !== false ? (
                strip
            ) : (
                // With no foot, a status line's empty strip stands beside the rail's foot cell, so the cell has its bar.
                <div aria-hidden className={cn(STATUS_STRIP, 'col-start-2 row-start-3 hidden md:flex md:peer-empty:hidden')} />
            )}
            {tabStrip(true)}
        </div>,
    )
}

export interface ShellWords {
    menu: string
    close: string
    showPanel: string
    hidePanel: string
    /** The name of the strip of the panel's tabs on a phone. */
    panelTabs: string
    /** What ⌘K or Ctrl+K does, as the shortcuts dialog lists it. */
    openPalette: string
    /** What `?` does, as the shortcuts dialog lists it. */
    openShortcuts: string
}

/** The shell's own words in English; a shell with words of its own starts from these. */
export const SHELL_WORDS: ShellWords = {
    menu: 'Open the navigation',
    close: 'Close the navigation',
    showPanel: 'Show the panel',
    hidePanel: 'Hide the panel',
    panelTabs: 'Panel',
    openPalette: 'Open the command palette',
    openShortcuts: 'Show the keyboard shortcuts',
}

/** What a screen inside a `Shell` can open of the shell's. */
export interface ShellControls {
    /** Opens the command palette, asking `mayOpenPalette` as its keys do; undefined where the shell holds no palette. */
    openPalette: (() => void) | undefined
    /** Opens the keyboard shortcuts dialog; undefined where the shell holds none. */
    openShortcuts: (() => void) | undefined
}

/**
 * The shell around a screen, for what the screen opens of it: the command palette and the
 * keyboard shortcuts, from a button or a command of the screen's own. Outside a `Shell` both are
 * undefined.
 */
export function useShell(): ShellControls {
    const openPalette = useContext(ShellPalette)
    const openShortcuts = useContext(ShellShortcuts)
    return useMemo(() => ({ openPalette, openShortcuts }), [openPalette, openShortcuts])
}

/**
 * A dialog of the shell's, open as `held` says or else as the shell keeps it, and whether it is
 * drawn: from its first opening on, so it can close with its own animation.
 */
function useOpened(held: boolean | undefined, initial: boolean) {
    const [own, setOwn] = useState(initial)
    const open = held ?? own
    const [shown, setShown] = useState(initial)
    if (open && !shown) setShown(true)
    return [open, shown, setOwn] as const
}

/** A box one screen at a time fills: who has claimed it (the latest mounted drawn) and the element it is drawn into. */
function useSlot(): [ShellSlot, (target: HTMLDivElement | null) => void] {
    const [claims, setClaims] = useState<readonly string[]>([])
    const claim = useCallback((id: string) => {
        setClaims((now) => [...now.filter((one) => one !== id), id])
        return () => setClaims((now) => now.filter((one) => one !== id))
    }, [])
    const [target, setTarget] = useState<HTMLDivElement | null>(null)
    const shown = claims.at(-1)
    return [useMemo(() => ({ target, shown, claim }), [target, shown, claim]), setTarget]
}

/** A layout effect in the browser, so an asked rail is drawn before the page paints; a plain one on a server. */
const useBeforePaint = typeof document === 'undefined' ? useEffect : useLayoutEffect

/**
 * Narrows the shell's rail to its icons (`collapsed`) or hides it (`hidden`) while the calling
 * screen is mounted, as a work page with list and detail panes of its own wants; undefined asks
 * nothing. The rail is back as the app holds it once the screen unmounts. The latest screen to ask
 * goes before an earlier one and before `Shell`'s `railMode`. Outside a `Shell` it does nothing.
 */
export function useRailMode(mode: RailMode | undefined): void {
    const ask = useContext(ShellRailAsk)
    const id = useId()
    useBeforePaint(() => {
        if (ask === undefined || mode === undefined) return
        return ask(id, mode)
    }, [ask, id, mode])
}

/** The `lg` breakpoint, from which the panel is a column rather than a sheet. */
const WIDE = '(min-width: 64rem)'

/** The `xl` breakpoint, from which the rail stays open beside an open panel. */
const ROOMY = '(min-width: 80rem)'

export interface PageProps {
    children: ReactNode
    className?: string
}

/**
 * The content's own padding, the density's page inset, for a page to sit in. The inset is the
 * wide one where the shell's content (or the window, outside a shell) is 40rem or wider, and the
 * phone-sized one below it.
 */
export function Page({ children, className }: PageProps) {
    return (
        <div className={cn('flex flex-col gap-(--density-page-gap) px-(--density-page-inset) pt-(--density-page-top) pb-10', className)}>
            {children}
        </div>
    )
}

export interface ShellTopProps {
    /** The top bar's content, such as a `TopBar` with the screen's trail and actions. */
    children: ReactNode
}

/**
 * Draws a screen's own top bar in the shell's, in place of `Shell`'s `top`, while the screen is
 * mounted: the screen keeps its head with its state, such as a trail naming the record it shows or
 * actions on it, rather than handing it up to where the shell is built. The latest screen to draw
 * one goes before an earlier one, and `top` is back once none is mounted. Outside a `Shell` it
 * draws nothing.
 */
export function ShellTop({ children }: ShellTopProps) {
    const slot = useContext(ShellTopSlot)
    const claim = slot?.claim
    const id = useId()
    useBeforePaint(() => claim?.(id), [claim, id])
    return slot?.target && slot.shown === id ? createPortal(children, slot.target) : null
}

export interface ShellHeadProps {
    /** The screen's head, such as its `PageHeader` and the tabs under it. */
    children: ReactNode
    /**
     * Whether the head stands in the page's inset over a rule (the default), lined up with a `Page`
     * under it; false draws it edge to edge with no rule, for a head that draws its own edges.
     */
    inset?: boolean
}

/**
 * Holds a screen's head above the shell's scroller while the screen is mounted, so its title, its
 * actions and its tabs stay in view while the content under them scrolls; the content stays the
 * shell's one scroller. The head stands in the page's inset over a rule, and ends at the content's
 * right edge, its scroll bar's room kept. The latest screen to draw one goes before an earlier
 * one. Outside a `Shell` it draws its head in place.
 */
export function ShellHead({ children, inset = true }: ShellHeadProps) {
    const slot = useContext(ShellHeadSlot)
    const claim = slot?.claim
    const id = useId()
    useBeforePaint(() => claim?.(id), [claim, id])
    // In the shell the rule is the box's, so it runs on under the scroll bar's room.
    const head = inset ? (
        <div
            data-shell-head-rule
            className={cn(
                'flex flex-col gap-(--density-page-gap) px-(--density-page-inset) pt-(--density-page-top) pb-(--density-page-gap)',
                slot === undefined && 'border-b border-border',
            )}
        >
            {children}
        </div>
    ) : (
        children
    )
    if (slot === undefined) return <>{head}</>
    return slot.target && slot.shown === id ? createPortal(head, slot.target) : null
}

export { useShellTrail, type ShellTrailOptions } from './shell-context'
