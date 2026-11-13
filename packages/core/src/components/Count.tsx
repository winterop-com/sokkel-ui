import { cn } from '../lib/cn'

const SIZE = {
    sm: 'h-4 min-w-4 text-2xs',
    md: 'h-5 min-w-5 text-xs',
} as const

const TONE = {
    critical: 'bg-critical font-semibold text-critical-foreground',
    quiet: 'bg-secondary font-medium text-muted-foreground',
} as const

/** What a count says: something waiting, on the critical color, or how many there are, quietly. */
export type CountTone = keyof typeof TONE

export interface CountProps {
    value: number
    max?: number
    label?: string
    size?: keyof typeof SIZE
    shape?: 'square' | 'round'
    /** `critical`, the default, for what is waiting; `quiet` for how many a group holds. */
    tone?: CountTone
    className?: string
}

/**
 * A count of what is waiting, such as unread messages, on the critical color, or with `tone="quiet"`
 * how many entries a group holds. Above `max` it says `99+`. Placed over an icon, the caller
 * positions it. `sm` is the small count a narrow strip hangs at an icon's corner; `round` is the
 * round badge a count over an icon reads as, growing into a capsule past one digit.
 */
export function Count({ value, max = 99, label, size = 'md', shape = 'square', tone = 'critical', className }: CountProps) {
    return (
        <span
            aria-label={label}
            data-tone={tone}
            className={cn(
                'flex items-center justify-center px-1 tabular-nums',
                TONE[tone],
                SIZE[size],
                shape === 'round' ? 'rounded-full' : 'rounded-mini',
                'leading-none',
                className,
            )}
        >
            {value > max ? `${String(max)}+` : value}
        </span>
    )
}
