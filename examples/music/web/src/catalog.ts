/**
 * Tidevann's music library: the artists, their albums and every song on them, made up and fixed,
 * so the same library is there on every visit. Each song's sound is drawn from its seed by the
 * synthesizer when it is first played (`synth.ts`), so its length is known here before a note is
 * made. Radio songs are made the same way on the fly, one after another.
 */
import { coverFor, seedHash, type ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'

import { lengthOf, seeded, type Style } from './synth'

export interface Artist {
    id: string
    name: string
    style: Style
    /** A sentence on who they are. */
    about: string
    cover: ArtworkCover
}

export interface Album {
    id: string
    title: string
    artist: string
    year: number
    cover: ArtworkCover
    /** How many discs it spans. */
    discs: number
}

export interface Song {
    id: string
    title: string
    album: string
    artist: string
    /** Another artist singing or playing on it, credited under the title. */
    with?: string
    disc: number
    number: number
    /** Seconds, as the synthesizer will make it. */
    duration: number
    /** What its sound is drawn from. */
    seed: number
    style: Style
    /** Whether it has words, and whether they are timed to the music. */
    words: 'synced' | 'plain' | 'none'
}

/** What kind of sound each style of music is, in words. */
export const STYLE_NAMES: Record<Style, string> = {
    ambient: 'Ambient',
    folk: 'Folk',
    pop: 'Pop',
    electronic: 'Electronic',
    chamber: 'Chamber',
    choir: 'Choral',
    band: 'Band',
}

const ARTISTS_GIVEN: [name: string, style: Style, about: string][] = [
    ['Ada', 'folk', 'Songs written on a kitchen table on the coast, recorded in one take.'],
    ['Brackwater Duo', 'electronic', 'Two synthesizers and a drum machine, between the river and the sea.'],
    ['Eelgrass', 'ambient', 'Long, slow pieces that drift like weed in the current.'],
    ['Grace', 'pop', 'Bright songs about leaving harbors and coming home.'],
    ['Harbor Quartet', 'chamber', 'Strings and a piano, playing music for the waterfront.'],
    ['Juniper Trio', 'folk', 'Guitar, fiddle and three voices from the high moors.'],
    ['Kelpwood', 'pop', 'A four-piece with a soft spot for big choruses.'],
    ['Larkspur', 'pop', 'Summer records from a studio by the dunes.'],
    ['Linus', 'electronic', 'Night music for ferries and empty roads.'],
    ['Margaret', 'ambient', 'Field recordings and drones from the lighthouse years.'],
    ['Northwater Choir', 'choir', 'Thirty voices in a stone church by the fjord.'],
    ['Saltmarsh Ensemble', 'chamber', 'A small orchestra that plays where the tide comes in.'],
    ['The Tidelines', 'band', 'Loud guitars, louder drums, and songs about the weather.'],
]

const artistId = (name: string) => name.toLowerCase().replaceAll(' ', '-')

export const ARTISTS: Artist[] = ARTISTS_GIVEN.map(([name, style, about]) => ({
    id: artistId(name),
    name,
    style,
    about,
    cover: coverFor(`artist:${name}`),
}))

const ALBUMS_GIVEN: [title: string, artist: string, year: number, cover: ArtworkCover, discs?: number][] = [
    ['Open Water', 'Grace', 2025, { motif: 'wave', from: 'blue', to: 'teal' }],
    ['Northern Coast', 'Ada', 2024, { motif: 'sun', from: 'violet', to: 'pink' }],
    ['High Desert', 'Linus', 2024, { motif: 'peaks', from: 'amber', to: 'coral' }],
    ['Glass Harbor', 'Harbor Quartet', 2023, { motif: 'rings', from: 'teal', to: 'green' }],
    ['Slow Current', 'Margaret', 2023, { motif: 'bands', from: 'jade', to: 'blue' }],
    ['Archipelago', 'Juniper Trio', 2022, { motif: 'dots', from: 'pink', to: 'amber' }, 2],
    ['Lowlands', 'Ada', 2022, { motif: 'bands', from: 'green', to: 'jade' }],
    ['River Delta', 'Grace', 2021, { motif: 'sun', from: 'teal', to: 'blue' }],
    ['Meridian', 'Larkspur', 2021, { motif: 'rings', from: 'coral', to: 'violet' }],
    ['Salt and Cedar', 'Linus', 2020, { motif: 'peaks', from: 'jade', to: 'teal' }],
    ['Equinox', 'Margaret', 2020, { motif: 'dots', from: 'violet', to: 'blue' }],
    ['Morning Fjord', 'Harbor Quartet', 2019, { motif: 'wave', from: 'pink', to: 'violet' }],
    ['Highland', 'Juniper Trio', 2019, { motif: 'peaks', from: 'blue', to: 'violet' }],
    ['Atoll', 'Grace', 2018, { motif: 'rings', from: 'jade', to: 'amber' }],
    ['Coastal Plain', 'Ada', 2017, { motif: 'wave', from: 'green', to: 'teal' }],
    ['Tidewater', 'Larkspur', 2016, { motif: 'sun', from: 'coral', to: 'pink' }, 2],
    ['Shoals', 'Brackwater Duo', 2024, { motif: 'wave', from: 'teal', to: 'blue' }],
    ['Neap Tide', 'Brackwater Duo', 2021, { motif: 'bands', from: 'blue', to: 'violet' }],
    ['Sea Glass', 'Eelgrass', 2023, { motif: 'dots', from: 'jade', to: 'teal' }],
    ['Quayside', 'Eelgrass', 2020, { motif: 'rings', from: 'amber', to: 'pink' }],
    ['Long Swell', 'Eelgrass', 2018, { motif: 'wave', from: 'violet', to: 'blue' }],
    ['Ebb and Flow', 'Kelpwood', 2023, { motif: 'sun', from: 'green', to: 'amber' }],
    ['Lantern Rock', 'Northwater Choir', 2022, { motif: 'peaks', from: 'coral', to: 'amber' }],
    ['Estuary', 'Saltmarsh Ensemble', 2025, { motif: 'bands', from: 'teal', to: 'jade' }, 2],
    ['Skerries', 'Saltmarsh Ensemble', 2019, { motif: 'rings', from: 'blue', to: 'teal' }],
    ['Pilot Light', 'The Tidelines', 2024, { motif: 'sun', from: 'pink', to: 'coral' }],
    ['Driftwood', 'The Tidelines', 2022, { motif: 'peaks', from: 'jade', to: 'green' }],
    ['Shingle Beach', 'The Tidelines', 2017, { motif: 'dots', from: 'violet', to: 'pink' }],
]

const albumId = (title: string) => title.toLowerCase().replaceAll(' ', '-')

export const ALBUMS: Album[] = ALBUMS_GIVEN.map(([title, artist, year, cover, discs = 1]) => ({
    id: albumId(title),
    title,
    artist: artistId(artist),
    year,
    cover,
    discs,
}))

const pick = <T>(list: readonly T[], random: () => number): T => list[Math.floor(random() * list.length)]

const PLACES = [
    'Harbor',
    'Tide',
    'Shore',
    'Breakwater',
    'Lighthouse',
    'Quay',
    'Ferry',
    'Island',
    'Current',
    'Inlet',
    'Dune',
    'Cove',
    'Headland',
    'Marsh',
    'Reef',
    'Pier',
    'Channel',
    'Lagoon',
    'Fjord',
    'Moor',
    'Valley',
    'Ridge',
    'Meadow',
    'Orchard',
    'River',
    'Bay',
    'Sound',
    'Estuary',
    'Jetty',
    'Beacon',
    'Causeway',
    'Skerry',
    'Mooring',
    'Shingle',
    'Kelp',
    'Salt',
]
const QUALITIES = [
    'Low',
    'High',
    'Slow',
    'Quiet',
    'Northern',
    'Silver',
    'Long',
    'Last',
    'First',
    'Open',
    'Still',
    'Cold',
    'Late',
    'Early',
    'Grey',
    'Golden',
    'Hidden',
    'Distant',
    'Bright',
    'Small',
    'Far',
    'Rising',
    'Turning',
    'Western',
    'Summer',
    'Winter',
]
const TIMES = ['Dusk', 'Dawn', 'Night', 'Noon', 'Morning', 'Evening', 'Midnight', 'First Light', 'Low Water', 'High Water']
const WORDS_ALONE = [
    'Undertow',
    'Passage',
    'Driftwood',
    'Slack Water',
    'Homeward',
    'Afterglow',
    'Crosswind',
    'Landfall',
    'Wayfinder',
    'Ebb',
    'Swell',
    'Squall',
    'Mainland',
    'Halyard',
    'Spindrift',
    'Stillwater',
    'Seaward',
    'Windward',
    'Leeward',
]

/** A song's title, drawn from `random` in one of a few shapes, no word in it twice. */
export function titleFrom(random: () => number): string {
    for (;;) {
        const title = shapeOf(random)
        const words = title.toLowerCase().split(' ')
        if (new Set(words).size === words.length) return title
    }
}

function shapeOf(random: () => number): string {
    const shape = Math.floor(random() * 7)
    if (shape === 0) return `${pick(QUALITIES, random)} ${pick(PLACES, random)}`
    if (shape === 1) return `The ${pick(QUALITIES, random)} ${pick(PLACES, random)}`
    if (shape === 2) return `${pick(PLACES, random)} at ${pick(TIMES, random)}`
    if (shape === 3) return `${pick(PLACES, random)} and ${pick(PLACES, random)}`
    if (shape === 4) return pick(WORDS_ALONE, random)
    if (shape === 5) return `Over the ${pick(PLACES, random)}`
    return `${pick(QUALITIES, random)} ${pick(TIMES, random)}`
}

const PEOPLE = ['Ada', 'Grace', 'Linus', 'Margaret']

function songsOf(album: Album, artist: Artist): Song[] {
    const random = seeded(seedHash(`album:${album.id}`))
    const perDisc = album.discs > 1 ? 6 + Math.floor(random() * 2) : 7 + Math.floor(random() * 4)
    const titles = new Set<string>()
    const songs: Song[] = []
    for (let disc = 1; disc <= album.discs; disc += 1) {
        for (let number = 1; number <= perDisc; number += 1) {
            let title = titleFrom(random)
            while (titles.has(title) || title === album.title) title = titleFrom(random)
            titles.add(title)
            const seed = seedHash(`song:${album.id}:${String(disc)}:${String(number)}`)
            const guest = random() < 0.15 ? PEOPLE.filter((person) => person !== artist.name)[Math.floor(random() * 3)] : undefined
            const lyric = artist.style === 'ambient' || artist.style === 'electronic' ? 0.25 : artist.style === 'chamber' ? 0.2 : 0.85
            const words = random() < lyric ? (random() < 0.8 ? 'synced' : 'plain') : 'none'
            songs.push({
                id: `${album.id}-${String(disc)}-${String(number)}`,
                title,
                album: album.id,
                artist: artist.id,
                with: guest,
                disc,
                number,
                duration: lengthOf(seed, artist.style),
                seed,
                style: artist.style,
                words,
            })
        }
    }
    return songs
}

export const ARTIST_BY_ID = new Map(ARTISTS.map((artist) => [artist.id, artist]))
export const ALBUM_BY_ID = new Map(ALBUMS.map((album) => [album.id, album]))

export const SONGS: Song[] = ALBUMS.flatMap((album) => {
    const artist = ARTIST_BY_ID.get(album.artist)
    return artist === undefined ? [] : songsOf(album, artist)
})

const SONG_BY_ID = new Map(SONGS.map((song) => [song.id, song]))

/** A radio station: an endless run of new songs in one style, or in the style of what it was started from. */
export interface Station {
    id: string
    name: string
    style: Style
    /** What it is about, in a line. */
    about: string
    cover: ArtworkCover
    /** The artists its songs are credited to. */
    artists: readonly string[]
}

const byStyle = (styles: readonly Style[]) => ARTISTS.filter((artist) => styles.includes(artist.style)).map((artist) => artist.id)

/** The stations every listener has. */
export const STATIONS: Station[] = [
    {
        id: 'slack-water',
        name: 'Slack Water',
        style: 'ambient',
        about: 'Drones and slow pads for reading and sleep',
        cover: { motif: 'wave', from: 'blue', to: 'violet' },
        artists: byStyle(['ambient']),
    },
    {
        id: 'harbor-lights',
        name: 'Harbor Lights',
        style: 'pop',
        about: 'Bright songs with big choruses',
        cover: { motif: 'sun', from: 'amber', to: 'pink' },
        artists: byStyle(['pop']),
    },
    {
        id: 'night-ferry',
        name: 'Night Ferry',
        style: 'electronic',
        about: 'Four on the floor until morning',
        cover: { motif: 'rings', from: 'violet', to: 'teal' },
        artists: byStyle(['electronic']),
    },
    {
        id: 'fireside',
        name: 'Fireside',
        style: 'folk',
        about: 'Guitars, fiddles and voices',
        cover: { motif: 'peaks', from: 'coral', to: 'amber' },
        artists: byStyle(['folk']),
    },
    {
        id: 'stone-church',
        name: 'Stone Church',
        style: 'choir',
        about: 'Voices and strings in a high room',
        cover: { motif: 'bands', from: 'jade', to: 'blue' },
        artists: byStyle(['choir', 'chamber']),
    },
    {
        id: 'loud-weather',
        name: 'Loud Weather',
        style: 'band',
        about: 'Guitars and drums, turned up',
        cover: { motif: 'dots', from: 'pink', to: 'coral' },
        artists: byStyle(['band', 'pop']),
    },
]

/** A station started from an artist, an album or a song: new songs in its style, credited to it and its kind. */
export function stationFrom(kind: 'artist' | 'album' | 'song', ref: string): Omit<Station, 'id'> | undefined {
    const song = kind === 'song' ? SONG_BY_ID.get(ref) : undefined
    const album = kind === 'album' ? ALBUM_BY_ID.get(ref) : song === undefined ? undefined : ALBUM_BY_ID.get(song.album)
    const artist = ARTIST_BY_ID.get(kind === 'artist' ? ref : (album?.artist ?? ''))
    if (artist === undefined) return undefined
    const name = kind === 'song' && song !== undefined ? song.title : kind === 'album' && album !== undefined ? album.title : artist.name
    const kin = ARTISTS.filter((other) => other.style === artist.style && other.id !== artist.id).map((other) => other.id)
    return {
        name: `${name} radio`,
        style: artist.style,
        about: `New ${STYLE_NAMES[artist.style].toLowerCase()} songs in the spirit of ${name}`,
        cover: coverFor(`station:${kind}:${ref}`),
        artists: [artist.id, ...kin],
    }
}

/** The `index`th song a station plays, made from the station's id and the count, so it is the same each time it is asked for. */
export function radioSong(station: Pick<Station, 'id' | 'name' | 'style' | 'artists'>, index: number): Song {
    const seed = seedHash(`radio:${station.id}:${String(index)}`)
    const random = seeded(seed)
    const artist = station.artists[Math.floor(random() * station.artists.length)] ?? 'ada'
    return {
        id: `radio:${station.id}:${String(index)}`,
        title: titleFrom(random),
        album: `radio:${station.id}`,
        artist,
        disc: 1,
        number: index + 1,
        duration: lengthOf(seed, station.style),
        seed,
        style: station.style,
        words: station.style === 'ambient' || station.style === 'electronic' ? 'none' : random() < 0.6 ? 'synced' : 'none',
    }
}

/** The stations a listener made, kept by the backend, for `songOf` to read a radio song's station from. */
const madeStations = new Map<string, Station>()

export function knowStations(stations: readonly Station[]): void {
    for (const station of stations) madeStations.set(station.id, station)
}

export function stationOf(id: string): Station | undefined {
    return STATIONS.find((station) => station.id === id) ?? madeStations.get(id)
}

/** A song by its id: one in the library, or a radio song, made again from its station and count. */
export function songOf(id: string): Song | undefined {
    const found = SONG_BY_ID.get(id)
    if (found !== undefined) return found
    const match = /^radio:(.+):(\d+)$/.exec(id)
    if (match === null) return undefined
    const station = stationOf(match[1])
    return station === undefined ? undefined : radioSong(station, Number(match[2]))
}

/** The album a song is on, or for a radio song its station dressed as one. */
export function albumOf(song: Song): Album {
    const album = ALBUM_BY_ID.get(song.album)
    if (album !== undefined) return album
    const station = stationOf(song.album.replace(/^radio:/, ''))
    return {
        id: song.album,
        title: station?.name ?? 'Radio',
        artist: song.artist,
        year: 2026,
        cover: station?.cover ?? coverFor(song.album),
        discs: 1,
    }
}

export const artistName = (id: string) => ARTIST_BY_ID.get(id)?.name ?? id

export const songsOfAlbum = (id: string) => SONGS.filter((song) => song.album === id)
export const albumsOfArtist = (id: string) => ALBUMS.filter((album) => album.artist === id).sort((one, other) => other.year - one.year)
export const songsOfArtist = (id: string) => SONGS.filter((song) => song.artist === id)

/** Minutes, rounded, written for a line under a title. */
export function minutes(seconds: number): string {
    const whole = Math.max(1, Math.round(seconds / 60))
    return `${String(whole)} min`
}

/** A total length of songs. */
export const lengthOfSongs = (songs: readonly Song[]) => songs.reduce((sum, song) => sum + song.duration, 0)

/** The size a song takes kept on the device: 16-bit samples at the synthesizer's rate. */
export const bytesOf = (song: Song) => Math.round(song.duration * 22_050 * 2 + 44)

/** Bytes written for people: 4.2 MB. */
export function formatBytes(bytes: number): string {
    if (bytes < 1_000_000) return `${String(Math.max(1, Math.round(bytes / 1000)))} kB`
    return `${(bytes / 1_000_000).toFixed(1)} MB`
}
