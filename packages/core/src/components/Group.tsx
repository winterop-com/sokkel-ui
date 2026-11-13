import { useId, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Count, type CountTone } from './Count'
import { GroupLabel } from './GroupLabel'

export interface GroupProps {
    title: ReactNode
    /** How many entries the group holds, beside the title; none is drawn for zero. */
    count?: number
    /** `quiet`, the default, for how many there are; `critical` for a group of what is wrong. */
    countTone?: CountTone
    /** Says the count to a screen reader, as "3 failed" rather than a bare number. */
    countLabel?: (count: number) => string
    /** Small controls at the right end of the title's line, such as an icon button to add one. */
    actions?: ReactNode
    /** The title's element: the heading level that fits the page around it. */
    as?: 'h2' | 'h3' | 'h4'
    /** The heading's id; the group is labelled by its heading either way. */
    headingId?: string
    children: ReactNode
    className?: string
    /** Classes for the body, for laying out its content. */
    bodyClassName?: string
}

/**
 * A run of entries under a small title inside a panel or an inspector: a run's steps, a job's
 * inputs, the failed checks. The title is drawn as a `GroupLabel`, with a quiet count of what the
 * group holds beside it (none for zero) and small actions at the line's right end. It draws no box
 * and no rule, so groups stack inside a `Section` or a sheet; a part of a page with a heading bar of
 * its own is a `Section`. The group is labelled by its title.
 */
export function Group({
    title,
    count,
    countTone = 'quiet',
    countLabel,
    actions,
    as = 'h3',
    headingId: givenId,
    children,
    className,
    bodyClassName,
}: GroupProps) {
    const ownId = useId()
    const headingId = givenId ?? ownId
    const counted = count !== undefined && count > 0
    return (
        <section aria-labelledby={headingId} className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <div className={cn('flex min-w-0 items-center gap-1.5', actions !== undefined && 'min-h-6')}>
                <GroupLabel as={as} id={headingId} className="min-w-0 truncate">
                    {title}
                </GroupLabel>
                {counted && <Count value={count} size="sm" tone={countTone} label={countLabel?.(count)} className="shrink-0" />}
                {actions !== undefined && <div className="ml-auto flex shrink-0 items-center gap-0.5">{actions}</div>}
            </div>
            <div className={cn('min-w-0', bodyClassName)}>{children}</div>
        </section>
    )
}
