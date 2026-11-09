import type { ReactNode } from 'react'

import { Code } from './Code'
import { DetailSheet, type DetailSheetWords } from './DetailSheet'

export interface SourceSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    description?: ReactNode
    /** The source: an object is written as indented JSON. */
    value: string | object
    language?: string
    /** The width in pixels, held from outside with `onSizeChange`. */
    size?: number
    onSizeChange?: (size: number) => void
    /** Whether the left edge drags to resize the sheet. */
    resizable?: boolean
    minSize?: number
    /** The widest a drag takes the sheet; most of the window when not given. */
    maxSize?: number
    /** The width the sheet opens at and a double click on the edge returns to. */
    defaultSize?: number
    words?: Partial<DetailSheetWords>
}

/**
 * A record's source in a sheet from the right: what the server holds for it, highlighted, with a
 * copy button. A screen opens it from a "View source" action so the raw form is one press away
 * without taking the page. It is a `DetailSheet` whose body is the source, and resizes as one does:
 * its left edge drags, it holds its width from `defaultSize`, and `resizable={false}` turns that off.
 */
export function SourceSheet({
    open,
    onOpenChange,
    title,
    description,
    value,
    language = 'json',
    size,
    onSizeChange,
    resizable = true,
    minSize,
    maxSize,
    defaultSize = 576,
    words,
}: SourceSheetProps) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    return (
        <DetailSheet
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            size={size}
            onSizeChange={onSizeChange}
            resizable={resizable}
            minSize={minSize}
            maxSize={maxSize}
            defaultSize={defaultSize}
            words={words}
        >
            <Code value={text} language={language} lineNumbers size="sm" />
        </DetailSheet>
    )
}
