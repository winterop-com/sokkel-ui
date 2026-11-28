'use client'

import { Star } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '../lib/cn'
import { IconButton } from './IconButton'
import { useWords, type WordsPart } from '../lib/words'

/** The words the star says, each with an English default. */
export interface StarButtonWords {
    /** Its label while not starred: what pressing it does. */
    star: string
    /** Its label while starred. */
    unstar: string
}

export const STAR_BUTTON_WORDS: StarButtonWords = { star: 'Add to favorites', unstar: 'Remove from favorites' }

/** Where a catalog holds a star button's words. */
export const STAR_BUTTON_PART: WordsPart<StarButtonWords> = { id: 'starButton', words: STAR_BUTTON_WORDS }

export type StarButtonProps = Omit<ComponentProps<typeof IconButton>, 'label' | 'children' | 'pressed' | 'onClick'> & {
    starred?: boolean
    onStarredChange?: (starred: boolean) => void
    words?: Partial<StarButtonWords>
}

/**
 * A favorite toggle: an outlined star in the quiet ink that fills in the accent once starred, the
 * button pressed while it is. Its tooltip and accessible name say what a press does, so they
 * change with it. It is an `IconButton`, so it takes the same sizes, variants and tooltip side; a
 * starred ghost star shows its fill alone, without the pressed ground, so a column of them down a
 * list stays quiet.
 */
export function StarButton({ starred = false, onStarredChange, variant = 'ghost', className, words, ...props }: StarButtonProps) {
    const said = useWords(STAR_BUTTON_PART, words)
    return (
        <IconButton
            {...props}
            variant={variant}
            label={starred ? said.unstar : said.star}
            pressed={starred}
            onClick={onStarredChange === undefined ? undefined : () => onStarredChange(!starred)}
            className={cn(
                starred && 'text-primary-ink hover:text-primary-ink',
                starred && variant === 'ghost' && 'bg-transparent',
                className,
            )}
        >
            <Star className={cn(starred && 'fill-current')} aria-hidden />
        </IconButton>
    )
}
