import { cn } from '../lib/cn'

/** The ink and wash of an inline code value: plain, or one of the status tones. */
export type InlineCodeTone = 'neutral' | 'critical' | 'warning' | 'info' | 'good'

const TONE: Record<InlineCodeTone, string> = {
    neutral: 'bg-muted text-foreground',
    critical: 'bg-critical/12 text-critical-ink',
    warning: 'bg-warning/12 text-warning-ink',
    info: 'bg-info/12 text-info-ink',
    good: 'bg-good/12 text-good-ink',
}

export interface InlineCodeProps {
    /** The value, drawn on one line; the whole of it is the title when it does not fit. */
    value: string
    tone?: InlineCodeTone
    className?: string
}

/**
 * A one-line value in the code face on a faint wash: a run id, a host, a path, a command. It never
 * wraps; a value wider than its room is cut short with an ellipsis, and its title holds the whole
 * of it. `tone` colors it as the status tones do elsewhere, for a value that is itself a state.
 */
export function InlineCode({ value, tone = 'neutral', className }: InlineCodeProps) {
    return (
        <code
            title={value}
            data-tone={tone}
            className={cn('inline-block max-w-full truncate rounded-mini px-1 align-bottom font-mono', TONE[tone], className)}
        >
            {value}
        </code>
    )
}
