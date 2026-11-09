/**
 * What every page reads and does: the listener's shows and episodes, the queue, the settings, and
 * the player, one audio element that plays each episode's sound as it is made in the page.
 */

import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { chapterStarts } from '@winterop-com/sokkel-ui-media/ChapterList'
import { useSleepTimer, type SleepTimerControls } from '@winterop-com/sokkel-ui-media/SleepTimer'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useCollection, type Collection } from 'tidevann-shared/backend'
import {
    day,
    DEFAULT_PREFS,
    episodes as episodeRows,
    listens as listenRows,
    players,
    prefsRows,
    shows as showRows,
    type EpisodeState,
    type Listen,
    type Player,
    type Prefs,
    type ShowState,
} from './backend'
import { EPISODES, episodeById, showById } from './catalog'
import { scriptOf, type Script } from './script'
import { soundOf } from './voice'

type Patch<T> = Partial<Omit<T, 'id'>>

const failed = (what: string) => (error: unknown) => {
    toast.add({ type: 'error', title: what, description: error instanceof Error ? error.message : String(error) })
}

/**
 * A collection's rows with each change shown at once, before the backend answers, so a second
 * change made meanwhile builds on the first.
 */
function useRows<T extends { id: string }>(source: Collection<T>) {
    const { rows, error } = useCollection(source)
    const [pending, setPending] = useState<Record<string, Patch<T>>>({})
    const merged = useMemo(
        () => (rows ?? []).map((row) => (pending[row.id] === undefined ? row : { ...row, ...pending[row.id] })),
        [rows, pending],
    )
    const latest = useRef(merged)
    latest.current = merged
    const patch = useCallback(
        (id: string, change: Patch<T>) => {
            latest.current = latest.current.map((row) => (row.id === id ? { ...row, ...change } : row))
            setPending((now) => ({ ...now, [id]: { ...now[id], ...change } }))
            const settle = () =>
                setPending((now) => {
                    const mine = { ...now[id] } as Record<string, unknown>
                    for (const [key, value] of Object.entries(change)) if (mine[key] === value) delete mine[key]
                    const rest = { ...now }
                    if (Object.keys(mine).length === 0) delete rest[id]
                    else rest[id] = mine as Patch<T>
                    return rest
                })
            return source.update(id, change).then(settle, (error: unknown) => {
                settle()
                failed('The change was not saved')(error)
            })
        },
        [source],
    )
    return { rows: merged, loaded: rows !== undefined, error, latest, patch }
}

export interface PodcastState {
    loading: boolean
    error: string | undefined
    shows: Map<string, ShowState>
    episodes: Map<string, EpisodeState>
    player: Player
    prefs: Prefs
    listens: readonly Listen[]

    /** The element that plays, for the bar's smooth scrubber and the visualizer, once it holds what plays. */
    media: HTMLAudioElement | null
    current: string | null
    script: Script | undefined
    playing: boolean
    position: number
    waveform: readonly number[] | undefined
    sleep: SleepTimerControls

    /** Plays an episode, or plays and pauses the one playing. */
    play: (id: string, at?: number) => void
    setPlaying: (playing: boolean) => void
    seek: (seconds: number) => void
    skip: (seconds: number) => void
    setRate: (rate: number) => void
    setVolume: (volume: number) => void
    setMuted: (muted: boolean) => void
    /** Plays the first in the queue; false when the queue is empty. */
    playNext: () => boolean

    queueAdd: (id: string, where: 'next' | 'end') => void
    queueRemove: (id: string) => void
    queueMove: (from: number, to: number) => void
    queueClear: () => void

    markPlayed: (id: string, played: boolean) => void
    star: (id: string, starred: boolean) => void
    archive: (id: string) => void
    archiveAll: () => void
    download: (id: string) => void
    removeDownload: (id: string) => void
    removeAllDownloads: () => void
    /** Brings the next episode of each followed show that has one still to come; answers how many came. */
    checkForNew: () => Promise<number>

