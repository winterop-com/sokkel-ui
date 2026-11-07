import { Check, ChevronDown, CircleAlert, CloudUpload, RotateCw, X } from 'lucide-react'
import { useRef, useState, type DragEvent, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { formatSize } from './FileList'

/** One file on its way up. */
export interface Upload {
    id: string
    name: string
    /** The size in bytes. */
    size: number
    state: 'uploading' | 'done' | 'failed'
    /** How far along an upload is, from 0 to 1. */
    progress?: number
    /** Why a failed upload failed, in one line. */
    error?: string
}

export interface UploadTrayWords {
    uploading: (count: number) => string
    finished: (done: number, failed: number) => string
    done: string
    retry: string
    cancel: string
    close: string
    fold: string
    unfold: string
}

const WORDS: UploadTrayWords = {
    uploading: (count) => `Uploading ${count} ${count === 1 ? 'file' : 'files'}`,
    finished: (done, failed) => (failed === 0 ? `${done} ${done === 1 ? 'upload' : 'uploads'} done` : `${done} done, ${failed} failed`),
    done: 'Done',
    retry: 'Retry',
    cancel: 'Cancel the upload',
    close: 'Close',
    fold: 'Fold the uploads',
    unfold: 'Unfold the uploads',
}

function Row({
    upload,
    onRetry,
    onCancel,
    words,
}: {
    upload: Upload
    onRetry?: (id: string) => void
    onCancel?: (id: string) => void
    words: UploadTrayWords
}) {
    const percent = Math.round((upload.progress ?? 0) * 100)
    return (
        <li className="flex flex-col gap-1.5 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{upload.name}</span>
                {upload.state === 'uploading' && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{percent}%</span>}
                {upload.state === 'done' && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-good-ink">
                        <Check aria-hidden className="size-3.5" />
                        {words.done}
                    </span>
                )}
                {upload.state === 'failed' && onRetry !== undefined && (
                    <button
                        type="button"
                        className="flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs text-foreground outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onRetry(upload.id)}
                    >
                        <RotateCw aria-hidden className="size-3" />
                        {words.retry}
                    </button>
                )}
                {upload.state === 'uploading' && onCancel !== undefined && (
                    <button
                        type="button"
                        aria-label={`${words.cancel} ${upload.name}`}
                        title={words.cancel}
                        className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onCancel(upload.id)}
                    >
                        <X aria-hidden className="size-3.5" />
                    </button>
                )}
            </div>
            {upload.state === 'uploading' && (
                <div
                    role="progressbar"
                    aria-label={upload.name}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    className="h-1 overflow-hidden rounded-full bg-muted"
                >
                    <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
            )}
            <div
                className={cn(
                    'flex min-w-0 items-center gap-1.5 text-xs',
                    upload.state === 'failed' ? 'text-critical-ink' : 'text-muted-foreground',
                )}
            >
                {upload.state === 'failed' && <CircleAlert aria-hidden className="size-3.5 shrink-0" />}
                <span className="truncate">
                    {upload.state === 'failed' && upload.error !== undefined
                        ? upload.error
                        : upload.state === 'uploading'
                          ? `${formatSize(Math.round(upload.size * (upload.progress ?? 0)))} / ${formatSize(upload.size)}`
                          : formatSize(upload.size)}
                </span>
            </div>
        </li>
    )
}

/**
 * The files being uploaded, in a card that sits over the corner of the page: a head that counts
 * what is still going (or what finished, once nothing is), then a row per file with its progress,
 * a done mark, or the reason it failed and a retry. The head folds the rows away; the close
 * shows once nothing is still uploading.
 */
