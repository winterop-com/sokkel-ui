import { cn } from '../lib/cn'

/** The ink and wash of an inline code value: plain, muted, or one of the status tones. */
export type InlineCodeTone = 'neutral' | 'muted' | 'critical' | 'warning' | 'info' | 'good'

const INK: Record<InlineCodeTone, string> = {
    neutral: 'text-foreground',
    muted: 'text-muted-foreground',
    critical: 'text-critical-ink',
    warning: 'text-warning-ink',
    info: 'text-info-ink',
    good: 'text-good-ink',
}

const WASH: Record<InlineCodeTone, string> = {
    neutral: 'bg-muted',
    muted: 'bg-muted',
    critical: 'bg-critical/12',
    warning: 'bg-warning/12',
    info: 'bg-info/12',
    good: 'bg-good/12',
}

const SIZE = { xs: 'text-xs', sm: 'text-sm' } as const

export interface InlineCodeProps {
    /** The value, drawn on one line; the whole of it is the title when it does not fit. */
    value: string
    tone?: InlineCodeTone
    /** Drops the wash and its padding, leaving the tone's ink: a value beside a title or in a line of facts. */
    bare?: boolean
    /** The face's size; without one it takes the size of the text around it. */
    size?: keyof typeof SIZE
    className?: string
}

/**
 * A one-line value in the code face on a faint wash: a run id, a host, a path, a command. It never
 * wraps; a value wider than its room is cut short with an ellipsis, and its title holds the whole
 * of it. `tone` colors it as the status tones do elsewhere, for a value that is itself a state;
 * `bare` drops the wash, and `size` sets the face apart from the text around it.
 */
export function InlineCode({ value, tone = 'neutral', bare = false, size, className }: InlineCodeProps) {
    return (
        <code
            title={value}
            data-tone={tone}
            className={cn(
                'inline-block max-w-full truncate align-bottom font-mono',
                !bare && 'rounded-mini px-1',
                !bare && WASH[tone],
                INK[tone],
                size !== undefined && SIZE[size],
                className,
            )}
        >
            {value}
        </code>
    )
}
