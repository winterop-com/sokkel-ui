import { cn } from '../lib/cn'

/**
 * A count of what is waiting, such as unread messages, on the critical color. Above `max` it
 * says `99+`. Placed over an icon, the caller positions it.
 */
export function Count({ value, max = 99, label, className }: { value: number; max?: number; label?: string; className?: string }) {
    return (
        <span
            aria-label={label}
            className={cn(
                'flex h-5 min-w-5 items-center justify-center rounded-mini bg-critical px-1 text-xs leading-none font-semibold text-critical-foreground tabular-nums',
                className,
            )}
        >
            {value > max ? `${String(max)}+` : value}
        </span>
    )
}
