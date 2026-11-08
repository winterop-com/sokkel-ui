import { IconButton } from './IconButton'
import {
    Brain,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    CircleCheck,
    Copy,
    RotateCcw,
    Search,
    ShieldAlert,
    Square,
    ThumbsDown,
    ThumbsUp,
} from 'lucide-react'
import { Children, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ConfirmCard, type ConfirmCardProps } from './ConfirmCard'
import { Markdown, type InlineCode, type MarkdownWords } from './Markdown'
import { useCopy } from '../hooks/use-copy'
import { Problem } from './Problem'
import { Timeline, type TimelineEvent } from './Timeline'
import { ToolCalls, type ToolCallEntry } from './ToolCall'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Button } from './ui/button'
import { Card, CardContent, CardFooter, CardHeader } from './ui/card'
import { Marker, MarkerContent, MarkerIcon } from './ui/marker'
import { MessageFooter, MessageHeader } from './ui/message'
import { Spinner } from './ui/spinner'
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from './ui/trace'
import { AudioPlayer, type AudioPlayerWords } from './media/AudioPlayer'
import { SpeakButton, type SpeakAudio, type SpeakButtonWords } from './media/SpeakButton'

/**
 * How the turn is drawn: `card` holds it in one quiet card, header to footer; `steps` sets it on a
 * rail of three stages, what was checked, what was found and what comes next.
 */
export type AssistantReplyLayout = 'card' | 'steps'

/** Where the answer is: written, still being written, stopped by the person, or failed. */
export type AssistantReplyState = 'done' | 'streaming' | 'stopped' | 'failed'

/** Which version of an answer asked for more than once is showing, counted from 1. */
export interface AssistantReplyVersions {
    at: number
    of: number
    onChange: (at: number) => void
}

/** What went wrong with an answer that failed. */
export interface AssistantReplyProblem {
    title?: ReactNode
    /** What happened and what it means, in a sentence. */
    detail?: ReactNode
    /** The raw error, folded away. */
    technical?: string
}

export interface AssistantReplyWords {
    /** The speaker, when no `name` is given. */
    name: string
    copy: string
    copied: string
    tryAgain: string
    good: string
    bad: string
    previous: string
    next: string
    version: (at: number, of: number) => string
    stopped: string
    failed: string
    /** The folded line over the tool calls, when no `summary` is given. */
    summary: (calls: readonly ToolCallEntry[]) => string
    /** The three stages of the `steps` layout. */
    checked: string
    found: string
    nextStep: string
    /** The folded line over a finished `reasoning`, from its length in words. */
    thoughtFor: (words: number) => string
    /** The line while the model thinks: over a streaming `reasoning`, and alone before anything has come. */
    thinking: string
    /** The read-back player's name. */
    speech: string
    /** The read-back player's words: play, pause and seek. */
    player: Partial<AudioPlayerWords>
    /** Read aloud's words in the footer, when `speak` is given. */
    speak: Partial<SpeakButtonWords>
    /** The words the answer's markdown says: its callouts, code blocks and diagrams. */
    markdown: Partial<MarkdownWords>
}

const plural = (count: number, word: string) => `${String(count)} ${word}${count === 1 ? '' : 's'}`

const WORDS: AssistantReplyWords = {
    name: 'Assistant',
    copy: 'Copy',
    copied: 'Copied',
    tryAgain: 'Try again',
    good: 'Good answer',
    bad: 'Bad answer',
    previous: 'Previous version',
    next: 'Next version',
    version: (at, of) => `${String(at)} of ${String(of)}`,
    stopped: 'Stopped',
    failed: 'The answer could not be finished',
    summary: (calls) => {
        const failed = calls.filter((call) => call.status === 'error').length
        if (failed > 0) return `${plural(failed, 'tool')} failed`
        const done = calls.filter((call) => call.status === 'done').length
        if (done < calls.length) return `Working · ${String(done)} of ${String(calls.length)} complete`
        return `Done · ${plural(calls.length, 'tool')}`
    },
    checked: 'Checked',
    found: 'Found',
    nextStep: 'Next',
    thoughtFor: (count) => `Thought for ${plural(count, 'word')}`,
    thinking: 'Thinking',
    speech: 'Read aloud',
    player: {},
    speak: {},
    markdown: {},
}

