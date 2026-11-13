import { CircleAlert, TriangleAlert } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'

import { cn } from '../lib/cn'

export interface ProseTextProps {
    text: string
    className?: string
}

/**
 * A sentence whose machine parts are marked with backticks, drawn with those parts in the code
 * face: "Set `base_url` in the service" shows `base_url` in mono. A server's own diagnostics
 * arrive written that way.
 */
export function ProseText({ text, className }: ProseTextProps) {
    const parts = text.split('`')
    // An odd count of backticks leaves the last one unmatched; it is drawn as written.
    const closed = parts.length % 2 === 1
    return (
        <span className={className ?? 'break-words'}>
            {parts.map((part, index) => {
                const code = index % 2 === 1 && (closed || index < parts.length - 1)
                if (code) {
                    return (
                        <code key={index} className="rounded-sm bg-muted px-1 font-mono">
                            {part}
                        </code>
                    )
                }
                const unmatched = !closed && index === parts.length - 1 && index % 2 === 1
                return <Fragment key={index}>{unmatched ? `\`${part}` : part}</Fragment>
            })}
        </span>
    )
}

export interface ProblemLineProps {
    children: ReactNode
    tone?: 'error' | 'warning'
    className?: string
}

/**
 * A problem said in one line with no box: a refusal under a control or above a dialog's answers,
 * where a `Problem` or a `Callout` would be a box too many. Its mark and words are in the tone's
 * ink; a string's backticked parts are drawn as code, as `ProseText` draws them. An error is
 * announced as an alert. `Problem` exports it too.
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
