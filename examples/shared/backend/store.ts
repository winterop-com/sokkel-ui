/**
 * A fake backend: typed collections kept in localStorage, each call answering after a short delay
 * with a promise, as a server would. A change is applied and kept at once; only its answer waits, so
 * a change made as the page leaves is kept. Storage that is missing or blocked (a private window)
 * leaves the rows in memory for the session; a full quota refuses the change with an error. Every
 * key is under the example's own prefix, which `configureDemo` names, since the published examples
 * share one origin and so one localStorage.
 */
import { setStoredPrefix } from '@winterop-com/sokkel-ui/lib/stored'

const PREFIX = 'tidevann-demo:'

/** The shape of what the shared backend keeps; raising it drops every example's kept data once. */
const SHAPE = 1

let app: string | undefined

/**
 * Names the example whose data the page keeps, its folder's name: every key the backend writes is
 * `tidevann-demo:<app>:<name>`, and so is every `useStored` key, the library's own included. The
 * look's keys take no prefix, so the look stays shared. Called once in the app's `main.tsx`, before
 * it renders. `version` is the shape of the example's own kept data: raise it when a stored row or
 * value changes shape, and data kept under another version is dropped, so the example starts from
 * its seed rather than reading rows it no longer understands.
 */
export function configureDemo(options: { app: string; version?: number }): void {
    if (!/^[a-z][a-z0-9-]*$/.test(options.app)) throw new Error(`"${options.app}" is not an example's folder name.`)
    app = options.app
    setStoredPrefix(`${PREFIX}${app}:`)
    const stamp = `${String(SHAPE)}.${String(options.version ?? 1)}`
    const key = storageKey('@version')
    try {
        if (localStorage.getItem(key) !== stamp) {
            dropKept()
            localStorage.setItem(key, stamp)
        }
    } catch {
        // No storage: nothing kept to drop.
    }
}

/** The localStorage key of `name` in the example's own data; it throws until `configureDemo` has named the example. */
export function storageKey(name: string): string {
    if (app === undefined) throw new Error('Call configureDemo({ app }) in main.tsx before the backend is used.')
    return `${PREFIX}${app}:${name}`
}

/** Removes every key under the example's prefix: the backend's rows and every `useStored` value. */
function dropKept(): void {
    const prefix = storageKey('')
    try {
        const keys: string[] = []
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index)
            if (key?.startsWith(prefix) === true) keys.push(key)
        }
        for (const key of keys) localStorage.removeItem(key)
    } catch {
        // No storage: nothing kept to drop.
    }
}

/** How long each call takes, in milliseconds. */
const LATENCY = 150

export interface Row {
    id: string
}

export interface Collection<T extends Row> {
    list(): Promise<T[]>
    /** Adds a row under `id`, or under an id the backend makes. */
    create(fields: Omit<T, 'id'>, id?: string): Promise<T>
    /** Adds several rows at once, each under its own id, as one change. */
    insert(rows: readonly T[]): Promise<T[]>
    /** Changes the row under `id` by `patch`, or by what `patch` makes of the row as it is now, so changes made in quick turn each build on the last. */
    update(id: string, patch: Partial<Omit<T, 'id'>> | ((row: T) => Partial<Omit<T, 'id'>>)): Promise<T>
    /** Writes the row under `id` from the one there now, or from undefined when there is none, as one change. */
    upsert(id: string, change: (found: T | undefined) => Omit<T, 'id'>): Promise<T>
    remove(id: string): Promise<void>
    /** Hears every change, with the rows as they now are; returns the call that stops it. */
    subscribe(listener: (rows: T[]) => void): () => void
}

/** What every collection does on a reset; `steps` are an example's own, such as dropping files it keeps elsewhere. */
const collections: { reset: () => void }[] = []
const steps: (() => Promise<void> | void)[] = []

/** Set once the demo data is reset, so nothing written as the page reloads brings old rows back. */
let sealed = false

function load<T>(name: string): T[] | undefined {
    const key = storageKey(name)
    try {
        const text = localStorage.getItem(key)
        const rows: unknown = text === null ? undefined : JSON.parse(text)
        return Array.isArray(rows) ? (rows as T[]) : undefined
    } catch {
        return undefined
    }
}

/** Whether storage refused a write for want of room, rather than being missing or blocked. */
function full(error: unknown): boolean {
    return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
}

/** Keeps the rows, or throws when storage is full; storage that is missing or blocked leaves them in memory. */
function store<T>(name: string, rows: readonly T[]): void {
    const key = storageKey(name)
    try {
        localStorage.setItem(key, JSON.stringify(rows))
    } catch (error) {
        if (full(error)) throw new Error('The browser has no room left to keep this change. Reset the demo data in Settings to make room.')
    }
}

