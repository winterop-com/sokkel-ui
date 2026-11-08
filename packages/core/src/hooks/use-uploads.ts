import { useMemo, useRef, useSyncExternalStore } from 'react'

import type { AttachmentFile } from '../components/AttachmentList'
import type { ComposerAttachment } from '../components/Composer'
import { formatSize } from '../components/FileList'
import type { Upload as TrayUpload } from '../components/UploadTray'
import { UPLOAD_WORDS, UploadStore, type RefusedFile, type Upload, type UploadOptions } from '../lib/uploads'

export type { RefusalReason, RefusedFile, Upload, UploadContext, UploadOptions, Uploader, UploadState, UploadWords } from '../lib/uploads'
export { accepts, UPLOAD_WORDS } from '../lib/uploads'

/** An upload as `AttachmentList` draws it: uploading with its progress, or up with its size, or failed. */
export function attachmentOf(upload: Upload, failed: string): AttachmentFile {
    const uploading = upload.state === 'uploading'
    return {
        id: upload.id,
        name: upload.file.name,
        detail: upload.state === 'failed' ? failed : formatSize(upload.file.size),
        uploading,
        progress: uploading ? upload.progress : undefined,
    }
}

/**
 * Files being uploaded, each through the app's `upload(file, { signal, onProgress })`: files not
 * matching `accept` (MIME types, `image/*` families, `.csv` extensions), larger than `maxSize` or
 * past `maxFiles` are refused with a reason; each accepted file goes up at once, with its progress
 * and state; `cancel` aborts its signal while it is going up, and `remove` drops it when done.
 *
 * `files`, `onRemove` and `onCancel` go straight to `AttachmentList` (`composerFiles` to `Composer`,
 * `tray` with `onRetry`, `onCancel` and `onClose` to `UploadTray`); `add` takes what a file input
 * or a drop gives. `attachment` adds to how a file is drawn once it is up, from what the uploader
 * answered: a picture for an image, a recording to play. An uploader that cannot be stopped may
 * ignore the signal: what it answers after a cancel is dropped.
 */
export function useUploads<R = unknown>(
    options: UploadOptions<R> & {
        /** More of a file's tile once it is up: its picture, its kind, where to play it. */
        attachment?: (upload: Upload<R>) => Partial<AttachmentFile>
    },
) {
    const store = useRef<UploadStore<R> | null>(null)
    if (store.current === null) store.current = new UploadStore(options)
    // The latest uploader and limits apply to files added from now on.
    store.current.options = options
    const own = store.current
    const { uploads, refused } = useSyncExternalStore(own.subscribe, own.get, own.get)
    const failed = options.words?.failed ?? UPLOAD_WORDS.failed
    const describe = options.attachment
    const files = useMemo(
        () =>
            uploads.map((upload) => {
                const file = attachmentOf(upload, failed)
                return upload.state === 'done' && describe !== undefined ? { ...file, ...describe(upload), id: file.id } : file
            }),
        [uploads, failed, describe],
    )
    const composerFiles = useMemo(() => files.map(composerFileOf), [files])
    const tray = useMemo(
        (): TrayUpload[] => [
            ...uploads.map((upload) => ({
                id: upload.id,
                name: upload.file.name,
                size: upload.file.size,
                state: upload.state,
                progress: upload.progress,
                error: upload.state === 'failed' ? (upload.error instanceof Error ? upload.error.message : failed) : undefined,
            })),
            ...refused.map((one) => ({
                id: one.id,
                name: one.file.name,
                size: one.file.size,
                state: 'failed' as const,
                error: one.message,
            })),
        ],
        [uploads, refused, failed],
    )
    return {
        uploads,
        refused: refused as readonly RefusedFile[],
        /** Takes files from an input or a drop; answers with those refused. */
        add: (list: Iterable<File> | ArrayLike<File>) => own.add(Array.from(list)),
        cancel: own.cancel,
        remove: own.remove,
        retry: own.retry,
        clear: own.clear,
        clearRefused: own.clearRefused,
        /** Whether any file is still going up. */
        busy: uploads.some((upload) => upload.state === 'uploading'),
        /** The uploads shaped for `AttachmentList`. */
        files,
        onRemove: own.remove,
        onCancel: own.cancel,
        /** The uploads shaped for `Composer`'s `attachments`, with `onRemove` and `onCancel` beside them. */
        composerFiles,
        /** The uploads, and the files refused as failed with their reason, shaped for `UploadTray`. */
        tray,
        onRetry: own.retry,
        /** Closes the tray: stops every upload and forgets every file. */
        onClose: own.clear,
    }
}

/** An attachment as `Composer` lists it: a picture as an image, a recording or a video to play, else a file. */
export function composerFileOf(file: AttachmentFile): ComposerAttachment {
    return {
        id: file.id,
        name: file.name,
        kind: file.image !== undefined ? 'image' : (file.kind ?? 'file'),
        url: file.image ?? file.src,
        detail: typeof file.detail === 'string' ? file.detail : undefined,
        uploading: file.uploading,
        progress: file.progress,
        waveform: file.waveform,
        duration: file.duration,
    }
}
