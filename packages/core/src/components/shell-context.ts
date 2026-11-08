import { createContext } from 'react'

import type { DesktopWindow } from '../lib/desktop'

/**
 * The cell at the shell's bottom-left corner that a rail's foot is drawn in while the shell has a
 * `bottom` strip, so the foot stays at the window's bottom edge under that strip; `null` where the
 * foot stays in the rail itself, as in the shell's drawer.
 */
export const ShellFootCell = createContext<HTMLElement | null>(null)

/** Opens the shell's command palette, for the top bar's search; undefined where the shell has none. */
export const ShellPalette = createContext<(() => void) | undefined>(undefined)

/** The desktop window the shell stands in, for the parts drawn in its top strip; undefined in a browser. */
export const ShellDesktop = createContext<DesktopWindow | undefined>(undefined)

/**
 * The shell's drawer on a narrow window, for the rail and its foot drawn in it: they draw
 * expanded there whatever the app holds, and the rail's head closes the drawer with `label` in
 * place of collapsing; undefined outside the drawer.
 */
export const ShellDrawer = createContext<{ close: () => void; label: string } | undefined>(undefined)
