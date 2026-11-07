import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/** One fact: what it is called, its value, and whether the value is a code to draw in mono. */
export interface Description {
    term: ReactNode
    value: ReactNode
    code?: boolean
    /** Spans the full width in a two-column list. */
    wide?: boolean
}

/**
 * Facts about one thing as terms and values: a run's state and duration, a service's base
 * URL. A value that is missing is drawn as a quiet dash, never as a blank. `columns={2}` sets the
 * pairs two to a row on wide screens; `stacked` puts each term above its value.
 */
export function DescriptionList({
    items,
    columns = 1,
    stacked = false,
    termWidth = '6rem',
    className,
}: {
    items: readonly Description[]
    columns?: 1 | 2
    stacked?: boolean
    /** How wide the term column is in the side-by-side layout. */
    termWidth?: string
    className?: string
}) {
    return (
        <dl
            className={cn('grid gap-x-6 gap-y-2 text-sm leading-5', columns === 2 && 'md:grid-cols-2', className)}
            style={{ '--term-width': termWidth } as React.CSSProperties}
        >
            {items.map((item, index) => {
                const empty = item.value === null || item.value === undefined || item.value === ''
                return (
                    <div
                        key={index}
                        className={cn(
                            'min-w-0',
                            stacked ? 'flex flex-col gap-0.5' : 'grid grid-cols-[var(--term-width)_minmax(0,1fr)] items-baseline gap-3',
                            item.wide === true && 'md:col-span-full',
                        )}
                    >
                        <dt className="text-xs leading-5 text-muted-foreground">{item.term}</dt>
                        <dd className={cn('min-w-0 break-words', item.code === true && !empty && 'font-mono', empty && 'text-faint')}>
                            {empty ? '-' : item.value}
                        </dd>
                    </div>
                )
            })}
        </dl>
    )
}
