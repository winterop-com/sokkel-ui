import { useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { usePanelSize } from '../hooks/use-panel-size'
import { ResizeHandle } from './ResizeHandle'
import { GroupLabel } from './GroupLabel'

/** One tab of a side panel. */
export interface SidePanelTab {
    id: string
    label: string
    content: ReactNode
}

/** The words a side panel says. */
export interface SidePanelWords {
    resize: string
}

const WORDS: SidePanelWords = { resize: 'Resize the side panel' }

/**
 * The right-hand panel beside a page: a header bar the height of the shell's top bar, with the
 * panel's tabs (or its title when it has one tab), then the content scrolling under it. The shell's
 * toggle in the header's right corner shows and hides the panel; the panel has no close of its own.
 *
 * The header lines up with the shell's top bar, so the panel reads as a column of the shell, not
 * as a card dropped beside the page.
 *
 * Left to itself the panel holds which tab is shown, starting at `defaultActive` or the first tab;
 * `active` with `onActiveChange` holds it from outside.
 *
 * Its left edge drags to resize it, and a double click on the edge puts it back. Left to itself it
 * holds its own width, starting at `defaultSize`, or at `width` when that is given alone; `size`
 * with `onSizeChange` holds it from outside, and `resizable={false}` keeps it fixed. In the shell's
 * sheet on a narrow window the edge is not drawn.
 */
export function SidePanel({
    tabs,
    active,
    onActiveChange,
    defaultActive,
    width,
    size,
    onSizeChange,
    resizable = true,
    minSize = 280,
    maxSize = 640,
    defaultSize,
    className,
    words: given,
}: {
    tabs: SidePanelTab[]
    active?: string
    onActiveChange?: (id: string) => void
    /** The tab shown at the start when `active` is not given. */
    defaultActive?: string
    /** A CSS width the panel starts at and returns to, when `defaultSize` is not given. */
    width?: string
    /** The width in pixels, held from outside with `onSizeChange`. */
    size?: number
    onSizeChange?: (size: number) => void
    /** Whether the left edge drags to resize the panel. */
    resizable?: boolean
    minSize?: number
    maxSize?: number
    /** The width in pixels the panel starts at and a double click on the edge returns to: 352 unless `width` is given. */
    defaultSize?: number
    className?: string
    words?: Partial<SidePanelWords>
}) {
    const words = { ...WORDS, ...given }
    const [own, setOwn] = useState(defaultActive)
    const shown = active ?? own
    const current = tabs.find((tab) => tab.id === shown) ?? tabs[0]
    const choose = (id: string) => {
        if (active === undefined) setOwn(id)
        onActiveChange?.(id)
    }
    const panel = useRef<HTMLElement>(null)
    const held = usePanelSize({
        size,
        onSizeChange,
        rest: defaultSize ?? width ?? 352,
        fallback: 352,
        min: minSize,
        max: maxSize,
    })
    return (
        <>
            {resizable && held.changeable && (
                <ResizeHandle
                    target={panel}
                    size={held.size}
                    onSize={held.set}
                    onReset={held.reset}
                    min={minSize}
                    max={maxSize}
                    grows={-1}
                    label={words.resize}
                />
            )}
            <aside
                ref={panel}
                className={cn('flex h-full shrink-0 flex-col border-l border-border-strong bg-sidebar', className)}
                style={{ width: held.style }}
            >
                <div className="flex h-shell-top shrink-0 items-center gap-1 border-b border-border-strong pr-12 pl-2">
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
                                            : 'text-muted-foreground hover:bg-hover hover:text-foreground',
                                    )}
                                    onClick={() => choose(tab.id)}
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
            <GroupLabel as="h3">{title}</GroupLabel>
            {children}
        </section>
    )
}