    subscribe: (show: string) => void
    unsubscribe: (show: string) => void

    setPrefs: (patch: Patch<Prefs>) => void
    clearStats: () => Promise<void>
}

const Context = createContext<PodcastState | undefined>(undefined)

export function usePodcasts(): PodcastState {
    const state = useContext(Context)
    if (state === undefined) throw new Error('usePodcasts needs a PodcastProvider around it')
    return state
}

const PLAYER: Player = { id: 'player', current: null, queue: [], rate: 1, volume: 0.8, muted: false }

/** How often the place in an episode is kept while it plays, in milliseconds. */
const KEEP_EVERY = 5000

/** How often the time listened is written down while playing, in seconds. */
const LOG_EVERY = 15

const titleOf = (id: string) => episodeById.get(id)?.title ?? id

export function PodcastProvider({ children }: { children: ReactNode }) {
    const showList = useRows(showRows)
    const episodeList = useRows(episodeRows)
    const playerList = useRows(players)
    const prefList = useRows(prefsRows)
    const listenList = useCollection(listenRows)

    const shows = useMemo(() => new Map(showList.rows.map((row) => [row.id, row])), [showList.rows])
    const episodes = useMemo(() => new Map(episodeList.rows.map((row) => [row.id, row])), [episodeList.rows])
    const player = playerList.rows[0] ?? PLAYER
    const prefs = prefList.rows[0] ?? DEFAULT_PREFS

    const audio = useMemo(() => {
        const element = new Audio()
        element.preload = 'auto'
        return element
    }, [])
    const [loaded, setLoaded] = useState<string | null>(null)
    const [playing, setPlayingState] = useState(false)
    const [position, setPosition] = useState(0)
    const [waveform, setWaveform] = useState<readonly number[] | undefined>(undefined)

    const current = player.current
    const script = current === null ? undefined : scriptOf(current)

    // What the handlers below read: the latest of everything, without waiting for a render.
    const now = useRef({ player, prefs, episodes, loaded, current, position })
    now.current = {
        player: playerList.latest.current[0] ?? PLAYER,
        prefs: prefList.latest.current[0] ?? DEFAULT_PREFS,
        episodes,
        loaded,
        current,
        position,
    }
    const latestEpisodes = episodeList.latest
    const episode = useCallback((id: string) => latestEpisodes.current.find((row) => row.id === id), [latestEpisodes])

    const patchEpisode = episodeList.patch
    const patchPlayerRow = playerList.patch
    const patchPrefsRow = prefList.patch
    const patchPlayer = useCallback((change: Patch<Player>) => void patchPlayerRow('player', change), [patchPlayerRow])
    const setPrefs = useCallback((change: Patch<Prefs>) => void patchPrefsRow('prefs', change), [patchPrefsRow])

    // Before an episode is loaded, the bar shows where it was left.
    const saved = current === null ? 0 : (episodes.get(current)?.position ?? 0)
    const shownPosition = loaded !== null && loaded === current ? position : saved

    /** Keeps where the loaded episode is. */
    const keepPlace = useCallback(() => {
        const id = now.current.loaded
        if (id === null) return
        void patchEpisode(id, { position: audio.currentTime, heard: Date.now() })
    }, [audio, patchEpisode])

    // Time listened, written down every so often and on a pause.
    const heard = useRef({ show: '', seconds: 0, content: 0, finished: 0 })
    const writing = useRef(Promise.resolve())
    const writeListens = useCallback(() => {
        const { show, seconds, content, finished } = heard.current
        heard.current = { show, seconds: 0, content: 0, finished: 0 }
        if (show === '' || (seconds === 0 && finished === 0)) return
        const id = `${day()}:${show}`
        writing.current = writing.current
            .then(() => listenRows.list())
            .then((rows) => {
                const found = rows.find((row) => row.id === id)
                if (found === undefined)
                    return listenRows
                        .create({ day: day(), show, seconds, content: Math.round(content), finished }, id)
                        .then(() => undefined)
                return listenRows
                    .update(id, {
                        seconds: found.seconds + seconds,
                        content: found.content + Math.round(content),
                        finished: found.finished + finished,
                    })
                    .then(() => undefined)
            })
            .catch(failed('The time listened was not saved'))
    }, [])

    const load = useCallback(
        (id: string, at: number) => {
            const sound = soundOf(id, scriptOf(id))
            audio.src = sound.url
            const rate = now.current.player.rate
            audio.defaultPlaybackRate = rate
            audio.playbackRate = rate
            audio.addEventListener(
                'loadedmetadata',
                () => {
                    audio.currentTime = at
                },
                { once: true },
            )
            setWaveform(sound.waveform)
            setLoaded(id)
            now.current.loaded = id
            setPosition(at)
            const show = episodeById.get(id)?.show ?? ''
            if (heard.current.show !== show) {
                writeListens()
                heard.current.show = show
            }
        },
        [audio, writeListens],
    )

    /** Where an episode picks up: where it was left, or the start once played or all but finished. */
    const resumeAt = useCallback(
        (id: string): number => {
            const state = episode(id)
            const length = scriptOf(id).duration
            if (state === undefined || state.played || state.position >= length - 2) return 0
            return state.position
        },
        [episode],
    )

    const play = useCallback(
        (id: string, at?: number) => {
            const { current: playingNow, loaded: inElement, player: held, prefs: settings } = now.current
            if (id === playingNow && inElement === id && at === undefined) {
                if (audio.paused) void audio.play().catch(() => setPlayingState(false))
                else audio.pause()
                return
            }
            keepPlace()
            const from = at ?? resumeAt(id)
            const other = id !== playingNow
            if (other) {
                audio.defaultPlaybackRate = settings.speed
                audio.playbackRate = settings.speed
                now.current.player = { ...held, rate: settings.speed }
            }
            patchPlayer({ current: id, queue: held.queue.filter((one) => one !== id), ...(other ? { rate: settings.speed } : {}) })
            if (episode(id)?.played === true) void patchEpisode(id, { played: false })
            now.current.current = id
            if (inElement !== id) load(id, from)
            else audio.currentTime = from
            void audio.play().catch(() => setPlayingState(false))
        },
        [audio, keepPlace, load, patchPlayer, patchEpisode, episode, resumeAt],
    )

    const setPlaying = useCallback(
        (on: boolean) => {
            const { current: id, loaded: inElement } = now.current
            if (id === null) return
            if (!on) {
                audio.pause()
                return
            }
            if (inElement !== id) play(id)
            else void audio.play().catch(() => setPlayingState(false))
        },
        [audio, play],
    )

    const seek = useCallback(
        (seconds: number) => {
            const { current: id, loaded: inElement } = now.current
            if (id === null) return
            const length = scriptOf(id).duration
            const to = Math.max(0, Math.min(length, seconds))
            if (inElement === id) audio.currentTime = to
            else void patchEpisode(id, { position: to })
            setPosition(to)
        },
        [audio, patchEpisode],
    )

    const skip = useCallback(
        (by: number) => {
            const { current: id, loaded: inElement, episodes: states } = now.current
            if (id === null) return
            seek((inElement === id ? audio.currentTime : (states.get(id)?.position ?? 0)) + by)
        },
        [audio, seek],
    )

    const playNext = useCallback(() => {
        const next = now.current.player.queue[0]
        if (next === undefined) return false
        play(next)
        return true
    }, [play])

    const chapters = useMemo(() => (script === undefined ? undefined : chapterStarts(script.chapters)), [script])
    const sleep = useSleepTimer({ playing, position: shownPosition, chapters, onSleep: () => audio.pause() })
    const sleepRef = useRef(sleep)
    sleepRef.current = sleep

    // The element's own events: what it plays, where, and the end.
    useEffect(() => {
        const time = () => setPosition(audio.currentTime)
        const started = () => setPlayingState(true)
        const paused = () => {
            setPlayingState(false)
            keepPlace()
            writeListens()
        }
        const ended = () => {
            const id = now.current.loaded
            setPlayingState(false)
            if (id === null) return
            heard.current.finished += 1
            writeListens()
            const settings = now.current.prefs
            void patchEpisode(id, { played: true, position: 0, heard: Date.now(), ...(settings.archivePlayed ? { inbox: false } : {}) })
            if (sleepRef.current.ended()) return
            if (settings.continueQueue && now.current.player.queue.length > 0) {
                const next = now.current.player.queue[0]
                if (next !== undefined) {
                    toast.add({ title: 'Up next', description: titleOf(next) })
                    play(next)
                }
            }
        }
        audio.addEventListener('timeupdate', time)
        audio.addEventListener('seeked', time)
        audio.addEventListener('play', started)
        audio.addEventListener('pause', paused)
        audio.addEventListener('ended', ended)
        return () => {
            audio.removeEventListener('timeupdate', time)
            audio.removeEventListener('seeked', time)
            audio.removeEventListener('play', started)
            audio.removeEventListener('pause', paused)
            audio.removeEventListener('ended', ended)
        }
    }, [audio, keepPlace, writeListens, patchEpisode, play])

    // While playing: the place kept every few seconds, and the time listened counted each second.
    useEffect(() => {
        if (!playing) return
        const keep = window.setInterval(keepPlace, KEEP_EVERY)
        let ticks = 0
        const count = window.setInterval(() => {
            heard.current.seconds += 1
            heard.current.content += audio.playbackRate
            ticks += 1
            if (ticks % LOG_EVERY === 0) writeListens()
        }, 1000)
        return () => {
            window.clearInterval(keep)
            window.clearInterval(count)
        }
    }, [playing, audio, keepPlace, writeListens])

    // Leaving the page keeps the place and the time.
    useEffect(() => {
        const away = () => {
            if (document.visibilityState !== 'hidden') return
            keepPlace()
            writeListens()
        }
        document.addEventListener('visibilitychange', away)
        window.addEventListener('pagehide', away)
        return () => {
            document.removeEventListener('visibilitychange', away)
            window.removeEventListener('pagehide', away)
        }
    }, [keepPlace, writeListens])

    // The element follows the player's speed and loudness.
    useEffect(() => {
        audio.volume = player.volume
        audio.muted = player.muted
    }, [audio, player.volume, player.muted])
    useEffect(() => {
        audio.defaultPlaybackRate = player.rate
        audio.playbackRate = player.rate
    }, [audio, player.rate])

    // Downloads move along a little at a time until they are kept.
    const downloading = episodeList.rows.some((row) => row.download === 'running')
    useEffect(() => {
        if (!downloading) return
        const tick = window.setInterval(() => {
            for (const row of episodeList.latest.current) {
                if (row.download !== 'running') continue
                const step = 0.05 + ((row.id.length * 7) % 5) * 0.015
                const next = Math.min(1, row.progress + step)
                void patchEpisode(row.id, next >= 1 ? { download: 'kept', progress: 1 } : { progress: next })
            }
        }, 400)
        return () => window.clearInterval(tick)
    }, [downloading, episodeList.latest, patchEpisode])

    const queueSet = (queue: string[]) => patchPlayer({ queue })

    const state: PodcastState = {
        loading: !showList.loaded || !episodeList.loaded || !playerList.loaded || !prefList.loaded,
        error: showList.error ?? episodeList.error ?? playerList.error ?? prefList.error ?? listenList.error,
        shows,
        episodes,
        player,
        prefs,
        listens: listenList.rows ?? [],
        media: loaded !== null && loaded === current ? audio : null,
        current,
        script,
        playing,
        position: shownPosition,
        waveform: loaded !== null && loaded === current ? waveform : undefined,
        sleep,
        play,
        setPlaying,
        seek,
        skip,
        setRate: (rate) => {
            audio.playbackRate = rate
            patchPlayer({ rate })
        },
        setVolume: (volume) => patchPlayer({ volume, muted: false }),
        setMuted: (muted) => patchPlayer({ muted }),
        playNext,

        queueAdd: (id, where) => {
            if (id === now.current.current) {
                toast.add({ title: 'Already playing', description: titleOf(id) })
                return
            }
            const rest = now.current.player.queue.filter((one) => one !== id)
            queueSet(where === 'next' ? [id, ...rest] : [...rest, id])
            toast.add({ title: where === 'next' ? 'Plays next' : 'Added to the queue', description: titleOf(id) })
        },
        queueRemove: (id) => queueSet(now.current.player.queue.filter((one) => one !== id)),
        queueMove: (from, to) => {
            const queue = [...now.current.player.queue]
            if (to < 0 || to >= queue.length) return
            const [moved] = queue.splice(from, 1)
            if (moved === undefined) return
            queue.splice(to, 0, moved)
            queueSet(queue)
        },
        queueClear: () => queueSet([]),

        markPlayed: (id, played) => {
            const settings = now.current.prefs
            void patchEpisode(id, { played, position: 0, ...(played && settings.archivePlayed ? { inbox: false } : {}) })
            if (id === now.current.loaded && id === now.current.current) {
                audio.pause()
                audio.currentTime = 0
            }
        },
        star: (id, starred) => void patchEpisode(id, { starred }),
        archive: (id) => void patchEpisode(id, { inbox: false }),
        archiveAll: () => {
            for (const row of episodeList.latest.current) if (row.inbox) void patchEpisode(row.id, { inbox: false })
        },
        download: (id) => void patchEpisode(id, { download: 'running', progress: 0 }),
        removeDownload: (id) => void patchEpisode(id, { download: 'idle', progress: 0 }),
        removeAllDownloads: () => {
            for (const row of episodeList.latest.current)
                if (row.download !== 'idle') void patchEpisode(row.id, { download: 'idle', progress: 0 })
        },
        checkForNew: () =>
            new Promise<number>((resolve) => {
                // As long as asking a server would take.
                window.setTimeout(() => {
                    const settings = now.current.prefs
                    const followed = showList.latest.current.filter((show) => show.subscribed).map((show) => show.id)
                    let count = 0
                    for (const show of followed) {
                        const next = EPISODES.filter((one) => one.show === show && episode(one.id)?.out === false).sort(
                            (a, b) => a.number - b.number,
                        )[0]
                        if (next === undefined) continue
                        count += 1
                        void patchEpisode(next.id, {
                            out: true,
                            outAt: Date.now(),
                            inbox: settings.inbox,
                            ...(settings.autoDownload ? { download: 'running', progress: 0 } : {}),
                        })
                    }
                    resolve(count)
                }, 900)
            }),

        subscribe: (id) => {
            void showList.patch(id, { subscribed: true, since: Date.now() })
            const settings = now.current.prefs
            const latest = EPISODES.filter((one) => one.show === id && episode(one.id)?.out === true).sort((a, b) => b.number - a.number)[0]
            const latestState = latest === undefined ? undefined : episode(latest.id)
            if (latest !== undefined && latestState !== undefined && !latestState.played) {
                void patchEpisode(latest.id, {
                    inbox: settings.inbox || latestState.inbox,
                    ...(settings.autoDownload && latestState.download === 'idle' ? { download: 'running', progress: 0 } : {}),
                })
            }
            toast.add({ title: 'Following', description: showById.get(id)?.title })
        },
        unsubscribe: (id) => {
            void showList.patch(id, { subscribed: false, since: null })
            for (const row of episodeList.latest.current) {
                if (row.inbox && episodeById.get(row.id)?.show === id) void patchEpisode(row.id, { inbox: false })
            }
            toast.add({ title: 'No longer following', description: showById.get(id)?.title })
        },

        setPrefs,
        clearStats: () => listenRows.list().then((rows) => Promise.all(rows.map((row) => listenRows.remove(row.id))).then(() => undefined)),
    }

    return <Context.Provider value={state}>{children}</Context.Provider>
}
