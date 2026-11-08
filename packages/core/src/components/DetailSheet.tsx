import { XIcon } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { IconButton } from './IconButton'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet'

/** The words a detail sheet says. */
export interface DetailSheetWords {
    close: string
}

const WORDS: DetailSheetWords = { close: 'Close' }

/**
 * One thing's detail in a sheet from the right, so a row of a list is read without leaving the
 * list: a head with the thing's code over its title, a sentence under it, and one line of its chips
 * followed by its actions (open the full page, the request behind it), then the body, which scrolls
 * under the head, and an optional foot pinned at the bottom for the verbs.
 *
 * The body is the same parts the thing's own page draws, so the sheet and the page say one thing
 * the same way. It takes the focus as the sheet opens, so the keys scroll it and Tab reaches the
 * actions next. `size` sets how wide it opens on a wide window; on a phone it takes the whole width.
 */
export function DetailSheet({
    open,
    onOpenChange,
    title,
    code,
    description,
    chips,
    actions,
    foot,
    size = 'xl',
    className,
    children,
    words: given,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    /** The thing's addressable code, over the title in the code face. */
    code?: string
    /** A sentence under the title. */
    description?: ReactNode
    /** The thing's chips on a line under the title: its kind, its state, its id. */
    chips?: ReactNode
    /** Actions after the chips on the same line, such as opening the full page. */
    actions?: ReactNode
    /** The verbs pinned at the sheet's foot. */
    foot?: ReactNode
    size?: 'md' | 'lg' | 'xl'
    className?: string
    children: ReactNode
    words?: Partial<DetailSheetWords>
}) {
    const words = { ...WORDS, ...given }
    const lined = chips !== undefined || actions !== undefined
    const body = useRef<HTMLDivElement>(null)
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" size={size} flush showCloseButton={false} initialFocus={body} className={className}>
                <header className="flex shrink-0 items-start gap-2 border-b border-border px-4 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        {code !== undefined && <span className="truncate font-mono text-xs text-muted-foreground">{code}</span>}
                        <SheetTitle className="text-pretty break-words">{title}</SheetTitle>
                        {description !== undefined && <SheetDescription>{description}</SheetDescription>}
                        {lined && (
                            <div className={cn('flex min-w-0 flex-wrap items-center gap-1.5', description === undefined && 'mt-0.5')}>
                                {chips}
                                {actions}
                            </div>
                        )}
                    </div>
                    <IconButton label={words.close} side="left" onClick={() => onOpenChange(false)}>
                        <XIcon aria-hidden />
                    </IconButton>
                </header>
                <div ref={body} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-4 outline-none">
                    <div className="flex min-w-0 flex-col gap-(--density-section-gap)">{children}</div>
                </div>
                {foot !== undefined && (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-2">{foot}</div>
                )}
            </SheetContent>
        </Sheet>
    )
}
