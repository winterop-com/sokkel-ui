import { IconButton } from './IconButton'
import {
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
import { useEffect, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ConfirmCard, type ConfirmCardProps } from './ConfirmCard'
import { Markdown, type InlineCode } from './Markdown'
import { Problem } from './Problem'
import { Timeline, type TimelineEvent } from './Timeline'
import { ToolCalls, type ToolCallEntry } from './ToolCall'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Button } from './ui/button'
import { Card, CardContent, CardFooter, CardHeader } from './ui/card'
import { Marker, MarkerContent, MarkerIcon } from './ui/marker'
import { MessageFooter, MessageHeader } from './ui/message'
import { Spinner } from './ui/spinner'

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
}

/** The inline-code look of each layout. */
const INLINE: Record<AssistantReplyLayout, InlineCode> = { card: 'wash', steps: 'plain' }

/** A labeled Copy that says Copied for a moment after a press. */
function CopyAction({ value, onCopy, words }: { value?: string; onCopy?: () => void; words: AssistantReplyWords }) {
    const [copied, setCopied] = useState(false)
    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), 1500)
        return () => clearTimeout(timer)
    }, [copied])
    return (
        <Button
            variant="ghost"
            onClick={() => {
                onCopy?.()
                if (value === undefined) return
                navigator.clipboard.writeText(value).then(
                    () => setCopied(true),
                    () => undefined,
                )
            }}
        >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? words.copied : words.copy}
        </Button>
    )
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
    content,
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
}: {
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
    /** The answer, as markdown. */
    content?: string
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
}) {
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

    const answer = (
        <>
            {content !== undefined && <Markdown content={content} inlineCode={INLINE[layout]} streaming={streaming} caret={streaming} />}
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
