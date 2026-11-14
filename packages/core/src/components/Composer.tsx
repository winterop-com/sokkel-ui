import { IconButton } from './IconButton'
import { ArrowUp, Check, CircleAlert, FileText, Mic, Paperclip, Play, Square, X } from 'lucide-react'
import { lazy, Suspense, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { insertTranscript, useDictation, type Dictation, type DictationOptions } from '../hooks/use-dictation'
import { DialogShell } from './DialogShell'
import { MENTION_WORDS, MentionList, useMentions, type ComposerMentions, type MentionWords } from './Mentions'
import { AudioPlayer } from './media/AudioPlayer'
import { formatTime } from './media/time'
import { VIDEO_PLAYER_WORDS, VideoPlayer, type VideoPlayerWords } from './media/VideoPlayer'
import { ProgressRing } from './ui/progress-ring'
import { Spinner } from './ui/spinner'
import { Textarea } from './ui/textarea'

export type { ComposerMentions, MentionPerson, MentionSearch, MentionWords } from './Mentions'

// The level a recording draws loads with the first recording, so a composer never dictated to carries none of it.
const BarVisualizer = lazy(() => import('./ui/bar-visualizer').then((module) => ({ default: module.BarVisualizer })))

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

/** The words dictation says in the composer. */
export interface ComposerDictationWords {
    /** The microphone button, which starts a dictation. */
    dictate: string
    /** The same button while it hears: a press stops and puts the text in. */
    finish: string
    /** The button that drops what was heard; Escape does the same. */
    cancel: string
    /** Said while it hears. */
    recording: string
    /** Said while what was heard is turned into text. */
    transcribing: string
    /** The level drawn while it hears. */
    level: string
    /** The microphone was refused. */
    refused: string
    /** There is no microphone, or nothing to record with. */
    missing: string
    /** What was heard could not be turned into text. */
    failed: string
}

const DICTATION_WORDS: ComposerDictationWords = {
    dictate: 'Dictate',
    finish: 'Finish dictating',
    cancel: 'Cancel dictation',
    recording: 'Listening',
    transcribing: 'Transcribing',
    level: 'Voice level',
    refused: 'The microphone is not allowed. Allow it for this site to dictate.',
    missing: 'No microphone was found.',
    failed: 'What was said could not be turned into text. Try again.',
}

/**
 * How the composer takes dictation: `transcribe` turns a recording of the microphone into text, and
 * `recognition` opts in to the browser's own speech recognition, used ahead of it where there is
 * one. `useDictation` runs it.
 */
export type ComposerDictation = Omit<DictationOptions, 'onText'>

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
    /** Dictation's words: the microphone, its states and its failures. */
    dictation: Partial<ComposerDictationWords>
    /** The words of the people a mention suggests. */
    mentions: Partial<MentionWords>
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
    dictation: {},
    mentions: {},
}

/** How much of a long text heard is kept, from its end, so what was heard last stays in view. */
const HEARD_TAIL = 160

