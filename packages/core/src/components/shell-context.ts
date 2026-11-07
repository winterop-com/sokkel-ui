import { createContext } from 'react'

/**
 * The cell at the shell's bottom-left corner that a rail's foot is drawn in while the shell has a
 * `bottom` strip, so the foot stays at the window's bottom edge under that strip; `null` where the
 * foot stays in the rail itself, as in the shell's drawer.
 */
export const ShellFootCell = createContext<HTMLElement | null>(null)

/** Opens the shell's command palette, for the top bar's search; undefined where the shell has none. */
export const ShellPalette = createContext<(() => void) | undefined>(undefined)
