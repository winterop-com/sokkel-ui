/**
 * The player: two audio elements that play the songs the synthesizer makes, the queue they play
 * from (the library's pure queue helpers), shuffle and repeat, the speed, the volume, a crossfade
 * between songs, and radio, which keeps making the next song. Its state lives here, outside React,
 * in two stores: what plays, and where along it, which changes four times a second. What it is
 * doing is kept by the backend, so a reload picks up where it was.
 */
import { createStore, useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import {
    createQueue,
    queueAdd,
    queueEnded,
    queueIndex,
    queueItem,
    queueMove,
    queueNext,
    queueOrdered,
    queuePlay,
    queuePrevious,
    queueRemove,
    queueRepeat,
    queueShuffle,
    type Queue,
    type RepeatMode,
} from '@winterop-com/sokkel-ui-media/queue'

import { radioSong, songOf, stationOf, type Song } from './catalog'
import { played, playerRows, settings, type PlayerRow, type QueueEntry, type Source } from './data'
import { render, waveformOf, wav } from './synth'

export interface PlayerState {
    queue: Queue<QueueEntry>
    source: Source | null
    radio: PlayerRow['radio']
    playing: boolean
    /** The song made but not yet able to play. */
    loading: boolean
    duration: number
    waveform: readonly number[] | undefined
    error: string | undefined
    /** The element sounding now, for the visualizer and the bar's frame clock. */
    element: HTMLAudioElement | null
}

const EMPTY: PlayerState = {
    queue: createQueue<QueueEntry>([]),
    source: null,
    radio: null,
    playing: false,
    loading: false,
    duration: 0,
    waveform: undefined,
    error: undefined,
    element: null,
}

export const player = createStore<PlayerState>(EMPTY)
/** Seconds into what plays, as the element last told it. */
export const position = createStore(0)

export const usePlayer = () => useStore(player)
export const usePosition = () => useStore(position)

/** The song playing or paused, if any. */
export function currentSong(state: PlayerState = player.get()): Song | undefined {
    const entry = queueItem(state.queue)
    return entry === undefined ? undefined : songOf(entry.song)
}

// The sound

interface Made {
    url: string
    waveform: number[]
}

/** The songs made lately, newest last, each as a WAV file's address and its loudness. */
const made = new Map<string, Made>()
/** How many made songs are kept before the oldest is let go. */
const KEEP = 10

function make(song: Song): Made {
    const kept = made.get(song.id)
    if (kept !== undefined) {
        made.delete(song.id)
        made.set(song.id, kept)
        return kept
    }
    const samples = render(song.seed, song.style)
    const fresh = { url: URL.createObjectURL(wav(samples)), waveform: waveformOf(samples) }
    made.set(song.id, fresh)
    const busy = new Set(elements.map((element) => element.src))
    for (const [id, old] of made) {
        if (made.size <= KEEP) break
        if (busy.has(old.url)) continue
        URL.revokeObjectURL(old.url)
        made.delete(id)
    }
    return fresh
}

const elements: HTMLAudioElement[] = [new Audio(), new Audio()]
for (const element of elements) element.preload = 'auto'
let active = 0
/** Each element's share of the volume, which a crossfade moves. */
const gains = [1, 1]
const current = () => elements[active]

function applyVolume(): void {
    const { volume, muted, rate } = settings.get()
    elements.forEach((element, index) => {
        element.volume = Math.max(0, Math.min(1, volume * gains[index]))
        element.muted = muted
        element.playbackRate = rate
        element.preservesPitch = true
    })
}
settings.subscribe(applyVolume)

function set(patch: Partial<PlayerState>): void {
    player.update((now) => ({ ...now, ...patch }))
}

// Keeping it

let keepTimer: ReturnType<typeof setTimeout> | undefined
let lastKept = 0

/** Writes what the player is doing to the backend, at once or after a moment's quiet. */
function keep(now = false): void {
    clearTimeout(keepTimer)
    const write = () => {
        const state = player.get()
        lastKept = Date.now()
        const row: Omit<PlayerRow, 'id'> = {
            entries: [...state.queue.items],
            order: [...state.queue.order],
            at: state.queue.at,
            shuffle: state.queue.shuffle,
            repeat: state.queue.repeat,
            position: position.get(),
            source: state.source,
            radio: state.radio,
        }
        void playerRows.update('now', row).catch(() => playerRows.create(row, 'now'))
    }
    if (now) write()
    else keepTimer = setTimeout(write, 400)
}

// Playing

/** Puts the current song in the sounding element, from `at` seconds, playing if asked. */
function cue(at: number, play: boolean): void {
    const state = player.get()
    const song = currentSong(state)
    const element = current()
    if (song === undefined) {
        element.pause()
        element.removeAttribute('src')
        set({ playing: false, duration: 0, waveform: undefined, loading: false })
        position.set(0)
        return
    }
    set({ loading: true, error: undefined, duration: song.duration })
    const sound = make(song)
    set({ waveform: sound.waveform, loading: false, element })
    const start = () => {
        element.currentTime = Math.min(at, Math.max(0, song.duration - 0.5))
        position.set(element.currentTime)
        if (play) void element.play().catch((error: unknown) => fail(error))
    }
    if (element.src !== sound.url) {
        element.src = sound.url
        element.addEventListener('loadedmetadata', start, { once: true })
        element.load()
    } else {
        start()
    }
    if (play) played(song.id)
    // Made ahead, so the next song starts at once.
    setTimeout(prepareNext, 1500)
}

function fail(error: unknown): void {
    // A play refused before the listener has pressed anything is not a failure: the page waits for the press.
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
        set({ playing: false })
        return
    }
    if (error instanceof DOMException && error.name === 'AbortError') return
    set({ playing: false, error: error instanceof Error ? error.message : String(error) })
}

