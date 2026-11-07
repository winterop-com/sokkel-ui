import { Fragment, type ReactNode } from 'react'

import { cn } from '../lib/cn'

/**
 * Small facts about a thing on one line, joined by a separator: an artist and a year, a count of
 * views and an age. An item that is undefined, null, false or empty is left out, so an optional
 * fact needs no condition around it. The line is quiet and small by default; `size="sm"` writes it
 * at the text size, `tone="strong"` in the foreground and medium weight, and `truncate` keeps it
 * to one line with an ellipsis. `inline` puts it inside a line another component draws, such as a
 * card's subtitle, taking that line's size and color.
 */
export function MetaLine({
    items,
    separator = '·',
    size = 'xs',
    tone = 'muted',
    truncate = false,
    inline = false,
    className,
}: {
    items: readonly ReactNode[]
    separator?: ReactNode
    size?: 'xs' | 'sm'
    tone?: 'muted' | 'strong'
    truncate?: boolean
    inline?: boolean
    className?: string
}) {
    const shown = items.filter((item) => item !== undefined && item !== null && item !== false && item !== '')
    return (
        <span
            className={cn(
                !inline && [
                    'block min-w-0',
                    size === 'xs' ? 'text-xs' : 'text-sm',
                    tone === 'muted' ? 'text-muted-foreground' : 'font-medium text-foreground',
                ],
                truncate && 'block truncate',
                className,
            )}
        >
            {shown.map((item, index) => (
                <Fragment key={index}>
                    {index > 0 && (
                        <>
                            {' '}
                            <span aria-hidden>{separator}</span>{' '}
                        </>
                    )}
                    {item}
                </Fragment>
            ))}
        </span>
    )
}
