import { AudioLines, FileText, Film, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { AudioPlayer } from './media/AudioPlayer'
import { VideoPlayer, type VideoPlayerWords } from './media/VideoPlayer'
import { ProgressRing } from './ui/progress-ring'
import { Spinner } from './ui/spinner'
import { Attachment, AttachmentAction, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from './ui/attachment'

/** One file in an attachment list. */
export interface AttachmentFile {
    id: string
    name: string
    /** A short fact under the name: `CSV, 2.1 MB`. */
    detail?: ReactNode
    /** The glyph in the tile; a document by default. */
    icon?: ReactNode
    /** A picture for the tile instead of the glyph, for an image. */
    image?: string
    /** A recording plays in one line under its name, and a video in the library's player; a file by default. */
    kind?: 'file' | 'audio' | 'video'
    /** The recording or the video to play. */
    src?: string
    /** A recording's levels from start to end, each from 0 to 1, drawn as its scrubber. */
    waveform?: readonly number[]
    /** A recording's length in seconds, shown before it has loaded. */
    duration?: number
    /**
     * Still on its way up: the tile takes a spinner, or a ring filled to `progress` when that is
     * known, and the name dims. A recording or a video plays only once it is up.
     */
    uploading?: boolean
    /** How much has gone up, from 0 to 1. */
    progress?: number
}

export interface AttachmentListWords {
    /** The remove button's accessible name. */
    remove: (name: string) => string
    /** The cancel button's accessible name, on a file still uploading when `onCancel` is given. */
    cancel: (name: string) => string
    /** The players' words, for a recording or a video: play, pause, seek, speed, captions, fullscreen and the rest. */
    player: Partial<VideoPlayerWords>
    /** Said for a file still uploading. */
    uploading: string
}

export const ATTACHMENT_LIST_WORDS: AttachmentListWords = {
    remove: (name) => `Remove ${name}`,
    cancel: (name) => `Cancel upload ${name}`,
    player: {},
    uploading: 'Uploading',
}

/** What an uploading file says under its name: its share done, or Uploading. */
function uploadNote(file: AttachmentFile, words: AttachmentListWords): string {
    if (file.progress === undefined) return words.uploading
    return `${words.uploading} · ${String(Math.round(Math.min(1, Math.max(0, file.progress)) * 100))}%`
}

export interface AttachmentListProps {
    files: readonly AttachmentFile[]
    /** Removes a file by its id; no remove buttons without it. */
    onRemove?: (id: string) => void
    /** Stops a file's upload and drops it; a file still uploading has no button without it. */
    onCancel?: (id: string) => void
    size?: 'default' | 'sm' | 'xs'
    words?: Partial<AttachmentListWords>
    className?: string
}

/**
 * Files attached to a letter or a message, each an `Attachment` with its tile, name and detail, in
 * a row that wraps onto more lines when it runs out of room, so every file stays in view. With
 * `onRemove` each file gets a remove button, for files waiting to be sent. Inside an end-aligned
 * `Message` it lines up with the bubble.
 *
 * A recording (`kind: 'audio'`) plays in place, in one line under its name, and a video in the
 * library's player, at the width of a message; a video waiting to be sent stays a tile, so it can
 * be removed.
 *
 * A file with `uploading` shows a spinner in its tile, or a ring when its `progress` is known, and
 * says how far it has got under its name. It takes a cancel button only with `onCancel`, never
 * the remove button.
 */
export function AttachmentList({ files, onRemove, onCancel, size = 'sm', words: given, className }: AttachmentListProps) {
    const words = { ...ATTACHMENT_LIST_WORDS, ...given }
    return (
        <ul data-slot="attachment-list" className={cn('flex min-w-0 flex-wrap items-stretch gap-2', className)}>
            {files.map((file) => {
                const uploading = file.uploading === true
                const drop = uploading ? onCancel : onRemove
                const video = file.kind === 'video' && file.src !== undefined && onRemove === undefined && !uploading
                const audio = file.kind === 'audio' && file.src !== undefined && !uploading
                const glyph =
                    file.kind === 'audio' ? (
                        <AudioLines aria-hidden />
                    ) : file.kind === 'video' ? (
                        <Film aria-hidden />
                    ) : (
                        <FileText aria-hidden />
                    )
                return (
                    <li key={file.id} className={cn('flex min-w-0', video && 'w-full max-w-sm')}>
                        {video && file.src !== undefined ? (
                            <VideoPlayer src={file.src} title={file.name} preload="metadata" words={words.player} />
                        ) : (
                            <Attachment size={size} className={cn('min-w-0', audio && 'w-80 max-w-full')}>
                                <AttachmentMedia variant={file.image === undefined || uploading ? 'icon' : 'image'}>
                                    {uploading ? (
                                        file.progress === undefined ? (
                                            <Spinner aria-label={words.uploading} />
                                        ) : (
                                            <ProgressRing value={file.progress} label={words.uploading} />
                                        )
                                    ) : file.image === undefined ? (
                                        (file.icon ?? glyph)
                                    ) : (
                                        <img src={file.image} alt="" />
                                    )}
                                </AttachmentMedia>
                                <AttachmentContent>
                                    <AttachmentTitle className={cn(uploading && 'text-muted-foreground')}>{file.name}</AttachmentTitle>
                                    {uploading ? (
                                        <AttachmentDescription className="tabular-nums">{uploadNote(file, words)}</AttachmentDescription>
                                    ) : audio && file.src !== undefined ? (
                                        <AudioPlayer
                                            src={file.src}
                                            waveform={file.waveform}
                                            duration={file.duration}
                                            label={file.name}
                                            words={words.player}
                                            className="mt-1 -ml-1"
                                        />
                                    ) : (
                                        file.detail !== undefined && <AttachmentDescription>{file.detail}</AttachmentDescription>
                                    )}
                                </AttachmentContent>
                                {drop !== undefined && (
                                    <AttachmentAction
                                        aria-label={uploading ? words.cancel(file.name) : words.remove(file.name)}
                                        onClick={() => drop(file.id)}
                                    >
                                        <X aria-hidden />
                                    </AttachmentAction>
                                )}
                            </Attachment>
                        )}
                    </li>
                )
            })}
        </ul>
    )
}
