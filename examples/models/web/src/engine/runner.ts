/**
 * The local runner, simulated: it starts and stops, loads models into memory (making room by
 * unloading the one used longest ago when the memory it may fill runs out), unloads them by hand
 * or after the keep-alive, and logs what it does.
 */

import { loaded, log, models, prefs, runner } from '../data/backend'
import { bytes, GB } from '../data/format'
import { DEFAULT_PREFS, type Loaded, type Model } from '../data/model'
import { memoryOf } from '../data/seed'
import { mirror } from './mirror'

export { memoryOf }

/** The memory this machine has, of which the runner may fill what the preferences allow. */
export const MACHINE_MEMORY = 36 * GB

const state = { runner: mirror(runner), loaded: mirror(loaded), models: mirror(models), prefs: mirror(prefs) }

const prefsNow = () => state.prefs.rows()[0] ?? DEFAULT_PREFS

/** Models answering now, which the keep-alive and room-making leave alone. */
const busy = new Map<string, number>()

export function markBusy(model: string, on: boolean): void {
    busy.set(model, Math.max(0, (busy.get(model) ?? 0) + (on ? 1 : -1)))
}

export function runnerUp(): boolean {
    return state.runner.rows()[0]?.status === 'up'
}

const stoppers = new Set<() => void>()

/** Hears the runner stopping, so the answers it was writing stop with it. */
export function onRunnerStop(listener: () => void): () => void {
    stoppers.add(listener)
    return () => stoppers.delete(listener)
}

export async function startRunner(): Promise<void> {
    const now = state.runner.rows()[0]
    if (now?.status === 'up' || now?.status === 'starting') return
    await runner.update('runner', { status: 'starting', since: Date.now() })
    log('info', 'runner', 'starting the runner')
    await new Promise((done) => setTimeout(done, 1200))
    await runner.update('runner', { status: 'up', since: Date.now() })
    log('info', 'runner', `runner ${now?.version ?? ''} listening on runner.example.org:8400`.replace('  ', ' '))
}

export async function stopRunner(): Promise<void> {
    const now = state.runner.rows()[0]
    if (now === undefined || now.status === 'down' || now.status === 'stopping') return
    await runner.update('runner', { status: 'stopping', since: Date.now() })
    for (const stop of stoppers) stop()
    log('info', 'runner', 'stopping: unloading every model')
    for (const one of state.loaded.rows()) await loaded.remove(one.id)
    await new Promise((done) => setTimeout(done, 700))
    await runner.update('runner', { status: 'down', since: Date.now() })
    log('warn', 'runner', 'runner stopped')
}

/** A wait that also ends when the runner stops. */
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms))

const loads = new Map<string, Promise<void>>()

/**
 * Makes sure a model is in memory, loading it if it is not (for an answer, only when loading on
 * demand is on): unloading idle models used longest ago
 * when there is no room, and refusing when even that leaves too little.
 */
export function ensureLoaded(model: Model, forAnswer = false): Promise<void> {
    if (!runnerUp()) return Promise.reject(new Error('The runner is not running. Start it from the top bar or the Runner page.'))
    if (forAnswer && model.tags.includes('embedding'))
        return Promise.reject(new Error(`${model.name} turns text into vectors for search; it does not chat. Pick another model.`))
    const there = state.loaded.rows().find((one) => one.id === model.id)
    if (there?.state === 'ready') {
        void loaded.update(model.id, { usedAt: Date.now() })
        return Promise.resolve()
    }
    if (forAnswer && there === undefined && !prefsNow().autoLoad)
        return Promise.reject(
            new Error(
                `${model.name} is not loaded, and loading on demand is off. Load it on the Runner page, or turn loading on demand on in Settings.`,
            ),
        )
    const going = loads.get(model.id)
    if (going !== undefined) return going
    const load = loadModel(model).finally(() => loads.delete(model.id))
    loads.set(model.id, load)
    return load
}

async function loadModel(model: Model): Promise<void> {
    const need = memoryOf(model)
    const limit = prefsNow().memory * GB
    if (need > limit) {
        log('error', 'loader', `${model.name} needs ${bytes(need)}, more than the ${bytes(limit)} the runner may use`)
        throw new Error(
            `${model.name} needs ${bytes(need)} of memory and the runner may use ${bytes(limit)}. Raise the limit in Settings, or pick a smaller model.`,
        )
    }
    let used = state.loaded.rows().reduce((sum, one) => sum + one.memory, 0)
    const idle = state.loaded
        .rows()
        .filter((one) => one.state === 'ready' && (busy.get(one.id) ?? 0) === 0)
        .sort((a, b) => a.usedAt - b.usedAt)
    for (const one of idle) {
        if (used + need <= limit) break
        await loaded.remove(one.id)
        used -= one.memory
        log('info', 'loader', `unloaded ${one.model} to make room for ${model.name}`)
    }
    if (used + need > limit) {
        log('error', 'loader', `no room for ${model.name}: ${bytes(used)} in use by models still answering`)
        throw new Error(`There is no room for ${model.name}: the models still answering hold ${bytes(used)} of ${bytes(limit)}.`)
    }
    const started = Date.now()
    const row: Loaded = {
        id: model.id,
        model: model.name,
        state: 'loading',
        progress: 0,
        memory: need,
        context: Math.min(model.context, 8192),
        loadedAt: started,
        usedAt: started,
        answers: 0,
    }
    await loaded.insert([row])
    log('info', 'loader', `loading ${model.name} ${model.quant} (${bytes(need)})`)
    const takes = 500 + (model.size / (2.4 * GB)) * 1000
    for (let at = 250; at < takes; at += 250) {
        await pause(250)
        if (!state.loaded.rows().some((one) => one.id === model.id)) throw new Error(`${model.name} was unloaded while it loaded.`)
        await loaded.update(model.id, { progress: Math.min(0.97, at / takes) })
    }
    await loaded.update(model.id, { state: 'ready', progress: 1, loadedAt: Date.now(), usedAt: Date.now() })
    log('info', 'loader', `loaded ${model.name} ${model.quant} in ${((Date.now() - started) / 1000).toFixed(1)} s (${bytes(need)})`)
}

export async function unloadModel(id: string, why = ''): Promise<void> {
    const one = state.loaded.rows().find((row) => row.id === id)
    if (one === undefined) return
    await loaded.remove(id)
    log('info', 'loader', `unloaded ${one.model}${why === '' ? '' : ` ${why}`}`)
}

/** Notes an answer written by a loaded model, so its keep-alive starts again. */
export function answeredWith(id: string): void {
    const one = state.loaded.rows().find((row) => row.id === id)
    if (one !== undefined) void loaded.update(id, { usedAt: Date.now(), answers: one.answers + 1 })
}

/** Unloads the models idle past the keep-alive, every few seconds while the app is open. */
export function startRunnerEngine(): () => void {
    void Promise.all([state.runner.ready, state.prefs.ready, state.loaded.ready]).then(() => {
        if (prefsNow().startRunner && state.runner.rows()[0]?.status === 'down') void startRunner()
        // A load cut off by a reload never finishes; it is dropped.
        for (const one of state.loaded.rows()) if (one.state === 'loading') void loaded.remove(one.id)
    })
    const timer = setInterval(() => {
        const keep = prefsNow().keepAlive
        if (keep <= 0) return
        for (const one of state.loaded.rows()) {
            if (one.state !== 'ready' || (busy.get(one.id) ?? 0) > 0) continue
            if (Date.now() - one.usedAt > keep * 60_000) void unloadModel(one.id, `after ${String(keep)} min idle`)
        }
    }, 5000)
    return () => clearInterval(timer)
}
