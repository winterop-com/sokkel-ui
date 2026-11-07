import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { PaneHeader } from './PaneHeader'

/**
 * A titled part of a page.
 *
 * `boxed`, the default, is a bordered surface whose head is a bar of its own, its title set like a table's
 * column heads but in the text color, so every box's head reads alike. `flat` is a heading
 * over a rule with the content on the page's own ground, for the rare page that wants it. Either takes actions at the right end of its
 * heading, and a count or a fact beside the title.
 */
export function Section({
    title,
    meta,
    actions,
    variant = 'boxed',
    flush = false,
    fill = false,
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
    /** The box takes the height its container gives it and its body scrolls within it, as an editor or a preview pane wants. */
    fill?: boolean
    children: ReactNode
    className?: string
}) {
    if (variant === 'boxed') {
        return (
            <section
                className={cn(
                    'overflow-hidden rounded-surface border border-border-strong bg-card',
                    fill && 'flex min-h-0 min-w-0 flex-col',
                    className,
                )}
            >
                <PaneHeader variant="panel" title={title} meta={meta} actions={actions} />
                <div className={cn(!flush && 'p-(--density-panel-pad)', fill && 'min-h-0 flex-1 overflow-auto')}>{children}</div>
            </section>
        )
    }
    return (
        <section className={cn('flex flex-col gap-(--density-section-gap)', className)}>
            <PaneHeader title={title} meta={meta} actions={actions} inset={false} />
            <div>{children}</div>
        </section>
    )
}

/** A bordered surface with no heading of its own, for content that is a surface: a graph, a list. */
export function Surface({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('overflow-hidden rounded-surface border border-border-strong bg-card', className)}>{children}</div>
}
