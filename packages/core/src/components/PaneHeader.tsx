import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

const GROUND = {
    panel: 'border-border-strong bg-panel-ground',
    plain: 'border-border',
} as const

const TITLE = {
    panel: 'truncate text-head',
    plain: 'truncate text-section-title',
    large: 'text-detail-title text-pretty break-words',
} as const

/**
 * The strip across the top of a pane, with a rule under it: the pane's title, controls before it
 * such as a back button, and actions at its right end. A pane of tools alone leaves the title out.
 *
 * `panel`, the head of a boxed section, sits on the panel ground over a strong rule and sets its
 * title like a table's column heads; `plain` sits on the pane's own ground. `size="lg"` is the head
 * of one thing's detail: its code over a larger title that wraps, with `children` (chips, labels)
 * on a line under it. `inset={false}` drops the side padding, for a head on the page's own edge.
 */
export function PaneHeader({
    title,
    as: Heading = 'h2',
    meta,
    code,
    start,
    actions,
    children,
    variant = 'plain',
    size = 'md',
    inset = true,
    className,
}: {
    title?: ReactNode
    /** The heading's level in the page's outline. */
    as?: 'h1' | 'h2' | 'h3' | 'p'
    /** A count or a short fact beside the title, drawn quieter than it. */
    meta?: ReactNode
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
}) {
    const large = size === 'lg'
    const titled = title !== undefined || code !== undefined || children !== undefined
    return (
        <header
            className={cn(
                'flex min-h-(--density-panel-head) shrink-0 items-center gap-2 border-b',
                GROUND[variant],
                inset && (large ? 'px-4' : 'px-(--density-panel-pad)'),
                large && 'items-start py-3',
                className,
            )}
        >
            {start !== undefined && <div className="flex shrink-0 items-center gap-0.5">{start}</div>}
            {titled && (
                <div className={cn('flex min-w-0 flex-1 flex-col', large && 'gap-2')}>
                    {code !== undefined && <span className="truncate font-mono text-xs text-muted-foreground">{code}</span>}
                    {title !== undefined && (
                        <div className="flex min-w-0 items-center gap-2">
                            <Heading className={TITLE[large ? 'large' : variant]}>{title}</Heading>
                            {meta !== undefined && <span className="shrink-0 font-mono text-xs text-muted-foreground">{meta}</span>}
                        </div>
                    )}
                    {children !== undefined && <div className="flex flex-wrap items-center gap-1.5">{children}</div>}
                </div>
            )}
            {actions !== undefined && <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div>}
        </header>
    )
}
