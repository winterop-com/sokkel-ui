import { X } from 'lucide-react'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

import { cn } from '../lib/cn'

/**
 * A chip's tone: neutral, a semantic color drawn as a faint wash with its own ink, or `absent`, a
 * dashed edge around muted words for a value that is not there.
 */
export type ChipTone = 'neutral' | 'good' | 'critical' | 'warning' | 'info' | 'absent'

const TONE: Record<ChipTone, string> = {
    neutral: 'bg-faint/15 text-muted-foreground',
    good: 'bg-good/15 text-good-ink',
    critical: 'bg-critical/15 text-critical-ink',
    warning: 'bg-warning/15 text-warning-ink',
    info: 'bg-info/15 text-info-ink',
    absent: 'border-dashed border-border-strong text-muted-foreground',
}

const RING = 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid'

export interface ChipWords {
    /** The remove button's name and tooltip, or a function of the chip's words ("Remove harbor"). */
    remove: string | ((text: string) => string)
}

const WORDS: ChipWords = { remove: 'Remove' }

/** The chip's words as text, for a name that says them; empty when they are not plain text. */
function textOf(children: ReactNode): string {
    if (typeof children === 'string' || typeof children === 'number') return String(children)
    if (Array.isArray(children)) return children.map(textOf).join('')
    return ''
}

/** Keeps a press of a chip's button from also pressing a row or a card around the chip. */
function holdKeys(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
}

export interface ChipProps {
    children: ReactNode
    /** Neutral by default. */
    tone?: ChipTone
    /** The words in the code face, for an id, a tag or a key. */
    mono?: boolean
    /** Drawn before the words, at the chip's icon size. */
    icon?: ReactNode
    /** Said on hover: the whole value when the chip cuts it short, or what it means. */
    title?: string
    /**
     * Makes the chip a button, pressed to open or filter by what it says. The press stops there, so
     * a row or a card around the chip is not pressed too.
     */
    onSelect?: (event: MouseEvent<HTMLButtonElement>) => void
    /** The select button's name and tooltip, saying what a press does ("Filter by harbor"); the chip's words by default. */
    selectLabel?: string
    /** Gives the chip a remove button at its end, named by `words.remove`. The press stops there, as `onSelect`'s does. */
    onRemove?: (event: MouseEvent<HTMLButtonElement>) => void
    words?: Partial<ChipWords>
    className?: string
}

/**
 * A short value as a chip: a tag on a job, a state that has no run color, a value that is absent.
 * Its tone is neutral, a semantic color's wash with its own ink, or `absent`, dashed. `mono` sets
 * the words in the code face and `icon` goes before them. With `onSelect` the chip is a button,
 * named by `selectLabel` where a press does more than its words say; with `onRemove` it ends in a
 * remove button, its own stop in the tab order with its own focus ring. Neither press reaches a
 * row or card around the chip. A long value ends in an ellipsis inside the room it is given.
 */
export function Chip({
    children,
    tone = 'neutral',
    mono = false,
    icon,
    title,
    onSelect,
    selectLabel,
    onRemove,
    words: given,
    className,
}: ChipProps) {
    const words = { ...WORDS, ...given }
    const remove = typeof words.remove === 'function' ? words.remove(textOf(children)) : words.remove
    const face = (
        <>
            {icon}
            <span className="min-w-0 truncate">{children}</span>
        </>
    )
    return (
        <span
            data-slot="chip"
            title={title}
            className={cn(
                'inline-flex h-5 max-w-full min-w-0 shrink-0 items-center rounded-chip border border-transparent text-badge whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0',
                mono && 'font-mono',
                TONE[tone],
                className,
            )}
        >
            {onSelect === undefined ? (
                <span className={cn('flex min-w-0 items-center gap-1 pl-1.5', onRemove === undefined && 'pr-1.5')}>{face}</span>
            ) : (
                <button
                    type="button"
                    data-slot="chip-select"
                    aria-label={selectLabel}
                    title={selectLabel}
                    onClick={(event) => {
                        event.stopPropagation()
                        onSelect(event)
                    }}
                    onKeyDown={holdKeys}
                    className={cn(
                        'flex h-full min-w-0 cursor-pointer items-center gap-1 rounded-chip pl-1.5 hover:underline hover:underline-offset-2',
                        onRemove === undefined && 'pr-1.5',
                        RING,
                    )}
                >
                    {face}
                </button>
            )}
            {onRemove !== undefined && (
                <button
                    type="button"
                    data-slot="chip-remove"
                    aria-label={remove}
                    title={remove}
                    onClick={(event) => {
                        event.stopPropagation()
                        onRemove(event)
                    }}
                    onKeyDown={holdKeys}
                    className={cn(
                        'mx-0.5 flex shrink-0 cursor-pointer items-center rounded-mini p-0.5 opacity-70 hover:bg-hover hover:opacity-100',
                        RING,
                    )}
                >
                    <X aria-hidden />
                </button>
            )}
        </span>
    )
}