export function UploadTray({
    uploads,
    onRetry,
    onCancel,
    onClose,
    open,
    defaultOpen = true,
    onOpenChange,
    className,
    words: given,
}: {
    uploads: readonly Upload[]
    onRetry?: (id: string) => void
    onCancel?: (id: string) => void
    /** Clears the tray; offered once every upload has finished. */
    onClose?: () => void
    /** Whether the rows show; held inside the tray when not given. */
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    className?: string
    words?: Partial<UploadTrayWords>
}) {
    const words = { ...WORDS, ...given }
    const [ownOpen, setOwnOpen] = useState(defaultOpen)
    const unfolded = open ?? ownOpen
    const toggle = () => {
        if (open === undefined) setOwnOpen(!unfolded)
        onOpenChange?.(!unfolded)
    }
    const going = uploads.filter((upload) => upload.state === 'uploading')
    const done = uploads.filter((upload) => upload.state === 'done').length
    const failed = uploads.filter((upload) => upload.state === 'failed').length
    const total = uploads.reduce((sum, upload) => sum + upload.size, 0)
    const sent = uploads.reduce(
        (sum, upload) => sum + (upload.state === 'uploading' ? upload.size * (upload.progress ?? 0) : upload.size),
        0,
    )
    return (
        <section
            className={cn(
                'flex w-80 max-w-full flex-col overflow-hidden rounded-surface border border-border-strong bg-popover text-popover-foreground shadow-pop',
                className,
            )}
        >
            <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border pr-1.5 pl-3">
                {going.length > 0 ? (
                    <CloudUpload aria-hidden className="size-4 shrink-0 text-primary-ink" />
                ) : failed > 0 ? (
                    <CircleAlert aria-hidden className="size-4 shrink-0 text-critical-ink" />
                ) : (
                    <Check aria-hidden className="size-4 shrink-0 text-good-ink" />
                )}
                <h2 className="ml-1 min-w-0 flex-1 truncate text-sm font-medium">
                    {going.length > 0 ? words.uploading(going.length) : words.finished(done, failed)}
                </h2>
                <button
                    type="button"
                    aria-expanded={unfolded}
                    aria-label={unfolded ? words.fold : words.unfold}
                    title={unfolded ? words.fold : words.unfold}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={toggle}
                >
                    <ChevronDown aria-hidden className={cn('size-4 transition-transform', !unfolded && 'rotate-180')} />
                </button>
                {going.length === 0 && onClose !== undefined && (
                    <button
                        type="button"
                        aria-label={words.close}
                        title={words.close}
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={onClose}
                    >
                        <X aria-hidden className="size-4" />
                    </button>
                )}
            </div>
            {going.length > 0 && (
                <div className="h-0.5 shrink-0 bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${total === 0 ? 0 : Math.round((sent / total) * 100)}%` }} />
                </div>
            )}
            {unfolded && (
                <ul className="max-h-[min(24rem,50svh)] divide-y divide-border overflow-y-auto">
                    {uploads.map((upload) => (
                        <Row key={upload.id} upload={upload} onRetry={onRetry} onCancel={onCancel} words={words} />
                    ))}
                </ul>
            )}
        </section>
    )
}

export interface DropZoneWords {
    title: string
    detail: string
}

const DROP_WORDS: DropZoneWords = { title: 'Drop to upload', detail: 'The files go into this folder.' }

/** Whether a drag carries files, rather than text or a link from the page. */
function carriesFiles(event: DragEvent<HTMLElement>): boolean {
    return [...event.dataTransfer.types].includes('Files')
}

/**
 * An area that takes files dragged onto it from the desktop. While files are over it, a dashed
 * frame and a line on where they go cover it; on the drop, `onFiles` gets them. `open` shows the
 * frame without a drag.
 */
export function DropZone({
    onFiles,
    open,
    children,
    className,
    words: given,
}: {
    onFiles: (files: File[]) => void
    /** Shows the drop frame whether or not files are being dragged. */
    open?: boolean
    children: ReactNode
    className?: string
    words?: Partial<DropZoneWords>
}) {
    const words = { ...DROP_WORDS, ...given }
    const [over, setOver] = useState(false)
    const depth = useRef(0)
    const shown = open ?? over
    return (
        <div
            className={cn('relative', className)}
            onDragEnter={(event) => {
                if (!carriesFiles(event)) return
                event.preventDefault()
                depth.current += 1
                setOver(true)
            }}
            onDragOver={(event) => {
                if (!carriesFiles(event)) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'copy'
            }}
            onDragLeave={(event) => {
                if (!carriesFiles(event)) return
                depth.current = Math.max(0, depth.current - 1)
                if (depth.current === 0) setOver(false)
            }}
            onDrop={(event) => {
                if (!carriesFiles(event)) return
                event.preventDefault()
                depth.current = 0
                setOver(false)
                const files = [...event.dataTransfer.files]
                if (files.length > 0) onFiles(files)
            }}
        >
            {children}
            {shown && (
                <div className="pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-surface border-2 border-dashed border-primary bg-primary/8 text-center backdrop-blur-[1px]">
                    <CloudUpload aria-hidden className="size-8 text-primary-ink" />
                    <p className="text-sm font-medium">{words.title}</p>
                    <p className="text-xs text-muted-foreground">{words.detail}</p>
                </div>
            )}
        </div>
    )
}
