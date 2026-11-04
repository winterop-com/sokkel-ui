import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * A titled part of a page.
 *
 * `flat` is a heading over a rule with the content on the page's own ground. `boxed` is a
 * bordered surface whose head is a bar of its own. Either takes actions at the right end of its
 * heading, and a count or a fact beside the title.
 */
export function Section({
    title,
    meta,
    actions,
    variant = 'flat',
    flush = false,
    children,
    className,
}: {
    title: ReactNode
    /** A count or a short fact beside the title, drawn quieter than it. */
    meta?: ReactNode
    /** Controls at the right end of the heading. */
    actions?: ReactNode
    variant?: 'flat' | 'boxed'
    /** Content that fills the box to its edges, such as a list or a graph, takes no padding. */
    flush?: boolean
    children: ReactNode
    className?: string
}) {
    if (variant === 'boxed') {
        return (
            <section className={cn('overflow-hidden rounded-surface border border-border-strong bg-card', className)}>
                <header className="flex h-(--density-panel-head) items-center gap-2 border-b border-border-strong bg-panel-ground px-(--density-panel-pad)">
                    <h2 className="truncate text-sm font-medium">{title}</h2>
                    {meta !== undefined && <span className="font-mono text-xs text-muted-foreground">{meta}</span>}
                    {actions !== undefined && <div className="ml-auto flex items-center gap-1">{actions}</div>}
                </header>
                <div className={flush ? undefined : 'p-(--density-panel-pad)'}>{children}</div>
            </section>
        )
    }
    return (
        <section className={cn('flex flex-col gap-(--density-section-gap)', className)}>
            <header className="flex h-(--density-panel-head) items-center gap-2 border-b border-border">
                <h2 className="truncate text-sm font-medium">{title}</h2>
                {meta !== undefined && <span className="font-mono text-xs text-muted-foreground">{meta}</span>}
                {actions !== undefined && <div className="ml-auto flex items-center gap-1">{actions}</div>}
            </header>
            <div>{children}</div>
        </section>
    )
}

/** A bordered surface with no heading of its own, for content that is a surface: a graph, a list. */
export function Surface({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('overflow-hidden rounded-surface border border-border-strong bg-card', className)}>{children}</div>
    )
}
