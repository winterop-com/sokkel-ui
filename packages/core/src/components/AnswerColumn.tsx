import { RotateCcw, Square, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { CopyButton } from './CopyButton'
import { IconButton } from './IconButton'
import { Markdown, type MarkdownWords } from './Markdown'
import { PaneHeader } from './PaneHeader'
import { Problem } from './Problem'
import { Reasoning } from './reasoning'
import { StatusChip, type Status } from './StatusChip'
import { UsageLine, type UsageLineProps, type UsageLineWords } from './UsageLine'

/** Where a model's answer is: asked and not yet begun, being written, written, stopped part way, or failed. */
export type AnswerState = 'waiting' | 'streaming' | 'done' | 'stopped' | 'failed'

/** The words an answer column says. */
export interface AnswerColumnWords extends Record<AnswerState, string> {
    /** Said in the body before the first token. */
    first: string
    copy: string
    copied: string
    /** The button that asks the model again. */
    again: string
    stop: string
    remove: string
    /** The title of a failed answer, when no `problem` title is given. */
    failedTitle: string
    /** The line over the model's thinking while it thinks. */
    thinking: string
    /** The folded line over finished thinking, from its length in words. */
    thoughtFor: (words: number) => string
    usage: Partial<UsageLineWords>
    markdown: Partial<MarkdownWords>
}

export const ANSWER_COLUMN_WORDS: AnswerColumnWords = {
    waiting: 'waiting',
    streaming: 'streaming',
    done: 'done',
    stopped: 'stopped',
    failed: 'failed',
    first: 'Waiting for the first token',
    copy: 'Copy the answer',
    copied: 'Copied',
    again: 'Run again',
    stop: 'Stop',
    remove: 'Remove',
    failedTitle: 'The model could not answer',
    thinking: 'Thinking',
    thoughtFor: (count) => `Thought for ${String(count)} ${count === 1 ? 'word' : 'words'}`,
    usage: {},
    markdown: {},
}

/** Each state's chip, in the run states' colors. */
const CHIP: Record<AnswerState, Status> = {
    waiting: 'queued',
    streaming: 'running',
    done: 'succeeded',
    stopped: 'cancelled',
    failed: 'failed',
}

export interface AnswerColumnProps {
    /** The model answering, drawn in the code face; any node, such as a select to change it. */
    model: ReactNode
    /** A short fact under the model: its quantization and size, where it runs. */
    detail?: ReactNode
    state: AnswerState
    /** The answer so far, as markdown. */
    content: string
    /** The model's thinking before its answer, as markdown: open while it is written, folded once the answer begins. */
    reasoning?: string
    /** What the answer cost and how fast it came, under it; its count says so far while it streams. */
    usage?: Omit<UsageLineProps, 'live' | 'words' | 'className'>
    /** What went wrong, when `failed`, in a sentence. */
    problem?: ReactNode
    /** Offers Stop while the answer is waited for or written. */
    onStop?: () => void
    /** Offers Run again once the answer has ended. */
    onRetry?: () => void
    /** Offers Remove, taking the column away. */
    onRemove?: () => void
    /** More buttons in the head, before the column's own. */
    actions?: ReactNode
    className?: string
    words?: Partial<AnswerColumnWords>
}

/**
 * One model's answer to a prompt sent to several, as a column beside the others: the model in the
 * code face over a short fact, the answer's state as a chip, then the model's thinking when it
 * thinks (open while it is written, folded behind a line counting its words once the answer
 * begins), the answer in markdown with a caret where the next words land while it streams, and
 * its usage line pinned under it. The head offers Copy once something is written, Stop while the
 * answer is coming, Run again once it has ended and Remove, each when its handler is given. A failed answer says why; a stopped one keeps
 * what was written. The column fills the height it is given and its answer scrolls within it.
 */
export function AnswerColumn({
    model,
    detail,
    state,
    content,
    reasoning = '',
    usage,
    problem,
    onStop,
    onRetry,
    onRemove,
    actions,
    className,
    words: given,
}: AnswerColumnProps) {
    const words = { ...ANSWER_COLUMN_WORDS, ...given }
    const going = state === 'waiting' || state === 'streaming'
    return (
        <section
            data-slot="answer-column"
            className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden rounded-surface border border-border-strong bg-card', className)}
        >
            <PaneHeader
                variant="panel"
                title={<span className="font-mono">{model}</span>}
                description={detail}
                actions={
                    <>
                        <StatusChip status={CHIP[state]} label={words[state]} />
                        {actions}
                        {content !== '' && <CopyButton value={content} words={{ copy: words.copy, copied: words.copied }} />}
                        {going && onStop !== undefined && (
                            <IconButton label={words.stop} onClick={onStop}>
                                <Square aria-hidden />
                            </IconButton>
                        )}
                        {!going && onRetry !== undefined && (
                            <IconButton label={words.again} onClick={onRetry}>
                                <RotateCcw aria-hidden />
                            </IconButton>
                        )}
                        {onRemove !== undefined && (
                            <IconButton label={words.remove} onClick={onRemove}>
                                <X aria-hidden />
                            </IconButton>
                        )}
                    </>
                }
            />
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-(--density-panel-pad)">
                {reasoning !== '' && (
                    <Reasoning
                        text={reasoning}
                        thinking={going && content === ''}
                        words={{ thinking: words.thinking, thoughtFor: words.thoughtFor, markdown: words.markdown }}
                    />
                )}
                {state === 'waiting' && content === '' && reasoning === '' && (
                    <p className="text-sm text-muted-foreground motion-safe:animate-pulse">{words.first}</p>
                )}
                {content !== '' && (
                    <Markdown content={content} streaming={state === 'streaming'} caret inlineCode="wash" words={words.markdown} />
                )}
                {state === 'failed' && <Problem title={words.failedTitle} detail={problem} />}
            </div>
            {usage !== undefined && (
                <div className="border-t border-border px-(--density-panel-pad) py-2.5">
                    <UsageLine {...usage} live={going} words={words.usage} />
                </div>
            )}
        </section>
    )
}
