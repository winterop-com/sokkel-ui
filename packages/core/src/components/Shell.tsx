import { Menu, PanelRight } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { CommandRegistry, useCommandRegistry } from '../hooks/use-commands'
import { useIsMobile } from '../hooks/use-mobile'
import { useOverlay } from '../hooks/use-overlay'
import { ShortcutRegistry } from '../hooks/use-shortcuts'
import { trafficLightsStyle, useTrafficLights, windowPressHandler, type DesktopWindow } from '../lib/desktop'
import { createShortcutRegistry, type KeyBinding, type ShortcutGroup } from '../lib/shortcuts'
import type { CommandPaletteWords, PaletteGroup, PaletteSearch } from './CommandPalette'
import type { ShortcutsDialogWords } from './ShortcutsDialog'
import { ShellDesktop, ShellFootCell, ShellPalette, ShellScroller, ShellShortcuts } from './shell-context'

// The palette and the shortcuts load when they first open, so an app's start carries neither.
const CommandPalette = lazy(() => import('./CommandPalette').then((module) => ({ default: module.CommandPalette })))
const ShortcutsDialog = lazy(() => import('./ShortcutsDialog').then((module) => ({ default: module.ShortcutsDialog })))

/**
 * The app's frame: the rail on the left, a thin top bar over the content, the content as the one
 * thing that scrolls, and an optional foot strip.
 *
 * The top bar and the rail's head are the same height and share one rule, so the shell reads as
 * one strip across the window. With a `foot` (a `StatusLine`), the rail's foot cell (the
 * `AccountMenu`) sits in the window's bottom-left corner level with the foot strip, so the account
 * and the status read as one bar across the window's foot, under the rail, the content and the panel.
 *
 * A `bottom` strip docks between the content and the foot, across the whole window under the rail
 * and the panel, for what belongs to the whole app rather than one screen, such as a player. The
 * rail's foot cell stays at the window's bottom edge under it, beside the foot strip, which is
 * drawn empty when there is no `foot` and the rail has a foot.
 *
 * Below the `md` breakpoint the rail leaves the frame: a menu button at the start of the top bar
 * opens it as a drawer over the content, and a press outside it, on a link or Escape closes it. The
 * drawer and the panel's sheet are marked `data-overlay`, so the panels' resize edges are not drawn
 * there; while either is open over the content, the content is out of reach (`useOverlay`).
 *
 * A panel is shown or hidden by a toggle held in the window's top-right corner: at the end of the top bar while the
 * panel is closed, in the corner of the panel's header while it is open. From the `lg` breakpoint it is
 * the right column; below it, an open panel slides over the content from the right and a press
 * outside it or Escape closes it. The panel eases in and out either way, as far as the document's motion allows.
 * Left to itself it starts open on a wide window and closed on a narrow one;
 * `panelOpen` with `onPanelOpenChange` holds it from outside, which is how a panel's own close
 * button closes it.
 *
 * With `palette`, the shell holds the app's command palette: ⌘K on a Mac and Ctrl+K elsewhere open
 * it, from a field too, and close it again; so does the top bar's search, unless the app gives
 * `TopBar` its own `onSearch`. The keys do not open it over a dialog or a menu, nor where
 * `mayOpenPalette` says no, such as over an app's own full-screen view; `paletteOpen` with
 * `onPaletteOpenChange` holds it from outside. `placeCommands` makes its places from the rail's
 * groups and `appearanceCommands` its scheme, density and theme from `useAppearance`. A screen adds
 * its own groups while it is mounted with `useCommands`, listed with the shell's by their `rank`.
 *
 * The shell answers the keys screens bind with `useShortcuts` while they are mounted, its own (the
 * palette's, the shortcuts') yielding to theirs, and keeps them quiet while the palette or the
 * shortcuts dialog is open. With `shortcuts`, it holds the shortcuts dialog: `?` outside a field
 * opens it, bound once here however many account menus the frame draws, and so does the account
 * menu's Keyboard shortcuts, listing every key bound with a label and the groups given for keys the
 * app answers itself. `useScrollMemory` keeps the content's place per screen.
 *
 * With `desktop`, the shell stands in a desktop window whose native title bar is hidden: its top
 * strip, the rail's head and the top bar (and an open panel's header), is the window's drag
 * region, and `trafficLights` leaves room at its start for the window's own buttons: in the
 * rail's head, or in the top bar where no rail shows or a collapsed rail is narrower than the room.
 */
