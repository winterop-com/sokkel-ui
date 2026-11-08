import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Button } from './ui/button'

export interface SelectionBarWords {
    /** How many are selected. */
    selected: (count: number) => string
    /** The button that empties the selection. */
    clear: string
    /** The bar's accessible name. */
    label: string
}

export const SELECTION_BAR_WORDS: SelectionBarWords = {
    selected: (count) => `${count.toLocaleString('en-US')} selected`,
    clear: 'Clear',
    label: 'Selection',
}

export interface SelectionBarProps {
    count: number
    /** Empties the selection; no Clear button without it. */
    onClear?: () => void
    /** Something to say or offer right after the count. */
    offer?: ReactNode
    /** The actions on the selection, after the Clear button. */
    children?: ReactNode
    framed?: boolean
    size?: 'default' | 'sm'
    words?: Partial<SelectionBarWords>
    className?: string
}

/**
 * What is selected and what can be done with it: the count, an optional `offer` after it (such as
 * selecting every row on every page), a Clear button when `onClear` is given, and the actions as
 * `children`. It fills the row it is put in, and its actions scroll sideways when the row is too
 * narrow for them. `framed` draws it as a bar of its own, tinted and edged, for a selection over a
 * list that has no bar of its own, and its actions then wrap instead; `size="sm"` writes the count
 * small and quiet, for a compact toolbar.
 */
export function SelectionBar({
    count,
    onClear,
    offer,
    children,
    framed = false,
    size = 'default',
    words: given,
    className,
}: SelectionBarProps) {
    const words = { ...SELECTION_BAR_WORDS, ...given }
    return (
        <div
            role="group"
            aria-label={words.label}
            className={cn(
                'flex min-w-0 flex-1 items-center gap-2 text-sm',
                framed
                    ? 'flex-wrap gap-y-1 rounded-control border border-primary/40 bg-primary/8 py-0.5 pr-1 pl-3'
                    : '[scrollbar-width:none] overflow-x-auto',
                className,
            )}
        >
            <span
                className={cn('shrink-0 whitespace-nowrap tabular-nums', size === 'sm' ? 'text-xs text-muted-foreground' : 'font-medium')}
            >
                {words.selected(count)}
            </span>
            {offer}
            {onClear !== undefined && (
                <Button variant="ghost" size="xs" onClick={onClear}>
                    {words.clear}
                </Button>
            )}
            {children}
        </div>
    )
}
