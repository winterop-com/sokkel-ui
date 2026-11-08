import { MoreHorizontal, X } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { CopyButton } from './CopyButton'
import { usePanelSize } from '../hooks/use-panel-size'
import { ResizeHandle } from './ResizeHandle'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './ui/dropdown-menu'

/**
 * The panel beside a list that shows the chosen row: a header naming the thing (its name, then its
 * code in the code face with a copy button), the thing's actions, then titled sections. It starts
 * level with the list's top and runs to the bottom of the content.
 *
 * Its left edge drags to resize it, and a double click on the edge puts it back. Left to itself it
 * holds its own width, starting at `defaultSize`; `size` with `onSizeChange` holds it from outside,
 * and `resizable={false}` keeps it fixed. A long title wraps; `singleLine` keeps it to one line.
 */
export function Inspector({
    title,
    code,
    status,
    actions,
    menu,
    onClose,
    size,
    onSizeChange,
    resizable = true,
    minSize = 320,
    maxSize = 480,
    defaultSize = 360,
    singleLine = false,
    className,
    words = { menu: 'More actions', close: 'Close', resize: 'Resize the panel', copy: 'Copy', copied: 'Copied' },
    children,
}: {
    title: ReactNode
    /** The thing's code, drawn under the title in the code face, with a copy button. */
    code?: string
    /** A status line under the header, such as a status chip and the step it stopped at. */
    status?: ReactNode
    /** Buttons for what can be done with the thing, under the header. */
    actions?: ReactNode
    /** Dropdown menu items behind the header's more button. */
    menu?: ReactNode
    onClose?: () => void
    /** The width in pixels, held from outside with `onSizeChange`. */
    size?: number
    onSizeChange?: (size: number) => void
    /** Whether the left edge drags to resize the panel. */
    resizable?: boolean
    minSize?: number
    maxSize?: number
    /** The width the panel starts at and a double click on the edge returns to. */
    defaultSize?: number
    /** Keeps the title to one line, cut short with an ellipsis, rather than wrapping. */
    singleLine?: boolean
    className?: string
    words?: { menu: string; close: string; resize: string; copy: string; copied: string }
    children: ReactNode
}) {
    const panel = useRef<HTMLElement>(null)
    const held = usePanelSize({ size, onSizeChange, rest: defaultSize, fallback: defaultSize, min: minSize, max: maxSize })
    const tool =
        'flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring'
    return (
        <div className="flex shrink-0 self-stretch">
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
                style={{ width: held.style }}
                className={cn('flex min-h-0 flex-col overflow-hidden rounded-surface border border-border-strong bg-card', className)}
            >
                <header className="flex flex-col gap-3 border-b border-border p-(--density-inspector-pad)">
                    <div className="flex items-start gap-2">
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <h2
                                title={singleLine && typeof title === 'string' ? title : undefined}
                                className={cn('text-detail-title', singleLine ? 'truncate' : 'text-pretty break-words')}
                            >
                                {title}
                            </h2>
                            {code !== undefined && (
                                <div className="flex items-center gap-1">
                                    <span className="truncate font-mono text-xs text-muted-foreground">{code}</span>
                                    <CopyButton value={code} size="icon-xs" words={{ copy: words.copy, copied: words.copied }} />
                                </div>
                            )}
                        </div>
                        {menu !== undefined && (
                            <DropdownMenu>
                                <DropdownMenuTrigger aria-label={words.menu} title={words.menu} className={tool}>
                                    <MoreHorizontal className="size-4" aria-hidden />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    {menu}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {onClose !== undefined && (
                            <button type="button" aria-label={words.close} title={words.close} className={tool} onClick={onClose}>
                                <X className="size-4" aria-hidden />
                            </button>
                        )}
                    </div>
                    {status !== undefined && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{status}</div>
                    )}
                    {actions !== undefined && <div className="flex flex-wrap gap-2">{actions}</div>}
                </header>
                <div className="flex min-h-0 flex-1 flex-col gap-(--density-inspector-gap) overflow-y-auto p-(--density-inspector-pad)">
                    {children}
                </div>
            </aside>
        </div>
    )
}

/** One titled section of an inspector: a small heading over its content. */
export function InspectorSection({ title, children }: { title: ReactNode; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-3">
            <h3 className="text-xs leading-4 font-semibold text-foreground">{title}</h3>
            {children}
        </section>
    )
}
