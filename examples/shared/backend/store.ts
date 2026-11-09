/**
 * A fake backend: typed collections kept in localStorage, each call answering after a short delay
 * with a promise, as a server would. Storage that refuses (a private window, a full quota) leaves
 * the rows in memory for the session. Every key is under the example's own prefix, which
 * `configureDemo` names, since the published examples share one origin and so one localStorage.
 */
import { setStoredPrefix } from '@winterop-com/sokkel-ui/lib/stored'

const PREFIX = 'tidevann-demo:'

let app: string | undefined

/**
 * Names the example whose data the page keeps, its folder's name: every key the backend writes is
 * `tidevann-demo:<app>:<name>`, and so is every `useStored` key, the library's own included. The
 * look's keys take no prefix, so the look stays shared. Called once in the app's `main.tsx`, before
 * it renders.
 */
export function configureDemo(options: { app: string }): void {
    if (!/^[a-z][a-z0-9-]*$/.test(options.app)) throw new Error(`"${options.app}" is not an example's folder name.`)
    app = options.app
    setStoredPrefix(`${PREFIX}${app}:`)
}

/** The localStorage key of `name` in the example's own data; it throws until `configureDemo` has named the example. */
export function storageKey(name: string): string {
    if (app === undefined) throw new Error('Call configureDemo({ app }) in main.tsx before the backend is used.')
    return `${PREFIX}${app}:${name}`
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
    update(id: string, patch: Partial<Omit<T, 'id'>>): Promise<T>
    remove(id: string): Promise<void>
    /** Hears every change, with the rows as they now are; returns the call that stops it. */
    subscribe(listener: (rows: T[]) => void): () => void
}

const collections: { reset: () => void }[] = []

function load<T>(name: string): T[] | undefined {
    const key = storageKey(name)
    try {
        const text = localStorage.getItem(key)
        return text === null ? undefined : (JSON.parse(text) as T[])
    } catch {
        return undefined
    }
}

function store<T>(name: string, rows: readonly T[]): void {
    const key = storageKey(name)
    try {
        localStorage.setItem(key, JSON.stringify(rows))
    } catch {
        // Storage refused: the rows stay in memory.
    }
}

function later<T>(answer: () => T): Promise<T> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                resolve(answer())
            } catch (error) {
                reject(error instanceof Error ? error : new Error(String(error)))
            }
        }, LATENCY)
    })
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
    const save = (next: T[]) => {
        memory = next
        store(name, next)
        for (const listener of listeners) listener([...next])
    }
    collections.push({ reset: () => save(seed()) })
    return {
        list: () => later(() => [...rows()]),
        create: (fields, id) =>
            later(() => {
                made += 1
                const row = { ...fields, id: id ?? `${name}-${Date.now().toString(36)}-${String(made)}` } as T
                save([row, ...rows()])
                return row
            }),
        insert: (added) =>
            later(() => {
                save([...added, ...rows()])
                return [...added]
            }),
        update: (id, patch) =>
            later(() => {
                const found = rows().find((row) => row.id === id)
                if (found === undefined) throw new Error(`No ${name} with the id ${id}.`)
                const row = { ...found, ...patch }
                save(rows().map((one) => (one.id === id ? row : one)))
                return row
            }),
        remove: (id) =>
            later(() => {
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

/** Puts every collection back to its seed. */
export function resetAll(): Promise<void> {
    return later(() => {
        for (const one of collections) one.reset()
    })
}