function prepareNext(): void {
    const next = queueEnded(player.get().queue)
    const entry = next === undefined ? undefined : queueItem(next)
    const song = entry === undefined ? undefined : songOf(entry.song)
    if (song !== undefined) make(song)
}

/** Moves to a new queue state and plays its current song from the start. */
function go(queue: Queue<QueueEntry>, play = true): void {
    stopFade()
    set({ queue })
    topUpRadio()
    cue(0, play)
    keep(true)
}

// Crossfade

let fading: { from: number; frame: number } | null = null

function stopFade(): void {
    if (fading === null) return
    cancelAnimationFrame(fading.frame)
    const old = elements[fading.from]
    old.pause()
    gains[fading.from] = 1
    gains[active] = 1
    fading = null
    applyVolume()
}

/** Starts the next song on the other element under this one, fading this one out over `seconds`. */
function fadeTo(queue: Queue<QueueEntry>, seconds: number): void {
    const from = active
    active = 1 - active
    gains[active] = 0
    applyVolume()
    set({ queue })
    topUpRadio()
    cue(0, true)
    keep(true)
    const began = performance.now()
    const step = () => {
        const share = Math.min(1, (performance.now() - began) / (seconds * 1000))
        gains[from] = 1 - share
        gains[active] = share
        applyVolume()
        if (share < 1 && fading !== null) fading.frame = requestAnimationFrame(step)
        else stopFade()
    }
    fading = { from, frame: requestAnimationFrame(step) }
}

// What the elements say

function hear(element: HTMLAudioElement): void {
    const mine = () => element === current()
    element.addEventListener('timeupdate', () => {
        if (!mine()) return
        position.set(element.currentTime)
        if (Date.now() - lastKept > 5000) keep()
        const fade = settings.get().crossfade
        if (fade > 0 && fading === null && !element.paused && element.duration - element.currentTime <= fade) {
            const queue = player.get().queue
            const next = queueEnded(queue)
            if (next !== undefined && next.at !== queue.at) fadeTo(next, fade)
        }
    })
    element.addEventListener('play', () => {
        if (mine()) set({ playing: true, error: undefined })
    })
    element.addEventListener('pause', () => {
        if (mine() && !element.ended) {
            set({ playing: false })
            keep(true)
        }
    })
    element.addEventListener('ended', () => {
        if (!mine()) return
        const queue = player.get().queue
        const next = queueEnded(queue)
        if (next === undefined) {
            set({ playing: false })
            element.currentTime = 0
            position.set(0)
            keep(true)
        } else if (next.at === queue.at) {
            element.currentTime = 0
            void element.play()
        } else {
            go(next, true)
        }
    })
    element.addEventListener('error', () => {
        if (mine() && element.error !== null) set({ playing: false, error: element.error.message || 'The song could not be played.' })
    })
}
elements.forEach(hear)

// Radio

/** How many songs a station keeps waiting after the one playing. */
const RADIO_AHEAD = 3

/** Makes more of the station's songs as the queue nears its end, so it never runs out. */
function topUpRadio(): void {
    const { radio, queue } = player.get()
    if (radio === null) return
    const station = stationOf(radio.station)
    if (station === undefined) return
    const ahead = queue.order.length - 1 - queue.at
    if (ahead >= RADIO_AHEAD) return
    const count = RADIO_AHEAD - ahead
    const fresh = Array.from({ length: count }, (_, index) => {
        const song = radioSong(station, radio.made + index)
        return { key: song.id, song: song.id }
    })
    set({ queue: queueAdd(queue, fresh, 'end'), radio: { ...radio, made: radio.made + count } })
}

// What the page asks

/** Plays `songs` from the one at `start`, as the queue from `source`. */
export function playSongs(songs: readonly string[], start: number, source: Source, options: { shuffle?: boolean } = {}): void {
    if (songs.length === 0) return
    const entries = songs.map((song, index) => ({ key: `${song}~${String(index)}~${Date.now().toString(36)}`, song }))
    const shuffle = options.shuffle ?? player.get().queue.shuffle
    const queue = createQueue(entries, {
        start: options.shuffle === true ? Math.floor(Math.random() * songs.length) : start,
        shuffle,
        repeat: player.get().queue.repeat === 'one' ? 'off' : player.get().queue.repeat,
        seed: Math.floor(Math.random() * 1e9),
    })
    set({ source, radio: null })
    go(queue, true)
}

