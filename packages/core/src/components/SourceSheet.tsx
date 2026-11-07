import type { ReactNode } from 'react'

import { Code } from './Code'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet'

/**
 * A record's source in a sheet from the right: what the server holds for it, highlighted, with a
 * copy button. A screen opens it from a "View source" action so the raw form is one press away
 * without taking the page.
 */
export function SourceSheet({
    open,
    onOpenChange,
    title,
    description,
    value,
    language = 'json',
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    description?: ReactNode
    /** The source: an object is written as indented JSON. */
    value: string | object
    language?: string
}) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" flush className="w-full sm:max-w-2xl">
                <SheetHeader className="border-b border-border px-4 py-3 pr-12">
                    <SheetTitle className="text-base font-medium">{title}</SheetTitle>
                    {description !== undefined && <SheetDescription>{description}</SheetDescription>}
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-auto p-4">
                    <Code value={text} language={language} lineNumbers size="sm" />
                </div>
            </SheetContent>
        </Sheet>
    )
}
