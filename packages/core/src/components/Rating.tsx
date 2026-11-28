import { Star } from 'lucide-react'
import { useId, useState } from 'react'

import { cn } from '../lib/cn'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'

export interface RatingWords {
    /** A star as a choice, by its count and the most there are. */
    star: (count: number, max: number) => string
    /** A rating shown, not chosen, by its value and the most there are. */
    rated: (value: string, max: number) => string
}

export const RATING_WORDS: RatingWords = {
    star: (count, max) => `${count.toLocaleString('en-US')} of ${max.toLocaleString('en-US')} ${count === 1 ? 'star' : 'stars'}`,
    rated: (value, max) => `Rated ${value} of ${max.toLocaleString('en-US')}`,
}

/** Where a catalog holds a rating's words, and the arguments its phrases name. */
export const RATING_PART: WordsPart<RatingWords> = { id: 'rating', words: RATING_WORDS, args: { star: 'count max', rated: 'value max' } }

/** A rating's phrases as ICU messages in English, for the catalog. */
export const RATING_MESSAGES: WordMessages<RatingWords> = {
    star: '{count, plural, one {# of {max} star} other {# of {max} stars}}',
    rated: 'Rated {value} of {max}',
}

export interface RatingProps {
    /** What the stars rate, said to a screen reader as the group's name. */
    label: string
    /** The stars given, from 0; a shown rating may be a fraction, such as an average of 3.6. */
    value?: number
    /** The stars it starts with when `value` is not given. */
    defaultValue?: number
    /** Makes it a choice: called with the stars picked, or 0 when the picked count is pressed again. */
    onValueChange?: (value: number) => void
    /** How many stars there are. */
    max?: number
    size?: 'sm' | 'md'
    disabled?: boolean
    words?: Partial<RatingWords>
    className?: string
}

const SIZE = { sm: 'size-3.5', md: 'size-5' } as const

/**
 * A rating in stars. With `onValueChange` it is a choice: a row of radio buttons, one per star,
 * that the arrow keys move along as any radio group's do; resting the pointer on a star lights it
 * and those before it, and pressing the stars already given takes the rating back to none. Without
 * it the rating is shown, filled to the fraction, as an average is, and said as one image.
 */
export function Rating({
    label,
    value,
    defaultValue = 0,
    onValueChange,
    max = 5,
    size = 'md',
    disabled = false,
    words: given,
    className,
}: RatingProps) {
    const words = useWords(RATING_PART, given)
    const [own, setOwn] = useState(defaultValue)
    const [hover, setHover] = useState<number | null>(null)
    const name = useId()
    const shown = value ?? own
    const stars = Array.from({ length: max }, (_, index) => index + 1)

    if (onValueChange === undefined) {
        const lit = Math.min(max, Math.max(0, shown))
        return (
            <span
                role="img"
                aria-label={words.rated(lit.toLocaleString('en-US', { maximumFractionDigits: 1 }), max)}
                data-slot="rating"
                className={cn('inline-flex items-center gap-0.5', className)}
            >
                {stars.map((star) => (
                    <span key={star} aria-hidden className={cn('relative', SIZE[size])}>
                        <Star className={cn('absolute inset-0 text-muted-foreground/40', SIZE[size])} />
                        <span
                            className="absolute inset-y-0 start-0 overflow-hidden"
                            style={{ width: `${String(Math.min(1, Math.max(0, lit - star + 1)) * 100)}%` }}
                        >
                            <Star className={cn('fill-warning text-warning', SIZE[size])} />
                        </span>
                    </span>
                ))}
            </span>
        )
    }

    const pick = (star: number) => {
        const next = star === shown ? 0 : star
        if (value === undefined) setOwn(next)
        onValueChange(next)
    }
    const lit = hover ?? shown
    return (
        <div
            role="radiogroup"
            aria-label={label}
            data-slot="rating"
            onPointerLeave={() => setHover(null)}
            className={cn('inline-flex items-center gap-0.5', disabled && 'opacity-disabled', className)}
        >
            {stars.map((star) => (
                <label
                    key={star}
                    onPointerEnter={() => {
                        if (!disabled) setHover(star)
                    }}
                    className={cn(
                        'relative cursor-pointer rounded-mini p-0.5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                        disabled && 'cursor-not-allowed',
                    )}
                >
                    <input
                        type="radio"
                        name={name}
                        value={star}
                        checked={shown === star}
                        disabled={disabled}
                        aria-label={words.star(star, max)}
                        onChange={() => pick(star)}
                        onClick={() => {
                            if (star === shown) pick(star)
                        }}
                        className="peer absolute inset-0 cursor-pointer opacity-0"
                    />
                    <Star
                        aria-hidden
                        className={cn(
                            SIZE[size],
                            'transition-colors duration-fast',
                            star <= lit ? 'fill-warning text-warning' : 'text-muted-foreground/40',
                            hover !== null && star <= hover && 'fill-warning/70 text-warning/70',
                        )}
                    />
                </label>
            ))}
        </div>
    )
}
