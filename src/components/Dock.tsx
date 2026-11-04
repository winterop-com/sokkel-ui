import { ChevronDown, ChevronUp } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ResizeHandle } from './ResizeHandle'

/**
 * A panel along the bottom of the content, for a log, a terminal or a result: a head bar with the
 * title, tools and a fold control, and its content scrolling under it. Folded, only the head bar
 * shows. Given `size` and `onSizeChange`, its top edge drags to resize it; otherwise it keeps
 * `height`.
 */
export function Dock({
    title,
    tools,
    open = true,
    onOpenChange,
    height = '16rem',
    size,
    onSizeChange,
    minSize = 120,
    maxSize = 640,
    defaultSize = 256,
    className,
    words = { fold: 'Fold the panel', unfold: 'Unfold the panel', resize: 'Resize the panel' },
    children,
}: {
    title: ReactNode
    tools?: ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** A CSS height, when the dock is not resizable. */
    height?: string
    /** The height in pixels; with `onSizeChange` the top edge drags to resize it. */
    size?: number
    onSizeChange?: (size: number) => void
    minSize?: number
    maxSize?: number
    defaultSize?: number
    className?: string
    words?: { fold: string; unfold: string; resize: string }
    children: ReactNode
}) {
    const dock = useRef<HTMLElement>(null)
    const resizable = open && size !== undefined && onSizeChange !== undefined
    return (
        <>
            {resizable && (
                <ResizeHandle
                    target={dock}
                    size={size}
                    onSize={onSizeChange}
                    min={minSize}
                    max={maxSize}
                    reset={defaultSize}
                    axis="y"
                    grows={-1}
                    label={words.resize}
                />
            )}
            <section
                ref={dock}
                className={cn('flex shrink-0 flex-col border-t border-border-strong bg-sidebar', className)}
                style={open ? { height: resizable ? size : height } : undefined}
            >
                <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
                    <h2 className="min-w-0 flex-1 truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
                    {tools}
                    {onOpenChange !== undefined && (
                        <button
                            type="button"
                            aria-label={open ? words.fold : words.unfold}
                            title={open ? words.fold : words.unfold}
                            aria-expanded={open}
                            onClick={() => onOpenChange(!open)}
                            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                            {open ? <ChevronDown className="size-4" aria-hidden /> : <ChevronUp className="size-4" aria-hidden />}
                        </button>
                    )}
                </div>
                {open && <div className="min-h-0 flex-1 overflow-auto">{children}</div>}
            </section>
        </>
    )
}