/** How many words a text holds, markdown marks and all. */
export function wordCount(text: string): number {
    return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length
}

/** The answer read aloud: a recording the model made of it. */
export interface AssistantReplySpeech {
    src: string
    /** The recording's levels from start to end, each from 0 to 1, drawn as the scrubber. */
    waveform?: readonly number[]
    /** Its length in seconds, shown before it has loaded. */
    duration?: number
}

/** Whether React would draw anything for a node: `false`, `null`, `undefined` and `''` draw nothing. */
function shown(node: ReactNode): boolean {
    return Children.toArray(node).some((child) => child !== '')
}

/**
 * The model's thinking, folded behind one line that counts its words. While it is still being
 * written it is open, its line shimmers as it says Thinking, and the text grows; once the answer
 * begins it folds away, and a press opens it again.
 */
function Reasoning({ text, thinking, math, words }: { text: string; thinking: boolean; math: boolean; words: AssistantReplyWords }) {
    const [open, setOpen] = useState(false)
    return (
        <Trace data-slot="assistant-reasoning">
            <TraceCollapsible open={thinking || open} onOpenChange={(next) => setOpen(next)}>
                <TraceCollapsibleTrigger>
                    <TraceLine status={thinking ? 'running' : undefined}>
                        <TraceIcon>
                            <Brain />
                        </TraceIcon>
                        <TraceTitle>{thinking ? words.thinking : words.thoughtFor(wordCount(text))}</TraceTitle>
                    </TraceLine>
                </TraceCollapsibleTrigger>
                <TraceCollapsibleContent>
                    <Markdown content={text} streaming={thinking} math={math} className="text-muted-foreground" words={words.markdown} />
                </TraceCollapsibleContent>
            </TraceCollapsible>
        </Trace>
    )
}

/** The inline-code look of each layout. */
const INLINE: Record<AssistantReplyLayout, InlineCode> = { card: 'wash', steps: 'plain' }

/** A labeled Copy that says Copied for a moment after a press. */
function CopyAction({ value, onCopy, words }: { value?: string; onCopy?: () => void; words: AssistantReplyWords }) {
    const { copied, copy } = useCopy()
    return (
        <Button
            variant="ghost"
            onClick={() => {
                onCopy?.()
                if (value !== undefined) copy(value)
            }}
        >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? words.copied : words.copy}
        </Button>
    )
}

export interface AssistantReplyProps {
    layout?: AssistantReplyLayout
    /** Who speaks; `words.name` when none is given. */
    name?: ReactNode
    /** The assistant's mark, drawn in a square before the name. */
    mark?: ReactNode
    /** When the answer came, as the conversation shows it: `09:42`. */
    time?: string
    /** The full date and time, on hover. */
    timeTitle?: string
    /** The tools it called, folded behind one line. */
    calls?: readonly ToolCallEntry[]
    /** The folded line over the calls, written from their state; one is made from the calls when none is given. */
    summary?: ReactNode
    /** The model's thinking, as markdown, folded between the tools and the answer. */
    reasoning?: string
    /** The answer, as markdown. */
    content?: string
    /** The answer read aloud, played in one line under it. */
    speech?: AssistantReplySpeech
    /**
     * Adds Read aloud to the footer, after Copy: a `SpeakButton` that fetches the answer's audio
     * through this on its first press and plays it, one sound at a time.
     */
    speak?: (options: { signal: AbortSignal }) => Promise<SpeakAudio>
    /** Draws the answer's LaTeX math, as `Markdown` does: on by default; off where every `$` is a dollar. */
    math?: boolean
    /** More under the answer, such as a chart or files it made. */
    children?: ReactNode
    state?: AssistantReplyState
    /** What went wrong, when `failed`. */
    problem?: AssistantReplyProblem
    /** A change the answer holds until a person approves or denies it. */
    held?: Omit<ConfirmCardProps, 'appearance'>
    /** Offers Try again, in the footer and on a failed answer. */
    onRetry?: () => void
    /** Called on Copy, which copies `content` itself. */
    onCopy?: () => void
    /** The feedback given, drawn pressed. */
    feedback?: 'good' | 'bad'
    /** Offers Good answer and Bad answer; pressing the given one again takes it back. */
    onFeedback?: (feedback: 'good' | 'bad' | undefined) => void
    /** Steps between the versions of an answer asked for again. */
    versions?: AssistantReplyVersions
    /** A quiet fact at the end of the footer: `3 tools, 4.1s`. */
    facts?: ReactNode
    /** More buttons for the footer, after the feedback. */
    actions?: ReactNode
    className?: string
    words?: Partial<AssistantReplyWords>
}