/** A dictation while it runs: a pulsing mark, the level or the words heard, and the time; or that it transcribes. */
function DictationStrip({ dictation, words }: { dictation: Dictation; words: ComposerDictationWords }) {
    if (dictation.state === 'transcribing') {
        return (
            <div role="status" className="flex h-8 min-w-0 flex-1 items-center gap-2 px-1 text-sm text-muted-foreground">
                <Spinner aria-hidden role={undefined} aria-label={undefined} />
                <span className="truncate">{words.transcribing}</span>
            </div>
        )
    }
    const heard = dictation.heard.length > HEARD_TAIL ? `…${dictation.heard.slice(-HEARD_TAIL)}` : dictation.heard
    return (
        <div role="status" aria-label={words.recording} className="flex h-8 min-w-0 flex-1 items-center gap-2 px-1">
            <span className="size-2 shrink-0 rounded-full bg-critical motion-safe:animate-pulse" aria-hidden />
            {dictation.mode === 'recognition' ? (
                // Pinned to the end and cut at the start, so the latest words stay in view.
                <span className="flex min-w-0 flex-1 justify-end overflow-hidden text-sm text-muted-foreground">
                    <span className="shrink-0 whitespace-nowrap">{heard === '' ? words.recording : heard}</span>
                </span>
            ) : (
                <Suspense fallback={<span className="min-w-0 flex-1" />}>
                    <BarVisualizer
                        source={dictation.stream}
                        state="listening"
                        barCount={32}
                        minHeight={12}
                        centerAlign
                        label={words.level}
                        className="h-6 min-w-0 flex-1 rounded-none bg-transparent p-0"
                    />
                </Suspense>
            )}
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{formatTime(dictation.seconds)}</span>
        </div>
    )
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

export interface ComposerProps {
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
    /** Adds a microphone that dictates into the text, through the app's transcriber or the browser's recognition. */
    dictation?: ComposerDictation
    /** Suggests people at the caret as an `@` is typed, from the app's list or its search, and puts the one picked in as `@handle`. */
    mentions?: ComposerMentions
    words?: Partial<ComposerWords>
    className?: string
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
 *
 * `dictation` adds a microphone before Send. A press starts hearing: the row shows a pulsing mark,
 * the voice's level (or, with the browser's recognition, the words heard so far) and the time, with
 * a button to cancel; a second press stops, the row says it transcribes, and the text is put in
 * where the caret was, or at the end. Escape cancels a dictation that is hearing or transcribing.
 * A failure is said on a line of its own over the row, wrapping as far as it needs, until the next
 * press or Escape. Send waits while a dictation runs.
 * The microphone shows only where the page can dictate with what the app gave.
 *
 * `mentions` suggests people at the caret as an `@` is typed: the arrow keys move through them,
 * Enter or Tab puts the one chosen in as `@handle` (Enter then does not send), and Escape closes
 * them. `mentions.onChange` hears the ids the text mentions; `mentionsIn` from `lib/mentions` reads
 * them from a text the app holds.
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
    dictation: dictating,
    mentions,
    words: given,
    className,
}: ComposerProps) {
    const words = { ...WORDS, ...given }
    const said = { ...DICTATION_WORDS, ...words.dictation }
    const picker = useRef<HTMLInputElement>(null)
    const root = useRef<HTMLDivElement>(null)
    const text = useRef<HTMLTextAreaElement>(null)
    const caret = useRef<number | undefined>(undefined)
    const latest = useRef({ value, onChange })
    useLayoutEffect(() => {
        latest.current = { value, onChange }
    })
    const [over, setOver] = useState(false)
    const [playing, setPlaying] = useState<ComposerAttachment>()
    const mention = useMentions({
        options: mentions,
        value,
        onChange,
        area: text,
        root,
        words: { ...MENTION_WORDS, ...words.mentions },
    })
    const dictation = useDictation({
        ...dictating,
        onText: (heard) => {
            const next = insertTranscript(latest.current.value, heard, caret.current)
            caret.current = next.caret
            latest.current.onChange(next.value)
            // Back to the text with the caret after what was put in, unless the person has moved on.
            if (root.current?.contains(document.activeElement) !== true) return
            requestAnimationFrame(() => {
                text.current?.focus()
                text.current?.setSelectionRange(next.caret, next.caret)
            })
        },
    })
    const hearing = dictation.state === 'recording' || dictation.state === 'transcribing'
    const offered = dictating !== undefined && (dictation.mode !== null || dictation.state !== 'idle')
    const uploading = attachments.some((attachment) => attachment.uploading === true)
    const ready = !disabled && !busy && !uploading && !hearing && (value.trim() !== '' || attachments.length > 0)
    const files = (list: FileList | null) => {
        if (onAttach !== undefined && list !== null && list.length > 0) onAttach([...list])
    }
    return (
        <div
            ref={root}
            onKeyDown={(event) => {
                if (event.key !== 'Escape' || (!hearing && dictation.state !== 'error')) return
                event.preventDefault()
                event.stopPropagation()
                dictation.cancel()
            }}
            className={cn(
                'relative flex flex-col rounded-control border border-border-strong bg-field shadow-surface transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
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
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-control bg-background/80 text-sm font-medium">
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
                ref={text}
                bare
                value={value}
                rows={1}
                disabled={disabled}
                placeholder={words.placeholder}
                aria-label={words.placeholder}
                {...mention.areaProps}
                onChange={(event) => {
                    onChange(event.target.value)
                    mention.onInput(event.target.value, event.target.selectionStart)
                }}
                onSelect={(event) => {
                    caret.current = event.currentTarget.selectionStart
                    mention.onSelect(event.currentTarget.value, event.currentTarget.selectionStart)
                }}
                onKeyDown={(event) => {
                    if (mention.onKeyDown(event)) return
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
            {mention.list !== null && <MentionList {...mention.list} />}
            {offered && dictation.state === 'error' && dictation.problem !== undefined && (
                // A line of its own over the row, wrapping as far as it needs, so the reason is read whole at any width.
                <p role="alert" className="flex items-start gap-1.5 px-3 pb-1 text-xs text-critical-ink">
                    <CircleAlert className="mt-0.75 size-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0">{said[dictation.problem]}</span>
                </p>
            )}
            <div className="flex items-center gap-1 px-2 pb-2">
                {hearing ? (
                    <IconButton label={said.cancel} onClick={dictation.cancel}>
                        <X aria-hidden />
                    </IconButton>
                ) : (
                    onAttach !== undefined && (
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
                    )
                )}
                {hearing ? (
                    <DictationStrip dictation={dictation} words={said} />
                ) : (
                    <>
                        {tools}
                        <div className="flex-1" />
                    </>
                )}
                {offered && (
                    <IconButton
                        label={
                            dictation.state === 'recording'
                                ? said.finish
                                : dictation.state === 'transcribing'
                                  ? said.transcribing
                                  : said.dictate
                        }
                        variant={dictation.state === 'recording' ? 'secondary' : 'ghost'}
                        disabled={disabled && !hearing}
                        aria-disabled={dictation.state === 'transcribing' || undefined}
                        data-state={dictation.state}
                        onClick={() => {
                            if (dictation.state === 'recording') dictation.stop()
                            else if (dictation.state !== 'transcribing') dictation.start()
                        }}
                    >
                        {dictation.state === 'recording' ? <Check aria-hidden /> : <Mic aria-hidden />}
                    </IconButton>
                )}
                {busy && onStop !== undefined ? (
                    <IconButton label={words.stop} variant="secondary" onClick={onStop}>
                        <Square className="fill-current" aria-hidden />
                    </IconButton>
                ) : (
                    <IconButton
                        label={uploading ? words.waiting : words.send}
                        variant="default"
                        aria-disabled={!ready || undefined}
                        className={cn(!ready && 'cursor-not-allowed opacity-disabled')}
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
