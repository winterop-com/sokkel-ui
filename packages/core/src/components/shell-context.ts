import { createContext, useContext, useEffect, useId, useLayoutEffect, type ComponentType, type ReactNode } from 'react'

import type { DesktopWindow } from '../lib/desktop'
import type { RailDrop } from './Rail'
import type { PanelStrip } from './panel-strip'
import type { Crumb, TrailEnd } from './TopBar'

/**
 * The cell at the shell's bottom-left corner that a rail's foot is drawn in while the shell has a
 * `bottom` strip, so the foot stays at the window's bottom edge under that strip; `null` where the
 * foot stays in the rail itself, as in the shell's drawer.
 */
export const ShellFootCell = createContext<HTMLElement | null>(null)

/** Opens the shell's command palette, for the top bar's search; undefined where the shell has none. */
export const ShellPalette = createContext<(() => void) | undefined>(undefined)

/** Whether the shell's command palette is open, for a `Search`, whose results close as it opens; false outside a shell. */
export const ShellPaletteOpen = createContext(false)

/** The desktop window the shell stands in, for the parts drawn in its top strip; undefined in a browser. */
export const ShellDesktop = createContext<DesktopWindow | undefined>(undefined)

/**
 * The shell's drawer on a narrow window, for the rail and its foot drawn in it: they draw
 * expanded there whatever the app holds, and the rail's head closes the drawer with `label` in
 * place of collapsing; undefined outside the drawer.
 */
export const ShellDrawer = createContext<{ close: () => void; label: string } | undefined>(undefined)

/** Opens the shell's keyboard shortcuts, for the account menu; undefined where the shell holds none. */
export const ShellShortcuts = createContext<(() => void) | undefined>(undefined)

/** The shell's content, the one thing that scrolls there, for `useScrollMemory`; null outside a shell. */
export const ShellScroller = createContext<HTMLElement | null>(null)

/** How the shell draws its rail against what the app holds: narrowed to its icons, or hidden. */
export type RailMode = 'collapsed' | 'hidden'

/** The rail mode asked of the shell now, by a screen or by `Shell`'s `railMode`; undefined where nothing is asked. */
export const ShellRailMode = createContext<RailMode | undefined>(undefined)

/** Asks the shell for a rail mode for one screen, answering with what takes the ask back; undefined outside a shell. */
export const ShellRailAsk = createContext<((id: string, mode: RailMode) => () => void) | undefined>(undefined)

/**
 * Whether the rail is drawn collapsed while a screen narrows it against what the app holds, for the
 * account in its foot, which follows the rail rather than the app; undefined while nothing is asked.
 */
export const RailCollapsed = createContext<boolean | undefined>(undefined)

/** The shell's tab strip, for the side panel inside; undefined where the shell draws none. */
export const ShellPanelStrip = createContext<PanelStrip | undefined>(undefined)

/**
 * A box of the shell's that one screen at a time fills: the element its part draws into, which of
 * them is drawn (the latest mounted), and how one claims the box while it is mounted.
 */
export interface ShellSlot {
    target: HTMLElement | null
    shown: string | undefined
    claim: (id: string) => () => void
}

/** The shell's top bar as a screen fills it with `ShellTop`; undefined outside a shell. */
export const ShellTopSlot = createContext<ShellSlot | undefined>(undefined)

/** The box above the shell's scroller a screen fills with `ShellHead`; undefined outside a shell. */
export const ShellHeadSlot = createContext<ShellSlot | undefined>(undefined)

/** A trail a screen states for the shell's top bar, and what its last crumb is. */
export interface StatedTrail {
    trail: readonly Crumb[]
    ends?: TrailEnd
}

/** States a screen's trail for the top bar, answering with what takes it back; undefined outside a shell. */
export const ShellTrailAsk = createContext<((id: string, trail: StatedTrail) => () => void) | undefined>(undefined)

/** A layout effect in the browser, so a stated trail is drawn before the page paints; a plain one on a server. */
const useBeforePaint = typeof document === 'undefined' ? useEffect : useLayoutEffect

/** Options for a trail a screen states. */
export interface ShellTrailOptions {
    /** What the last crumb is, as `TopBar`'s `trailEnds`: the current screen (the default) or the one above it. */
    ends?: TrailEnd
}

/**
 * States the calling screen's trail for the shell's top bar while the screen is mounted: the
 * `TopBar` in `Shell`'s `top` draws it in place of its own, keeping its search, its palette button
 * and its actions, rather than the screen drawing the whole bar with `ShellTop`. The latest screen
 * to state one goes before an earlier one; the bar's own trail is back once none does. Undefined
 * states nothing. Outside a `Shell` it does nothing.
 */
export function useShellTrail(trail: readonly Crumb[] | undefined, { ends }: ShellTrailOptions = {}): void {
    const state = useContext(ShellTrailAsk)
    const id = useId()
    // The trail is compared by what it says, so a screen can build it afresh on every render.
    const said = trail === undefined ? undefined : JSON.stringify([trail, ends ?? null])
    useBeforePaint(() => {
        if (state === undefined || said === undefined) return
        const [crumbs, end] = JSON.parse(said) as [Crumb[], TrailEnd | null]
        return state(id, { trail: crumbs, ends: end ?? undefined })
    }, [state, id, said])
}

/**
 * The trail the latest mounted screen states, for the `TopBar` in `Shell`'s `top`, given only around
 * the shell's own top bar so a bar drawn elsewhere keeps its own; undefined while none is stated.
 */
export const ShellTrail = createContext<StatedTrail | undefined>(undefined)

/** What a rail entry's row is drawn in to take drops, which `RailDrops` hands the rail; undefined outside one. */
export const RailDropRows = createContext<ComponentType<{ label: string; drop: RailDrop; children: ReactNode }> | undefined>(undefined)