/**
 * The assistant's side of a turn in a conversation: who speaks, the tools it called folded behind
 * one line that opens into them, the answer in markdown, a change it holds until a person answers,
 * and the reply's actions: Copy, Try again, feedback, and the versions when it was asked again.
 *
 * While `streaming` the answer ends in a caret and the actions wait; `stopped` keeps what was
 * written under a Stopped mark; `failed` says what went wrong, with Try again. Try again also
 * waits while a held change is unanswered.
 *
 * `reasoning`, the model's thinking, folds between the tools and the answer behind a line that
 * counts its words; while it streams with no answer yet it stands open and grows. A streaming reply
 * with nothing to show yet, no thinking, no calls and no answer, says Thinking, shimmering,
 * instead of an empty card. `speech` puts the answer read aloud in a player under it; `speak`
 * instead fetches it on demand from Read aloud in the footer.
 *
 * The `card` layout (the default) holds the turn in one quiet card, inline code washed and the
 * held change as a section of it. The `steps` layout sets it on a rail: Checked holds the tools,
 * Found the answer, and Next the held change and the actions, inline code in the code face alone.
 */
export function AssistantReply({
    layout = 'card',
    name,
    mark,
    time,
    timeTitle,
    calls,
    summary,
    reasoning,
    content,
    speech,
    speak,
    math = true,
    children,
    state = 'done',
    problem,
    held,
    onRetry,
    onCopy,
    feedback,
    onFeedback,
    versions,
    facts,
    actions,
    className,
    words: given,
}: AssistantReplyProps) {
    const words = { ...WORDS, ...given }
    const card = layout === 'card'
    const streaming = state === 'streaming'
    const failed = state === 'failed'
    const waiting = held?.state === 'pending'

    const header = (
        <MessageHeader variant="speaker">
            {mark !== undefined && (
                <Avatar shape="square">
                    <AvatarFallback>{mark}</AvatarFallback>
                </Avatar>
            )}
            <span className="min-w-0 truncate font-medium">{name ?? words.name}</span>
            {time !== undefined && (
                <time title={timeTitle} className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {time}
                </time>
            )}
        </MessageHeader>
    )

    const tools =
        calls !== undefined && calls.length > 0 ? <ToolCalls calls={calls} summary={summary ?? words.summary(calls)} /> : undefined

    const written = content !== undefined && content !== ''
    const thought = reasoning !== undefined && reasoning !== ''
    const empty = streaming && !written && !thought && tools === undefined && !shown(children)

    const answer = (
        <>
            {empty && (
                <Trace data-slot="assistant-waiting">
                    <TraceLine status="running">
                        <TraceTitle>{words.thinking}</TraceTitle>
                    </TraceLine>
                </Trace>
            )}
            {thought && <Reasoning text={reasoning} thinking={streaming && !written} math={math} words={words} />}
            {written && (
                <Markdown
                    content={content}
                    inlineCode={INLINE[layout]}
                    streaming={streaming}
                    caret={streaming}
                    math={math}
                    words={words.markdown}
                />
            )}
            {speech !== undefined && (
                <AudioPlayer
                    src={speech.src}
                    waveform={speech.waveform}
                    duration={speech.duration}
                    label={words.speech}
                    words={words.player}
                    variant="card"
                    className="max-w-sm"
                />
            )}
            {children}
            {state === 'stopped' && (
                <Marker>
                    <MarkerIcon>
                        <Square aria-hidden />
                    </MarkerIcon>
                    <MarkerContent>{words.stopped}</MarkerContent>
                </Marker>
            )}
            {failed && (
                <Problem
                    title={problem?.title ?? words.failed}
                    detail={problem?.detail}
                    technical={problem?.technical}
                    actions={
                        onRetry === undefined ? undefined : (
                            <Button variant="outline" size="sm" onClick={onRetry}>
                                <RotateCcw aria-hidden />
                                {words.tryAgain}
                            </Button>
                        )
                    }
                />
            )}
        </>
    )

    const confirm =
        held !== undefined && !streaming && !failed ? <ConfirmCard {...held} appearance={card ? 'section' : 'card'} details /> : undefined

    const footer =
        streaming || failed ? undefined : (
            <MessageFooter variant="actions" className={cn('w-full', !card && '-ml-2.5')}>
                {versions !== undefined && (
                    <span className="flex items-center gap-1">
                        <IconButton
                            label={words.previous}
                            size="icon"
                            disabled={versions.at <= 1}
                            onClick={() => versions.onChange(versions.at - 1)}
                        >
                            <ChevronLeft aria-hidden />
                        </IconButton>
                        <span className="text-sm font-normal tabular-nums">{words.version(versions.at, versions.of)}</span>
                        <IconButton
                            label={words.next}
                            size="icon"
                            disabled={versions.at >= versions.of}
                            onClick={() => versions.onChange(versions.at + 1)}
                        >
                            <ChevronRight aria-hidden />
                        </IconButton>
                    </span>
                )}
                <CopyAction value={content} onCopy={onCopy} words={words} />
                {speak !== undefined && <SpeakButton load={speak} variant="labeled" words={words.speak} />}
                {onRetry !== undefined && (
                    <Button variant="ghost" disabled={waiting} onClick={onRetry}>
                        <RotateCcw aria-hidden />
                        {words.tryAgain}
                    </Button>
                )}
                {onFeedback !== undefined && (
                    <>
                        <IconButton
                            label={words.good}

                            size="icon"
                            pressed={feedback === 'good'}
                            onClick={() => onFeedback(feedback === 'good' ? undefined : 'good')}
                        >
                            <ThumbsUp aria-hidden />
                        </IconButton>
                        <IconButton
                            label={words.bad}

                            size="icon"
                            pressed={feedback === 'bad'}
                            onClick={() => onFeedback(feedback === 'bad' ? undefined : 'bad')}
                        >
                            <ThumbsDown aria-hidden />
                        </IconButton>
                    </>
                )}
                {actions}
                {facts !== undefined && <span className="ml-auto font-normal text-faint tabular-nums">{facts}</span>}
            </MessageFooter>
        )

    if (card) {
        return (
            <Card className={cn('w-full min-w-0', className)}>
                <CardHeader>{header}</CardHeader>
                <CardContent className="flex min-w-0 flex-col gap-4">
                    {tools}
                    {answer}
                    {confirm}
                </CardContent>
                {footer !== undefined && <CardFooter>{footer}</CardFooter>}
            </Card>
        )
    }

    const running = calls?.some((call) => call.status === 'running' || call.status === 'pending') === true
    const toolsFailed = calls?.some((call) => call.status === 'error') === true
    const events: TimelineEvent[] = []
    if (tools !== undefined) {
        events.push({
            id: 'checked',
            title: <span className="font-medium">{words.checked}</span>,
            tone: toolsFailed ? 'failed' : running ? 'running' : 'succeeded',
            icon: toolsFailed ? <CircleAlert className="size-4" /> : running ? <Spinner /> : <CircleCheck className="size-4" />,
            content: tools,
        })
    }
    events.push({
        id: 'found',
        title: <span className="font-medium">{words.found}</span>,
        tone: failed ? 'failed' : 'neutral',
        icon: failed ? <CircleAlert className="size-4" /> : <Search className="size-4" />,
        content: (
            <div className="flex min-w-0 flex-col gap-3">
                {answer}
                {confirm === undefined && footer}
            </div>
        ),
    })
    if (confirm !== undefined) {
        events.push({
            id: 'next',
            title: <span className="font-medium">{words.nextStep}</span>,
            tone: waiting ? 'waiting' : 'neutral',
            icon: <ShieldAlert className="size-4" />,
            content: (
                <div className="flex min-w-0 flex-col gap-3">
                    {confirm}
                    {footer}
                </div>
            ),
        })
    }
    return (
        <div className={cn('flex w-full min-w-0 flex-col gap-4 text-sm', className)}>
            {header}
            <Timeline events={events} />
        </div>
    )
}
