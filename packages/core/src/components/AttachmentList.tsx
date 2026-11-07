import { FileText, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
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
}

export interface AttachmentListWords {
    /** The remove button's accessible name. */
    remove: (name: string) => string
}

export const ATTACHMENT_LIST_WORDS: AttachmentListWords = {
    remove: (name) => `Remove ${name}`,
}

/**
 * Files attached to a letter or a message, each an `Attachment` with its tile, name and detail, in
 * a row that wraps onto more lines when it runs out of room, so every file stays in view. With
 * `onRemove` each file gets a remove button, for files waiting to be sent. Inside an end-aligned
 * `Message` it lines up with the bubble.
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
            {files.map((file) => (
                <li key={file.id} className="flex min-w-0">
                    <Attachment size={size} className="min-w-0">
                        <AttachmentMedia variant={file.image === undefined ? 'icon' : 'image'}>
                            {file.image === undefined ? (file.icon ?? <FileText aria-hidden />) : <img src={file.image} alt="" />}
                        </AttachmentMedia>
                        <AttachmentContent>
                            <AttachmentTitle>{file.name}</AttachmentTitle>
                            {file.detail !== undefined && <AttachmentDescription>{file.detail}</AttachmentDescription>}
                        </AttachmentContent>
                        {onRemove !== undefined && (
                            <AttachmentAction aria-label={words.remove(file.name)} onClick={() => onRemove(file.id)}>
                                <X aria-hidden />
                            </AttachmentAction>
                        )}
                    </Attachment>
                </li>
            ))}
        </ul>
    )
}
