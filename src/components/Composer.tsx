import { ArrowUp, FileText, Paperclip, Square, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Button } from './ui/button'

/** A file waiting to go with the next message. */
export interface ComposerAttachment {
    id: string
    name: string
    /** An image shows as a thumbnail; anything else as a chip. */
    kind: 'image' | 'file'
    /** The image to show, for `image`. */
    url?: string
    /** A short fact under the name: `CSV, 2.1 MB`. */
    detail?: string
}

export interface ComposerWords {
    placeholder: string
    send: string
    stop: string
    attach: string
    remove: string
    drop: string
}

const WORDS: ComposerWords = {
    placeholder: 'Ask anything',
    send: 'Send',
    stop: 'Stop',
    attach: 'Attach files',
    remove: 'Remove',
    drop: 'Drop files to attach them',
}

/**
 * Where a message is written: the text grows with what is typed up to a limit, Enter sends and
 * Shift+Enter breaks the line, and files come in by the attach button, a paste or a drop. While an
 * answer is streaming the send button becomes Stop. Tools such as a model picker sit in the row
 * under the text.
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
    tools,
    disabled = false,
    accept,
    words = WORDS,
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
    tools?: ReactNode
    disabled?: boolean
    /** The file types the attach button offers, as an `accept` attribute. */
    accept?: string
    words?: ComposerWords
    className?: string
}) {
    const picker = useRef<HTMLInputElement>(null)
    const [over, setOver] = useState(false)
    const ready = !disabled && !busy && (value.trim() !== '' || attachments.length > 0)
    const files = (list: FileList | null) => {
        if (onAttach !== undefined && list !== null && list.length > 0) onAttach([...list])
    }
    return (
        <div
            className={cn(
                'relative flex flex-col rounded-lg border border-border-strong bg-field shadow-surface transition-colors focus-within:border-ring',
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
                    {attachments.map((attachment) => (
                        <li key={attachment.id} className="group relative">
                            {attachment.kind === 'image' && attachment.url !== undefined ? (
                                <img
                                    src={attachment.url}
                                    alt={attachment.name}
                                    title={attachment.name}
                                    className="size-14 rounded-md border border-border object-cover"
                                />
                            ) : (
                                <div className="flex h-14 max-w-56 items-center gap-2 rounded-md border border-border bg-card px-2.5">
                                    <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                    <span className="flex min-w-0 flex-col">
                                        <span className="truncate text-xs font-medium" title={attachment.name}>
                                            {attachment.name}
                                        </span>
                                        {attachment.detail !== undefined && (
                                            <span className="truncate text-xs text-muted-foreground">{attachment.detail}</span>
                                        )}
                                    </span>
                                </div>
                            )}
                            {onRemove !== undefined && (
                                <button
                                    type="button"
                                    aria-label={`${words.remove} ${attachment.name}`}
                                    onClick={() => onRemove(attachment.id)}
                                    className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-border-strong bg-popover text-muted-foreground opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-foreground pointer-coarse:opacity-100"
                                >
                                    <X className="size-3" aria-hidden />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <textarea
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
                className="field-sizing-content max-h-60 min-h-12 w-full resize-none bg-transparent px-3 pt-3 pb-1 text-sm outline-none placeholder:text-muted-foreground"
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
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={words.attach}
                            title={words.attach}
                            disabled={disabled}
                            onClick={() => picker.current?.click()}
                            className="text-muted-foreground"
                        >
                            <Paperclip aria-hidden />
                        </Button>
                    </>
                )}
                {tools}
                <div className="flex-1" />
                {busy && onStop !== undefined ? (
                    <Button size="icon-sm" variant="secondary" aria-label={words.stop} title={words.stop} onClick={onStop}>
                        <Square className="fill-current" aria-hidden />
                    </Button>
                ) : (
                    <Button
                        size="icon-sm"
                        aria-label={words.send}
                        title={words.send}
                        aria-disabled={!ready || undefined}
                        className={cn(!ready && 'cursor-not-allowed opacity-50')}
                        onClick={ready ? onSend : undefined}
                    >
                        <ArrowUp aria-hidden />
                    </Button>
                )}
            </div>
        </div>
    )
}
