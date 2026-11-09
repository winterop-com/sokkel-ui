/**
 * Clips kept between visits in IndexedDB, so a video made once plays at once the next time. The
 * least recently watched go first once more than `LIMIT` are kept. Where IndexedDB is refused (a
 * private window) nothing is kept and every clip is made again.
 */

const NAME = 'tidevann-video-clips'
/** Raised whenever the clips are drawn differently, so old ones are made again. */
const VERSION = 3
const STORE = 'clips'
const LIMIT = 40

export interface KeptClip {
    key: string
    blob: Blob
    sound: boolean
    made: number
    used: number
    /** Downloaded by the viewer: never let go to make room, only when they remove it. */
    pinned?: boolean
}

let opened: Promise<IDBDatabase | undefined> | undefined

function database(): Promise<IDBDatabase | undefined> {
    opened ??= new Promise((resolve) => {
        try {
            const request = indexedDB.open(NAME, VERSION)
            request.onupgradeneeded = () => {
                const db = request.result
                if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE)
                db.createObjectStore(STORE, { keyPath: 'key' })
            }
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => resolve(undefined)
            request.onblocked = () => resolve(undefined)
        } catch {
            resolve(undefined)
        }
    })
    return opened
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
    return database().then(
        (db) =>
            new Promise((resolve) => {
                if (db === undefined) {
                    resolve(undefined)
                    return
                }
                try {
                    const request = work(db.transaction(STORE, mode).objectStore(STORE))
                    request.onsuccess = () => resolve(request.result)
                    request.onerror = () => resolve(undefined)
                } catch {
                    resolve(undefined)
                }
            }),
    )
}

/** The kept clip under `key`, marked as used now, or undefined. */
export async function readKept(key: string): Promise<KeptClip | undefined> {
    const found = await run<KeptClip | undefined>('readonly', (store) => store.get(key) as IDBRequest<KeptClip | undefined>)
    if (found !== undefined) void run('readwrite', (store) => store.put({ ...found, used: Date.now() }))
    return found
}

/** Keeps a clip, letting the least recently used go past the limit; a pinned one stays pinned. */
export async function keep(clip: KeptClip): Promise<void> {
    const before = await run<KeptClip | undefined>('readonly', (store) => store.get(clip.key) as IDBRequest<KeptClip | undefined>)
    await run('readwrite', (store) => store.put({ ...clip, pinned: clip.pinned ?? before?.pinned }))
    const all = (await run<KeptClip[]>('readonly', (store) => store.getAll() as IDBRequest<KeptClip[]>)) ?? []
    const extra = all
        .filter((one) => one.pinned !== true)
        .sort((left, right) => right.used - left.used)
        .slice(LIMIT)
    for (const one of extra) await run('readwrite', (store) => store.delete(one.key))
}

/** How many clips are kept and how many bytes they take. */
export async function keptSize(): Promise<{ count: number; bytes: number }> {
    const all = (await run<KeptClip[]>('readonly', (store) => store.getAll() as IDBRequest<KeptClip[]>)) ?? []
    return { count: all.length, bytes: all.reduce((sum, one) => sum + one.blob.size, 0) }
}

/** Pins a kept clip, or unpins it, so it goes like any other. */
export async function pin(key: string, pinned: boolean): Promise<void> {
    const found = await run<KeptClip | undefined>('readonly', (store) => store.get(key) as IDBRequest<KeptClip | undefined>)
    if (found !== undefined) await run('readwrite', (store) => store.put({ ...found, pinned }))
}

/** Lets every kept clip go but the pinned ones, the viewer's downloads, unless `pinned` says those too. */
export async function clearKept(pinned = false): Promise<void> {
    const all = (await run<KeptClip[]>('readonly', (store) => store.getAll() as IDBRequest<KeptClip[]>)) ?? []
    for (const one of all) if (pinned || one.pinned !== true) await run('readwrite', (store) => store.delete(one.key))
}

/** Unpins every kept clip whose video is not among `videos`, as after the downloads were reset elsewhere. */
export async function unpinAllBut(videos: ReadonlySet<string>): Promise<void> {
    const all = (await run<KeptClip[]>('readonly', (store) => store.getAll() as IDBRequest<KeptClip[]>)) ?? []
    for (const one of all) {
        if (one.pinned === true && !videos.has(one.key.split(':')[0] ?? ''))
            await run('readwrite', (store) => store.put({ ...one, pinned: false }))
    }
}
