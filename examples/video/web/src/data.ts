/**
 * What the viewer keeps on the site, on the shared fake backend under the example's own prefix: the channels they follow, what
 * they liked, what they watched and where they stopped, their playlists, comments, downloads and
 * player settings. Each list answers after a short wait, as a server would.
 */

import { createStore, useStore, type Store } from '@winterop-com/sokkel-ui/hooks/use-store'
import type { CaptionSettings } from '@winterop-com/sokkel-ui/media/captions'
import { useMemo } from 'react'

import { collection, useCollection, type Collection, type Row } from 'tidevann-shared/backend'
import { VIDEOS, VIEWER, channelOf, type Person } from './catalog'
import type { RenditionId } from './clips'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** A channel the viewer follows, under the channel's id. */
export interface Follow extends Row {
    since: number
}

/** What the viewer thinks of a video, under the video's id. */
export interface Rating extends Row {
    rating: 'like' | 'dislike'
}

/** A video the viewer watched, under its id: where they stopped, when, and whether they saw it to the end. */
export interface Watched extends Row {
    position: number
    at: number
    finished: boolean
    times: number
}

/** A list of videos the viewer keeps; `later` is Watch later, the rest are their own. */
export interface Playlist extends Row {
    name: string
    description: string
    videos: string[]
    created: number
    updated: number
}

export interface Comment extends Row {
    video: string
    /** The comment it answers, or null for one on the video itself. */
    parent: string | null
    author: Person
    text: string
    at: number
    likes: number
    liked: boolean
    disliked: boolean
    pinned: boolean
    /** Reported by the viewer, and so hidden from them. */
    reported: boolean
}

/** A video kept on this device to watch without the site, under the video's id. */
export interface Download extends Row {
    rendition: RenditionId
    bytes: number
    at: number
}

export type Quality = 'auto' | RenditionId

/** The viewer's player and site settings, one row. */
export interface Prefs extends Row {
    /** Plays what is next when a video ends, after a countdown. */
    autoplay: boolean
    theater: boolean
    /** The speed every video starts at. */
    rate: number
    quality: Quality
    /** The captions' look and whether they are on, as the player's captions menu and the settings set them. */
    captions: Partial<CaptionSettings>
    /** Keeps what is watched in the history. */
    history: boolean
    /** Shows the stats over the picture. */
    stats: boolean
}

export const WATCH_LATER = 'later'

export const DEFAULT_PREFS: Prefs = {
    id: 'me',
    autoplay: true,
    theater: false,
    rate: 1,
    quality: 'auto',
    captions: { track: 'en' },
    history: true,
    stats: false,
}

export const follows = collection<Follow>('follows', () => {
    const now = Date.now()
    return [
        { id: 'harbor', since: now - 200 * DAY },
        { id: 'night', since: now - 40 * DAY },
        { id: 'tides', since: now - 10 * DAY },
    ]
})

/** The channels followed as the backend last said, so a double press never follows one twice. */
const followedNow = new Set<string>()
void follows.list().then((rows) => rows.forEach((row) => followedNow.add(row.id)))
follows.subscribe((rows) => {
    followedNow.clear()
    rows.forEach((row) => followedNow.add(row.id))
})

/** Follows a channel or stops, kept by the backend; a press that asks for what already holds does nothing. */
export function setFollowing(channel: string, on: boolean): Promise<unknown> {
    if (on === followedNow.has(channel)) return Promise.resolve()
    if (on) followedNow.add(channel)
    else followedNow.delete(channel)
    return on ? follows.create({ since: Date.now() }, channel) : follows.remove(channel)
}

export const ratings = collection<Rating>('ratings', () => [
    { id: 'aurora-fjord', rating: 'like' },
    { id: 'first-light', rating: 'like' },
    { id: 'island-ferry', rating: 'like' },
])

export const watched = collection<Watched>('history', () => {
    const now = Date.now()
    return [
        { id: 'first-light', position: 17, at: now - 2 * HOUR, finished: false, times: 1 },
        { id: 'tide-table', position: 0, at: now - 5 * HOUR, finished: true, times: 2 },
        { id: 'island-ferry', position: 0, at: now - DAY - 3 * HOUR, finished: true, times: 1 },
        { id: 'snow-pass', position: 24, at: now - 3 * DAY, finished: false, times: 1 },
        { id: 'valley-line', position: 9, at: now - 6 * DAY, finished: false, times: 1 },
    ]
})

/** The ids the history holds, as the backend last said, and the rows being made, so a row is never made twice. */
const inHistory = new Set<string>()
const makingHistory = new Map<string, Promise<unknown>>()
void watched.list().then((rows) => rows.forEach((row) => inHistory.add(row.id)))
watched.subscribe((rows) => {
    inHistory.clear()
    rows.forEach((row) => inHistory.add(row.id))
})

/** Keeps where the viewer is in a video, making its history row the first time. */
export function keepWatched(id: string, patch: Partial<Omit<Watched, 'id'>>): void {
    const making = makingHistory.get(id)
    if (making !== undefined) {
        void making.then(() => watched.update(id, patch))
        return
    }
    if (inHistory.has(id)) {
        void watched.update(id, patch)
        return
    }
    const made = watched
        .create({ position: 0, at: Date.now(), finished: false, times: 0, ...patch }, id)
        .finally(() => makingHistory.delete(id))
    makingHistory.set(id, made)
}

