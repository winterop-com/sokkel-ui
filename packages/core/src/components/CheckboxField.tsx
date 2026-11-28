'use client'

import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import type { KindColor } from '../lib/kind'
import { PlainCheckbox } from './ui/checkbox-look'

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
    /** A dot in a kind color before the label, as a calendar's toggle wears its calendar's color. */
    dot?: KindColor
    /**
     * Which state sets the label quiet: `unchecked` for a toggle whose thing is hidden while off (a
     * calendar), `checked` for a step that is done, its label also struck through.
     */
    quiet?: 'checked' | 'unchecked'
    className?: string
}

/**
 * A checkbox with its label beside it and, where the label alone does not say enough, a line
 * under it. The whole row is the label, so a press anywhere on it ticks the box. `critical` frames
 * the row in the critical tone, for an acknowledgement a destructive step waits on.
 *
 * `dot` draws a dot in a kind color before the label, for a list of toggles that each stand for a
 * colored thing, such as the calendars a calendar shows. `quiet` sets the label in the muted ink in
 * one state: while unticked for such a toggle, or while ticked, struck through, for a checklist's
 * step that is done.
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
    dot,
    quiet,
    className,
}: CheckboxFieldProps) {
    const [own, setOwn] = useState(defaultChecked ?? false)
    const ticked = checked ?? own
    const hushed = quiet !== undefined && ticked === (quiet === 'checked')
    return (
        <label
            className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-control px-2 py-1.5 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-disabled',
                tone === 'critical' ? 'border border-critical/30 bg-critical/4 px-3 py-2.5' : 'hover:bg-hover',
                className,
            )}
        >
            <PlainCheckbox
                checked={ticked}
                onCheckedChange={(next) => {
                    setOwn(next)
                    onCheckedChange?.(next)
                }}
                indeterminate={indeterminate}
                disabled={disabled}
                className="mt-0.5 disabled:opacity-100"
            />
            <span className="flex min-w-0 flex-col">
                <span className={cn('leading-5', hushed && 'text-muted-foreground', hushed && quiet === 'checked' && 'line-through')}>
                    {dot !== undefined && (
                        <span
                            className="me-2 inline-block size-2.5 rounded-full align-middle"
                            style={{ background: `var(--kind-${dot})` }}
                            aria-hidden
                        />
                    )}
                    {label}
                </span>
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
