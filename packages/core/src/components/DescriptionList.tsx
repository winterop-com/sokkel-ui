import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/** One fact: what it is called, its value, and whether the value is a code to draw in mono. */
export interface Description {
    term: ReactNode
    value: ReactNode
    code?: boolean
    /** A number, time or duration, its figures set at one width so values line up down the list. */
    numeric?: boolean
    /** Spans the full width in a two-column list. */
    wide?: boolean
}

/**
 * Facts about one thing as terms and values: a run's state and duration, a service's base
 * URL. A value that is missing is drawn as a quiet dash, never as a blank. `layout` sets the pairs:
 * `side` (the default) puts each term in a column beside its value, `stacked` each term above its
 * value, and `row` the pairs one after another in a line that wraps, for a strip of facts under a
 * title. `columns={2}` sets the side and stacked pairs two to a row on wide screens.
 */
export function DescriptionList({
    items,
    columns = 1,
    layout = 'side',
    termWidth = '6rem',
    className,
}: {
    items: readonly Description[]
    columns?: 1 | 2
    layout?: 'side' | 'stacked' | 'row'
    /** How wide the term column is in the side-by-side layout. */
    termWidth?: string
    className?: string
}) {
    return (
        <dl
            className={cn(
                'text-sm leading-5',
                layout === 'row' ? 'flex flex-wrap gap-x-5 gap-y-1' : 'grid gap-x-6 gap-y-2',
                layout !== 'row' && columns === 2 && 'md:grid-cols-2',
                className,
            )}
            style={{ '--term-width': termWidth } as React.CSSProperties}
        >
            {items.map((item, index) => {
                const empty = item.value === null || item.value === undefined || item.value === ''
                return (
                    <div
                        key={index}
                        className={cn(
                            'min-w-0',
                            layout === 'stacked' && 'flex flex-col gap-0.5',
                            layout === 'side' && 'grid grid-cols-[var(--term-width)_minmax(0,1fr)] items-baseline gap-3',
                            layout === 'row' && 'flex items-baseline gap-1.5',
                            layout !== 'row' && item.wide === true && 'md:col-span-full',
                        )}
                    >
                        <dt className="text-xs leading-5 text-muted-foreground">{item.term}</dt>
                        <dd
                            className={cn(
                                'min-w-0 break-words',
                                item.code === true && !empty && 'font-mono',
                                item.numeric === true && 'tabular-nums',
                                empty && 'text-faint',
                            )}
                        >
                            {empty ? '-' : item.value}
                        </dd>
                    </div>
                )
            })}
        </dl>
    )
}
