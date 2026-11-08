import { useEffect, useMemo, useState } from 'react'

/** The tokens series take in order when they name no color of their own. */
export const SERIES_ORDER = ['chart-2', 'chart-3', 'chart-4', 'kind-teal', 'kind-pink', 'kind-green', 'kind-blue', 'chart-5'] as const

/**
 * The current theme's colors and typeface, resolved to hex for a renderer that takes no CSS.
 * `token` resolves any color token by name, `mix` blends two CSS colors, and `ramp` steps from the
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
    /** Text sizes in pixels, read from the size tokens: axis and legend labels, axis names, titles and tooltips, and a figure in a chart's middle. */
    size: { label: number; small: number; body: number; stat: number }
    /** A mark's corner in pixels, such as a bar's top or a heatmap's cell: a share of the radius token, so a square theme draws square marks. */
    corner: number
    /** The categorical colors in order. */
    series: string[]
    token: (name: string) => string
    mix: (css: string, percent: number, base?: string) => string
    ramp: (name: string, steps?: number) => string[]
}

function readKey(): string {
    const root = document.documentElement
    return `${root.className}|${root.getAttribute('data-theme') ?? ''}|${root.getAttribute('style') ?? ''}`
}

/** A key that changes whenever the document's scheme, theme or inline token overrides change. */
function useLookKey(): string {
    const [key, setKey] = useState(readKey)
    useEffect(() => {
        const observer = new MutationObserver(() => setKey(readKey()))
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
        return () => observer.disconnect()
    }, [])
    return key
}

/** Resolves a CSS color expression to hex by painting it on a one-pixel canvas. */
function makeHex(): (css: string) => string {
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const cache = new Map<string, string>()
    return (css) => {
        const known = cache.get(css)
        if (known !== undefined) return known
        if (context === null) return '#888888'
        const probe = document.createElement('span')
        probe.style.color = css
        probe.style.display = 'none'
        document.body.append(probe)
        const computed = getComputedStyle(probe).color
        probe.remove()
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = computed
        context.fillRect(0, 0, 1, 1)
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data
        const hex = `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
        cache.set(css, hex)
        return hex
    }
}

/** Resolves the chart look now, against the document as it is styled. */
export function readLook(key = readKey()): ChartLook {
    const hex = makeHex()
    const style = getComputedStyle(document.documentElement)
    const token = (name: string) => hex(`var(--${name})`)
    const mix = (css: string, percent: number, base = 'var(--card)') => hex(`color-mix(in oklab, ${css} ${percent}%, ${base})`)
    const rem = Number.parseFloat(style.fontSize) || 16
    const pixels = (name: string, fallback: number) => {
        const value = style.getPropertyValue(`--${name}`).trim()
        const number = Number.parseFloat(value)
        if (Number.isNaN(number)) return fallback
        return value.endsWith('rem') ? number * rem : number
    }
    return {
        key,
        dark: document.documentElement.classList.contains('dark'),
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
            label: pixels('chart-text-size', 11),
            small: pixels('chart-text-size-small', 10),
            body: pixels('text-xs', 13),
            stat: pixels('chart-stat-size', 24),
        },
        corner: Math.max(0, pixels('radius', 4.5) * 0.4),
        series: SERIES_ORDER.map(token),
        token,
        mix,
        ramp: (name, steps = 6) =>
            Array.from({ length: steps }, (_, index) => mix(`var(--${name})`, Math.round(12 + (88 * index) / Math.max(1, steps - 1)))),
    }
}

/** The chart look, read again when the scheme, the theme or a token override changes, once fonts have loaded. */
export function useChartLook(): ChartLook | null {
    const key = useLookKey()
    const [fonts, setFonts] = useState(false)
    useEffect(() => {
        let live = true
        void document.fonts.ready.then(() => live && setFonts(true))
        return () => {
            live = false
        }
    }, [])
    return useMemo(() => (fonts ? readLook(key) : null), [fonts, key])
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
