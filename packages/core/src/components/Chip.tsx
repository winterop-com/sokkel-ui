import { X } from 'lucide-react'
import type { ReactNode } from 'react'

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
    /** The remove button's name and tooltip. */
    remove: string
}

const WORDS: ChipWords = { remove: 'Remove' }

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
    /** Makes the chip a button, pressed to open or filter by what it says. */
    onSelect?: () => void
    /** Gives the chip a remove button at its end, named by `words.remove`. */
    onRemove?: () => void
    words?: Partial<ChipWords>
    className?: string
}

/**
 * A short value as a chip: a tag on a job, a state that has no run color, a value that is absent.
 * Its tone is neutral, a semantic color's wash with its own ink, or `absent`, dashed. `mono` sets
 * the words in the code face and `icon` goes before them. With `onSelect` the chip is a button;
 * with `onRemove` it ends in a remove button, its own stop in the tab order with its own focus
 * ring. A long value ends in an ellipsis inside the room it is given.
 */
export function Chip({ children, tone = 'neutral', mono = false, icon, title, onSelect, onRemove, words: given, className }: ChipProps) {
    const words = { ...WORDS, ...given }
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
                    onClick={onSelect}
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
                    aria-label={words.remove}
                    title={words.remove}
                    onClick={onRemove}
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
