/** Fixed, neutral albums for the grid stories: as many as a story asks for, the same every time, each with a drawn cover. */

import type { Cover, Hue, Motif } from './Artwork'

function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 2 ** 32
    }
}

const FIRST = [
    'Low',
    'Northern',
    'Evening',
    'Glass',
    'Open',
    'High',
    'Late',
    'Morning',
    'Dry',
    'Coastal',
    'Quiet',
    'Long',
    'Salt',
    'Cedar',
    'Winter',
]
const SECOND = [
    'Tide',
    'Coast',
    'Harbor',
    'Water',
    'Desert',
    'Ferries',
    'Fjord',
    'Heat',
    'Plain',
    'Sound',
    'Line',
    'Pass',
    'Lights',
    'Islands',
    'Country',
]
const ARTISTS = [
    'Breakwater',
    'Meridian',
    'Atoll',
    'Archipelago',
    'Passage',
    'Equinox',
    'Highland',
    'Lowlands',
    'Open Water',
    'The Keepers',
]
const MOTIFS: Motif[] = ['sun', 'rings', 'bands', 'dots', 'wave', 'peaks']
const HUES: Hue[] = ['blue', 'teal', 'green', 'jade', 'violet', 'pink', 'amber', 'coral']

export interface Album {
    id: string
    title: string
    artist: string
    year: number
    tracks: number
    /** Seconds. */
    length: number
    plays: number
    cover: Cover
}

const pick = <V>(values: readonly V[], random: () => number) => values[Math.floor(random() * values.length) % values.length]

const made = new Map<number, Album[]>()

/** `count` albums; the same count always gives the same albums. */
export function makeAlbums(count: number): Album[] {
    const cached = made.get(count)
    if (cached !== undefined) return cached
    const random = seeded(19700101)
    const albums = Array.from({ length: count }, (_, index) => {
        const tracks = 6 + Math.floor(random() * 10)
        return {
            id: `album-${String(index + 1)}`,
            title: `${pick(FIRST, random)} ${pick(SECOND, random)}`,
            artist: pick(ARTISTS, random),
            year: 1968 + Math.floor(random() * 58),
            tracks,
            length: tracks * (150 + Math.floor(random() * 180)),
            plays: Math.round(random() ** 3 * 4_000_000),
            cover: { motif: pick(MOTIFS, random), from: pick(HUES, random), to: pick(HUES, random) },
        }
    })
    made.set(count, albums)
    return albums
}
