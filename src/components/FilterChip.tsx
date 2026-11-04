import { ChevronDown, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/**
 * One filter in a toolbar: the facet it filters on, and what it is set to.
 *
 * Unset, it reads as an offer: the facet and a chevron, on the field's ground with a solid edge
 * and the ordinary ink, so it is plainly a control. Set, it says the value in the full ink on
 * the accent's wash, and carries a remove button. Pressing it opens whatever the app gives it
 * to choose with; this component draws the chip, not the menu.
 */
export function FilterChip({
    facet,
    value,
    onOpen,
    onClear,
    icon,
    className,
    words = { clear: (facet: string) => `Clear ${facet}` },
}: {
    facet: string
    /** What the filter is set to; unset when absent. */
    value?: ReactNode
    onOpen?: () => void
    onClear?: () => void
    icon?: ReactNode
    className?: string
    words?: { clear: (facet: string) => string }
}) {
    const set = value !== undefined && value !== null && value !== ''
    return (
        <span
            className={cn(
                'inline-flex h-(--density-control) items-stretch overflow-hidden rounded-control border text-sm',
                set ? 'border-primary/40 bg-accent text-foreground' : 'border-input bg-field text-foreground',
                className,
            )}
        >
            <button type="button" className="flex items-center gap-1.5 px-2.5 hover:bg-secondary/60" aria-haspopup="menu" onClick={onOpen}>
                {icon}
                <span className={set ? 'text-muted-foreground' : undefined}>{facet}</span>
                {set && <span className="font-medium">{value}</span>}
                {!set && <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />}
            </button>
            {set && onClear !== undefined && (
                <button
                    type="button"
                    aria-label={words.clear(facet)}
                    title={words.clear(facet)}
                    className="flex items-center border-l border-primary/30 px-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    onClick={onClear}
                >
                    <X className="size-3.5" aria-hidden />
                </button>
            )}
        </span>
    )
}
