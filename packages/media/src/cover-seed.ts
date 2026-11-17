/**
 * Which drawn cover a record wears when it has no picture: a motif over a gradient between two
 * hues, chosen from a stable id, so the same record wears the same cover in a grid, a list and the
 * player, in every session, and a grid of records without pictures does not look all alike. Pure,
 * so the choice has tests: `Artwork` draws a cover's shapes (`coverShapes`) as an SVG, and
 * `drawCover` draws them on a canvas, for the media session's artwork.
 */

/** The shapes a drawn cover is made of. */
export type ArtworkMotif = 'sun' | 'rings' | 'bands' | 'dots' | 'wave' | 'peaks'

export const ARTWORK_MOTIFS: readonly ArtworkMotif[] = ['sun', 'rings', 'bands', 'dots', 'wave', 'peaks']

/** The hues a drawn cover is painted in, each a token, so a theme can change them. */
export const ARTWORK_HUES = {
    blue: 'var(--kind-blue)',
    teal: 'var(--kind-teal)',
    green: 'var(--kind-green)',
    jade: 'var(--kind-jade)',
    violet: 'var(--kind-violet)',
    pink: 'var(--kind-pink)',
    amber: 'var(--chart-4)',
    coral: 'var(--chart-5)',
} as const

export type ArtworkHue = keyof typeof ARTWORK_HUES

const HUE_NAMES = Object.keys(ARTWORK_HUES) as ArtworkHue[]

/** A drawn cover: a motif over a gradient from one hue to another. */
export interface ArtworkCover {
    motif: ArtworkMotif
    from: ArtworkHue
    to: ArtworkHue
}

/**
 * A string as an unsigned 32-bit number, the same in every build: FNV-1a over its UTF-16 code
 * units, then mixed so every bit depends on every character and the low bits spread as well as
 * the high ones.
 */
export function seedHash(seed: string): number {
    let hash = 0x811c9dc5
    for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index)
        hash = Math.imul(hash, 0x01000193)
    }
    hash ^= hash >>> 16
    hash = Math.imul(hash, 0x85ebca6b)
    hash ^= hash >>> 13
    hash = Math.imul(hash, 0xc2b2ae35)
    hash ^= hash >>> 16
    return hash >>> 0
}

/**
 * The cover a seed wears. The motif, the first hue and the second come from separate bits of the
 * hash, so they vary apart, and the two hues always differ, so every cover is a gradient.
 */
export function coverFor(seed: string): ArtworkCover {
    const hash = seedHash(seed)
    const motif = ARTWORK_MOTIFS[hash % ARTWORK_MOTIFS.length]
    const first = (hash >>> 8) % HUE_NAMES.length
    const second = (first + 1 + ((hash >>> 16) % (HUE_NAMES.length - 1))) % HUE_NAMES.length
    return { motif, from: HUE_NAMES[first], to: HUE_NAMES[second] }
}

/** The two inks a motif is drawn in over the gradient, each a token: a light one and a dark one. */
export const COVER_INKS = {
    light: 'var(--terminal-foreground)',
    dark: 'var(--terminal)',
} as const

export type CoverInk = keyof typeof COVER_INKS

/**
 * One shape of a motif, as SVG path data in a frame `width` wide and 100 tall: filled, or stroked
 * `stroke` wide with round ends, in an ink at an opacity.
 */
export interface CoverShape {
    d: string
    ink: CoverInk
    opacity: number
    stroke?: number
}

/** A circle as path data: two half arcs. */
const circle = (cx: number, cy: number, r: number) =>
    `M${String(cx - r)} ${String(cy)}a${String(r)} ${String(r)} 0 1 0 ${String(2 * r)} 0a${String(r)} ${String(r)} 0 1 0 ${String(-2 * r)} 0Z`

/**
 * The shapes a motif is made of, in a frame `width` wide (100 square, 160 wide) and 100 tall, so
 * the same cover is drawn as an SVG by `Artwork` and on a canvas by `drawCover`.
 */