export const playlists = collection<Playlist>('playlists', () => {
    const now = Date.now()
    return [
        {
            id: WATCH_LATER,
            name: 'Watch later',
            description: '',
            videos: ['night-train', 'spring-tide', 'aurora-night'],
            created: now - 90 * DAY,
            updated: now - DAY,
        },
        {
            id: 'coast-mornings',
            name: 'Coast mornings',
            description: 'Slow starts by the sea, for the first coffee.',
            videos: ['first-light', 'harbor-wakes', 'boat-afloat'],
            created: now - 30 * DAY,
            updated: now - 4 * DAY,
        },
        {
            id: 'window-seat',
            name: 'Window seat',
            description: 'Long train rides, filmed from the window.',
            videos: ['valley-line', 'salt-flats', 'night-train'],
            created: now - 12 * DAY,
            updated: now - 2 * DAY,
        },
    ]
})

export const downloads = collection<Download>('downloads', () => [])

/** What people say under any video of the site, a few picked for each. */
const SAID: readonly string[] = [
    'Watched this twice already. The sound alone is worth it.',
    'Where exactly is this filmed? It looks a lot like the coast where I grew up.',
    'Perfect to have on while working. More of these, please.',
    'The pacing is exactly right: nothing rushed, nothing added.',
    'I would love a longer version of this one.',
    'Saved it for the next rainy evening.',
    'How long did this take to film? It must have been a lot of early mornings.',
    'This is the calmest thing I have seen all week.',
]

const REPLIES: readonly string[] = [
    'Same here.',
    'Agreed, the ending especially.',
    'It is about an hour north of the city, past the old ferry quay.',
    'Thanks, that means a lot.',
]

/** A comment or two from the channel's owner, pinned, and a few from the rest, with some replies. */
function seedComments(): Comment[] {
    const now = Date.now()
    const people: Person[] = ['ada', 'grace', 'linus', 'margaret']
    const out: Comment[] = []
    VIDEOS.forEach((video, index) => {
        const owner = channelOf(video).owner
        const at = (days: number, hours = 0) => now - Math.min(days, video.days) * DAY - hours * HOUR - (index % 5) * MINUTE * 7
        const comment = (
            id: string,
            author: Person,
            text: string,
            when: number,
            likes: number,
            parent: string | null = null,
            pinned = false,
        ): Comment => ({
            id: `${video.id}-${id}`,
            video: video.id,
            parent: parent === null ? null : `${video.id}-${parent}`,
            author,
            text,
            at: when,
            likes,
            liked: false,
            disliked: false,
            pinned,
            reported: false,
        })
        if (index % 3 !== 2) {
            out.push(
                comment(
                    'owner',
                    owner,
                    `Thank you for watching. ${video.captions[0] ?? ''} The next one is already in the works.`,
                    at(video.days, -1),
                    120 + index * 37,
                    null,
                    true,
                ),
            )
        }
        const others = people.filter((person) => person !== owner && person !== VIEWER)
        for (let n = 0; n < 2 + (index % 3); n += 1) {
            const author = others[(index + n) % others.length] ?? 'grace'
            const text = SAID[(index * 3 + n) % SAID.length] ?? ''
            out.push(
                comment(
                    `c${String(n)}`,
                    author,
                    text,
                    at(Math.max(0, video.days - n - 1), n * 3),
                    Math.max(0, 90 - n * 31 - (index % 7) * 9),
                ),
            )
            if (n === 0) {
                out.push(
                    comment(
                        `c${String(n)}-r`,
                        owner === author ? 'linus' : owner,
                        REPLIES[index % REPLIES.length] ?? '',
                        at(Math.max(0, video.days - n - 1), n * 3 - 2),
                        4 + (index % 9),
                        `c${String(n)}`,
                    ),
                )
            }
        }
    })
    return out
}

export const comments = collection<Comment>('comments', seedComments)

const prefsRows = collection<Prefs>('prefs', () => [DEFAULT_PREFS])

/** The settings as the page holds them, the backend's answer as soon as it comes, and every change at once. */
const prefsStore = createStore<Prefs>(DEFAULT_PREFS)
let loaded = false
void prefsRows.list().then((rows) => {
    loaded = true
    const row = rows.find((one) => one.id === 'me')
    if (row !== undefined) prefsStore.set({ ...DEFAULT_PREFS, ...row })
})
prefsRows.subscribe((rows) => {
    const row = rows.find((one) => one.id === 'me')
    if (row !== undefined) prefsStore.set({ ...DEFAULT_PREFS, ...row })
})

/** Changes settings at once on the page and tells the backend. */
export function setPrefs(patch: Partial<Omit<Prefs, 'id'>>): void {
    prefsStore.set({ ...prefsStore.get(), ...patch })
    void prefsRows.update('me', patch).catch(() => prefsRows.create({ ...DEFAULT_PREFS, ...prefsStore.get(), ...patch }, 'me'))
}

/** The viewer's settings, current as they change. */
export function usePrefs(): Prefs {
    return useStore(prefsStore)
}

export const prefsReady = () => loaded

/**
 * The captions' settings as the player's `captionStore`: the same object until they change, so the
 * player and the settings page read and write one place, kept by the backend.
 */
export const captionStore: Store<Partial<CaptionSettings>> = {
    get: () => prefsStore.get().captions,
    set: (next) => setPrefs({ captions: next }),
    update: (change) => setPrefs({ captions: change(prefsStore.get().captions) }),
    subscribe: (listener) => {
        let last = prefsStore.get().captions
        return prefsStore.subscribe(() => {
            const now = prefsStore.get().captions
            if (now === last) return
            last = now
            listener()
        })
    },
}

/** A collection's rows, empty until the first answer, with whether that answer has come. */
export function useRows<T extends Row>(source: Collection<T>): { rows: T[]; ready: boolean; error: string | undefined } {
    const { rows, error } = useCollection(source)
    return useMemo(() => ({ rows: rows ?? [], ready: rows !== undefined, error }), [rows, error])
}

/** The rows of a collection as a map by id. */
export function useById<T extends Row>(source: Collection<T>): Map<string, T> {
    const { rows } = useRows(source)
    return useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows])
}
