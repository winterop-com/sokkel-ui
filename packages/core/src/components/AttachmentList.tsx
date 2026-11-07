import { AudioLines, FileText, Film, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { AudioPlayer } from './media/AudioPlayer'
import { VideoPlayer } from './media/VideoPlayer'
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
}

export interface AttachmentListWords {
    /** The remove button's accessible name. */
    remove: (name: string) => string
    /** The players' buttons and scrubber, for a recording or a video. */
    play: string
    pause: string
    seek: string
}

export const ATTACHMENT_LIST_WORDS: AttachmentListWords = {
    remove: (name) => `Remove ${name}`,
    play: 'Play',
    pause: 'Pause',
    seek: 'Seek',
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
 */
export function AttachmentList({
    files,
    onRemove,
    size = 'sm',
    words: given,
    className,
}: {
    files: readonly AttachmentFile[]
    /** Removes a file by its id; no remove buttons without it. */
    onRemove?: (id: string) => void
    size?: 'default' | 'sm' | 'xs'
    words?: Partial<AttachmentListWords>
    className?: string
}) {
    const words = { ...ATTACHMENT_LIST_WORDS, ...given }
    return (
        <ul data-slot="attachment-list" className={cn('flex min-w-0 flex-wrap items-stretch gap-2', className)}>
            {files.map((file) => {
                const video = file.kind === 'video' && file.src !== undefined && onRemove === undefined
                const audio = file.kind === 'audio' && file.src !== undefined
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
                            <VideoPlayer
                                src={file.src}
                                title={file.name}
                                preload="metadata"
                                labels={{ play: words.play, pause: words.pause, seek: words.seek }}
                            />
                        ) : (
                            <Attachment size={size} className={cn('min-w-0', audio && 'w-80 max-w-full')}>
                                <AttachmentMedia variant={file.image === undefined ? 'icon' : 'image'}>
                                    {file.image === undefined ? (file.icon ?? glyph) : <img src={file.image} alt="" />}
                                </AttachmentMedia>
                                <AttachmentContent>
                                    <AttachmentTitle>{file.name}</AttachmentTitle>
                                    {audio && file.src !== undefined ? (
                                        <AudioPlayer
                                            src={file.src}
                                            waveform={file.waveform}
                                            duration={file.duration}
                                            label={file.name}
                                            labels={{ play: words.play, pause: words.pause, seek: words.seek }}
                                            className="mt-1 -ml-1"
                                        />
                                    ) : (
                                        file.detail !== undefined && <AttachmentDescription>{file.detail}</AttachmentDescription>
                                    )}
                                </AttachmentContent>
                                {onRemove !== undefined && (
                                    <AttachmentAction aria-label={words.remove(file.name)} onClick={() => onRemove(file.id)}>
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
