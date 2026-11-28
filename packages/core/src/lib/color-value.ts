/** A color as hue (0 to 360), saturation and value (each 0 to 1), the space a picker's area and strip move through. */
export interface Hsv {
    h: number
    s: number
    v: number
}

/**
 * The color in `text` as `#rrggbb` in lower case, or null when it is not one: `#rgb`, `#rrggbb`
 * (the `#` optional) and `rgb(r, g, b)` read.
 */
export function readColor(text: string): string | null {
    const typed = text.trim().toLowerCase()
    const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(typed)?.[1]
    if (hex !== undefined) return `#${hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex}`
    const rgb = /^rgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/.exec(typed)
    if (rgb === null) return null
    const channels = rgb.slice(1).map(Number)
    return channels.every((channel) => channel <= 255) ? hexOf(channels[0], channels[1], channels[2]) : null
}

/** A `#rrggbb` color in hue, saturation and value. */
export function toHsv(hex: string): Hsv {
    const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255)
    const max = Math.max(r, g, b)
    const range = max - Math.min(r, g, b)
    let h = 0
    if (range > 0) {
        if (max === r) h = ((g - b) / range) % 6
        else if (max === g) h = (b - r) / range + 2
        else h = (r - g) / range + 4
    }
    return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : range / max, v: max }
}

/** A hue, saturation and value as `#rrggbb`. */
export function fromHsv({ h, s, v }: Hsv): string {
    const at = (n: number) => {
        const k = (n + h / 60) % 6
        return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
    }
    return hexOf(at(5), at(3), at(1))
}

function hexOf(r: number, g: number, b: number): string {
    return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}
