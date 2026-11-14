import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

const GROUND = {
    panel: 'border-section-head-line bg-section-head-ground',
    plain: 'border-border',
} as const

// Every title is set in the heading face and the section heads' ink, which a theme may change.
const TITLE = {
    panel: 'truncate font-heading text-head text-section-head-ink',
    plain: 'truncate font-heading text-section-title text-section-head-ink',
    large: 'font-heading text-detail-title text-pretty break-words text-section-head-ink',
} as const

export interface PaneHeaderProps {
    title?: ReactNode
    /** The heading's level in the page's outline. */
    as?: 'h1' | 'h2' | 'h3' | 'p'
    /** The heading's id, for what it names to point at with `aria-labelledby`. */
    headingId?: string
    /** A count or a short fact beside the title, drawn quieter than it, as a page header's count is: the body face, tabular figures. */
    meta?: ReactNode
    /** A sentence under the title: what the pane holds. */
    description?: ReactNode
    /** An addressable code over the title, in the code face. */
    code?: ReactNode
    /** Controls before the title, such as a back button or a pane's own tools. */
    start?: ReactNode
    /** Controls at the right end. */
    actions?: ReactNode
    /** A line under the title, such as chips or labels. */
    children?: ReactNode
    variant?: keyof typeof GROUND
    size?: 'md' | 'lg'
    /** Whether the strip pads its sides. */
    inset?: boolean
    className?: string
}

/**
 * The strip across the top of a pane, with a rule under it: the pane's title, controls before it
 * such as a back button, and actions at its right end. A pane of tools alone leaves the title out.
 *
 * `panel`, the head of a boxed section, sits on the section heads' ground over their rule and sets its
 * title like a table's column heads; `plain` sits on the pane's own ground. `size="lg"` is the head
 * of one thing's detail: its code over a larger title that wraps, with `children` (chips, labels)
 * on a line under it. `inset={false}` drops the side padding, for a head on the page's own edge.
 * `description` is a sentence under the title saying what the pane holds; the strip grows to hold it.
 * A `meta` too long to stand beside the title on a narrow head goes under it, so it never runs
 * into the actions, and actions too wide to leave the title its room go under the title, as on a phone,
 * wrapping onto more lines when they are wider than the strip itself.
 */
export function PaneHeader({
    title,
    as: Heading = 'h2',
    headingId,
    meta,
    description,
    code,
    start,
    actions,
    children,
    variant = 'plain',
    size = 'md',
    inset = true,
    className,
}: PaneHeaderProps) {
    const large = size === 'lg'
    const titled = title !== undefined || code !== undefined || children !== undefined
    const described = description !== undefined
    return (
        <header
            className={cn(
                'flex min-h-(--density-panel-head) shrink-0 flex-wrap items-center gap-2 border-b',
                GROUND[variant],
                inset && (large ? 'px-4' : 'px-(--density-panel-pad)'),
                large && 'items-start py-3',
                described && !large && 'items-start py-2',
                className,
            )}
        >
            {start !== undefined && <div className="flex shrink-0 items-center gap-0.5">{start}</div>}
            {titled && (
                // The actions stay beside the title while it has 10rem or its own width, and go under it otherwise.
                <div className={cn('flex max-w-max min-w-0 grow basis-40 flex-col', large && 'gap-2', !large && !described && 'py-1')}>
                    {code !== undefined && <span className="truncate font-mono text-xs text-muted-foreground">{code}</span>}
                    {title !== undefined && (
                        // The meta stays beside the title while both fit with the title at 6rem or its
                        // own width, and drops under it otherwise, cut short where it is wider still.
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2">
                            <Heading id={headingId} className={cn('max-w-max min-w-0 grow basis-24', TITLE[large ? 'large' : variant])}>
                                {title}
                            </Heading>
                            {meta !== undefined && (
                                <span className="min-w-0 truncate text-help text-muted-foreground tabular-nums">{meta}</span>
                            )}
                        </div>
                    )}
                    {described && <p className="text-help text-pretty text-muted-foreground">{description}</p>}
                    {children !== undefined && <div className="flex flex-wrap items-center gap-1.5">{children}</div>}
                </div>
            )}
            {/* Actions wider than the whole strip wrap onto lines of their own, from the end, rather than run past its edge. */}
            {actions !== undefined && (
                <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1">{actions}</div>
            )}
        </header>
    )
}
