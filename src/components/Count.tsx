import { cn } from '../lib/cn'

const SIZE = {
    sm: 'h-4 min-w-4 text-2xs',
    md: 'h-5 min-w-5 text-xs',
} as const

/**
 * A count of what is waiting, such as unread messages, on the critical color. Above `max` it
 * says `99+`. Placed over an icon, the caller positions it. `sm` is the small count a narrow strip
 * hangs at an icon's corner.
 */
export function Count({
    value,
    max = 99,
    label,
    size = 'md',
    className,
}: {
    value: number
    max?: number
    label?: string
    size?: keyof typeof SIZE
    className?: string
}) {
    return (
        <span
            aria-label={label}
            className={cn(
                'flex items-center justify-center rounded-mini bg-critical px-1 font-semibold text-critical-foreground tabular-nums',
                SIZE[size],
                'leading-none',
                className,
            )}
        >
            {value > max ? `${String(max)}+` : value}
        </span>
    )
}
