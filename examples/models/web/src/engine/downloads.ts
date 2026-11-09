/**
 * Pulls, simulated: a few at a time as the preferences allow, the rest queued; each at the speed
 * its source gives, shared under the bandwidth limit; paused, resumed, cancelled and tried again;
 * refused when the disk has no room. A finished pull lands in the library with its files.
 */

import { downloads, log, models, prefs } from '../data/backend'
import { entryOf, modelId, type CatalogEntry, type Variant } from '../data/catalog'
import { usageOf } from '../data/disk'
import { bytes, MB } from '../data/format'
import { DEFAULT_PREFS, SOURCES, type Download } from '../data/model'
import { modelOf } from '../data/seed'
import { mirror } from './mirror'

const state = { downloads: mirror(downloads), models: mirror(models), prefs: mirror(prefs) }
const prefsNow = () => state.prefs.rows()[0] ?? DEFAULT_PREFS

/** Bytes a second each source gives one pull, before the limit. */
const SOURCE_SPEED = { hub: 92 * MB, runner: 640 * MB, desktop: 480 * MB }

const finished = new Set<(download: Download) => void>()

/** Hears each pull that lands in the library. */
export function onPulled(listener: (download: Download) => void): () => void {
    finished.add(listener)
    return () => finished.delete(listener)
}

/** The pull of an entry's variant under way or waiting, if there is one. */
export function activePull(entry: string, quant: string): Download | undefined {
    return state.downloads
        .rows()
        .find(
            (one) =>
                one.entry === entry && one.quant === quant && (one.state === 'running' || one.state === 'queued' || one.state === 'paused'),
        )
}

/** Starts pulling an entry's variant, or says why it cannot. */
export async function pull(entry: CatalogEntry, variant: Variant): Promise<void> {
    const id = modelId(entry.name, variant.quant)
    if (state.models.rows().some((model) => model.id === id)) throw new Error(`${entry.name} ${variant.quant} is already in the library.`)
    if (activePull(entry.id, variant.quant) !== undefined) return
    await downloads.create({
        entry: entry.id,
        quant: variant.quant,
        name: entry.name,
        publisher: entry.publisher,
        source: entry.source,
        format: variant.format,
        size: variant.size,
        done: 0,
        speed: 0,
        state: 'queued',
        started: Date.now(),
        ended: null,
        error: null,
    })
    log('info', 'pull', `queued ${entry.name} ${variant.quant} (${bytes(variant.size)}) from ${SOURCES[entry.source].label}`)
}

export async function pausePull(id: string): Promise<void> {
    await downloads.update(id, { state: 'paused', speed: 0 })
}

export async function resumePull(id: string): Promise<void> {
    await downloads.update(id, { state: 'queued', error: null })
}

export async function cancelPull(id: string): Promise<void> {
    const one = state.downloads.rows().find((row) => row.id === id)
    await downloads.update(id, { state: 'cancelled', speed: 0, done: 0, ended: Date.now() })
    if (one !== undefined) log('info', 'pull', `cancelled ${one.name} ${one.quant}; its partial files were removed`)
}

export async function retryPull(id: string): Promise<void> {
    await downloads.update(id, { state: 'queued', done: 0, speed: 0, error: null, ended: null, started: Date.now() })
}

/** Takes the pulls that ended (landed, cancelled or failed) off the list. */
export async function clearEnded(): Promise<void> {
    for (const one of state.downloads.rows()) {
        if (one.state === 'done' || one.state === 'cancelled' || one.state === 'failed') await downloads.remove(one.id)
    }
}

/** How fast a source gives a pull at this moment: it wanders a little, as a network does. */
function speedOf(download: Download, now: number): number {
    const base = SOURCE_SPEED[download.source]
    const phase = (download.started % 997) / 997
    return base * (0.82 + 0.18 * Math.sin(now / 1700 + phase * 6) + 0.06 * Math.sin(now / 430 + phase * 11))
}

const TICK = 400

async function tick(): Promise<void> {
    const now = Date.now()
    const { parallel, bandwidth, root } = prefsNow()
    const rows = state.downloads.rows()
    let running = rows.filter((one) => one.state === 'running')
    // Waiting pulls start, oldest first, as slots free up.
    const waiting = rows.filter((one) => one.state === 'queued').sort((a, b) => a.started - b.started)
    for (const one of waiting) {
        if (running.length >= parallel) break
        const { free, disk } = usageOf(root, state.models.rows(), rows)
        if (free < one.size - one.done) {
            const error = `Not enough room on ${disk.name}: ${bytes(one.size - one.done)} needed, ${bytes(free)} free.`
            await downloads.update(one.id, { state: 'failed', error, ended: now, speed: 0 })
            log('error', 'pull', `${one.name} ${one.quant}: ${error}`)
            continue
        }
        await downloads.update(one.id, { state: 'running' })
        log('info', 'pull', `pulling ${one.name} ${one.quant} from ${SOURCES[one.source].label}`)
        running = [...running, { ...one, state: 'running' }]
    }
    const limit = bandwidth > 0 ? (bandwidth * MB) / Math.max(1, running.length) : Infinity
    for (const one of running) {
        const speed = Math.min(speedOf(one, now), limit)
        const done = Math.min(one.size, one.done + (speed * TICK) / 1000)
        if (done < one.size) {
            await downloads.update(one.id, { done, speed })
            continue
        }
        await land(one)
    }
}

async function land(one: Download): Promise<void> {
    const entry = entryOf(one.entry)
    const variant = entry?.variants.find((each) => each.quant === one.quant)
    if (entry === undefined || variant === undefined) {
        await downloads.update(one.id, { state: 'failed', error: 'The source no longer lists this model.', ended: Date.now(), speed: 0 })
        return
    }
    const model = modelOf(entry, variant, one.source, Date.now())
    await models.insert([model])
    const done = { ...one, state: 'done' as const, done: one.size, speed: 0, ended: Date.now() }
    await downloads.update(one.id, { state: 'done', done: one.size, speed: 0, ended: done.ended })
    log('info', 'pull', `${one.name} ${one.quant} is in the library (${bytes(model.size)}, ${String(model.files.length)} files)`)
    for (const listener of finished) listener(done)
}

let ticking = false

/** Moves the pulls along while the app is open; pulls left running by a reload carry on from where they were. */
export function startDownloadEngine(): () => void {
    const timer = setInterval(() => {
        if (ticking) return
        ticking = true
        void tick().finally(() => {
            ticking = false
        })
    }, TICK)
    return () => clearInterval(timer)
}