export function coverShapes(motif: ArtworkMotif, width: number): CoverShape[] {
    const middle = width / 2
    const w = String(width)
    switch (motif) {
        case 'sun':
            return [
                { d: circle(middle + 18, 36, 16), ink: 'light', opacity: 0.5 },
                { d: `M0 74 L28 56 L50 66 L74 48 L${w} 64 V100 H0 Z`, ink: 'dark', opacity: 0.18 },
                { d: `M0 86 L34 72 L62 80 L${w} 70 V100 H0 Z`, ink: 'dark', opacity: 0.16 },
            ]
        case 'rings':
            return [10, 20, 30, 40, 50].map((r, index) => ({
                d: circle(middle, 50, r),
                ink: 'light',
                opacity: 0.5 - index * 0.08,
                stroke: 3,
            }))
        case 'bands':
            return [0, 1, 2, 3, 4].map((band) => ({
                d: `M0 ${String(18 + band * 14)}h${w}v6H0Z`,
                ink: 'light',
                opacity: 0.14 + band * 0.07,
            }))
        case 'dots':
            return Array.from({ length: 36 }, (_, index) => {
                const column = index % 6
                const row = Math.floor(index / 6)
                return {
                    d: circle(middle - 40 + column * 16, 10 + row * 16, 1.5 + ((column + row) % 4) * 0.9),
                    ink: 'light',
                    opacity: 0.55,
                }
            })
        case 'wave':
            return [38, 52, 66].map((y, index) => ({
                d: `M-4 ${String(y)} Q ${String(width * 0.25)} ${String(y - 14)} ${String(middle)} ${String(y)} T ${String(width + 4)} ${String(y)}`,
                ink: 'light',
                opacity: 0.6 - index * 0.15,
                stroke: 3,
            }))
        case 'peaks':
            return [
                {
                    d: `M0 100 L${String(middle - 20)} 30 L${String(middle + 4)} 62 L${String(middle + 24)} 42 L${w} 100 Z`,
                    ink: 'dark',
                    opacity: 0.22,
                },
                { d: `M${String(middle - 20)} 30 L${String(middle - 11)} 41 L${String(middle - 27)} 39 Z`, ink: 'light', opacity: 0.7 },
                { d: circle(middle - 26, 22, 5), ink: 'light', opacity: 0.6 },
            ]
    }
}

/** What `drawCover` asks of a canvas's 2D context. */
export type CoverContext = Pick<
    CanvasRenderingContext2D,
    | 'save'
    | 'restore'
    | 'scale'
    | 'createLinearGradient'
    | 'fillRect'
    | 'fill'
    | 'stroke'
    | 'fillStyle'
    | 'strokeStyle'
    | 'globalAlpha'
    | 'lineWidth'
    | 'lineCap'
>

/**
 * Draws a cover on a square canvas `size` pixels across, as `Artwork` draws it square: the gradient
 * from corner to corner and the motif over it. `paint` turns each hue and ink, a token such as
 * `var(--kind-blue)`, into a color the canvas takes, as the page's theme resolves it.
 */
export function drawCover(context: CoverContext, cover: ArtworkCover, size: number, paint: (token: string) => string) {
    context.save()
    context.scale(size / 100, size / 100)
    const gradient = context.createLinearGradient(0, 0, 100, 100)
    gradient.addColorStop(0, paint(ARTWORK_HUES[cover.from]))
    gradient.addColorStop(1, paint(ARTWORK_HUES[cover.to]))
    context.fillStyle = gradient
    context.fillRect(0, 0, 100, 100)
    for (const shape of coverShapes(cover.motif, 100)) {
        const ink = paint(COVER_INKS[shape.ink])
        const path = new Path2D(shape.d)
        context.globalAlpha = shape.opacity
        if (shape.stroke === undefined) {
            context.fillStyle = ink
            context.fill(path)
        } else {
            context.strokeStyle = ink
            context.lineWidth = shape.stroke
            context.lineCap = 'round'
            context.stroke(path)
        }
    }
    context.restore()
}
