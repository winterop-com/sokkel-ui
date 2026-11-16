import { useEffect, useMemo, useState, type RefObject } from 'react'

/** The tokens series take in order when they name no color of their own. */
export const SERIES_ORDER = ['chart-2', 'chart-3', 'chart-4', 'kind-teal', 'kind-pink', 'kind-green', 'kind-blue', 'chart-5'] as const

/**
 * The current theme's colors and typeface, resolved to hex for a renderer that takes no CSS.
 * `token` resolves any color token by name, with an alpha where it is written `name/45`, `mix` blends two CSS colors, and `ramp` steps from the
 * card to a token, for a sequential scale.
 */
export interface ChartLook {
    /** Changes whenever the scheme, theme or a token override changes. */
    key: string
    dark: boolean
    font: string
    mono: string
    foreground: string
    muted: string
    faint: string
    border: string
    grid: string
    card: string
    popover: string
    /**
     * Text sizes in pixels, read from the size tokens: axis and legend labels, axis names, titles and
     * tooltips, a figure in a chart's middle, and that figure in a small chart, such as a gauge on a phone.
     */
    size: { label: number; small: number; body: number; stat: number; statSmall: number }
    /** A mark's corner in pixels, such as a bar's top or a heatmap's cell: a share of the radius token, so a square theme draws square marks. */
    corner: number
    /** The categorical colors in order. */
    series: string[]
    token: (name: string) => string
    mix: (css: string, percent: number, base?: string) => string
    ramp: (name: string, steps?: number) => string[]
}

/** A color token and the percent it is drawn opaque at, read from `name` or `name/45`. */
export function tokenAlpha(token: string): { name: string; alpha: number } {
    const at = token.lastIndexOf('/')
    if (at === -1) return { name: token, alpha: 1 }
    const percent = Number(token.slice(at + 1))
    return { name: token.slice(0, at), alpha: Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) / 100 : 1 }
}

/** A color token as CSS, such as a legend's swatch takes: `name/45` is the token at 45% opacity. */
export function tokenColor(token: string): string {
    const { name, alpha } = tokenAlpha(token)
    return alpha === 1 ? `var(--${name})` : `color-mix(in oklab, var(--${name}) ${String(Math.round(alpha * 100))}%, transparent)`
}

/** The nearest element around this one that wears a theme of its own, or null where the page's theme holds. */
const scopeOf = (element: Element | null): HTMLElement | null => element?.closest<HTMLElement>('[data-theme-scope]') ?? null

function readKey(scope: HTMLElement | null = null): string {
    const root = document.documentElement
    const page = `${root.className}|${root.getAttribute('data-theme') ?? ''}|${root.getAttribute('style') ?? ''}`
    if (scope === null) return page
    const dark = scope.closest('.dark') !== null ? 'dark' : 'light'
    return `${page}|${scope.getAttribute('data-theme-scope') ?? ''}|${dark}|${scope.className}|${scope.getAttribute('style') ?? ''}`
}

const WATCHED = ['class', 'data-theme', 'data-theme-scope', 'style']

/**
 * A key that changes whenever the scheme, theme or inline token overrides change: the document's,
 * and those of the `data-theme-scope` around the element, where there is one.
 */
function useLookKey(element: RefObject<HTMLElement | null>): { key: string; scope: HTMLElement | null } {
    const [held, setHeld] = useState(() => ({ key: readKey(), scope: null as HTMLElement | null }))
    useEffect(() => {
        const scope = scopeOf(element.current)
        const update = () =>
            setHeld((last) => {
                const key = readKey(scope)
                return last.key === key && last.scope === scope ? last : { key, scope }
            })
        update()
        const observer = new MutationObserver(update)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: WATCHED })
        if (scope !== null) observer.observe(scope, { attributes: true, attributeFilter: WATCHED })
        return () => observer.disconnect()
    }, [element])
    return held
}

/** The hidden element colors are resolved on, kept in the page so a lookup restyles it alone, not the page around it. */
let probe: HTMLSpanElement | undefined

function probeElement(): HTMLSpanElement {
    if (probe?.isConnected !== true) {
        probe = document.createElement('span')
        probe.style.display = 'none'
        probe.setAttribute('aria-hidden', 'true')
        document.body.append(probe)
    }
    return probe
}

/** A CSS color as the browser computes it: in the page's theme, or inside a theme scope for its tokens. */
function computedColor(css: string, scope: HTMLElement | null): string {
    if (scope === null || !scope.isConnected) {
        const element = probeElement()
        element.style.color = css
        return getComputedStyle(element).color
    }
    // Held in the scope only while it is read, so no element of the app's gains a child it does not know.
    const holder = document.createElement('span')
    holder.style.display = 'none'
    holder.style.color = css
    scope.append(holder)
    try {
        return getComputedStyle(holder).color
    } finally {
        holder.remove()
    }
}

