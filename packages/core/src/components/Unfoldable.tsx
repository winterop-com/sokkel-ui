import { ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'

export interface UnfoldableProps {
    heading: ReactNode
    /** Facts at the row's right end, such as a count, outside the button's name. */
    aside?: ReactNode
    defaultOpen?: boolean
    forced?: boolean
    className?: string
    children: ReactNode
}

/**
 * A heading that opens what is under it. The whole heading row is the control: the chevron turns,
 * the row carries `aria-expanded`, and it washes under the pointer the way a menu row does.
 *
 * `forced` holds it open whatever the reader chose, as a filter does while it is being typed; the
 * reader's own choice returns when it is let go.
 */
export function Unfoldable({ heading, aside, defaultOpen = false, forced = false, className, children }: UnfoldableProps) {
    const [opened, setOpened] = useState(defaultOpen)
    const open = opened || forced
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpened(!opened)}
                    className="-mx-1 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-left text-sm font-medium outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                    <ChevronRight
                        className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
                        aria-hidden
                    />
                    <span className="min-w-0 truncate">{heading}</span>
                </button>
                {aside !== undefined && <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{aside}</div>}
            </div>
            {open && <div className="pl-5.5">{children}</div>}
        </div>
    )
}
