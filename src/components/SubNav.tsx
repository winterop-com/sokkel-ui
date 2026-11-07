import { useRef, type ReactNode } from 'react'

import { usePanelSize } from '../hooks/use-panel-size'
import { cn } from '../lib/cn'
import { GroupLabel } from './GroupLabel'
import { ResizeHandle } from './ResizeHandle'

const SHOWN = {
    always: 'flex',
    md: 'hidden md:flex',
    lg: 'hidden lg:flex',
    xl: 'hidden xl:flex',
} as const

/**
 * The second column beside the rail: what the app's section holds, such as a tree of folders, a
 * section's pages or a month to pick a day from. It sits on the rail's ground with a strong rule
 * at its right, holds `title` (a group label) or `search` at its top with `actions` beside them,
 * and scrolls its content under them.
 *
 * Below the `from` breakpoint it is not drawn, and the page reaches the same places another way.
 * Its right edge drags to resize it, and a double click on the edge puts it back. Left to itself
 * it holds its own width from `defaultSize`; `size` with `onSizeChange` holds it from outside, and
 * `resizable={false}` keeps it fixed.
 */
export function SubNav({
    title,
    search,
    actions,
    children,
    label,
    from = 'lg',
    size,
    onSizeChange,
    resizable = true,
    minSize = 192,
    maxSize = 400,
    defaultSize = 240,
    className,
    words = { resize: 'Resize the column' },
}: {
    /** A group label over the content, such as "Folders". */
    title?: string
    /** A search field at the top, beside `actions`. */
    search?: ReactNode
    /** Controls at the end of the top line, such as a button that adds a page. */
    actions?: ReactNode
    children: ReactNode
    /** The column's name for a screen reader, when it has no `title`. */
    label?: string
    /** The breakpoint the column shows from. */
    from?: keyof typeof SHOWN
    /** The width in pixels, held from outside with `onSizeChange`. */
    size?: number
    onSizeChange?: (size: number) => void
    /** Whether the right edge drags to resize the column. */
    resizable?: boolean
    minSize?: number
    maxSize?: number
    /** The width in pixels the column starts at and a double click on the edge returns to. */
    defaultSize?: number
    className?: string
    words?: { resize: string }
}) {
    const column = useRef<HTMLElement>(null)
    const held = usePanelSize({ size, onSizeChange, rest: defaultSize, fallback: 240, min: minSize, max: maxSize })
    const top = title !== undefined || search !== undefined || actions !== undefined
    return (
        <div className={cn('min-h-0 shrink-0', SHOWN[from])}>
            <aside
                ref={column}
                aria-label={label ?? title}
                style={{ width: held.style }}
                className={cn(
                    'flex min-h-0 flex-col gap-3 overflow-y-auto border-r border-border-strong bg-sidebar px-2 py-3 text-sidebar-foreground',
                    className,
                )}
            >
                {top && (
                    <div className="flex shrink-0 items-center gap-1 px-1">
                        {title !== undefined && (
                            <GroupLabel as="h2" className="min-w-0 flex-1 truncate px-1">
                                {title}
                            </GroupLabel>
                        )}
                        {search !== undefined && <div className="min-w-0 flex-1">{search}</div>}
                        {actions !== undefined && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
                    </div>
                )}
                {children}
            </aside>
            {resizable && held.changeable && (
                <ResizeHandle
                    target={column}
                    size={held.size}
                    onSize={held.set}
                    onReset={held.reset}
                    min={minSize}
                    max={maxSize}
                    label={words.resize}
                />
            )}
        </div>
    )
}