/** Resolves a CSS color expression to hex by painting it on a one-pixel canvas, in the scope `where` gives. */
function makeHex(where: () => HTMLElement | null): (css: string) => string {
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const cache = new Map<string, string>()
    return (css) => {
        const known = cache.get(css)
        if (known !== undefined) return known
        if (context === null) return '#888888'
        const computed = computedColor(css, where())
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = computed
        context.fillRect(0, 0, 1, 1)
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data
        const hex = `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
        cache.set(css, hex)
        return hex
    }
}

/** The looks last read, by key, which every chart in the same theme shares until its key changes. */
const looks = new Map<string, ChartLook>()

/** The scope each look resolves its colors in: the last one mounted with its key, as the first may since have gone. */
const scopes = new Map<string, HTMLElement | null>()

/**
 * Resolves the chart look against the document as it is styled, or inside a theme scope, once per
 * key: each color it resolves forces a style pass, so charts mounting together share one look
 * rather than each reading its own.
 */
export function readLook(key = readKey(), scope: HTMLElement | null = null): ChartLook {
    if (scope?.isConnected === true || !scopes.has(key)) scopes.set(key, scope)
    const known = looks.get(key)
    if (known !== undefined) return known
    const hex = makeHex(() => scopes.get(key) ?? null)
    const style = getComputedStyle(scope?.isConnected === true ? scope : document.documentElement)
    const token = (name: string) => {
        const { name: base, alpha } = tokenAlpha(name)
        const solid = hex(`var(--${base})`)
        return alpha === 1 ? solid : withAlpha(solid, alpha)
    }
    const mix = (css: string, percent: number, base = 'var(--card)') => hex(`color-mix(in oklab, ${css} ${percent}%, ${base})`)
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const pixels = (name: string, fallback: number) => {
        const value = style.getPropertyValue(`--${name}`).trim()
        const number = Number.parseFloat(value)
        if (Number.isNaN(number)) return fallback
        return value.endsWith('rem') ? number * rem : number
    }
    const look: ChartLook = {
        key,
        dark: (scope ?? document.documentElement).closest('.dark') !== null,
        font: style.getPropertyValue('--typeface-sans').trim() || 'sans-serif',
        mono: style.getPropertyValue('--typeface-mono').trim() || 'monospace',
        foreground: token('foreground'),
        muted: token('muted-foreground'),
        faint: token('faint'),
        border: token('border'),
        grid: mix('var(--border)', 65),
        card: token('card'),
        popover: token('popover'),
        size: {
            label: pixels('chart-text-size', 12),
            small: pixels('chart-text-size-small', 11),
            body: pixels('text-xs', 13),
            stat: pixels('chart-stat-size', 24),
            statSmall: pixels('chart-stat-size-small', 18),
        },
        corner: Math.max(0, pixels('radius', 4.5) * 0.4),
        series: SERIES_ORDER.map(token),
        token,
        mix,
        ramp: (name, steps = 6) =>
            Array.from({ length: steps }, (_, index) => mix(tokenColor(name), Math.round(12 + (88 * index) / Math.max(1, steps - 1)))),
    }
    // A page wears a few themes at most; past that the oldest look is let go.
    if (looks.size >= 16) {
        const oldest = looks.keys().next().value as string
        looks.delete(oldest)
        scopes.delete(oldest)
    }
    looks.set(key, look)
    return look
}

/**
 * The chart look for the element, read in the `data-theme-scope` around it where there is one, and
 * read again when the scheme, the theme or a token override changes, once fonts have loaded.
 */
export function useChartLook(element: RefObject<HTMLElement | null>): ChartLook | null {
    const { key, scope } = useLookKey(element)
    const [fonts, setFonts] = useState(false)
    useEffect(() => {
        let live = true
        void document.fonts.ready.then(() => live && setFonts(true))
        return () => {
            live = false
        }
    }, [])
    return useMemo(() => (fonts ? readLook(key, scope) : null), [fonts, key, scope])
}

/** A hex color with an alpha. */
export const withAlpha = (hex: string, alpha: number) =>
    `${hex}${Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0')}`

/** One row of a chart tooltip. */
export interface TooltipRow {
    label: string
    value: string
    color?: string
}

const escape = (text: string) =>
    text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char)

/** Tooltip markup in the library's tokens, for the chart's HTML tooltip. */
export function tooltipMarkup(title: string, rows: readonly TooltipRow[]): string {
    const lines = rows
        .map(
            (row) =>
                `<div class="flex items-center gap-2">${row.color === undefined ? '' : `<span class="size-2.5 shrink-0 rounded-mini" style="background:${row.color}"></span>`}<span class="text-muted-foreground">${escape(row.label)}</span><span class="ml-auto pl-4 font-mono font-medium tabular-nums text-popover-foreground">${escape(row.value)}</span></div>`,
        )
        .join('')
    return `<div class="grid min-w-36 gap-1 rounded-md border border-border bg-popover px-2.5 py-1.5 font-sans text-xs text-popover-foreground shadow-(--elevation-pop)">${title === '' ? '' : `<div class="font-medium">${escape(title)}</div>`}${lines}</div>`
}

/** About how wide a line of text is drawn at this size, in pixels: wide letters, narrow marks and the rest. */
export function textWidth(text: string, size: number): number {
    let ems = 0
    for (const char of text) ems += /[mwMW%]/.test(char) ? 0.88 : /[\s.,:;'il|/!³²]/.test(char) ? 0.32 : 0.6
    return ems * size
}
