import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'

/** One choice in a choice list. */
export interface Choice<T extends string> {
    value: T
    /** The choice's name, or a richer row such as a person. */
    label: ReactNode
    /** A line under the label: what choosing it means. */
    description?: ReactNode
}

export interface ChoiceListProps<T extends string> {
    options: readonly Choice<T>[]
    value: T
    onValueChange: (value: T) => void
    /** The list's accessible name, where no visible heading names it. */
    label?: string
    /** The id of a visible heading that names the list. */
    labelledBy?: string
    className?: string
}

/**
 * Pick one of a few choices, each a row with its radio, its name and a line saying what it means.
 * The whole row is pressable and the chosen one is filled, so the choice reads at a glance where a
 * bare radio would be easy to miss.
 */
export function ChoiceList<T extends string>({ options, value, onValueChange, label, labelledBy, className }: ChoiceListProps<T>) {
    return (
        <RadioGroup
            value={value}
            onValueChange={(next) => onValueChange(next as T)}
            aria-label={label}
            aria-labelledby={labelledBy}
            className={cn('gap-0.5', className)}
        >
            {options.map((choice) => (
                <label
                    key={choice.value}
                    className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-2 text-sm hover:bg-hover',
                        choice.value === value && 'bg-secondary hover:bg-secondary',
                    )}
                >
                    <RadioGroupItem value={choice.value} className={cn(choice.description !== undefined && 'mt-0.5 self-start')} />
                    <span className="flex min-w-0 flex-1 flex-col">
                        <span className={cn(typeof choice.label === 'string' && 'font-medium')}>{choice.label}</span>
                        {choice.description !== undefined && <span className="text-xs text-muted-foreground">{choice.description}</span>}
                    </span>
                </label>
            ))}
        </RadioGroup>
    )
}
