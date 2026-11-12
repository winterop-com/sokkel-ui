import { ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'

export interface UnfoldableProps {
    heading: ReactNode
    /** Facts at the row's right end, such as a count, outside the button's name. */
    aside?: ReactNode
    /** A line under the heading while it is shut, such as what the folded part holds in short. */
    summary?: ReactNode
    /** Whether it is open, held by the app; held inside when not given. */
    open?: boolean
    defaultOpen?: boolean
    /** Called with the open state the reader asked for. */
    onOpenChange?: (open: boolean) => void
    forced?: boolean
    className?: string
    /** What opens under the heading. Without it the row is static: no chevron and no button, its heading lined up with the rest. */
    children?: ReactNode
}

/**
 * A heading that opens what is under it. The whole heading row is the control: the chevron turns,
 * the row carries `aria-expanded`, and it washes under the pointer the way a menu row does.
 *
 * `open` with `onOpenChange` holds it from outside; `defaultOpen` starts it open otherwise.
 * `summary` is a line under the heading while it is shut. A row with nothing to unfold (no
 * children) is static: no chevron and no button, its heading where an unfoldable row's stands, so
 * a list of mixed rows lines up.
 *
 * `forced` holds it open whatever the reader chose, as a filter does while it is being typed; the
 * reader's own choice returns when it is let go.
 */
export function Unfoldable({
    heading,
    aside,
    summary,
    open: held,
    defaultOpen = false,
    onOpenChange,
    forced = false,
    className,
    children,
}: UnfoldableProps) {
    const [own, setOwn] = useState(defaultOpen)
    const opened = held ?? own
    const unfolds = children !== undefined && children !== null && children !== false
    const open = unfolds && (opened || forced)
    const toggle = () => {
        if (held === undefined) setOwn(!opened)
        onOpenChange?.(!opened)
    }
    const row = '-mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm font-medium'
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <div className="flex items-center gap-2">
                {unfolds ? (
                    <button
                        type="button"
                        aria-expanded={open}
                        onClick={toggle}
                        className={cn(
                            row,
                            'cursor-pointer outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        )}
                    >
                        <ChevronRight
                            className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
                            aria-hidden
                        />
                        <span className="min-w-0 truncate">{heading}</span>
                    </button>
                ) : (
                    <div className={row}>
                        <span className="size-3.5 shrink-0" aria-hidden />
                        <span className="min-w-0 truncate">{heading}</span>
                    </div>
                )}
                {aside !== undefined && <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{aside}</div>}
            </div>
            {!open && summary !== undefined && summary !== null && (
                <div className="-mt-1.5 truncate pl-5.5 text-xs text-muted-foreground">{summary}</div>
            )}
            {open && <div className="pl-5.5">{children}</div>}
        </div>
    )
}