export function Shell({
    rail,
    top,
    foot,
    panel,
    bottom,
    panelOpen,
    onPanelOpenChange,
    palette,
    paletteOpen,
    defaultPaletteOpen = false,
    onPaletteOpenChange,
    mayOpenPalette,
    paletteWords,
    paletteSearch,
    shortcuts,
    defaultShortcutsOpen = false,
    shortcutsWords,
    desktop,
    children,
    words: given,
}: {
    rail: ReactNode
    /** What the top bar holds: a search, the version, the theme control. */
    top?: ReactNode
    /** What the foot strip holds to the right of the rail's foot cell, if anything. */
    foot?: ReactNode
    /** A side panel as the shell's right column, full height, its header level with the top bar. */
    panel?: ReactNode
    /** A strip across the whole window between the content and the foot, under the rail and the panel. */
    bottom?: ReactNode
    /** Whether the panel shows; held inside the shell when not given. */
    panelOpen?: boolean
    onPanelOpenChange?: (open: boolean) => void
    /** The command palette's groups; the shell opens it on ⌘K or Ctrl+K and from the top bar's search. No palette without it. */
    palette?: readonly PaletteGroup[]
    /** Whether the palette is open; held inside the shell when not given. */
    paletteOpen?: boolean
    /** Whether the palette starts open. */
    defaultPaletteOpen?: boolean
    onPaletteOpenChange?: (open: boolean) => void
    /**
     * Asked before the palette opens, from the keys or the top bar's search; false keeps it closed,
     * as over an app's own full-screen view.
     */
    mayOpenPalette?: () => boolean
    paletteWords?: Partial<CommandPaletteWords>
    /** The app's search, whose results the palette lists under its commands. */
    paletteSearch?: PaletteSearch
    /**
     * The keys the app answers itself, listed in the shortcuts dialog after the keys bound with
     * `useShortcuts`; given, even empty, the shell holds the dialog and opens it on `?`.
     */
    shortcuts?: readonly ShortcutGroup[]
    /** Whether the shortcuts dialog starts open. */
    defaultShortcutsOpen?: boolean
    shortcutsWords?: Partial<ShortcutsDialogWords>
    /** The desktop window the shell stands in, when its native title bar is hidden; leave it off in a browser. */
    desktop?: DesktopWindow
    children: ReactNode
    words?: Partial<ShellWords>
}) {
    const words = { ...WORDS, ...given }
    const [drawer, setDrawer] = useState(false)
    const [footCell, setFootCell] = useState<HTMLDivElement | null>(null)
    const wide = useWide()
    const [ownOpen, setOwnOpen] = useState<boolean | null>(null)
    const open = panelOpen ?? ownOpen ?? wide
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
    const [shortcutRegistry] = useState(() => createShortcutRegistry())
    const [ownPaletteOpen, setOwnPaletteOpen] = useState(defaultPaletteOpen)
    const paletteIsOpen = paletteOpen ?? ownPaletteOpen
    // Drawn from its first opening on, so it can close with its own animation.
    const [paletteShown, setPaletteShown] = useState(defaultPaletteOpen)
    if (paletteIsOpen && !paletteShown) setPaletteShown(true)
    const latest = useRef({ held: paletteOpen !== undefined, isOpen: paletteIsOpen, onPaletteOpenChange, mayOpenPalette })
    useEffect(() => {
        latest.current = { held: paletteOpen !== undefined, isOpen: paletteIsOpen, onPaletteOpenChange, mayOpenPalette }
    })
    const setPalette = useCallback((next: boolean) => {
        if (next && latest.current.mayOpenPalette?.() === false) return
        if (!latest.current.held) setOwnPaletteOpen(next)
        latest.current.onPaletteOpenChange?.(next)
    }, [])
    const openPalette = useCallback(() => setPalette(true), [setPalette])
    // The keys close an open palette, and open one only where nothing stands over the page.
    const togglePalette = useCallback(() => {
        if (latest.current.isOpen) setPalette(false)
        else if (!shortcutRegistry.covered()) setPalette(true)
    }, [setPalette, shortcutRegistry])
    const commands = palette !== undefined && paletteShown && (
        <Suspense fallback={null}>
            <CommandPalette open={paletteIsOpen} onOpenChange={setPalette} groups={groups} search={paletteSearch} words={paletteWords} />
        </Suspense>
    )
    const [shortcutsOpen, setShortcutsOpen] = useState(defaultShortcutsOpen)
    const [shortcutsShown, setShortcutsShown] = useState(defaultShortcutsOpen)
    const openShortcuts = useCallback(() => {
        setShortcutsShown(true)
        setShortcutsOpen(true)
    }, [])
    const keys = shortcuts !== undefined && shortcutsShown && (
        <Suspense fallback={null}>
            <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} groups={shortcuts} words={shortcutsWords} />
        </Suspense>
    )
    useEffect(() => shortcutRegistry.listen(window), [shortcutRegistry])
    useEffect(() => {
        shortcutRegistry.surface('palette', paletteIsOpen)
        shortcutRegistry.surface('shortcuts', shortcutsOpen)
    }, [shortcutRegistry, paletteIsOpen, shortcutsOpen])
    const hasPalette = palette !== undefined
    const hasShortcuts = shortcuts !== undefined
    useEffect(() => {
        const own: KeyBinding[] = []
        if (hasPalette)
            own.push({ id: 'palette', key: 'k', mod: true, inFields: true, inDialogs: true, label: words.openPalette, run: togglePalette })
        if (hasShortcuts) own.push({ id: 'shortcuts', key: '?', label: words.openShortcuts, run: openShortcuts })
        shortcutRegistry.set('shell', own, { fallback: true })
    }, [shortcutRegistry, hasPalette, hasShortcuts, words.openPalette, words.openShortcuts, togglePalette, openShortcuts])
    const mobile = useIsMobile()
    const drawerRef = useOverlay(drawer && mobile, { onClose: () => setDrawer(false) })
    const panelRef = useOverlay(panel !== undefined && !wide && open, { onClose: () => setOpen(false), inert: false })
    const [main, setMain] = useState<HTMLElement | null>(null)

    const toggle = panel !== undefined && (
        <button
            type="button"
            aria-label={open ? words.hidePanel : words.showPanel}
            aria-pressed={open}
            title={open ? words.hidePanel : words.showPanel}
            data-window-no-drag
            className={cn(
                'absolute top-[calc((var(--spacing-shell-top)-2rem)/2)] right-2 z-50 flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
                open && 'text-foreground',
            )}
            onClick={() => setOpen(!open)}
        >
            <PanelRight className="size-4" aria-hidden />
        </button>
    )
    const drawn = drawer && (
        <div ref={drawerRef} className="fixed inset-0 z-40 outline-none md:hidden">
            <button type="button" aria-label={words.close} className="absolute inset-0 bg-scrim" onClick={() => setDrawer(false)} />
            <div
                data-overlay
                className="absolute inset-y-0 left-0 flex shadow-pop"
                onClick={(event) => {
                    if ((event.target as HTMLElement).closest('a')) setDrawer(false)
                }}
            >
                {rail}
            </div>
        </div>
    )
    const strip = foot !== undefined && (
        <footer
            className={cn(
                'flex h-shell-foot shrink-0 items-center gap-3 border-t border-border-strong bg-sidebar px-3 text-xs text-muted-foreground',
                docked && 'col-start-2 row-start-3 peer-empty:col-span-full',
            )}
        >
            {foot}
        </footer>
    )
    const content = (
        <div className="flex min-w-0 flex-1 flex-col">
            {top !== undefined && (
                <header
                    data-window-drag={desktop === undefined ? undefined : ''}
                    className={cn(
                        'flex h-shell-top shrink-0 items-center gap-2 border-b border-border-strong bg-sidebar px-3',
                        panel !== undefined && !(open && wide) && 'pr-12',
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
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-hover md:hidden"
                        onClick={() => setDrawer(true)}
                    >
                        <Menu className="size-4" aria-hidden />
                    </button>
                    {top}
                </header>
            )}
            <main className="@container relative min-h-0 flex-1 overflow-y-auto" ref={setMain}>
                {children}
            </main>
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
                        'grid min-h-0 transition-[grid-template-columns] duration-200 ease-out',
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
                    className={cn('fixed inset-0 z-40 outline-none', !open && 'pointer-events-none')}
                >
                    <button
                        type="button"
                        aria-label={words.hidePanel}
                        tabIndex={open ? undefined : -1}
                        className={cn('absolute inset-0 bg-scrim transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0')}
                        onClick={() => setOpen(false)}
                    />
                    <div
                        data-overlay
                        className={cn(
                            'absolute inset-y-0 right-0 flex max-w-[calc(100vw-3rem)] shadow-pop transition-transform duration-200 ease-out [&>*]:max-w-full',
                            open ? 'translate-x-0' : 'translate-x-full shadow-none',
                        )}
                    >
                        {panel}
                    </div>
                </div>
            )}
        </>
    )

    // A press anywhere in the frame is handed to the window when it lands in the top strip.
    const frame = { style: trafficLightsStyle(desktop), onMouseDown: windowPressHandler(desktop) }
    const provide = (node: ReactNode) => (
        <ShortcutRegistry value={shortcutRegistry}>
            <ShellPalette value={palette === undefined ? undefined : openPalette}>
                <ShellShortcuts value={shortcuts === undefined ? undefined : openShortcuts}>
                    <ShellDesktop value={desktop}>
                        <ShellScroller value={main}>
                            <CommandRegistry value={commandRegistry.registry}>{node}</CommandRegistry>
                        </ShellScroller>
                    </ShellDesktop>
                </ShellShortcuts>
                {commands}
                {keys}
            </ShellPalette>
        </ShortcutRegistry>
    )

    if (!docked)
        return provide(
            <div {...frame} className="group/shell relative flex h-svh min-h-0 flex-col overflow-hidden bg-background text-foreground">
                {toggle}
                <div className="flex min-h-0 flex-1">
                    <div data-shell-rail className="hidden md:flex">
                        {rail}
                    </div>
                    {drawn}
                    {content}
                    {panels}
                </div>
            </div>,
        )

    // The rail's column is as wide as the rail, so the foot cell under the bottom strip follows the
    // rail's width as it is dragged or collapsed; the cell hides while the rail has no foot in it.
    return provide(
        <div
            {...frame}
            className="group/shell relative grid h-svh min-h-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto_auto] overflow-hidden bg-background text-foreground"
        >
            {toggle}
            <div data-shell-rail className="col-start-1 row-start-1 hidden min-h-0 md:flex">
                <ShellFootCell value={footCell}>{rail}</ShellFootCell>
            </div>
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
                <div
                    aria-hidden
                    className="col-start-2 row-start-3 hidden h-shell-foot border-t border-border-strong bg-sidebar md:block md:peer-empty:hidden"
                />
            )}
        </div>,
    )
}

