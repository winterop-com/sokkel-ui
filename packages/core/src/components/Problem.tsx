import { CircleAlert, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ProseText } from './ProseText'
import { Unfoldable } from './Unfoldable'

/** The words a problem says. */
export interface ProblemWords {
    technical: string
}

const WORDS: ProblemWords = {
    technical: 'Technical details',
}

export interface ProblemProps {
    title: ReactNode
    /** Where and how to fix it; a string's backticked parts are drawn as code. */
    detail?: ReactNode
    /** The raw message, shown as written. */
    technical?: string
    actions?: ReactNode
    tone?: 'error' | 'warning'
    className?: string
    words?: Partial<ProblemWords>
}

/**
 * Something that went wrong, said for a person: what happened in one sentence, then where and what
 * a right value looks like, with machine words marked by backticks drawn in the code face. The raw
 * message a program produced, such as a validator's or a stack trace, is folded away under the
 * technical details, for whoever needs it.
 */
export function Problem({ title, detail, technical, actions, tone = 'error', className, words: given }: ProblemProps) {
    const words = { ...WORDS, ...given }
    const Icon = tone === 'error' ? CircleAlert : TriangleAlert
    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={cn(
                'flex flex-col gap-1.5 rounded-r-control border-l-2 py-2.5 pr-3 pl-3 text-sm',
                tone === 'error' ? 'border-critical bg-critical/6' : 'border-warning bg-warning/6',
                className,
            )}
        >
            <div className="flex items-start gap-2">
                <Icon className={cn('mt-0.5 size-4 shrink-0', tone === 'error' ? 'text-critical' : 'text-warning')} aria-hidden />
                <p className="font-medium">{title}</p>
            </div>
            {detail !== undefined && (
                <p className="pl-6 text-muted-foreground">{typeof detail === 'string' ? <ProseText text={detail} /> : detail}</p>
            )}
            {technical !== undefined && (
                <Unfoldable heading={<span className="text-xs font-normal text-muted-foreground">{words.technical}</span>} className="pl-5">
                    <pre className="overflow-x-auto rounded-sm bg-muted px-2 py-1.5 font-mono text-xs [overflow-wrap:anywhere] whitespace-pre-wrap text-muted-foreground">
                        {technical}
                    </pre>
                </Unfoldable>
            )}
            {actions !== undefined && <div className="flex flex-wrap gap-2 pt-1 pl-6">{actions}</div>}
        </div>
    )
}
