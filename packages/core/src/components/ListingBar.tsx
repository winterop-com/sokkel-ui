import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

export interface ListingBarProps {
    /** The search field, first in the bar: a fixed width beside the end, and the whole width of a narrow bar. */
    search?: ReactNode
    /**
     * What narrows the listing, such as filters. With a `search` they take a line of their own under
     * it and wrap from the left edge; without one they sit before the end, and under it on a narrow bar.
     */
    toolbar?: ReactNode
    /** How many there are, in the count's face, at the start of the end. None while nothing is said. */
    count?: ReactNode
    /** The rest of the end, after the count: a sort, a view switch, a menu of columns. */
    end?: ReactNode
    /** Drawn in place of the search and the tools, such as the bar of a selection. */
    selection?: ReactNode
    className?: string
}

/**
 * The bar over a listing, as `DataTable` draws its own: the search and the count on the first line,
 * the tools on a line of their own under them, wrapping from the left edge. For a page that narrows
 * several tables, or a listing that is not a table, with one search.
 */
export function ListingBar({ search, toolbar, count, end, selection, className }: ListingBarProps) {
    return (
        <div
            data-slot="listing-bar"
            className={cn('@container/bar shrink-0 border-b border-border px-(--density-panel-pad) text-sm', className)}
        >
            <div className="flex min-h-(--density-panel-head) min-w-0 flex-wrap items-center gap-2 gap-y-1.5 py-2">
                {selection ?? (
                    <>
                        {search !== undefined && <div className="w-64 min-w-0 shrink @max-md/bar:w-full">{search}</div>}
                        {/* The tools wrap onto more lines when the bar is too narrow for them, so none is hidden. */}
                        {toolbar !== undefined && (
                            <div
                                className={cn(
                                    'flex min-w-0 flex-wrap items-center gap-2',
                                    search === undefined ? 'flex-1 @max-md/bar:order-last @max-md/bar:basis-full' : 'order-last basis-full',
                                )}
                            >
                                {toolbar}
                            </div>
                        )}
                    </>
                )}
                <div className="ml-auto flex shrink-0 items-center gap-2">
                    {count !== undefined && count !== null && (
                        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{count}</span>
                    )}
                    {end}
                </div>
            </div>
        </div>
    )
}
