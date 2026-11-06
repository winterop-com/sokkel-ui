import { cn } from '../lib/cn'
import { KIND_WASH, kindOf, type KindColor } from '../lib/kind'

/** Whether a person is around: here, away, or not signed in. */
export type Presence = 'active' | 'away' | 'offline'

/** Each size: the badge and its letters, how many letters fit in it, and its presence dot's size and place. */
const SIZE = {
    '2xs': { box: 'size-4 text-2xs', letters: 1, dot: 'size-1.5 -right-0.75 -bottom-0.75 border' },
    xs: { box: 'size-5 text-2xs', letters: 1, dot: 'size-2 -right-0.5 -bottom-0.5 border-2' },
    sm: { box: 'size-6 text-xs', letters: 2, dot: 'size-2 -right-0.5 -bottom-0.5 border-2' },
    md: { box: 'size-8 text-sm', letters: 2, dot: 'size-2.5 -right-0.5 -bottom-0.5 border-2' },
    lg: { box: 'size-9 text-sm', letters: 2, dot: 'size-2.5 -right-0.5 -bottom-0.5 border-2' },
    xl: { box: 'size-16 text-page', letters: 2, dot: 'size-3.5 -right-1 -bottom-1 border-3' },
} as const

/** A filled dot while active; while away or offline a ring, its middle the ground it sits on. */
const PRESENCE: Record<Presence, string> = {
    active: 'border-good bg-good',
    away: 'border-muted-foreground bg-[color:var(--avatar-ring,var(--color-background))]',
    offline: 'border-faint bg-[color:var(--avatar-ring,var(--color-background))]',
}

export interface PersonAvatarWords {
    presence: Record<Presence, string>
}

const WORDS: PersonAvatarWords = { presence: { active: 'Active', away: 'Away', offline: 'Offline' } }

/**
 * Whether a person is around, as a small dot: filled green while active, a hollow ring while away
 * or offline. It wears a ring of `--avatar-ring`, the ground it sits on (the background unless a
 * container sets it), so it reads as cut out of whatever it overlaps.
 */
export function PresenceDot({ presence, label, className }: { presence: Presence; label?: string; className?: string }) {
    return (
        <span
            role="img"
            aria-label={label ?? WORDS.presence[presence]}
            className={cn(
                'size-2 shrink-0 rounded-full border-2 ring-2 ring-[color:var(--avatar-ring,var(--color-background))]',
                PRESENCE[presence],
                className,
            )}
        />
    )
}

/**
 * A person as a badge of their initials on a wash of their color: an assignee, an attendee, an
 * author. Round by default; `square` gives the rounded square a message list's authors wear. The
 * color follows from the name unless one is given, so a person wears the same one everywhere.
 * Given `image`, the picture stands in for the initials. At `2xs` and `xs` only the first initial
 * shows, since two do not fit.
 *
 * Given `presence`, a dot at the lower right corner says whether they are around. It sits outside
 * the letters, ringed in `--avatar-ring` (the background by default), so a list on another ground
 * sets that variable to its own color.
 */
export function PersonAvatar({
    name,
    label = name,
    initials,
    color,
    image,
    size = 'sm',
    shape = 'round',
    presence,
    className,
    words: given,
}: {
    name: string
    /** What the badge says on hover and to a screen reader; the name by default. */
    label?: string
    /** One or two letters; the name's first letters by default. */
    initials?: string
    color?: KindColor
    image?: string
    size?: keyof typeof SIZE
    /** `square` is a rounded square, as a message list's authors wear. */
    shape?: 'round' | 'square'
    /** Whether they are around, drawn as a dot at the corner. */
    presence?: Presence
    className?: string
    words?: Partial<PersonAvatarWords>
}) {
    const words = { ...WORDS, ...given }
    const fit = SIZE[size]
    const letters = (
        initials ??
        name
            .split(/[\s._-]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase()
    ).slice(0, fit.letters)
    const corner = shape === 'round' ? 'rounded-full' : size === 'xl' ? 'rounded-xl' : 'rounded-md'
    const badge = cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden font-medium select-none',
        fit.box,
        corner,
        KIND_WASH[color ?? kindOf(name)],
    )
    const content =
        image !== undefined ? <img src={image} alt={label} className="size-full object-cover" /> : <span aria-label={label}>{letters}</span>
    if (presence === undefined)
        return (
            <span title={label} className={cn(badge, className)}>
                {content}
            </span>
        )
    return (
        <span title={label} className={cn('relative inline-flex shrink-0', fit.box, corner, className)}>
            <span className={cn(badge, 'size-full')}>{content}</span>
            <PresenceDot presence={presence} label={words.presence[presence]} className={cn('absolute', fit.dot)} />
        </span>
    )
}
