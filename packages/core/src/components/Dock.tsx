import { ChevronDown, ChevronUp } from 'lucide-react'
import { useRef, type ComponentProps, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { usePanelSize } from '../hooks/use-panel-size'
import { ResizeHandle } from './ResizeHandle'

/** The words a dock says. */
export interface DockWords {
    fold: string
    unfold: string
    resize: string
}

const WORDS: DockWords = {
    fold: 'Fold the panel',
    unfold: 'Unfold the panel',
    resize: 'Resize the panel',
}

export interface DockProps extends Omit<ComponentProps<'section'>, 'title' | 'children' | 'ref' | 'style'> {
    title: ReactNode
    tools?: ReactNode
    /** A row under the head bar, held while the content scrolls: filters that need more room than the head has. */
    bar?: ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** A CSS height the dock starts at and returns to, when `defaultSize` is not given. */
    height?: string
    /** The height in pixels, held from outside with `onSizeChange`. */
    size?: number
    onSizeChange?: (size: number) => void
    /** Whether the top edge drags to resize the dock. */
    resizable?: boolean
    minSize?: number
    maxSize?: number
    /** The height in pixels the dock starts at and a double click on the edge returns to: 256 unless `height` is given. */
    defaultSize?: number
    className?: string
    words?: Partial<DockWords>
    children: ReactNode
}

/**
 * A panel along the bottom of the content, for a log, a terminal or a result: a head bar with the
 * title, tools and a fold control, and its content scrolling under it. Folded, only the head bar
 * shows.
 *
 * While open, its top edge drags to resize it, and a double click on the edge puts it back. Left
 * to itself it holds its own height, starting at `defaultSize`, or at `height` when that is given
 * alone; `size` with `onSizeChange` holds it from outside, and `resizable={false}` keeps it fixed.
 * Its head wraps when its tools need more room than one line, `bar` adds a row of its own under the
 * head for filters, and the section takes the rest of a section's props, an `aria-label` among them.
 */
export function Dock({
    title,
    tools,
    bar,
    open = true,
    onOpenChange,
    height,
    size,
    onSizeChange,
    resizable = true,
    minSize = 120,
    maxSize = 640,
    defaultSize,
    className,
    words: given,
    children,
    ...props
}: DockProps) {
    const words = { ...WORDS, ...given }
    const dock = useRef<HTMLElement>(null)
    const held = usePanelSize({
        size,
        onSizeChange,
        rest: defaultSize ?? height ?? 256,
        fallback: 256,
        min: minSize,
        max: maxSize,
    })
    return (
        <>
            {open && resizable && held.changeable && (
                <ResizeHandle
                    target={dock}
                    size={held.size}
                    onSize={held.set}
                    onReset={held.reset}
                    min={minSize}
                    max={maxSize}
                    axis="y"
                    grows={-1}
                    label={words.resize}
                />
            )}
            <section
                {...props}
                ref={dock}
                className={cn('flex shrink-0 flex-col border-t border-border-strong bg-sidebar', className)}
                style={open ? { height: held.style } : undefined}
            >
                <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-3 py-1">
                    <h2 className="min-w-0 flex-1 basis-32 truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {title}
                    </h2>
                    {tools}
                    {onOpenChange !== undefined && (
                        <button
                            type="button"
                            aria-label={open ? words.fold : words.unfold}
                            title={open ? words.fold : words.unfold}
                            aria-expanded={open}
                            onClick={() => onOpenChange(!open)}
                            className="flex size-(--density-control-sm) items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
                        >
                            {open ? <ChevronDown className="size-4" aria-hidden /> : <ChevronUp className="size-4" aria-hidden />}
                        </button>
                    )}
                </div>
                {open && bar !== undefined && (
                    <div data-slot="dock-bar" className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-1.5">
                        {bar}
                    </div>
                )}
                {open && <div className="min-h-0 flex-1 overflow-auto">{children}</div>}
            </section>
        </>
    )
}
