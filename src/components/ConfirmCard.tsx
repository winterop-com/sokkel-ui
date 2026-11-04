import { ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { digest } from './ToolCall'
import { Button } from './ui/button'

export type ConfirmState = 'pending' | 'approved' | 'denied' | 'expired'

export interface ConfirmWords {
    approve: string
    deny: string
    approved: string
    denied: string
    expired: string
}

const WORDS: ConfirmWords = {
    approve: 'Approve',
    deny: 'Deny',
    approved: 'Approved',
    denied: 'Denied',
    expired: 'Denied: no answer in time',
}

/**
 * An action an assistant holds until a person answers: what it will do in a sentence, the call in
 * the code face, and Approve and Deny. Once answered it keeps its place and states the outcome.
 */
export function ConfirmCard({
    action,
    tool,
    args,
    state,
    onApprove,
    onDeny,
    words = WORDS,
}: {
    /** What approving does, said plainly: "Delete the pipeline weather-gate". */
    action: ReactNode
    tool: string
    args?: unknown
    state: ConfirmState
    onApprove?: () => void
    onDeny?: () => void
    words?: ConfirmWords
}) {
    const outcome = state === 'approved' ? words.approved : state === 'denied' ? words.denied : words.expired
    return (
        <div
            className={cn(
                'flex w-full flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm',
                state === 'pending' ? 'border-warning/50 bg-warning/10' : 'border-border bg-card',
            )}
        >
            <div className="flex items-start gap-2">
                <ShieldAlert
                    className={cn('mt-0.5 size-4 shrink-0', state === 'pending' ? 'text-warning' : 'text-muted-foreground')}
                    aria-hidden
                />
                <p className="font-medium">{action}</p>
            </div>
            <p className="pl-6 font-mono text-xs break-all text-muted-foreground">
                <span className="text-foreground">{tool}</span>({digest(args, 4)})
            </p>
            {state === 'pending' ? (
                <div className="flex items-center gap-2 pl-6">
                    <Button size="sm" onClick={onApprove}>
                        {words.approve}
                    </Button>
                    <Button size="sm" variant="outline" onClick={onDeny}>
                        {words.deny}
                    </Button>
                </div>
            ) : (
                <p role="status" className="pl-6 text-xs text-muted-foreground">
                    {outcome}
                </p>
            )}
        </div>
    )
}
