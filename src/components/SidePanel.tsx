import { PanelRightClose } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/** One tab of a side panel. */
export interface SidePanelTab {
    id: string
    label: string
    content: ReactNode
}

/**
 * The right-hand panel beside a page: a header bar the height of the shell's top bar, with the
 * panel's tabs (or its title when it has one tab) and the close control at its right edge, then
 * the content scrolling under it.
 *
 * The header lines up with the shell's top bar, so the panel reads as a column of the shell, not
 * as a card dropped beside the page.
 */
export function SidePanel({
    tabs,
    active,
    onActiveChange,
    onClose,
    width = '22rem',
    className,
    words = { close: 'Close the side panel' },
}: {
    tabs: SidePanelTab[]
    active?: string
    onActiveChange?: (id: string) => void
    onClose?: () => void
    /** A CSS width. */
    width?: string
    className?: string
    words?: { close: string }
}) {
    const current = tabs.find((tab) => tab.id === active) ?? tabs[0]
    return (
        <aside className={cn('flex h-full shrink-0 flex-col border-l border-border-strong bg-sidebar', className)} style={{ width }}>
            <div className="flex h-shell-top shrink-0 items-center gap-1 border-b border-border-strong px-2">
                {tabs.length === 1 ? (
                    <h2 className="truncate px-1.5 text-sm font-medium">{current?.label}</h2>
                ) : (
                    <div role="tablist" className="flex min-w-0 items-center gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={tab.id === current?.id}
                                className={cn(
                                    'h-7 rounded-md px-2.5 text-sm',
                                    tab.id === current?.id
                                        ? 'bg-secondary font-medium text-foreground'
                                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                                )}
                                onClick={() => onActiveChange?.(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
                {onClose !== undefined && (
                    <button
                        type="button"
                        aria-label={words.close}
                        title={words.close}
                        className="ml-auto flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                        onClick={onClose}
                    >
                        <PanelRightClose className="size-4" aria-hidden />
                    </button>
                )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{current?.content}</div>
        </aside>
    )
}

/** A titled block inside a side panel: a quiet uppercase heading over its content. */
export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0">
            <h3 className="text-xs font-medium tracking-wide text-faint uppercase">{title}</h3>
            {children}
        </section>
    )
}
