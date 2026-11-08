import { ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Code } from './Code'
import { digest } from './ToolCall'
import { Button } from './ui/button'
import { TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceLine, TraceTitle } from './ui/trace'

export type ConfirmState = 'pending' | 'approved' | 'denied' | 'expired'

/**
 * How the card sits among an answer: `warning` is washed in the warning color; `card` is a plain
 * card under a warning-ink heading; `section` drops its own frame for a rule above it, for a
 * card already inside a framed reply.
 */
export type ConfirmAppearance = 'warning' | 'card' | 'section'

export interface ConfirmWords {
    approve: string
    deny: string
    approved: string
    denied: string
    expired: string
    /** The heading over the action, in the `card` and `section` appearances. */
    heading: string
    /** The control that opens the call, when `details` folds it away. */
    details: string
}

const WORDS: ConfirmWords = {
    approve: 'Approve',
    deny: 'Deny',
    approved: 'Approved',
    denied: 'Denied',
    expired: 'Denied: no answer in time',
    heading: 'Approval required',
    details: 'View change',
}

const FRAME: Record<ConfirmAppearance, { pending: string; settled: string }> = {
    warning: {
        pending: 'gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2.5',
        settled: 'gap-2 rounded-lg border border-border bg-card px-3 py-2.5',
    },
    card: {
        pending: 'gap-3 rounded-surface border border-border-strong bg-card p-4',
        settled: 'gap-3 rounded-surface border border-border bg-card p-4',
    },
    section: { pending: 'gap-3 border-t border-border pt-4', settled: 'gap-3 border-t border-border pt-4' },
}

/** What a held action says and does, as `ConfirmCard` takes it. */
export interface ConfirmCardProps {
    /** What approving does, said plainly: "Delete the job import-orders". */
    action: ReactNode
    tool: string
    args?: unknown
    state: ConfirmState
    onApprove?: () => void
    onDeny?: () => void
    appearance?: ConfirmAppearance
    /** Folds the call away behind a control that opens it in full. */
    details?: boolean
    words?: Partial<ConfirmWords>
}

/**
 * An action an assistant holds until a person answers: what it will do in a sentence, the call in
 * the code face, and Approve and Deny. Once answered it keeps its place and states the outcome.
 *
 * In the `card` and `section` appearances a warning-ink heading says an answer is needed, the
 * buttons take the default size, and `details` folds the call behind "View change", where it
 * opens in full.
 */
export function ConfirmCard({
    action,
    tool,
    args,
    state,
    onApprove,
    onDeny,
    appearance = 'warning',
    details = false,
    words: given,
}: ConfirmCardProps) {
    const words = { ...WORDS, ...given }
    const pending = state === 'pending'
    const outcome = state === 'approved' ? words.approved : state === 'denied' ? words.denied : words.expired
    const headed = appearance !== 'warning'
    const call = (
        <p className="font-mono text-xs break-all text-muted-foreground">
            <span className="text-foreground">{tool}</span>({digest(args, 4)})
        </p>
    )
    return (
        <div className={cn('flex w-full flex-col text-sm', pending ? FRAME[appearance].pending : FRAME[appearance].settled)}>
            {headed ? (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <ShieldAlert
                            className={cn('size-4 shrink-0', pending ? 'text-warning-ink' : 'text-muted-foreground')}
                            aria-hidden
                        />
                        <p className={cn('text-xs font-medium', pending ? 'text-warning-ink' : 'text-muted-foreground')}>{words.heading}</p>
                    </div>
                    <p className="font-medium">{action}</p>
                </div>
            ) : (
                <div className="flex items-start gap-2">
                    <ShieldAlert className={cn('mt-0.5 size-4 shrink-0', pending ? 'text-warning' : 'text-muted-foreground')} aria-hidden />
                    <p className="font-medium">{action}</p>
                </div>
            )}
            <div className={cn(!headed && 'pl-6')}>
                {details ? (
                    <TraceCollapsible>
                        <TraceCollapsibleTrigger>
                            <TraceLine>
                                <TraceTitle>{words.details}</TraceTitle>
                            </TraceLine>
                        </TraceCollapsibleTrigger>
                        <TraceCollapsibleContent>
                            <div className="flex flex-col gap-2">
                                {call}
                                {args !== undefined && <Code size="sm" language="json" value={JSON.stringify(args, null, 2)} />}
                            </div>
                        </TraceCollapsibleContent>
                    </TraceCollapsible>
                ) : (
                    call
                )}
            </div>
            {pending ? (
                <div className={cn('flex flex-wrap items-center gap-2', !headed && 'pl-6')}>
                    <Button size={headed ? 'default' : 'sm'} onClick={onApprove}>
                        {words.approve}
                    </Button>
                    <Button size={headed ? 'default' : 'sm'} variant="outline" onClick={onDeny}>
                        {words.deny}
                    </Button>
                </div>
            ) : (
                <p role="status" className={cn('text-xs text-muted-foreground', !headed && 'pl-6')}>
                    {outcome}
                </p>
            )}
        </div>
    )
}
