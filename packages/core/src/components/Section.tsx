import { TriangleAlert } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { PaneHeader } from './PaneHeader'

/** How a section's body or edge reads: plain, a graph's dot grid, or something gone wrong. */
export type SectionTone = 'plain' | 'graph' | 'critical'

// The graph canvas's ground and its dots, on the canvas's 18px grid.
const GRAPH = 'bg-canvas bg-[radial-gradient(circle,var(--panel-dot)_1px,transparent_1px)] bg-[length:18px_18px] bg-center'

export interface SectionProps {
    title: ReactNode
    /** A count or a short fact beside the title, drawn quieter than it. */
    meta?: ReactNode
    /** A sentence under the title: what this part of the page holds. */
    description?: ReactNode
    /** Controls at the right end of the heading. */
    actions?: ReactNode
    variant?: 'flat' | 'boxed'
    /**
     * `graph` draws the body on a graph canvas's dot grid, for a drawing with no ground of its own;
     * `critical` draws a rule in the critical tone across the top and a warning mark before the title.
     */
    tone?: SectionTone
    /** The heading's id; the section is labelled by its heading either way. */
    headingId?: string
    /** Content that fills the box to its edges, such as a list or a graph, takes no padding. */
    flush?: boolean
    /** The box takes the height its container gives it and its body scrolls within it, as an editor or a preview pane wants. */
    fill?: boolean
    children: ReactNode
    className?: string
    /** Classes for the body, for laying out its content. */
    bodyClassName?: string
}

/**
 * A titled part of a page.
 *
 * `boxed`, the default, is a bordered surface whose head is a bar of its own, its title set like a table's
 * column heads but in the text color, so every box's head reads alike. `flat` is a heading
 * over a rule with the content on the page's own ground, for the rare page that wants it. Either takes actions at the right end of its
 * heading, a count or a fact beside the title, and a `description` under it saying what the part holds.
 * The box's line and ground are a framed DataTable's and a card's, and its head is as tall as a listing's
 * head row, so they sit together in every theme. A `tone` draws the body as a graph's canvas or marks the
 * section critical. The section is labelled by its heading.
 */
export function Section({
    title,
    meta,
    description,
    actions,
    variant = 'boxed',
    tone = 'plain',
    headingId: givenId,
    flush = false,
    fill = false,
    children,
    className,
    bodyClassName,
}: SectionProps) {
    const ownId = useId()
    const headingId = givenId ?? ownId
    const critical = tone === 'critical'
    const mark = critical ? <TriangleAlert aria-hidden className="size-4 shrink-0 text-critical" /> : undefined
    const toned = tone === 'plain' ? undefined : tone
    if (variant === 'boxed') {
        return (
            <section
                aria-labelledby={headingId}
                data-tone={toned}
                className={cn(
                    'overflow-hidden rounded-surface border border-border-strong bg-card',
                    critical && 'border-t-2 border-t-critical',
                    fill && 'flex min-h-0 min-w-0 flex-col',
                    className,
                )}
            >
                <PaneHeader
                    variant="panel"
                    title={title}
                    headingId={headingId}
                    start={mark}
                    meta={meta}
                    description={description}
                    actions={actions}
                />
                <div
                    className={cn(
                        !flush && 'p-(--density-panel-pad)',
                        tone === 'graph' && GRAPH,
                        fill && 'min-h-0 flex-1 overflow-auto',
                        bodyClassName,
                    )}
                >
                    {children}
                </div>
            </section>
        )
    }
    return (
        <section aria-labelledby={headingId} data-tone={toned} className={cn('flex flex-col gap-(--density-section-gap)', className)}>
            <PaneHeader
                title={title}
                headingId={headingId}
                start={mark}
                meta={meta}
                description={description}
                actions={actions}
                inset={false}
                className={critical ? 'border-critical' : undefined}
            />
            <div className={cn(tone === 'graph' && ['rounded-surface', GRAPH], bodyClassName)}>{children}</div>
        </section>
    )
}

export interface SurfaceProps {
    children: ReactNode
    className?: string
}

/** A bordered surface with no heading of its own, for content that is a surface: a graph, a list. */
export function Surface({ children, className }: SurfaceProps) {
    return <div className={cn('overflow-hidden rounded-surface border border-border-strong bg-card', className)}>{children}</div>
}
