import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Checkbox } from './ui/checkbox'

export interface CheckboxFieldProps {
    label: ReactNode
    /** A line under the label: what ticking it means. */
    description?: ReactNode
    checked?: boolean
    defaultChecked?: boolean
    onCheckedChange?: (checked: boolean) => void
    /** Some but not all of what it stands for is ticked. */
    indeterminate?: boolean
    disabled?: boolean
    tone?: 'plain' | 'critical'
    className?: string
}

/**
 * A checkbox with its label beside it and, where the label alone does not say enough, a line
 * under it. The whole row is the label, so a press anywhere on it ticks the box. `critical` frames
 * the row in the critical tone, for an acknowledgement a destructive step waits on.
 */
export function CheckboxField({
    label,
    description,
    checked,
    defaultChecked,
    onCheckedChange,
    indeterminate,
    disabled,
    tone = 'plain',
    className,
}: CheckboxFieldProps) {
    return (
        <label
            className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-control px-2 py-1.5 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-60',
                tone === 'critical' ? 'border border-critical/30 bg-critical/4 px-3 py-2.5' : 'hover:bg-hover',
                className,
            )}
        >
            <Checkbox
                checked={checked}
                defaultChecked={defaultChecked}
                onCheckedChange={onCheckedChange}
                indeterminate={indeterminate}
                disabled={disabled}
                className="mt-0.5"
            />
            <span className="flex min-w-0 flex-col">
                <span className="leading-5">{label}</span>
                {description !== undefined && <span className="text-xs text-muted-foreground">{description}</span>}
            </span>
        </label>
    )
}

export interface CheckboxListProps {
    label: string
    children: ReactNode
    className?: string
}

/** A titled group of checkbox fields: the title names what the boxes choose among. */
export function CheckboxList({ label, children, className }: CheckboxListProps) {
    return (
        <fieldset className={cn('flex min-w-0 flex-col gap-0.5', className)}>
            <legend className="mb-1.5 text-sm font-medium">{label}</legend>
            {children}
        </fieldset>
    )
}
