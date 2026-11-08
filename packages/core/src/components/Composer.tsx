import { IconButton } from './IconButton'
import { ArrowUp, FileText, Paperclip, Play, Square, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { DialogShell } from './DialogShell'
import { AudioPlayer } from './media/AudioPlayer'
import { VIDEO_PLAYER_WORDS, VideoPlayer, type VideoPlayerWords } from './media/VideoPlayer'
import { ProgressRing } from './ui/progress-ring'
import { Spinner } from './ui/spinner'
import { Textarea } from './ui/textarea'

/** A file waiting to go with the next message. */
export interface ComposerAttachment {
    id: string
    name: string
    /**
     * An image shows as a thumbnail, a recording plays in its chip, a video shows its first frame and
     * plays in a dialog, and anything else is a chip.
     */
    kind: 'image' | 'file' | 'audio' | 'video'
    /** The image, the recording or the video, for those kinds. */
    url?: string
    /** A short fact under the name: `CSV, 2.1 MB`. */
    detail?: string
    /**
     * Still on its way up: the chip takes a spinner, or a ring filled to `progress` when that is
     * given, and Send waits until every file is up.
     */
    uploading?: boolean
    /** How much of the upload is done, from 0 to 1. */
    progress?: number
    /** A recording's levels from start to end, each from 0 to 1, drawn as its scrubber. */
    waveform?: readonly number[]
    /** A recording's length in seconds, shown before it has loaded. */
    duration?: number
}

export interface ComposerWords {
    placeholder: string
    send: string
    stop: string
    attach: string
    remove: string
    drop: string
    /** The cancel button on a file still uploading, when `onCancel` is given. */
    cancel: string
    /** Said for a file still uploading. */
    uploading: string
    /** The send button's name while a file is still uploading. */
    waiting: string
    /** The players' words, for a recording or a video: play, pause, seek, speed, captions, fullscreen and the rest. */
    player: Partial<VideoPlayerWords>
    /** The video dialog's way out. */
    close: string
}

const WORDS: ComposerWords = {
    placeholder: 'Ask anything',
    send: 'Send',
    stop: 'Stop',
    attach: 'Attach files',
    remove: 'Remove',
    drop: 'Drop files to attach them',
    cancel: 'Cancel upload',
    uploading: 'Uploading',
    waiting: 'Waiting for files to upload',
    player: {},
    close: 'Close',
}

/** A spinner, or a ring filled to the upload's progress when it is known. */
function Upload({ attachment, words }: { attachment: ComposerAttachment; words: ComposerWords }) {
    return attachment.progress === undefined ? (
        <Spinner aria-label={words.uploading} className="shrink-0 text-muted-foreground" />
    ) : (
        <ProgressRing value={attachment.progress} label={words.uploading} className="shrink-0" />
    )
}

/** What an uploading file says under its name: its share done, or Uploading. */
function uploadNote(attachment: ComposerAttachment, words: ComposerWords): string {
    if (attachment.progress === undefined) return words.uploading
    return `${words.uploading} · ${String(Math.round(Math.min(1, Math.max(0, attachment.progress)) * 100))}%`
}

/** One file waiting to go, drawn by its kind and whether it is still uploading. */
function Chip({ attachment, words, onPlay }: { attachment: ComposerAttachment; words: ComposerWords; onPlay: () => void }) {
    const uploading = attachment.uploading === true
    const { kind, url, name } = attachment
    if (kind === 'image' && url !== undefined) {
        return (
            <span className="relative block size-14">
                <img
                    src={url}
                    alt={name}
                    title={name}
                    className={cn('size-14 rounded-md border border-border object-cover', uploading && 'opacity-50')}
                />
                {uploading && (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <Upload attachment={attachment} words={words} />
                    </span>
                )}
            </span>
        )
    }
    if (kind === 'video' && url !== undefined && !uploading) {
        return (
            <button
                type="button"
                aria-label={`${words.player.play ?? VIDEO_PLAYER_WORDS.play} ${name}`}
                title={name}
                onClick={onPlay}
                className="relative block size-14 overflow-hidden rounded-md border border-border bg-terminal outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
                <video src={url} muted playsInline preload="metadata" aria-hidden className="size-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-terminal/30 text-terminal-foreground">
                    <Play className="size-4 fill-current" aria-hidden />
                </span>
            </button>
        )
    }
    if (kind === 'audio' && url !== undefined && !uploading) {
        return (
            <div className="flex min-h-14 w-72 max-w-full flex-col justify-center rounded-md border border-border bg-card py-1 pr-2.5 pl-1">
                <span className="truncate pl-1.5 text-xs font-medium" title={name}>
                    {name}
                </span>
                <AudioPlayer src={url} waveform={attachment.waveform} duration={attachment.duration} label={name} words={words.player} />
            </div>
        )
    }
    return (
        <div className="flex h-14 max-w-56 items-center gap-2 rounded-md border border-border bg-card px-2.5">
            {uploading ? (
                <Upload attachment={attachment} words={words} />
            ) : (
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className="flex min-w-0 flex-col">
                <span className={cn('truncate text-xs font-medium', uploading && 'text-muted-foreground')} title={name}>
                    {name}
                </span>
                {uploading ? (
                    <span className="truncate text-xs text-muted-foreground tabular-nums">{uploadNote(attachment, words)}</span>
                ) : (
                    attachment.detail !== undefined && <span className="truncate text-xs text-muted-foreground">{attachment.detail}</span>
                )}
            </span>
        </div>
    )
}

/**
 * Where a message is written: the text grows with what is typed up to a limit, Enter sends and
 * Shift+Enter breaks the line, and files come in by the attach button, a paste or a drop. While an
 * answer is streaming the send button becomes Stop. Tools such as a model picker sit in the row
 * under the text.
 *
 * A file still uploading shows a spinner, or a ring when its progress is known. It has no remove
 * button then, unless `onCancel` is given, and Send waits until every file is up, so a message
 * never goes without its files. A recording plays in its chip, and a video opens in a dialog.
 */
export function Composer({
    value,
    onChange,
    onSend,
    onStop,
    busy = false,
    attachments = [],
    onAttach,
    onRemove,
    onCancel,
    tools,
    disabled = false,
    accept,
    words: given,
    className,
}: {
    value: string
    onChange: (value: string) => void
    onSend: () => void
    onStop?: () => void
    /** An answer is streaming. */
    busy?: boolean
    attachments?: readonly ComposerAttachment[]
    /** Takes files from the button, a paste or a drop; the composer accepts none without it. */
    onAttach?: (files: File[]) => void
    onRemove?: (id: string) => void
    /** Stops a file's upload and drops it; a file still uploading cannot be taken off without it. */
    onCancel?: (id: string) => void
    tools?: ReactNode
    disabled?: boolean
    /** The file types the attach button offers, as an `accept` attribute. */
    accept?: string
    words?: Partial<ComposerWords>
    className?: string
}) {
    const words = { ...WORDS, ...given }
    const picker = useRef<HTMLInputElement>(null)
    const [over, setOver] = useState(false)
    const [playing, setPlaying] = useState<ComposerAttachment>()
    const uploading = attachments.some((attachment) => attachment.uploading === true)
    const ready = !disabled && !busy && !uploading && (value.trim() !== '' || attachments.length > 0)
    const files = (list: FileList | null) => {
        if (onAttach !== undefined && list !== null && list.length > 0) onAttach([...list])
    }
    return (
        <div
            className={cn(
                'relative flex flex-col rounded-lg border border-border-strong bg-field shadow-surface transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
                over && 'border-primary ring-2 ring-primary/30',
                disabled && 'opacity-60',
                className,
            )}
            onDragOver={(event) => {
                if (onAttach === undefined || !event.dataTransfer.types.includes('Files')) return
                event.preventDefault()
                setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(event) => {
                if (!event.dataTransfer.types.includes('Files')) return
                event.preventDefault()
                setOver(false)
                files(event.dataTransfer.files)
            }}
        >
            {over && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 text-sm font-medium">
                    {words.drop}
                </div>
            )}
            {attachments.length > 0 && (
                <ul className="flex flex-wrap gap-2 px-3 pt-3">
                    {attachments.map((attachment) => {
                        const pending = attachment.uploading === true
                        const drop = pending ? onCancel : onRemove
                        return (
                            <li key={attachment.id} className="group relative max-w-full">
                                <Chip attachment={attachment} words={words} onPlay={() => setPlaying(attachment)} />
                                {drop !== undefined && (
                                    <button
                                        type="button"
                                        aria-label={`${pending ? words.cancel : words.remove} ${attachment.name}`}
                                        onClick={() => drop(attachment.id)}
                                        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-border-strong bg-popover text-muted-foreground opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-foreground pointer-coarse:opacity-100"
                                    >
                                        <X className="size-3" aria-hidden />
                                    </button>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}
            <Textarea
                bare
                value={value}
                rows={1}
                disabled={disabled}
                placeholder={words.placeholder}
                aria-label={words.placeholder}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
                    event.preventDefault()
                    if (ready) onSend()
                }}
                onPaste={(event) => {
                    if (onAttach === undefined) return
                    const pasted = [...event.clipboardData.items]
                        .filter((item) => item.kind === 'file')
                        .map((item) => item.getAsFile())
                        .filter((file): file is File => file !== null)
                    if (pasted.length === 0) return
                    if (!event.clipboardData.types.includes('text/plain')) event.preventDefault()
                    onAttach(pasted)
                }}
                className="max-h-60 min-h-12 px-3 pt-3 pb-1 text-sm"
            />
            <div className="flex items-center gap-1 px-2 pb-2">
                {onAttach !== undefined && (
                    <>
                        <input
                            ref={picker}
                            type="file"
                            multiple
                            accept={accept}
                            hidden
                            onChange={(event) => {
                                files(event.target.files)
                                event.target.value = ''
                            }}
                        />
                        <IconButton label={words.attach} disabled={disabled} onClick={() => picker.current?.click()}>
                            <Paperclip aria-hidden />
                        </IconButton>
                    </>
                )}
                {tools}
                <div className="flex-1" />
                {busy && onStop !== undefined ? (
                    <IconButton label={words.stop} variant="secondary" onClick={onStop}>
                        <Square className="fill-current" aria-hidden />
                    </IconButton>
                ) : (
                    <IconButton
                        label={uploading ? words.waiting : words.send}
                        variant="default"
                        aria-disabled={!ready || undefined}
                        className={cn(!ready && 'cursor-not-allowed opacity-50')}
                        onClick={ready ? onSend : undefined}
                    >
                        <ArrowUp aria-hidden />
                    </IconButton>
                )}
            </div>
            {playing?.url !== undefined && (
                <DialogShell
                    open
                    onOpenChange={(open) => {
                        if (!open) setPlaying(undefined)
                    }}
                    width="lg"
                    title={playing.name}
                    words={{ cancel: words.close }}
                >
                    <VideoPlayer src={playing.url} autoPlay words={words.player} />
                </DialogShell>
            )}
        </div>
    )
}
