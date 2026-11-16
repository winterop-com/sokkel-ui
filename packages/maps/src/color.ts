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
        context.fillStyle = 'transparent'
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
 * read in, so a map inside a `data-theme-scope` takes that scope's colors. A color that does not
 * resolve, such as a token no theme defines, comes back in the scope's own text color.
 */
export function resolveColors<K extends string>(scope: HTMLElement, colors: Record<K, string>): Record<K, string> {
    const holder = document.createElement('span')
    holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
    const probe = document.createElement('span')
    holder.append(probe)
    scope.append(holder)
    const resolved = {} as Record<K, string>
    try {
        // A probe whose color fails to resolve inherits this one, so it needs no check of its own.
        const text = getComputedStyle(holder).color
        const fallback = toRgb(text) ?? text
        for (const key of Object.keys(colors) as K[]) {
            probe.style.color = ''
            probe.style.color = colors[key]
            const computed = getComputedStyle(probe).color
            resolved[key] = computed === '' ? fallback : (toRgb(computed) ?? fallback)
        }
    } finally {
        holder.remove()
    }
    return resolved
}
