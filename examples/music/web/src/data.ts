/**
 * What the listener keeps, in the fake backend: favorites, playlists, downloads, the stations they
 * made, what they played, what the player was doing and their settings. Each collection is mirrored
 * here in a store, so a change shows at once and goes to the backend after; once it is through,
 * the backend's rows are read back, so a refusal puts them back.
 */
import { createStore, useStore, type Store } from '@winterop-com/sokkel-ui/hooks/use-store'
import type { RepeatMode } from '@winterop-com/sokkel-ui-media/queue'
import { collection, type Collection, type Row } from 'tidevann-shared/backend'

import { ALBUMS, SONGS, songsOfAlbum, type Station } from './catalog'

/** A collection's rows held for the page to read at once, undefined until the backend first answers. */
export interface Mirror<T extends Row> {
    store: Store<T[] | undefined>
    /** Changes the rows here at once, then asks the backend; a refusal reads the backend's rows back. */
    change: (next: (rows: T[]) => T[], call: (source: Collection<T>) => Promise<unknown>) => void
    source: Collection<T>
}

function mirror<T extends Row>(source: Collection<T>): Mirror<T> {
    const store = createStore<T[] | undefined>(undefined)
    // While changes are on their way, the backend's rows between their steps are not drawn, so a
    // change of several calls, such as removing every row, does not flicker back.
    let pending = 0
    void source.list().then((rows) => store.set(rows))
    source.subscribe((rows) => {
        if (pending === 0) store.set(rows)
    })
    return {
        store,
        source,
        change: (next, call) => {
            store.set(next(store.get() ?? []))
            pending += 1
            void call(source)
                .catch(() => undefined)
                .finally(() => {
                    pending -= 1
                    if (pending > 0) return
                    void source.list().then((rows) => {
                        if (pending === 0) store.set(rows)
                    })
                })
        },
    }
}

/** A mirror's rows, followed as they change: none until the backend first answers. */
export function useRows<T extends Row>(source: Mirror<T>): T[] {
    return useStore(source.store) ?? []
}

let made = 0
/** A fresh id for a row the page makes. */
export const newId = (kind: string) => {
    made += 1
    return `${kind}-${Date.now().toString(36)}-${String(made)}`
}

// Favorites

export type FavoriteKind = 'song' | 'album' | 'artist'

export interface Favorite extends Row {
    kind: FavoriteKind
    ref: string
    at: number
}

const STARTED = Date.UTC(2026, 10, 1, 9)

export const favorites = mirror(
    collection<Favorite>('music-favorites', () => [
        ...[
            'open-water-1-2',
            'open-water-1-4',
            'northern-coast-1-1',
            'high-desert-1-3',
            'glass-harbor-1-2',
            'sea-glass-1-1',
            'pilot-light-1-1',
        ].map((ref, index): Favorite => ({ id: `song:${ref}`, kind: 'song', ref, at: STARTED - index * 3_600_000 })),
        ...['open-water', 'archipelago', 'estuary'].map((ref, index): Favorite => ({
            id: `album:${ref}`,
            kind: 'album',
            ref,
            at: STARTED - index * 7_200_000,
        })),
        ...['grace', 'eelgrass'].map((ref, index): Favorite => ({
            id: `artist:${ref}`,
            kind: 'artist',
            ref,
            at: STARTED - index * 9_000_000,
        })),
    ]),
)

/** Stars or unstars a song, an album or an artist. */
export function setFavorite(kind: FavoriteKind, ref: string, on: boolean): void {
    const id = `${kind}:${ref}`
    if (on) {
        const row: Favorite = { id, kind, ref, at: Date.now() }
        favorites.change(
            (rows) => [row, ...rows.filter((one) => one.id !== id)],
            (source) => source.create({ kind, ref, at: row.at }, id),
        )
    } else {
        favorites.change(
            (rows) => rows.filter((one) => one.id !== id),
            (source) => source.remove(id),
        )
    }
}

/** Whether each of a kind is starred, as a set of the starred ids. */
export function useStarred(kind: FavoriteKind): ReadonlySet<string> {
    const rows = useRows(favorites)
    return new Set(rows.filter((row) => row.kind === kind).map((row) => row.ref))
}

// Playlists

/** One place on a playlist: the same song may stand on it twice, each its own entry. */
export interface PlaylistEntry {
    key: string
    song: string
}

export interface Playlist extends Row {
    name: string
    description: string
    entries: PlaylistEntry[]
    updated: number
}

