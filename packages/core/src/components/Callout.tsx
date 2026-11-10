import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ProseText } from './ProseText'

export type CalloutTone = 'critical' | 'warning' | 'info' | 'good' | 'neutral'

const BOX: Record<CalloutTone, string> = {
    critical: 'border-critical/35 bg-critical/8',
    warning: 'border-warning/35 bg-warning/8',
    info: 'border-info/35 bg-info/8',
    good: 'border-good/35 bg-good/8',
    neutral: 'border-border bg-panel-ground',
}

const INK: Record<CalloutTone, string> = {
    critical: 'text-critical-ink',
    warning: 'text-warning-ink',
    info: 'text-info-ink',
    good: 'text-good-ink',
    neutral: 'text-muted-foreground',
}

const ICON: Record<CalloutTone, typeof Info> = {
    critical: CircleAlert,
    warning: TriangleAlert,
    info: Info,
    good: CircleCheck,
    neutral: Info,
}

export interface CalloutProps {
    tone?: CalloutTone
    /** What the box is about, in one line over the body. */
    title?: ReactNode
    /** Replaces the tone's icon; `false` draws none. */
    icon?: ReactNode | false
    actions?: ReactNode
    className?: string
    /** The body; a string's backticked parts are drawn as code. */
    children?: ReactNode
}

/**
 * A boxed note inside a page or a panel: what a reader should know about what is around it, in a
 * tone. A hairline edge all the way round, tinted by the tone, with a title, a body and actions
 * under them. `Banner` is the strip across a screen's edge for a state that holds; `Problem` says
 * what went wrong with the raw message folded away; a callout sits in the content beside what it
 * is about.
 */
export function Callout({ tone = 'info', title, icon, actions, className, children }: CalloutProps) {
    const Icon = ICON[tone]
    const mark = icon === false ? null : (icon ?? <Icon className={cn('mt-0.5 size-4 shrink-0', INK[tone])} aria-hidden />)
    return (
        <div
            role={tone === 'critical' ? 'alert' : 'note'}
            data-tone={tone}
            className={cn('flex gap-2 rounded-surface border px-3 py-2.5 text-sm text-foreground', BOX[tone], className)}
        >
            {mark}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                {title !== undefined && <p className={cn('font-medium', tone === 'neutral' ? 'text-foreground' : INK[tone])}>{title}</p>}
                {children !== undefined && (
                    <div className="break-words">{typeof children === 'string' ? <ProseText text={children} /> : children}</div>
                )}
                {actions !== undefined && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
            </div>
        </div>
    )
}
