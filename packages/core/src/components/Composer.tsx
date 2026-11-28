import { IconButton } from './IconButton'
import { ArrowUp, Check, CircleAlert, FileText, Mic, Paperclip, Play, Plus, Square, X } from 'lucide-react'
import { lazy, Suspense, useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { composing, touchTyping } from '../lib/keys'
import { accepts } from '../lib/uploads'
import { useWords, type WordsPart } from '../lib/words'
import { insertTranscript, useDictation, type Dictation, type DictationOptions } from '../hooks/use-dictation'
import { useFileDrop } from '../hooks/use-file-drop'
import { DialogShell } from './DialogShell'
import { MENTION_PART, MentionList, useMentions, type ComposerMentions, type MentionWords } from './Mentions'
import { AudioPlayer } from './media/AudioPlayer'
import { formatTime } from './media/time'
import { wantsFirstFrame } from './media/video-source'
import { VIDEO_PLAYER_PART, VideoPlayer, type VideoPlayerWords } from './media/VideoPlayer'
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

export const COMPOSER_DICTATION_WORDS: ComposerDictationWords = {
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

/** Where a catalog holds a composer's dictation's words. */
export const COMPOSER_DICTATION_PART: WordsPart<ComposerDictationWords> = { id: 'composerDictation', words: COMPOSER_DICTATION_WORDS }

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

export const COMPOSER_WORDS: ComposerWords = {
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

/** Where a catalog holds a composer's words. */
export const COMPOSER_PART: WordsPart<ComposerWords> = { id: 'composer', words: COMPOSER_WORDS }

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
    const play = useWords(VIDEO_PLAYER_PART).play
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
                aria-label={`${words.player.play ?? play} ${name}`}
                title={name}
                onClick={onPlay}
                className="relative block size-14 overflow-hidden rounded-md border border-border bg-terminal outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
                <video
                    src={url}
                    muted
                    playsInline
                    preload="metadata"
                    aria-hidden
                    // A seek to the start makes WebKit fetch the first frame, which it leaves empty under `preload="metadata"`.
                    onLoadedMetadata={(event) => {
                        if (wantsFirstFrame(event.currentTarget)) event.currentTarget.currentTime = 0
                    }}
                    className="size-full object-cover"
                />
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
 * How a composer lays out: `stacked` puts the text on top and its controls in a row under it;
 * `inline` puts them on one line, a pill, until the text needs a line of its own.
 */
export type ComposerLayout = 'stacked' | 'inline'

/** The tools' row: their buttons (toggles and selects among them) round, as the composer's own buttons are. */
const TOOLS = 'flex min-w-0 items-center gap-1 [&_button]:rounded-full!'

/** Room the text must leave beyond its own width before an inline composer goes back to one line, so it does not flip at the edge. */
const INLINE_SPARE = 8

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
    /** Controls beside attach, such as a model picker or a toggle; their buttons, toggles and selects are drawn round. */
    tools?: ReactNode
    disabled?: boolean
    /**
     * The file types taken, as an `accept` attribute: what the attach button offers, and what a drop
     * or a paste hands to `onAttach`.
     */
    accept?: string
    /** Hears the files a drop or a paste brought that `accept` does not take, so the app can say why. */
    onRefuse?: (files: File[]) => void
    /** Adds a microphone that dictates into the text, through the app's transcriber or the browser's recognition. */
    dictation?: ComposerDictation
    /** Suggests people at the caret as an `@` is typed, from the app's list or its search, and puts the one picked in as `@handle`. */
    mentions?: ComposerMentions
    /**
     * `stacked` (the default) puts the text on top and attach, the tools, the microphone and Send
     * in a row under it. `inline` puts them on one line, a pill: a round attach button, the text,
     * the tools and a round Send. Once the text (or the placeholder, while there is none) does not
     * fit on that line, or files, dictation or a failure show, it opens into the stacked box.
     */
    layout?: ComposerLayout
    words?: Partial<ComposerWords>
    className?: string
}

/**
 * Where a message is written: the text grows with what is typed up to a limit, Enter sends and
 * Shift+Enter breaks the line (on a touch screen Enter breaks the line and only the send button
 * sends), and files come in by the attach button, a paste or a drop. While an
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
 *
 * `layout="inline"` draws it on one line, a pill, while the text (or the placeholder, while there
 * is none) fits there beside the controls; it opens into the stacked box once the text wraps or
 * breaks a line, or files, dictation or a failure show, and closes back when the text fits again.
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
    onRefuse,
    dictation: dictating,
    mentions,
    layout = 'stacked',
    words: given,
    className,
}: ComposerProps) {
    const words = useWords(COMPOSER_PART, given)
    const said = useWords(COMPOSER_DICTATION_PART, words.dictation)
    const mentionWords = useWords(MENTION_PART)
    const picker = useRef<HTMLInputElement>(null)
    const root = useRef<HTMLDivElement>(null)
    const text = useRef<HTMLTextAreaElement>(null)
    const caret = useRef<number | undefined>(undefined)
    const latest = useRef({ value, onChange })
    useLayoutEffect(() => {
        latest.current = { value, onChange }
    })
    const [playing, setPlaying] = useState<ComposerAttachment>()
    // Read once: on a touch screen Enter breaks the line, as its keyboard has no Shift+Enter to reach for.
    const [touch] = useState(touchTyping)
    const mention = useMentions({
        options: mentions,
        value,
        onChange,
        area: text,
        root,
        words: { ...mentionWords, ...words.mentions },
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
    // Hands on the files `accept` takes, and the rest to `onRefuse`; whether any were taken.
    const take = (brought: File[]) => {
        const taken = brought.filter((file) => accepts(file, accept))
        const refused = brought.filter((file) => !taken.includes(file))
        if (refused.length > 0) onRefuse?.(refused)
        if (taken.length > 0) onAttach?.(taken)
        return taken.length > 0
    }
    const drop = useFileDrop(take, onAttach !== undefined && !disabled)
    const over = drop.over
    const inline = layout === 'inline'
    const failed = offered && dictation.state === 'error' && dictation.problem !== undefined
    // What opens an inline composer whatever the text: files, dictation and its failure.
    const held = attachments.length > 0 || hearing || failed
    const ruler = useRef<HTMLSpanElement>(null)
    const [long, setLong] = useState(false)
    const longNow = useRef(long)
    // Whether the text, or the placeholder while there is none, needs a line of its own: a line break, or wider than the room beside the controls.
    const measure = useCallback(() => {
        const box = root.current
        const area = text.current
        const line = ruler.current
        if (!inline || box === null || area === null || line === null) return
        const typed = latest.current.value
        let next = typed.includes('\n')
        if (!next) {
            const boxStyle = getComputedStyle(box)
            const areaStyle = getComputedStyle(area)
            const controls = [...box.querySelectorAll(':scope > [data-composer-control]')]
            const used = controls.reduce((sum, control) => sum + control.getBoundingClientRect().width, 0)
            const room =
                box.clientWidth -
                parseFloat(boxStyle.paddingLeft) -
                parseFloat(boxStyle.paddingRight) -
                used -
                (parseFloat(boxStyle.columnGap) || 0) * controls.length -
                parseFloat(areaStyle.paddingLeft) -
                parseFloat(areaStyle.paddingRight)
            const width = line.getBoundingClientRect().width
            if (longNow.current) next = width + INLINE_SPARE > room
            else {
                const padding = parseFloat(areaStyle.paddingTop) + parseFloat(areaStyle.paddingBottom)
                next = width > room || area.scrollHeight - padding > parseFloat(areaStyle.lineHeight) * 1.5
            }
        }
        if (next === longNow.current) return
        longNow.current = next
        setLong(next)
    }, [inline])
    useLayoutEffect(measure, [measure, value, words.placeholder, held])
    useLayoutEffect(() => {
        const box = root.current
        if (!inline || box === null || typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(() => measure())
        observer.observe(box)
        return () => observer.disconnect()
    }, [inline, measure])
    // An inline composer on one line: a pill with the text between the controls.
    const pill = inline && !held && !long
    const boxed = inline && !pill
    const button = inline ? 'icon' : 'icon-sm'
    const attach = hearing ? (
        <span data-composer-control className="flex">
            <IconButton label={said.cancel} size={button} className="rounded-full" onClick={dictation.cancel}>
                <X aria-hidden />
            </IconButton>
        </span>
    ) : (
        onAttach !== undefined && (
            <span data-composer-control className="flex">
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
                <IconButton
                    label={words.attach}
                    size={button}
                    variant={inline ? 'secondary' : 'ghost'}
                    disabled={disabled}
                    className="rounded-full"
                    onClick={() => picker.current?.click()}
                >
                    {inline ? <Plus aria-hidden /> : <Paperclip aria-hidden />}
                </IconButton>
            </span>
        )
    )
    const area = (
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
                if (event.key !== 'Enter' || event.shiftKey || touch || composing(event)) return
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
                if (take(pasted) && !event.clipboardData.types.includes('text/plain')) event.preventDefault()
            }}
            className={cn(
                'max-h-60 text-sm',
                !inline && 'min-h-12 px-3 pt-3 pb-1',
                inline && 'px-1.5 py-1 leading-6',
                pill && 'min-w-0 flex-1 placeholder:truncate',
                boxed && 'order-first basis-full',
            )}
        />
    )
    const controls = (
        <>
            {hearing ? (
                <DictationStrip dictation={dictation} words={said} />
            ) : (
                <>
                    {tools !== undefined && tools !== null && (
                        <span data-composer-control className={TOOLS}>
                            {tools}
                        </span>
                    )}
                    {!pill && <div className="flex-1" />}
                </>
            )}
            {offered && (
                <span data-composer-control className="flex">
                    <IconButton
                        label={
                            dictation.state === 'recording'
                                ? said.finish
                                : dictation.state === 'transcribing'
                                  ? said.transcribing
                                  : said.dictate
                        }
                        size={button}
                        variant={dictation.state === 'recording' ? 'secondary' : 'ghost'}
                        disabled={disabled && !hearing}
                        aria-disabled={dictation.state === 'transcribing' || undefined}
                        data-state={dictation.state}
                        className="rounded-full"
                        onClick={() => {
                            if (dictation.state === 'recording') dictation.stop()
                            else if (dictation.state !== 'transcribing') dictation.start()
                        }}
                    >
                        {dictation.state === 'recording' ? <Check aria-hidden /> : <Mic aria-hidden />}
                    </IconButton>
                </span>
            )}
            <span data-composer-control className="flex">
                {busy && onStop !== undefined ? (
                    <IconButton
                        label={words.stop}
                        size={button}
                        variant={inline ? 'default' : 'secondary'}
                        className="rounded-full"
                        onClick={onStop}
                    >
                        <Square className="fill-current" aria-hidden />
                    </IconButton>
                ) : (
                    <IconButton
                        label={uploading ? words.waiting : words.send}
                        size={button}
                        variant="default"
                        aria-disabled={!ready || undefined}
                        className={cn('rounded-full', !ready && 'cursor-not-allowed opacity-disabled')}
                        onClick={ready ? onSend : undefined}
                    >
                        <ArrowUp aria-hidden />
                    </IconButton>
                )}
            </span>
        </>
    )
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
                'relative flex border border-border-strong bg-field shadow-surface transition-[color,background-color,border-color,box-shadow,border-radius] duration-base ease-motion focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
                inline ? 'flex-wrap items-center gap-1.5 p-1.5' : 'flex-col',
                // The pill's corners are half its height or more, so they ease to the box's as it opens.
                pill
                    ? 'rounded-[calc(var(--density-control)/2+--spacing(3))] max-md:rounded-[calc(var(--spacing-finger)/2+--spacing(3))]'
                    : 'rounded-composer',
                over && 'border-primary ring-2 ring-primary/30',
                disabled && 'opacity-60',
                className,
            )}
            {...drop.handlers}
        >
            {over && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-background/80 text-sm font-medium">
                    {words.drop}
                </div>
            )}
            {attachments.length > 0 && (
                <ul className={cn('flex flex-wrap gap-2', inline ? 'order-first basis-full px-1.5 pt-1.5' : 'px-3 pt-3')}>
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
                                        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-border-strong bg-popover text-muted-foreground opacity-0 shadow-surface transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-foreground pointer-coarse:opacity-100"
                                    >
                                        <X className="size-3" aria-hidden />
                                    </button>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}
            {inline && (
                <span aria-hidden className="pointer-events-none invisible absolute top-0 left-0 size-0 overflow-hidden">
                    <span ref={ruler} className="text-sm leading-6 whitespace-pre">
                        {value === '' ? words.placeholder : value}
                    </span>
                </span>
            )}
            {inline && attach}
            {area}
            {mention.list !== null && <MentionList {...mention.list} />}
            {failed && dictation.problem !== undefined && (
                // A line of its own over the row, wrapping as far as it needs, so the reason is read whole at any width.
                <p
                    role="alert"
                    className={cn(
                        'flex items-start gap-1.5 text-xs text-critical-ink',
                        inline ? 'order-first basis-full px-1.5' : 'px-3 pb-1',
                    )}
                >
                    <CircleAlert className="mt-0.75 size-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0">{said[dictation.problem]}</span>
                </p>
            )}
            {inline ? (
                controls
            ) : (
                <div className="flex items-center gap-1 px-2 pb-2">
                    {attach}
                    {controls}
                </div>
            )}
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