/** Plays a station: one of its songs after another, without end. */
export function playStation(id: string, label: string): void {
    const station = stationOf(id)
    if (station === undefined) return
    const first = radioSong(station, 0)
    set({ source: { kind: 'radio', label, href: '/radio' }, radio: { station: id, made: 1 } })
    go(createQueue([{ key: first.id, song: first.id }]), true)
}

export function togglePlay(): void {
    const element = current()
    const state = player.get()
    if (currentSong(state) === undefined) return
    if (state.playing) {
        element.pause()
        return
    }
    if (element.src === '' || element.readyState === 0) cue(position.get(), true)
    else void element.play().catch(fail)
}

export function setPlaying(on: boolean): void {
    if (on !== player.get().playing) togglePlay()
}

export function seek(seconds: number): void {
    stopFade()
    const element = current()
    const at = Math.max(0, Math.min(seconds, player.get().duration))
    element.currentTime = at
    position.set(at)
    keep()
}

export function seekBy(seconds: number): void {
    seek(position.get() + seconds)
}

export function next(): void {
    const next = queueNext(player.get().queue)
    if (next !== undefined) go(next)
}

export function previous(): void {
    const queue = player.get().queue
    const before = queuePrevious(queue)
    if (position.get() > 3 || before === undefined || player.get().radio !== null) seek(0)
    else go(before)
}

export const hasNext = (state: PlayerState) => queueNext(state.queue) !== undefined

/** Plays the entry at `index` in the queue's list. */
export function playIndex(index: number): void {
    go(queuePlay(player.get().queue, index))
}

/** Plays the entry at `at` in the play order, as a press on a row of Up next asks. */
export function playPosition(at: number): void {
    const index = player.get().queue.order[at]
    if (index !== undefined) playIndex(index)
}

export function setShuffle(on: boolean): void {
    set({ queue: queueShuffle(player.get().queue, on, { seed: Math.floor(Math.random() * 1e9) }) })
    keep()
}

export function setRepeat(mode: RepeatMode): void {
    set({ queue: queueRepeat(player.get().queue, mode) })
    keep()
}

/** Puts songs in the queue: right after the one playing, or at the end. */
export function enqueue(songs: readonly string[], where: 'next' | 'end'): void {
    const stamp = Date.now().toString(36)
    const entries = songs.map((song, index) => ({ key: `${song}~${stamp}~${String(index)}`, song }))
    const was = player.get().queue
    set({ queue: queueAdd(was, entries, where) })
    if (was.at < 0) cue(0, false)
    keep()
}

/** Takes the entries at `positions` in the play order out of the queue. */
export function dequeue(positions: readonly number[]): void {
    const queue = player.get().queue
    const indexes = positions.map((at) => queue.order[at]).filter((index) => index !== undefined)
    const playingGone = indexes.includes(queueIndex(queue))
    const next = queueRemove(queue, indexes)
    set({ queue: next })
    if (playingGone) cue(0, player.get().playing)
    keep()
}

/** Moves an entry in the play order, as the queue's list of what comes next is reordered. */
export function moveInQueue(from: number, to: number): void {
    set({ queue: queueMove(player.get().queue, from, to) })
    keep()
}

/** Takes everything after the song playing out of the queue. */
export function clearUpNext(): void {
    const queue = player.get().queue
    dequeue(queue.order.slice(queue.at + 1).map((_, index) => queue.at + 1 + index))
}

/** What plays after this song, in order, each with its place in the play order. */
export function upNext(state: PlayerState): { entry: QueueEntry; position: number }[] {
    return queueOrdered(state.queue)
        .slice(state.queue.at + 1)
        .map(({ item, position: at }) => ({ entry: item, position: at }))
}

/** Picks the player up as it was left: the queue, the song and where in it, paused. */
export function restore(row: PlayerRow, resume: boolean): void {
    const entries = row.entries.filter((entry) => songOf(entry.song) !== undefined)
    const queue =
        entries.length === row.entries.length
            ? createQueue(entries, { order: row.order, shuffle: row.shuffle, repeat: row.repeat })
            : createQueue(entries, { repeat: row.repeat })
    const at = entries.length === row.entries.length && row.at >= 0 && row.at < entries.length ? row.at : 0
    set({ queue: { ...queue, at: entries.length === 0 ? -1 : at }, source: row.source, radio: row.radio })
    applyVolume()
    cue(resume ? row.position : 0, false)
}

/** Stops the sound and lets the elements go, as the page is left. */
export function stop(): void {
    stopFade()
    for (const element of elements) element.pause()
    keep(true)
}
