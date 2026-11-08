import { formatSize } from '../components/FileList'

/**
 * Files on their way up, as a store a hook or a test can drive: what is accepted and what refused
 * with its reason, each upload's progress and state, cancel while uploading, remove when done.
 */

/** What an upload gets from the store: the signal that cancels it, and where to say how far it got. */
export interface UploadContext {
    signal: AbortSignal
    /** How much has gone up, from 0 to 1. */
    onProgress: (share: number) => void
}

/** Sends one file; the app's own request. A rejection marks the upload failed. */
export type Uploader<R = unknown> = (file: File, context: UploadContext) => Promise<R>

export type UploadState = 'uploading' | 'done' | 'failed'

/** One file being uploaded, or up, or failed. */
export interface Upload<R = unknown> {
    id: string
    file: File
    state: UploadState
    /** How much has gone up, from 0 to 1, once the uploader says. */
    progress?: number
    /** What the uploader resolved with, once done. */
    result?: R
    /** Why it failed. */
    error?: unknown
}

export type RefusalReason = 'type' | 'size' | 'count'

/** A file not taken, and why. */
export interface RefusedFile {
    id: string
    file: File
    reason: RefusalReason
    /** The reason said in words, for a toast or a line under a drop zone. */
    message: string
}

export interface UploadWords {
    type: (name: string) => string
    size: (name: string, limit: string) => string
    count: (name: string, limit: number) => string
    failed: string
}

export const UPLOAD_WORDS: UploadWords = {
    type: (name) => `${name} is not a type that can be added.`,
    size: (name, limit) => `${name} is larger than ${limit}.`,
    count: (name, limit) => `${name} was not added: at most ${String(limit)} files.`,
    failed: 'Failed',
}

export interface UploadOptions<R = unknown> {
    upload: Uploader<R>
    /**
     * What is accepted, as a file input's `accept` says it: MIME types (`image/png`), families
     * (`image/*`) and extensions (`.csv`), as a list or comma-separated. Everything without it.
     */
    accept?: string | readonly string[]
    /** The largest file taken, in bytes. */
    maxSize?: number
    /** The most files held at once, uploading or up. */
    maxFiles?: number
    words?: Partial<UploadWords>
}

/** The parts of an `accept` value, trimmed and lowercased. */
export function acceptList(accept: string | readonly string[] | undefined): string[] {
    if (accept === undefined) return []
    const parts = typeof accept === 'string' ? accept.split(',') : accept
    return parts.map((part) => part.trim().toLowerCase()).filter((part) => part !== '')
}

/** Whether a file's type or name matches an `accept` value; anything matches an empty one. */
export function accepts(file: { name: string; type: string }, accept: string | readonly string[] | undefined): boolean {
    const list = acceptList(accept)
    if (list.length === 0) return true
    const name = file.name.toLowerCase()
    const type = file.type.toLowerCase()
    return list.some((part) => {
        if (part.startsWith('.')) return name.endsWith(part)
        if (part.endsWith('/*')) return type.startsWith(part.slice(0, -1))
        return type === part
    })
}

/** Why a file is refused, or undefined when it is taken. */
export function refusal(
    file: { name: string; type: string; size: number },
    options: Pick<UploadOptions, 'accept' | 'maxSize'>,
): RefusalReason | undefined {
    if (!accepts(file, options.accept)) return 'type'
    if (options.maxSize !== undefined && file.size > options.maxSize) return 'size'
    return undefined
}

export interface UploadsSnapshot<R = unknown> {
    uploads: readonly Upload<R>[]
    refused: readonly RefusedFile[]
}

/** The store behind `useUploads`. */
export class UploadStore<R = unknown> {
    private snapshot: UploadsSnapshot<R> = { uploads: [], refused: [] }
    private readonly listeners = new Set<() => void>()
    private readonly controllers = new Map<string, AbortController>()
    private count = 0

    constructor(public options: UploadOptions<R>) {}

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    get = (): UploadsSnapshot<R> => this.snapshot

    private set(next: Partial<UploadsSnapshot<R>>): void {
        this.snapshot = { ...this.snapshot, ...next }
        for (const listener of this.listeners) listener()
    }

    private change(id: string, change: Partial<Upload<R>>): void {
        if (!this.snapshot.uploads.some((upload) => upload.id === id)) return
        this.set({ uploads: this.snapshot.uploads.map((upload) => (upload.id === id ? { ...upload, ...change } : upload)) })
    }

    /** Takes files, starting an upload for each one accepted; answers with those refused this time. */
    add = (files: Iterable<File>): RefusedFile[] => {
        const words = { ...UPLOAD_WORDS, ...this.options.words }
        const { maxSize, maxFiles } = this.options
        const refused: RefusedFile[] = []
        const taken: Upload<R>[] = []
        for (const file of files) {
            const held = this.snapshot.uploads.length + taken.length
            const reason = refusal(file, this.options) ?? (maxFiles !== undefined && held >= maxFiles ? 'count' : undefined)
            if (reason !== undefined) {
                const message =
                    reason === 'type'
                        ? words.type(file.name)
                        : reason === 'size'
                          ? words.size(file.name, formatSize(maxSize ?? 0))
                          : words.count(file.name, maxFiles ?? 0)
                this.count += 1
                refused.push({ id: `refused-${String(this.count)}`, file, reason, message })
                continue
            }
            this.count += 1
            taken.push({ id: `upload-${String(this.count)}`, file, state: 'uploading' })
        }
        this.set({ uploads: [...this.snapshot.uploads, ...taken], refused: [...this.snapshot.refused, ...refused] })
        for (const upload of taken) this.start(upload)
        return refused
    }

    private start(upload: Upload<R>): void {
        const controller = new AbortController()
        this.controllers.set(upload.id, controller)
        const onProgress = (share: number) => {
            if (!controller.signal.aborted) this.change(upload.id, { progress: Math.min(1, Math.max(0, share)) })
        }
        this.options.upload(upload.file, { signal: controller.signal, onProgress }).then(
            (result) => {
                if (controller.signal.aborted) return
                this.controllers.delete(upload.id)
                this.change(upload.id, { state: 'done', progress: 1, result })
            },
            (error: unknown) => {
                if (controller.signal.aborted) return
                this.controllers.delete(upload.id)
                this.change(upload.id, { state: 'failed', error })
            },
        )
    }

    /** Stops an upload under way and drops it. */
    cancel = (id: string): void => {
        this.controllers.get(id)?.abort()
        this.controllers.delete(id)
        this.set({ uploads: this.snapshot.uploads.filter((upload) => upload.id !== id) })
    }

    /** Drops a file, stopping its upload first if it is still going. */
    remove = (id: string): void => this.cancel(id)

    /** Sends a failed file again. */
    retry = (id: string): void => {
        const upload = this.snapshot.uploads.find((one) => one.id === id)
        if (upload?.state !== 'failed') return
        const again: Upload<R> = { id, file: upload.file, state: 'uploading' }
        this.set({ uploads: this.snapshot.uploads.map((one) => (one.id === id ? again : one)) })
        this.start(again)
    }

    /** Forgets the refused files, once they have been said. */
    clearRefused = (): void => this.set({ refused: [] })

    /** Stops every upload and drops every file. */
    clear = (): void => {
        for (const controller of this.controllers.values()) controller.abort()
        this.controllers.clear()
        this.set({ uploads: [], refused: [] })
    }
}