const pickSongs = (step: number, count: number, from = 0) =>
    Array.from({ length: count }, (_, index) => SONGS[(from + index * step) % SONGS.length].id)

const entriesOf = (songs: readonly string[]): PlaylistEntry[] => songs.map((song, index) => ({ key: `${song}~${String(index)}`, song }))

export const playlists = mirror(
    collection<Playlist>('music-playlists', () => [
        {
            id: 'morning-run',
            name: 'Morning run',
            description: 'Fast songs for the coast road.',
            entries: entriesOf(pickSongs(11, 14, 3)),
            updated: STARTED,
        },
        {
            id: 'deep-focus',
            name: 'Deep focus',
            description: 'No words, nothing sudden.',
            entries: entriesOf(pickSongs(17, 12, 40)),
            updated: STARTED - 86_400_000,
        },
        {
            id: 'long-drive',
            name: 'Long drive',
            description: '',
            entries: entriesOf(pickSongs(7, 20, 9)),
            updated: STARTED - 2 * 86_400_000,
        },
        {
            id: 'sunday-slow',
            name: 'Sunday slow',
            description: 'For the slow end of the week.',
            entries: entriesOf(pickSongs(23, 9, 61)),
            updated: STARTED - 5 * 86_400_000,
        },
    ]),
)

/** Changes a playlist here and in the backend. */
export function changePlaylist(id: string, patch: Partial<Omit<Playlist, 'id'>>): void {
    const updated = Date.now()
    playlists.change(
        (rows) => rows.map((row) => (row.id === id ? { ...row, ...patch, updated } : row)),
        (source) => source.update(id, { ...patch, updated }),
    )
}

/** Makes a playlist holding `songs`, and answers its id. */
export function createPlaylist(name: string, songs: readonly string[] = []): string {
    const id = newId('playlist')
    const row: Playlist = {
        id,
        name,
        description: '',
        entries: entriesOf(songs).map((entry) => ({ ...entry, key: `${entry.key}~${id}` })),
        updated: Date.now(),
    }
    playlists.change(
        (rows) => [row, ...rows],
        (source) => source.create({ name: row.name, description: row.description, entries: row.entries, updated: row.updated }, id),
    )
    return id
}

export function deletePlaylist(id: string): void {
    playlists.change(
        (rows) => rows.filter((row) => row.id !== id),
        (source) => source.remove(id),
    )
}

/** Adds songs at the end of a playlist. */
export function addToPlaylist(id: string, songs: readonly string[]): void {
    const playlist = playlists.store.get()?.find((row) => row.id === id)
    if (playlist === undefined) return
    const stamp = Date.now().toString(36)
    changePlaylist(id, {
        entries: [...playlist.entries, ...songs.map((song, index) => ({ key: `${song}~${stamp}~${String(index)}`, song }))],
    })
}

// Downloads

export interface Download extends Row {
    state: 'running' | 'kept'
    /** How many of the album's songs are in. */
    done: number
    total: number
    bytes: number
    at: number
}

export const downloads = mirror(
    collection<Download>('music-downloads', () =>
        ['northern-coast', 'sea-glass', 'pilot-light'].map((album, index) => {
            const songs = songsOfAlbum(album)
            return {
                id: album,
                state: 'kept' as const,
                done: songs.length,
                total: songs.length,
                bytes: songs.reduce((sum, song) => sum + Math.round(song.duration * 44_100 + 44), 0),
                at: STARTED - index * 86_400_000,
            }
        }),
    ),
)

// Stations

/** A station the listener started from an artist, an album or a song. */
export interface MadeStation extends Row, Omit<Station, 'id'> {
    from: { kind: 'artist' | 'album' | 'song'; ref: string }
    at: number
}

export const stations = mirror(collection<MadeStation>('music-stations', () => []))

// History

export interface Played extends Row {
    song: string
    at: number
}

export const history = mirror(
    collection<Played>('music-history', () =>
        ['glass-harbor-1-1', 'lowlands-1-3', 'shoals-1-2', 'open-water-1-1'].map((song, index) => ({
            id: `played-seed-${String(index)}`,
            song,
            at: STARTED - (index + 1) * 600_000,
        })),
    ),
)

/** How many plays the history keeps. */
const HISTORY = 60

