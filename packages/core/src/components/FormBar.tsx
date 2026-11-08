import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

export interface FormBarProps {
    /** A control before the note, kept apart from the verbs at the end: Reset to defaults, Cancel. */
    start?: ReactNode
    /** What the form's state is, said at the start of the bar. */
    note?: ReactNode
    /** The actions, such as `IssueCount` and the buttons. */
    children: ReactNode
    placement?: 'foot' | 'end'
    /** The bar's side padding at the foot: a page's inset, or a panel's, for a sheet or a side panel. */
    inset?: 'page' | 'panel'
    className?: string
}

/**
 * A form's actions: a note at the start, such as when the draft was last saved, and the actions at
 * the end, the main verb last; `start` puts a control before the note, away from the verbs. When
 * the row is too narrow for both, the actions move under the note, and when it is too narrow for
 * the actions alone, they wrap onto a second line.
 *
 * At the `foot` (the default) it is a bar pinned to the bottom edge of the page's scrolling
 * content, as the content's last child, so the verbs stay in reach down a long form; `inset`
 * matches its side padding to a page's or a panel's. At the `end` it is a plain row closing a short
 * form, with the actions at its right.
 */
export function FormBar({ start, note, children, placement = 'foot', inset = 'page', className }: FormBarProps) {
    const row = (
        <div
            className={cn(
                'flex flex-wrap items-center gap-2',
                placement === 'foot' && [
                    'min-h-[calc(var(--spacing-shell-foot)-1px)] py-1',
                    inset === 'page' ? 'px-(--density-page-inset)' : 'px-(--density-panel-pad)',
                ],
                placement === 'end' && className,
            )}
        >
            {start}
            {note !== undefined && (
                <span role="status" className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    {note}
                </span>
            )}
            <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">{children}</div>
        </div>
    )
    if (placement === 'end') return row
    return (
        // As tall as the shell's foot strip, so its top line meets the rail's foot beside it.
        <div className={cn('sticky bottom-0 z-20 border-t border-border-strong bg-sidebar', className)}>{row}</div>
    )
}
