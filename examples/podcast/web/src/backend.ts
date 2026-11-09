/**
 * What the backend keeps for the listener: which shows they follow, where they are in each
 * episode, the queue and the player, their settings and the time they listened. The shows and
 * episodes themselves are the catalog's.
 */

import type { DownloadState } from '@winterop-com/sokkel-ui/DownloadButton'
import { collection } from 'tidevann-shared/backend'

import { EPISODES, episodeById, SHOWS } from './catalog'
import { lengthOf, seeded } from './script'

export interface ShowState {
    id: string
    subscribed: boolean
    /** When it was followed, in milliseconds. */
    since: number | null
}

export interface EpisodeState {
    id: string
    /** Whether it has come out, and when, in milliseconds. */
    out: boolean
    outAt: number
    /** Where the listener left it, in seconds. */
    position: number
    played: boolean
    starred: boolean
    /** Whether it waits in New. */
    inbox: boolean
    download: DownloadState
    /** How far a download has come, from 0 to 1. */
    progress: number
    /** When it was last heard, in milliseconds. */
    heard: number | null
}

export interface Player {
    id: string
    current: string | null
    /** The episodes to play after it, in order. */
    queue: string[]
    rate: number
    volume: number
    muted: boolean
}

export interface Prefs {
    id: string
    /** The speed a new episode starts at. */
    speed: number
    /** How far the skip buttons move, in seconds. */
    skip: number
    /** Whether the next in the queue plays when an episode ends. */
    continueQueue: boolean
    /** Whether new episodes of followed shows download as they come out. */
    autoDownload: boolean
    /** Whether new episodes of followed shows go to New. */
    inbox: boolean
    /** Whether an episode leaves New once played. */
    archivePlayed: boolean
}

/** Time listened on one day to one show. */
export interface Listen {
    id: string
    day: string
    show: string
    /** Seconds of the listener's time. */
    seconds: number
    /** Seconds of the episodes heard, more than `seconds` when played faster. */
    content: number
    /** Episodes played to the end. */
    finished: number
}

export const DAY = 86_400_000

/** The local day `offset` days from today, as `YYYY-MM-DD`. */
export function day(offset = 0, from = Date.now()): string {
    const date = new Date(from + offset * DAY)
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const FOLLOWED = new Set(['low-tide-hours', 'harbor-log', 'field-notes-larkspur', 'juniper-weather', 'tidevann-weekly'])

export const DEFAULT_PREFS: Prefs = {
    id: 'prefs',
    speed: 1,
    skip: 15,
    continueQueue: true,
    autoDownload: true,
    inbox: true,
    archivePlayed: true,
}

function seedShows(): ShowState[] {
    const now = Date.now()
    return SHOWS.map((show, index) => ({
        id: show.id,
        subscribed: FOLLOWED.has(show.id),
        since: FOLLOWED.has(show.id) ? now - (60 - index) * DAY : null,
    }))
}

/** Where the listener is in a few episodes, as seconds in. */
const STARTED: Record<string, number> = {
    'low-tide-hours-3': 48,
    'tidevann-weekly-2': 31,
    'islands-one-by-one-2': 22,
}
const STARRED = new Set(['low-tide-hours-1', 'lighthouse-stories-1', 'tidevann-weekly-1', 'rivers-and-deltas-3'])
const KEPT = new Set(['low-tide-hours-3', 'low-tide-hours-4', 'harbor-log-3', 'juniper-weather-3'])

function seedEpisodes(): EpisodeState[] {
    const now = Date.now()
    return EPISODES.map((episode) => {
        const out = episode.age !== undefined
        const age = episode.age ?? 0
        const followed = FOLLOWED.has(episode.show)
        const started = STARTED[episode.id]
        const played = out && started === undefined && followed && age > 12
        return {
            id: episode.id,
            out,
            outAt: now - age * DAY,
            position: started ?? 0,
            played,
            starred: STARRED.has(episode.id),
            inbox: out && followed && !played && age <= 12,
            download: KEPT.has(episode.id) ? 'kept' : 'idle',
            progress: KEPT.has(episode.id) ? 1 : 0,
            heard: played ? now - (age - 1) * DAY : started === undefined ? null : now - DAY * (episode.id === 'low-tide-hours-3' ? 0 : 3),
        }
    })
}

function seedPlayer(): Player[] {
    return [
        {
            id: 'player',
            current: 'low-tide-hours-3',
            queue: ['tidevann-weekly-3', 'juniper-weather-3', 'field-notes-larkspur-3'],
            rate: 1,
            volume: 0.8,
            muted: false,
        },
    ]
}

/** Two weeks of listening, made up the same way every time. */
function seedListens(): Listen[] {
    const random = seeded('listens')
    const shows = [...FOLLOWED, 'islands-one-by-one', 'lighthouse-stories']
    const rows: Listen[] = []
    for (let offset = -13; offset <= -1; offset += 1) {
        const count = 1 + Math.floor(random() * 3)
        for (let index = 0; index < count; index += 1) {
            const show = shows[Math.floor(random() * shows.length)] ?? 'low-tide-hours'
            const date = day(offset)
            const id = `${date}:${show}`
            const seconds = Math.round(60 + random() * 420)
            const fast = random() < 0.4 ? 1.25 : 1
            const found = rows.find((row) => row.id === id)
            if (found !== undefined) {
                found.seconds += seconds
                found.content += Math.round(seconds * fast)
                continue
            }
            rows.push({ id, day: date, show, seconds, content: Math.round(seconds * fast), finished: Math.floor(random() * 3) })
        }
    }
    return rows
}

export const shows = collection<ShowState>('shows', seedShows)
export const episodes = collection<EpisodeState>('episodes', seedEpisodes)
export const players = collection<Player>('player', seedPlayer)
export const prefsRows = collection<Prefs>('prefs', () => [{ ...DEFAULT_PREFS }])
export const listens = collection<Listen>('listens', seedListens)

/** The size an episode takes on the device, in megabytes, as if encoded at 64 kbit/s. */
export function sizeOf(id: string): number {
    return episodeById.has(id) ? (lengthOf(id) * 64) / 8 / 1024 : 0
}