/** Tells the history a song started. */
export function played(song: string): void {
    const rows = history.store.get() ?? []
    if (rows[0]?.song === song) return
    const id = newId('played')
    const at = Date.now()
    const over = rows.slice(HISTORY - 1)
    history.change(
        (now) => [{ id, song, at }, ...now].slice(0, HISTORY),
        async (source) => {
            await source.create({ song, at }, id)
            for (const old of over) await source.remove(old.id)
        },
    )
}

export function clearHistory(): void {
    const rows = history.store.get() ?? []
    history.change(
        () => [],
        async (source) => {
            for (const row of rows) await source.remove(row.id)
        },
    )
}

// The player, as it was left

/** Where what plays came from, for the queue's "Playing from" and a way back to it. */
export interface Source {
    kind: 'album' | 'artist' | 'playlist' | 'favorites' | 'tracks' | 'radio' | 'search' | 'history'
    label: string
    /** The route back to it. */
    href?: string
}

export interface QueueEntry {
    key: string
    song: string
}

export interface PlayerRow extends Row {
    entries: QueueEntry[]
    order: number[]
    at: number
    shuffle: boolean
    repeat: RepeatMode
    position: number
    source: Source | null
    /** The station playing, and how many songs it has made. */
    radio: { station: string; made: number } | null
}

const FIRST = songsOfAlbum(ALBUMS[0].id)

export const DEFAULT_PLAYER: PlayerRow = {
    id: 'now',
    entries: FIRST.map((song) => ({ key: song.id, song: song.id })),
    order: FIRST.map((_, index) => index),
    at: 0,
    shuffle: false,
    repeat: 'off',
    position: 0,
    source: { kind: 'album', label: ALBUMS[0].title, href: `/albums/${ALBUMS[0].id}` },
    radio: null,
}

export const playerRows = collection<PlayerRow>('music-player', () => [DEFAULT_PLAYER])

// Settings

export type Look = 'spectrum' | 'mirror' | 'area' | 'wave' | 'ring'
export type Ramp = 'theme' | 'heat' | 'cool' | 'lagoon' | 'ink'
export type Effect = 'none' | 'glow' | 'trails'

export interface Settings extends Row {
    volume: number
    muted: boolean
    rate: number
    /** Seconds one song fades into the next; 0 plays them back to back. */
    crossfade: number
    layout: 'rows' | 'panel' | 'stage'
    /** The bar's height in pixels, as it was left; null for the one line. */
    barSize: number | null
    /** Whether the visualizer rises behind the grown bar. */
    barVisualizer: boolean
    look: Look
    ramp: Ramp
    effect: Effect
    /** Milliseconds the picture waits for the output, for a slow speaker. */
    delay: number
    /** Whether the fullscreen view shows the words in place of the picture. */
    lyrics: boolean
    queueOpen: boolean
    /** Whether a new session picks up where the last one stopped. */
    resume: boolean
    albumOrder: 'recent' | 'title' | 'artist' | 'year'
}

export const DEFAULT_SETTINGS: Settings = {
    id: 'settings',
    volume: 0.8,
    muted: false,
    rate: 1,
    crossfade: 0,
    layout: 'rows',
    barSize: null,
    barVisualizer: true,
    look: 'spectrum',
    ramp: 'theme',
    effect: 'none',
    delay: 0,
    lyrics: false,
    queueOpen: false,
    resume: true,
    albumOrder: 'recent',
}

const settingsRows = collection<Settings>('music-settings', () => [DEFAULT_SETTINGS])

/** The settings, here at once and kept by the backend shortly after a change. */
export const settings = createStore<Settings>(DEFAULT_SETTINGS)
let settingsLoaded = false
let settingsTimer: ReturnType<typeof setTimeout> | undefined

export function setSettings(patch: Partial<Omit<Settings, 'id'>>): void {
    settings.update((now) => ({ ...now, ...patch }))
    clearTimeout(settingsTimer)
    settingsTimer = setTimeout(() => {
        const { id, ...rest } = settings.get()
        void settingsRows.update(id, rest).catch(() => settingsRows.create(rest, id))
    }, 300)
}

export const useSettings = () => useStore(settings)

/** Reads what the backend keeps that the page needs before it draws: the settings and the player as they were left. */
export async function loadKept(): Promise<PlayerRow> {
    const [kept, player] = await Promise.all([settingsRows.list(), playerRows.list()])
    if (!settingsLoaded) {
        settings.set({ ...DEFAULT_SETTINGS, ...kept[0] })
        settingsLoaded = true
    }
    return { ...DEFAULT_PLAYER, ...player.find((row) => row.id === 'now') }
}
