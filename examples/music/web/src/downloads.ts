/**
 * Downloads, simulated: an album comes in one song at a time, each a moment apart, its progress
 * kept by the backend, so a reload picks a running download up where it was. A kept album says
 * its size, and is removed with a second press.
 */
import { bytesOf, songsOfAlbum } from './catalog'
import { downloads, type Download } from './data'

/** How long one song takes to come in, in milliseconds. */
const PER_SONG = 650

let timer: ReturnType<typeof setInterval> | undefined

function tick(): void {
    const running = (downloads.store.get() ?? []).filter((row) => row.state === 'running')
    if (running.length === 0) {
        clearInterval(timer)
        timer = undefined
        return
    }
    for (const row of running) {
        const done = Math.min(row.total, row.done + 1)
        const patch: Partial<Download> =
            done >= row.total
                ? { done, state: 'kept', bytes: songsOfAlbum(row.id).reduce((sum, song) => sum + bytesOf(song), 0), at: Date.now() }
                : { done }
        downloads.change(
            (rows) => rows.map((one) => (one.id === row.id ? { ...one, ...patch } : one)),
            (source) => source.update(row.id, patch),
        )
    }
}

function run(): void {
    timer ??= setInterval(tick, PER_SONG)
}

/** Starts keeping an album on this device. */
export function download(album: string): void {
    const total = songsOfAlbum(album).length
    const row: Download = { id: album, state: 'running', done: 0, total, bytes: 0, at: Date.now() }
    downloads.change(
        (rows) => [row, ...rows.filter((one) => one.id !== album)],
        (source) => source.create({ state: row.state, done: 0, total, bytes: 0, at: row.at }, album),
    )
    run()
}

/** Stops a running download, or removes a kept one; either way nothing of it stays. */
export function removeDownload(album: string): void {
    downloads.change(
        (rows) => rows.filter((one) => one.id !== album),
        (source) => source.remove(album),
    )
}

export function removeAllDownloads(): void {
    const rows = downloads.store.get() ?? []
    downloads.change(
        () => [],
        async (source) => {
            for (const row of rows) await source.remove(row.id)
        },
    )
}

/** Picks up the downloads that were running when the page was left. */
export function resumeDownloads(): () => void {
    const stop = downloads.store.subscribe(() => {
        if ((downloads.store.get() ?? []).some((row) => row.state === 'running')) run()
    })
    if ((downloads.store.get() ?? []).some((row) => row.state === 'running')) run()
    return () => {
        stop()
        clearInterval(timer)
        timer = undefined
    }
}
