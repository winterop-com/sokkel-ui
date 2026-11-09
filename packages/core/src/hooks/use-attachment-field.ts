import { useState } from 'react'

import type { FileFieldProps, StoredFile } from '../components/FileField'
import { UPLOAD_WORDS, type UploadOptions } from '../lib/uploads'
import { useUploads } from './use-uploads'

/** What a field's attachments came to: the stored files kept and taken out, and what each new file's upload answered. */
export interface AttachmentChanges<R> {
    kept: readonly string[]
    removed: readonly string[]
    added: readonly R[]
}

/** The props `useAttachmentField` hands a `FileField`, beside its id and label. */
export type AttachmentFieldProps = Pick<
    FileFieldProps,
    'value' | 'onChange' | 'stored' | 'onRemoveStored' | 'onCancel' | 'progress' | 'failed' | 'accept' | 'maxSize' | 'maxFiles'
>

/**
 * One file field's attachments, as a record being edited holds them: the files `stored` on the
 * server, which can be taken out, and new files, each sent through `upload` the moment it is
 * chosen. Spread `field` into a `FileField`: a new file goes up at once with its progress, its
 * cancel aborts the upload, a failed one says so in place of its size, and `maxFiles` counts the
 * stored files too. `changes` is what to save: the stored ids kept and removed, and what each
 * finished upload answered. `busy` holds a submit while a file is still going up, and `failed`
 * says one did not get there.
 */
export function useAttachmentField<R = unknown>({
    stored: initial = [],
    accept,
    maxSize,
    maxFiles,
    ...options
}: UploadOptions<R> & {
    /** The files the record holds already. */
    stored?: readonly StoredFile[]
}) {
    // The field checks the limits, counting the stored files; the uploads take what it lets through.
    const uploads = useUploads<R>(options)
    const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set())
    const stored = initial.filter((file) => !removed.has(file.id))
    const files = uploads.uploads.map((upload) => upload.file)
    const uploadOf = (file: File) => uploads.uploads.find((upload) => upload.file === file)
    const said = options.words?.failed ?? UPLOAD_WORDS.failed
    const field: AttachmentFieldProps = {
        value: files,
        onChange: (next) => {
            for (const file of files) {
                const upload = next.includes(file) ? undefined : uploadOf(file)
                if (upload !== undefined) uploads.remove(upload.id)
            }
            const added = next.filter((file) => !files.includes(file))
            if (added.length > 0) uploads.add(added)
        },
        stored,
        onRemoveStored: (id) => setRemoved((current) => new Set(current).add(id)),
        onCancel: (file) => {
            const upload = uploadOf(file)
            if (upload !== undefined) uploads.cancel(upload.id)
        },
        progress: (file) => {
            const upload = uploadOf(file)
            return upload?.state === 'uploading' ? (upload.progress ?? 0) : undefined
        },
        failed: (file) => {
            const upload = uploadOf(file)
            if (upload?.state !== 'failed') return undefined
            return upload.error instanceof Error ? upload.error.message : said
        },
        accept,
        maxSize,
        maxFiles,
    }
    const changes: AttachmentChanges<R> = {
        kept: stored.map((file) => file.id),
        removed: initial.filter((file) => removed.has(file.id)).map((file) => file.id),
        added: uploads.uploads.flatMap((upload) => (upload.state === 'done' ? [upload.result as R] : [])),
    }
    return {
        field,
        changes,
        busy: uploads.busy,
        failed: uploads.uploads.some((upload) => upload.state === 'failed'),
        /** Sends every failed file again. */
        retry: () => {
            for (const upload of uploads.uploads) if (upload.state === 'failed') uploads.retry(upload.id)
        },
    }
}
