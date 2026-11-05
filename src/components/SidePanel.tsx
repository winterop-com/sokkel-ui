import { useRef, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ResizeHandle } from './ResizeHandle'

/** One tab of a side panel. */
export interface SidePanelTab {
    id: string
    label: string
    content: ReactNode
}

/**
 * The right-hand panel beside a page: a header bar the height of the shell's top bar, with the
 * panel's tabs (or its title when it has one tab), then the content scrolling under it. The shell's
 * toggle at the end of its top bar shows and hides the panel; the panel has no close of its own.
 *
 * The header lines up with the shell's top bar, so the panel reads as a column of the shell, not
 * as a card dropped beside the page. Given `size` and `onSizeChange`, its left edge drags to
 * resize it; otherwise it keeps `width`.
 */
export function SidePanel({
    tabs,
    active,
    onActiveChange,
    width = '22rem',
    size,
    onSizeChange,
    minSize = 280,
    maxSize = 640,
    defaultSize = 352,
    className,
    words = { resize: 'Resize the side panel' },
}: {
    tabs: SidePanelTab[]
    active?: string
    onActiveChange?: (id: string) => void
    /** A CSS width, when the panel is not resizable. */
    width?: string
    /** The width in pixels; with `onSizeChange` the left edge drags to resize it. */
    size?: number
    onSizeChange?: (size: number) => void
    minSize?: number
    maxSize?: number
    /** The width a double click on the edge returns to. */
    defaultSize?: number
    className?: string
    words?: { resize: string }
}) {
    const current = tabs.find((tab) => tab.id === active) ?? tabs[0]
    const panel = useRef<HTMLElement>(null)
    const resizable = size !== undefined && onSizeChange !== undefined
    return (
        <>
            {resizable && (
                <ResizeHandle
                    target={panel}
                    size={size}
                    onSize={onSizeChange}
                    min={minSize}
                    max={maxSize}
                    reset={defaultSize}
                    grows={-1}
                    label={words.resize}
                />
            )}
            <aside
                ref={panel}
                className={cn('flex h-full shrink-0 flex-col border-l border-border-strong bg-sidebar', className)}
                style={{ width: resizable ? size : width }}
            >
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
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">{current?.content}</div>
            </aside>
        </>
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
