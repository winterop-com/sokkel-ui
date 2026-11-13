import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

export interface GroupLabelProps {
    as?: 'p' | 'h2' | 'h3' | 'h4' | 'span' | 'div'
    id?: string
    children: ReactNode
    className?: string
}

/**
 * The small heading over a group of entries: a rail's group, a panel's section, a palette's kind,
 * a table's run of rows. One look for all of them, so a theme or a change reaches every group.
 */
export function GroupLabel({ as: Tag = 'p', id, children, className }: GroupLabelProps) {
    return (
        <Tag id={id} className={cn('text-xs font-medium tracking-wide text-faint uppercase', className)}>
            {children}
        </Tag>
    )
}
