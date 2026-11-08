import type { ReactNode } from 'react'

import { Code } from './Code'
import { DetailSheet } from './DetailSheet'

export interface SourceSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    description?: ReactNode
    /** The source: an object is written as indented JSON. */
    value: string | object
    language?: string
}

/**
 * A record's source in a sheet from the right: what the server holds for it, highlighted, with a
 * copy button. A screen opens it from a "View source" action so the raw form is one press away
 * without taking the page. It is a `DetailSheet` whose body is the source.
 */
export function SourceSheet({ open, onOpenChange, title, description, value, language = 'json' }: SourceSheetProps) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    return (
        <DetailSheet open={open} onOpenChange={onOpenChange} title={title} description={description} size="lg">
            <Code value={text} language={language} lineNumbers size="sm" />
        </DetailSheet>
    )
}
