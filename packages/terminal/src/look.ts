import type { ITheme } from '@xterm/xterm'
import { useEffect, useState } from 'react'

/** The terminal's colors and type, read from the tokens where the terminal stands. */
export interface TerminalLook {
    theme: ITheme
    fontFamily: string
    fontSize: number
    /** The weight bold text is drawn in: the bold the core ships for the terminal face, so bold is never synthesized wider than its cell. */
    fontWeightBold: 700
    /** The line's height as a share of the glyph's height, as xterm takes it. */
    lineHeight: number
}

/**
 * The token each of xterm's colors takes. The sixteen ANSI colors are the `ansi-*` tokens, the
 * contract's sixteen-color map, which a renderer in a sixteen-color terminal shares.
 */
export const TERMINAL_COLORS: { [K in Exclude<keyof ITheme, 'extendedAnsi'>]?: string } = {
    background: 'var(--terminal)',
    foreground: 'var(--terminal-foreground)',
    cursor: 'var(--terminal-foreground)',
    cursorAccent: 'var(--terminal)',
    selectionBackground: 'color-mix(in oklab, var(--terminal-accent) 35%, var(--terminal))',
    selectionInactiveBackground: 'color-mix(in oklab, var(--terminal-foreground) 18%, var(--terminal))',
    scrollbarSliderBackground: 'color-mix(in oklab, var(--terminal-foreground) 15%, transparent)',
    scrollbarSliderHoverBackground: 'color-mix(in oklab, var(--terminal-foreground) 25%, transparent)',
    scrollbarSliderActiveBackground: 'color-mix(in oklab, var(--terminal-foreground) 32%, transparent)',
    black: 'var(--ansi-black)',
    red: 'var(--ansi-red)',
    green: 'var(--ansi-green)',
    yellow: 'var(--ansi-yellow)',
    blue: 'var(--ansi-blue)',
    magenta: 'var(--ansi-magenta)',
    cyan: 'var(--ansi-cyan)',
    white: 'var(--ansi-white)',
    brightBlack: 'var(--ansi-bright-black)',
    brightRed: 'var(--ansi-bright-red)',
    brightGreen: 'var(--ansi-bright-green)',
    brightYellow: 'var(--ansi-bright-yellow)',
    brightBlue: 'var(--ansi-bright-blue)',
    brightMagenta: 'var(--ansi-bright-magenta)',
    brightCyan: 'var(--ansi-bright-cyan)',
    brightWhite: 'var(--ansi-bright-white)',
}

/** A CSS color written as xterm reads it: `rgb()` or `rgba()`, resolved by painting it on a one-pixel canvas. */
function resolver(within: HTMLElement): (css: string) => string {
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    return (css) => {
        // A probe inside the terminal, so a theme scoped to an element around it applies.
        const probe = document.createElement('span')
        probe.style.color = css
        probe.style.display = 'none'
        within.append(probe)
        const computed = getComputedStyle(probe).color
        probe.remove()
        if (context === null) return computed
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = computed
        context.fillRect(0, 0, 1, 1)
        const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
        return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
    }
}

/** The terminal look at `element`, which carries the terminal face (`--typeface-terminal`) and the terminal's text size. */
export function readTerminalLook(element: HTMLElement): TerminalLook {
    const resolve = resolver(element)
    const style = getComputedStyle(element)
    const fontSize = parseFloat(style.fontSize)
    const line = parseFloat(style.lineHeight)
    return {
        theme: Object.fromEntries(Object.entries(TERMINAL_COLORS).map(([key, css]) => [key, resolve(css)])) as ITheme,
        fontFamily: style.fontFamily,
        fontSize,
        fontWeightBold: 700,
        // xterm multiplies the glyph's own height, about 1.3 times the text size for a mono face, not the size.
        lineHeight: Number.isFinite(line) && fontSize > 0 ? Math.max(1, line / Math.ceil(fontSize * 1.3)) : 1.2,
    }
}

function readKey(): string {
    const root = document.documentElement
    return `${root.className}|${root.getAttribute('data-theme') ?? ''}|${root.getAttribute('style') ?? ''}`
}

/** A key that changes whenever the document's scheme, theme, typeface or token overrides change. */
export function useLookKey(): string {
    const [key, setKey] = useState(readKey)
    useEffect(() => {
        const observer = new MutationObserver(() => setKey(readKey()))
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
        return () => observer.disconnect()
    }, [])
    return key
}
