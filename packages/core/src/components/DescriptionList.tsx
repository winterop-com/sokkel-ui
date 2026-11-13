import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'

import { cn } from '../lib/cn'

/** One fact: what it is called, its value, and whether the value is a code to draw in mono. */
export interface Description {
    term: ReactNode
    value: ReactNode
    code?: boolean
    /** A number, time or duration, its figures set at one width so values line up down the list. */
    numeric?: boolean
    /**
     * Takes the list's full width. In the side layout its value goes under its term, for a value too
     * long to sit beside it (a JSON body, a rule); in a two-column stacked list it spans both columns.
     */
    wide?: boolean
}

export interface DescriptionListProps {
    items: readonly Description[]
    columns?: 1 | 2
    layout?: 'side' | 'stacked' | 'row'
    /**
     * How wide the term column is in the side-by-side layout: a CSS length, or `auto` for as wide
     * as the longest term in the list (up to two fifths of it), so every value starts at one line.
     */
    termWidth?: string
    /** `sm` sets the values at the size of help text with tighter gaps, for a narrow inspector. */
    size?: 'default' | 'sm'
    className?: string
}

/**
 * Facts about one thing as terms and values: a run's state and duration, a service's base
 * URL. A value that is missing is drawn as a quiet dash, never as a blank. `layout` sets the pairs:
 * `side` (the default) puts each term in a column beside its value, `stacked` each term above its
 * value, and `row` the pairs one after another in a line that wraps, for a strip of facts under a
 * title. `columns={2}` sets the side and stacked pairs two to a row on wide screens. In the side
 * layout every pair shares the list's term column, so `termWidth="auto"` lines the values up at the
 * longest term, and a `wide` pair puts its value under its term across the full width. `size="sm"`
 * fits a narrow inspector. A value edited in place with `InlineEdit` lines its text up with the
 * plain values, its box reaching into the gap.
 */
export function DescriptionList({
    items,
    columns = 1,
    layout = 'side',
    termWidth = '6rem',
    size = 'default',
    className,
}: DescriptionListProps) {
    const small = size === 'sm'
    const side = layout === 'side'
    const pairGap = small ? 'gap-x-2' : 'gap-x-3'
    // In a group, a one-column side list is a subgrid of the group's tracks and takes its term column.
    const grouped = useContext(GroupContext) && side && columns === 1
    return (
        <dl
            data-size={size}
            data-grouped={grouped ? '' : undefined}
            className={cn(
                small ? 'text-xs leading-4' : 'text-sm leading-5',
                layout === 'row' && (small ? 'flex flex-wrap gap-x-4 gap-y-0.5' : 'flex flex-wrap gap-x-5 gap-y-1'),
                layout !== 'row' && (small ? 'grid gap-y-1' : 'grid gap-y-2'),
                layout === 'stacked' && (small ? 'gap-x-4' : 'gap-x-6'),
                layout === 'stacked' && columns === 2 && 'md:grid-cols-2',
                // The pairs are subgrids of these tracks, so every term in the list shares one column.
                side && [grouped ? 'col-span-full grid-cols-subgrid' : 'grid-cols-[var(--term-width)_minmax(0,1fr)]', pairGap],
                side &&
                    columns === 2 && [
                        'md:grid-cols-[var(--term-width)_minmax(0,1fr)_var(--term-width)_minmax(0,1fr)]',
                        small ? 'md:gap-x-4' : 'md:gap-x-6',
                    ],
                className,
            )}
            style={
                side && !grouped ? ({ '--term-width': termWidth === 'auto' ? 'fit-content(40%)' : termWidth } as CSSProperties) : undefined
            }
        >
            {items.map((item, index) => {
                const empty = item.value === null || item.value === undefined || item.value === ''
                const wide = item.wide === true
                return (
                    <div
                        key={index}
                        className={cn(
                            'min-w-0',
                            (layout === 'stacked' || (side && wide)) && 'flex flex-col gap-0.5',
                            side && (wide ? 'col-span-full' : ['col-span-2 grid grid-cols-subgrid items-baseline', pairGap]),
                            layout === 'row' && 'flex items-baseline gap-1.5',
                            layout === 'stacked' && wide && 'md:col-span-full',
                        )}
                    >
                        <dt className={cn('min-w-0 text-xs text-muted-foreground', small ? 'leading-4' : 'leading-5')}>{item.term}</dt>
                        <dd
                            className={cn(
                                'min-w-0 break-words',
                                // An `InlineEdit`'s box reaches into the gap before it, so its text starts where a plain value's does.
                                layout !== 'row' &&
                                    '[&>[data-slot^=inline-edit]]:-ml-[calc(--spacing(2.5)+1px)] [&>[data-slot^=inline-edit]]:w-[calc(100%+--spacing(2.5)+1px)]',
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

/** Whether a list is inside a `DescriptionListGroup`, whose term column it takes. */
const GroupContext = createContext(false)

export interface DescriptionListGroupProps {
    /** The lists and whatever sits between them, such as a form or a heading. */
    children: ReactNode
    /** How wide the shared term column is: a CSS length, or `auto` for as wide as the longest term in any of the lists (up to two fifths). */
    termWidth?: string
    /** `sm` sets the gap between terms and values as a list of `size="sm"` does. */
    size?: 'default' | 'sm'
    className?: string
}

/**
 * Lists of facts that share one term column across what sits between them: the facts of a thing
 * split around a form or a heading, every value starting at one line. Each one-column side-by-side
 * `DescriptionList` inside takes the group's column, so `termWidth="auto"` sizes it to the longest
 * term of them all; anything else inside takes the group's full width.
 */
export function DescriptionListGroup({ children, termWidth = '6rem', size = 'default', className }: DescriptionListGroupProps) {
    return (
        <GroupContext value={true}>
            <div
                data-slot="description-list-group"
                className={cn(
                    'grid grid-cols-[var(--term-width)_minmax(0,1fr)] gap-y-4 *:col-span-full',
                    size === 'sm' ? 'gap-x-2' : 'gap-x-3',
                    className,
                )}
                style={{ '--term-width': termWidth === 'auto' ? 'fit-content(40%)' : termWidth } as CSSProperties}
            >
                {children}
            </div>
        </GroupContext>
    )
}