/** Where the example's changes stand: some still on their way, the last one refused, or all kept. */
export type Saving = { state: 'saving' } | { state: 'failed'; reason: string } | { state: 'saved' }

let pending = 0
let saving: Saving = { state: 'saved' }
const savingListeners = new Set<() => void>()

/** Where the example's changes stand now; `subscribeSaving` hears it change. */
export function savingNow(): Saving {
    return saving
}

/** Hears where the example's changes stand change; returns the call that stops it. */
export function subscribeSaving(listener: () => void): () => void {
    savingListeners.add(listener)
    return () => {
        savingListeners.delete(listener)
    }
}

function setSaving(next: Saving): void {
    saving = next
    for (const listener of savingListeners) listener()
}

/** Follows a change until it is answered, so `savingNow` says whether it was kept. */
function follow<T>(answer: Promise<T>): Promise<T> {
    pending += 1
    if (saving.state !== 'saving') setSaving({ state: 'saving' })
    const settle = (failure?: unknown) => {
        pending -= 1
        if (failure !== undefined) setSaving({ state: 'failed', reason: failure instanceof Error ? failure.message : String(failure) })
        else if (pending === 0 && saving.state === 'saving') setSaving({ state: 'saved' })
    }
    answer.then(
        () => settle(),
        (failure: unknown) => settle(failure ?? new Error('The change was refused.')),
    )
    return answer
}

/** Answers after the delay with what `work` gave or threw at once. */
function later<T>(work: () => T): Promise<T> {
    let outcome: { ok: true; value: T } | { ok: false; error: Error }
    try {
        outcome = { ok: true, value: work() }
    } catch (error) {
        outcome = { ok: false, error: error instanceof Error ? error : new Error(String(error)) }
    }
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (outcome.ok) resolve(outcome.value)
            else reject(outcome.error)
        }, LATENCY)
    })
}

/** A change: made at once, answered after the delay, and followed by `savingNow`. */
function write<T>(work: () => T): Promise<T> {
    return follow(later(work))
}

let made = 0

/** A collection named `name`, filled from `seed` the first time and after a reset. */
export function collection<T extends Row>(name: string, seed: () => T[]): Collection<T> {
    let memory: T[] | undefined
    const listeners = new Set<(rows: T[]) => void>()
    const rows = (): T[] => {
        memory ??= load<T>(name) ?? seed()
        return memory
    }
    const tell = (next: T[]) => {
        setTimeout(() => {
            for (const listener of listeners) listener([...next])
        }, LATENCY)
    }
    const save = (next: T[]) => {
        if (sealed) return
        store(name, next)
        memory = next
        tell(next)
    }
    // Another tab of the same example changed the rows: read them again, so this tab does not write over them.
    if (typeof window !== 'undefined') {
        window.addEventListener('storage', (event) => {
            if (sealed || (event.key !== null && event.key !== storageKey(name))) return
            memory = load<T>(name) ?? seed()
            for (const listener of listeners) listener([...memory])
        })
    }
    collections.push({
        reset: () => {
            memory = seed()
            store(name, memory)
        },
    })
    return {
        list: () => later(() => [...rows()]),
        create: (fields, id) =>
            write(() => {
                made += 1
                const row = { ...fields, id: id ?? `${name}-${Date.now().toString(36)}-${String(made)}` } as T
                save([row, ...rows()])
                return row
            }),
        insert: (added) =>
            write(() => {
                save([...added, ...rows()])
                return [...added]
            }),
        update: (id, patch) =>
            write(() => {
                const found = rows().find((row) => row.id === id)
                if (found === undefined) throw new Error(`No ${name} with the id ${id}.`)
                const row = { ...found, ...(typeof patch === 'function' ? patch(found) : patch) }
                save(rows().map((one) => (one.id === id ? row : one)))
                return row
            }),
        upsert: (id, change) =>
            write(() => {
                const found = rows().find((row) => row.id === id)
                const row = { ...change(found), id } as T
                save(found === undefined ? [row, ...rows()] : rows().map((one) => (one.id === id ? row : one)))
                return row
            }),
        remove: (id) =>
            write(() => {
                save(rows().filter((row) => row.id !== id))
            }),
        subscribe: (listener) => {
            listeners.add(listener)
            return () => {
                listeners.delete(listener)
            }
        },
    }
}

/** Adds a step to every reset of the demo data, such as dropping what an example keeps outside localStorage. */
export function onReset(step: () => Promise<void> | void): void {
    steps.push(step)
}

/**
 * Puts the demo data back as it started: the example's own reset steps, then every key it keeps,
 * `useStored` values included, and every collection back to its seed. Nothing is written after it,
 * so the caller reloads the page.
 */
export async function resetAll(): Promise<void> {
    for (const step of steps) await step()
    dropKept()
    for (const one of collections) one.reset()
    sealed = true
    await later(() => undefined)
}
