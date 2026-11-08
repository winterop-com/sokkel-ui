/** The color a token that does not resolve is drawn in. */
const UNRESOLVED = 'rgb(128, 128, 128)'

/** An inherited color no stylesheet sets, so a probe that comes back with it failed to resolve. */
const SENTINEL = 'rgb(1, 2, 3)'

let pixel: CanvasRenderingContext2D | null | undefined

function pixelContext(): CanvasRenderingContext2D | null {
    if (pixel !== undefined) return pixel
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    pixel = canvas.getContext('2d', { willReadFrequently: true })
    return pixel
}

/**
 * One color in any notation the browser parses as `rgb()` or `rgba()`, which is what maplibre
 * accepts. Painting a pixel and reading its bytes is the conversion: Chromium hands `fillStyle`
 * back in the notation it was given, so `oklch()` would survive a read of the property itself.
 */
function toRgb(color: string): string | null {
    const context = pixelContext()
    if (context === null) return null
    try {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = 'rgba(0, 0, 0, 0)'
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
        if (alpha === 0) return null
        if (alpha === 255) return `rgb(${red}, ${green}, ${blue})`
        return `rgba(${red}, ${green}, ${blue}, ${Math.round((alpha / 255) * 1000) / 1000})`
    } catch {
        return null
    }
}

/**
 * Resolve CSS colors in the scope of an element: tokens, `var()`, `color-mix()` and `oklch()` all
 * come back as `rgb()` strings maplibre can paint. The element decides which theme the tokens are
 * read in, so a map inside a `data-theme-scope` takes that scope's colors.
 */
export function resolveColors<K extends string>(scope: HTMLElement, colors: Record<K, string>): Record<K, string> {
    const holder = document.createElement('span')
    holder.style.cssText = `position:absolute;width:0;height:0;overflow:hidden;color:${SENTINEL}`
    const probe = document.createElement('span')
    holder.append(probe)
    scope.append(holder)
    const resolved = {} as Record<K, string>
    try {
        for (const key of Object.keys(colors) as K[]) {
            probe.style.color = ''
            probe.style.color = colors[key]
            const computed = getComputedStyle(probe).color
            resolved[key] = computed === SENTINEL || computed === '' ? UNRESOLVED : (toRgb(computed) ?? UNRESOLVED)
        }
    } finally {
        holder.remove()
    }
    return resolved
}
