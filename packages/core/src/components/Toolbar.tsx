import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/**
 * The row of tools above a page's or a pane's content: a search, filters, a `Segmented`, a sort,
 * a count. `search` comes first and takes the row's whole width when the row is narrow; `children`
 * follow in order; `end` stands at the row's right end. When the row runs out of room its tools
 * wrap onto more lines rather than overflow, so none is hidden on a phone.
 *
 * `variant="pane"` makes it a strip across the top of a pane, padded with a rule under it; on a
 * page it sits in the page's flow.
 */
export function Toolbar({
    search,
    children,
    end,
    variant = 'page',
    className,
}: {
    /** The search field, sized by the toolbar. */
    search?: ReactNode
    /** The tools after the search, in order. */
    children?: ReactNode
    /** Tools at the end of the row, such as a count, a sort or a view switch. */
    end?: ReactNode
    variant?: 'page' | 'pane'
    className?: string
}) {
    return (
        <div
            className={cn(
                '@container/toolbar min-w-0',
                variant === 'pane' && 'shrink-0 border-b border-border px-(--density-panel-pad) py-2',
                className,
            )}
        >
            <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                {search !== undefined && <div className="w-full @md/toolbar:w-64">{search}</div>}
                {children}
                {end !== undefined && <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">{end}</div>}
            </div>
        </div>
    )
}

/** The title a toolbar names its content by, such as the month a calendar shows; it takes the room the tools leave and truncates. */
export function ToolbarTitle({ as: Heading = 'h2', children }: { as?: 'h1' | 'h2' | 'h3'; children: ReactNode }) {
    return <Heading className="min-w-0 flex-1 truncate text-title font-semibold">{children}</Heading>
}
