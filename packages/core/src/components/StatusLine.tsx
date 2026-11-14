import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/** How a note in the foot strip is inked. Something live is information, not a warning. */
export type StatusTone = 'quiet' | 'live' | 'warn' | 'error'

// A quiet note and the facts at the right take the foot's own ink, which a theme may set.
const TONE: Record<StatusTone, string> = {
    quiet: 'text-page-foot-ink',
    live: 'text-info',
    warn: 'text-warning',
    error: 'text-destructive',
}

/**
 * The foot strip a status line draws: the shell's foot height on the foot's ground under its rule,
 * padded 12 across. The shell stands it empty beside the rail's foot cell when it has no foot.
 */
export const STATUS_STRIP =
    'flex h-shell-foot w-full min-w-0 shrink-0 items-center gap-3 border-t border-page-foot-line bg-page-foot-ground px-3 text-xs text-page-foot-ink'

export interface StatusLineProps {
    note?: ReactNode
    tone?: StatusTone
    /** A dot before the note that pulses, for something happening now. */
    live?: boolean
    /** Identifiers and counts at the right end, each a `StatusItem`. */
    children?: ReactNode
}

/**
 * The shell's foot strip, saying what the screen is doing: a short note at the left and identifiers
 * at the right, on one row of fixed height. It draws the strip itself, the shell's foot height on
 * the foot's ground under its rule, so the shell only gives it its room and a strip drawn alone looks
 * the same. It holds short facts, never a sentence, so it never grows; where the row is too narrow,
 * the note is cut short first, and the facts, kept to most of the row, after it.
 */
export function StatusLine({ note, tone = 'quiet', live = false, children }: StatusLineProps) {
    return (
        <div className={STATUS_STRIP}>
            {note !== undefined && (
                <span className={cn('flex min-w-0 items-center gap-2', TONE[tone])}>
                    {live && (
                        <span className="relative flex size-2 shrink-0" aria-hidden>
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-50" />
                            <span className="relative inline-flex size-2 rounded-full bg-current" />
                        </span>
                    )}
                    <span className="truncate">{note}</span>
                </span>
            )}
            <div className="flex-1" />
            {children !== undefined && (
                <div className="flex max-w-[70%] min-w-0 shrink-0 items-center justify-end gap-3 overflow-hidden text-page-foot-ink">
                    {children}
                </div>
            )}
        </div>
    )
}

export interface StatusItemProps {
    label?: string
    children: ReactNode
    code?: boolean
}

/** One fact at the foot strip's right end, an identifier in the code face when `code` is set. */
export function StatusItem({ label, children, code = false }: StatusItemProps) {
    return (
        <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
            {label !== undefined && <span className="shrink-0 text-faint">{label}</span>}
            <span className={cn('min-w-0 truncate', code && 'font-mono text-foreground')}>{children}</span>
        </span>
    )
}
