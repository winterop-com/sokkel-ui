import { CircleAlert, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ProseText } from './ProseText'

export interface ProblemLineProps {
    children: ReactNode
    tone?: 'error' | 'warning'
    className?: string
}

/**
 * A problem said in one line with no box: a refusal under a control or above a dialog's answers,
 * where a `Problem` or a `Callout` would be a box too many. Its mark and words are in the tone's
 * ink; a string's backticked parts are drawn as code. An error is announced as an alert.
 */
export function ProblemLine({ children, tone = 'error', className }: ProblemLineProps) {
    const Icon = tone === 'error' ? CircleAlert : TriangleAlert
    return (
        <div
            data-slot="problem-line"
            role={tone === 'error' ? 'alert' : 'status'}
            className={cn(
                'flex min-w-0 items-start gap-1.5 text-sm break-words',
                tone === 'error' ? 'text-critical-ink' : 'text-warning-ink',
                className,
            )}
        >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="min-w-0">{typeof children === 'string' ? <ProseText text={children} /> : children}</span>
        </div>
    )
}
