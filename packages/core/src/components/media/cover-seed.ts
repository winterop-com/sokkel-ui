/**
 * Which drawn cover a record wears when it has no picture: a motif over a gradient between two
 * hues, chosen from a stable id, so the same record wears the same cover in a grid, a list and the
 * player, in every session, and a grid of records without pictures does not look all alike. Pure,
 * so the choice has tests and `Artwork` only draws it.
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
