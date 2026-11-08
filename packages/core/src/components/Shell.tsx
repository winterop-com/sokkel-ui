import { Menu, PanelRight } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { CommandRegistry, useCommandRegistry } from '../hooks/use-commands'
import { usePaletteShortcut } from '../hooks/use-palette-shortcut'
import { trafficLightsStyle, useTrafficLights, windowPressHandler, type DesktopWindow } from '../lib/desktop'
import type { PaletteGroup, PaletteSearch } from './CommandPalette'
import { ShellDesktop, ShellDrawer, ShellFootCell, ShellPalette } from './shell-context'

// The palette loads when it first opens, so an app's start carries none of it.
const CommandPalette = lazy(() => import('./CommandPalette').then((module) => ({ default: module.CommandPalette })))

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
 * A `banner`, such as a `Banner` saying the server is not answering, stands between the top bar and
 * the content: it does not scroll with the content and covers none of it.
 *
 * Below the `md` breakpoint the rail leaves the frame: a menu button at the start of the top bar
 * opens it as a drawer over the content, drawn expanded even where the app holds it `collapsed`.
 * The focus moves into the drawer as it opens and back to the menu button as it closes. Escape, a
 * press outside it, a press on a link and a change of the app's `route` close it, so a page reached
 * by the palette or by the app's own navigation closes it too; `drawerOpen` with
 * `onDrawerOpenChange` holds it from outside. The drawer and the panel's sheet are marked
 * `data-overlay`, so the panels' resize edges are not drawn there.
 *
 * The frame keeps clear of a phone's notch and home indicator by the safe-area insets, on all four
 * sides. They are zero unless the app's page opts in to drawing under them with
 * `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, which
 * a web app added to a home screen wants.
 *
 * A panel is shown or hidden by a toggle held in the window's top-right corner: at the end of the top bar while the
 * panel is closed, in the corner of the panel's header while it is open. From the `lg` breakpoint it is
 * the right column; below it, an open panel slides over the content from the right and a press
 * outside it closes it. The panel eases in and out either way, as far as the document's motion allows.
 * Left to itself it starts open on a wide window and closed on a narrow one;
 * `panelOpen` with `onPanelOpenChange` holds it from outside, which is how a panel's own close
 * button closes it.
 *
 * With `palette`, the shell holds the app's command palette: ⌘K or Ctrl+K opens it wherever focus
 * is, and so does the top bar's search, unless the app gives `TopBar` its own `onSearch`.
 * `placeCommands` makes its places from the rail's groups and `appearanceCommands` its scheme,
 * density and theme from `useAppearance`. A screen adds its own groups while it is mounted with
 * `useCommands`, listed with the shell's by their `rank`.
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
    banner,
    panelOpen,
    onPanelOpenChange,
    drawerOpen,
    onDrawerOpenChange,
    route,
    palette,
    defaultPaletteOpen = false,
    paletteWords,
    paletteSearch,
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
    /** A strip between the top bar and the content, such as a `Banner`, that does not scroll with the content. */
    banner?: ReactNode
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
    /** Whether the palette starts open. */
    defaultPaletteOpen?: boolean
    paletteWords?: { placeholder: string; empty: string; title: string }
    /** The app's search, whose results the palette lists under its commands. */
    paletteSearch?: PaletteSearch
    /** The desktop window the shell stands in, when its native title bar is hidden; leave it off in a browser. */
    desktop?: DesktopWindow
    children: ReactNode
    words?: Partial<ShellWords>
}) {
    const words = { ...WORDS, ...given }
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
    const menuButton = useRef<HTMLButtonElement>(null)
    const drawerRoot = useRef<HTMLDivElement>(null)
    const drawerPanel = useRef<HTMLDivElement>(null)
    // The focus moves into the drawer as it opens, and back to the menu button as it closes unless
    // something else has taken it by then.
    useEffect(() => {
        if (!drawer) return
        const panel = drawerPanel.current
        ;(panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus()
        return () => {
            const active = document.activeElement
            if (active === null || active === document.body) menuButton.current?.focus()
        }
    }, [drawer])
    // Escape closes the drawer when it lands in it, so it leaves a menu or a dialog opened over it alone.
    useEffect(() => {
        if (!drawer) return
        const escape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return
            const target = event.target
            if (target !== document.body && !(target instanceof Node && drawerRoot.current?.contains(target))) return
            setDrawer(false)
        }
        document.addEventListener('keydown', escape)
        return () => document.removeEventListener('keydown', escape)
    }, [drawer, setDrawer])
    // A change of route closes the drawer, however the app navigated.
    const routeSeen = useRef(route)
    useEffect(() => {
        if (routeSeen.current === route) return
        routeSeen.current = route
        if (drawer) setDrawer(false)
    }, [route, drawer, setDrawer])
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
    const [paletteOpen, setPaletteOpen] = useState(defaultPaletteOpen)
    // Drawn from its first opening on, so it can close with its own animation.
    const [paletteShown, setPaletteShown] = useState(defaultPaletteOpen)
    const openPalette = useCallback(() => {
        setPaletteShown(true)
        setPaletteOpen(true)
    }, [])
    const commands = palette !== undefined && (
        <>
            <PaletteKeys onOpen={openPalette} />
            {paletteShown && (
                <Suspense fallback={null}>
                    <CommandPalette
                        open={paletteOpen}
                        onOpenChange={setPaletteOpen}
                        groups={groups}
                        search={paletteSearch}
                        words={paletteWords}
                    />
                </Suspense>
            )}
        </>
    )

    const toggle = panel !== undefined && (
        <button
            type="button"
            aria-label={open ? words.hidePanel : words.showPanel}
            aria-pressed={open}
            title={open ? words.hidePanel : words.showPanel}
            data-window-no-drag
            className={cn(
                'absolute top-[calc(env(safe-area-inset-top)+(var(--spacing-shell-top)-2rem)/2)] right-[calc(env(safe-area-inset-right)+0.5rem)] z-50 flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
                open && 'text-foreground',
            )}
            onClick={() => setOpen(!open)}
        >
            <PanelRight className="size-4" aria-hidden />
        </button>
    )
    const drawn = drawer && (
        <div ref={drawerRoot} className="fixed inset-0 z-40 md:hidden">
            <button type="button" aria-label={words.close} tabIndex={-1} className="absolute inset-0 bg-scrim" onClick={closeDrawer} />
            <div
                ref={drawerPanel}
                data-overlay
                tabIndex={-1}
                className="absolute inset-y-0 left-0 flex bg-sidebar pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] shadow-pop outline-none"
                onClick={(event) => {
                    if ((event.target as HTMLElement).closest('a')) closeDrawer()
                }}
            >
                <ShellDrawer value={drawerContext}>{rail}</ShellDrawer>
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
                        ref={menuButton}
                        type="button"
                        aria-label={words.menu}
                        title={words.menu}
                        aria-expanded={drawer}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-hover md:hidden"
                        onClick={() => setDrawer(true)}
                    >
                        <Menu className="size-4" aria-hidden />
                    </button>
                    {top}
                </header>
            )}
            {banner !== undefined && banner !== null && banner !== false && <div className="shrink-0">{banner}</div>}
            <main className="@container relative min-h-0 flex-1 overflow-y-auto">{children}</main>
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
                <div inert={!open} aria-hidden={!open || undefined} className={cn('fixed inset-0 z-40', !open && 'pointer-events-none')}>
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
                            'absolute inset-y-0 right-0 flex max-w-[calc(100vw-3rem)] bg-sidebar pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] shadow-pop transition-transform duration-200 ease-out [&>*]:max-w-full',
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
        <ShellPalette value={palette === undefined ? undefined : openPalette}>
            <ShellDesktop value={desktop}>
                <CommandRegistry value={commandRegistry.registry}>{node}</CommandRegistry>
            </ShellDesktop>
            {commands}
        </ShellPalette>
    )

    if (!docked)
        return provide(
            <div
                {...frame}
                className="group/shell relative flex h-svh min-h-0 flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] text-foreground"
            >
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
            className="group/shell relative grid h-svh min-h-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto_auto] overflow-hidden bg-background pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] text-foreground"
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

/** Opens the palette on ⌘K or Ctrl+K while the shell has one. */
function PaletteKeys({ onOpen }: { onOpen: () => void }) {
    usePaletteShortcut(onOpen)
    return null
}

export interface ShellWords {
    menu: string
    close: string
    showPanel: string
    hidePanel: string
}

const WORDS: ShellWords = {
    menu: 'Open the navigation',
    close: 'Close the navigation',
    showPanel: 'Show the panel',
    hidePanel: 'Hide the panel',
}

/** What takes the focus first in the drawer as it opens. */
const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

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