export interface ShellWords {
    menu: string
    close: string
    showPanel: string
    hidePanel: string
    /** What ⌘K or Ctrl+K does, as the shortcuts dialog lists it. */
    openPalette: string
    /** What `?` does, as the shortcuts dialog lists it. */
    openShortcuts: string
}

const WORDS: ShellWords = {
    menu: 'Open the navigation',
    close: 'Close the navigation',
    showPanel: 'Show the panel',
    hidePanel: 'Hide the panel',
    openPalette: 'Open the command palette',
    openShortcuts: 'Show the keyboard shortcuts',
}

/** The `lg` breakpoint, from which the panel is a column rather than a sheet. */
const WIDE = '(min-width: 64rem)'

/** Whether the window is at least `lg` wide, followed as it is resized. */
function useWide(): boolean {
    const [wide, setWide] = useState(() => typeof window === 'undefined' || window.matchMedia(WIDE).matches)
    useEffect(() => {
        const query = window.matchMedia(WIDE)
        const change = () => setWide(query.matches)
        change()
        query.addEventListener('change', change)
        return () => query.removeEventListener('change', change)
    }, [])
    return wide
}

/**
 * The content's own padding, the density's page inset, for a page to sit in. The inset is the
 * wide one where the shell's content (or the window, outside a shell) is 40rem or wider, and the
 * phone-sized one below it.
 */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-col gap-(--density-page-gap) px-(--density-page-inset) pt-(--density-page-top) pb-10', className)}>
            {children}
        </div>
    )
}
