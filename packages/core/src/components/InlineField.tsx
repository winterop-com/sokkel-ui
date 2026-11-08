import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

export interface InlineFieldProps {
    /** The control's id, which the label names. */
    id: string
    label: ReactNode
    size?: 'default' | 'sm'
    /** The control, taking `id` itself. */
    children: ReactNode
    className?: string
}

/**
 * A label and its control on one row: the label quiet at the start, never shrinking or wrapping,
 * and the control taking the rest of the row. The whole row is the label, so a click anywhere on
 * it reaches the control.
 *
 * By default it is a row of a form divided by rules, such as a message being written, matching
 * `AddressInput`'s To and Cc rows: a bare `Input` in it takes their height and padding. `size="sm"`
 * sets the label in small text beside a small control, such as a select in a section's head.
 */
export function InlineField({ id, label, size = 'default', children, className }: InlineFieldProps) {
    return (
        <label
            htmlFor={id}
            data-slot="inline-field"
            className={cn(
                'flex min-w-0 items-center',
                size === 'default' ? 'min-h-(--density-control) py-1 text-sm' : 'gap-2 text-xs',
                className,
            )}
        >
            <span className={cn('shrink-0 whitespace-nowrap text-muted-foreground', size === 'default' && 'pr-1.5 pl-1')}>{label}</span>
            <span
                className={cn('flex min-w-0 flex-1 items-center', size === 'default' && '*:data-[slot=input]:h-6 *:data-[slot=input]:px-1')}
            >
                {children}
            </span>
        </label>
    )
}
