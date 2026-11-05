import { cn } from '../lib/cn'
import { KIND_WASH, kindOf, type KindColor } from '../lib/kind'

const SIZE = {
    xs: 'size-5 text-[0.625rem]',
    sm: 'size-6 text-xs',
    md: 'size-8 text-sm',
} as const

/**
 * A person as a round badge of their initials on a wash of their color: an assignee, an
 * attendee, an author. The color follows from the name unless one is given, so a person wears
 * the same one everywhere. Given `image`, the picture stands in for the initials.
 */
export function PersonAvatar({
    name,
    label = name,
    initials,
    color,
    image,
    size = 'sm',
    className,
}: {
    name: string
    /** What the badge says on hover and to a screen reader; the name by default. */
    label?: string
    /** One or two letters; the name's first letters by default. */
    initials?: string
    color?: KindColor
    image?: string
    size?: keyof typeof SIZE
    className?: string
}) {
    const letters =
        initials ??
        name
            .split(/[\s._-]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase()
    return (
        <span
            title={label}
            className={cn(
                'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium select-none',
                SIZE[size],
                KIND_WASH[color ?? kindOf(name)],
                className,
            )}
        >
            {image !== undefined ? (
                <img src={image} alt={label} className="size-full object-cover" />
            ) : (
                <span aria-label={label}>{letters}</span>
            )}
        </span>
    )
}
