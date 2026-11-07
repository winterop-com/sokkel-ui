import type { ReactNode } from 'react'

import { useHighlightedCode } from '../hooks/use-highlighted-code'
import { hasLanguage } from '../lib/highlighter'
import {
    CodeBlock,
    CodeBlockActions,
    CodeBlockContent,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockLine,
    CodeBlockTitle,
} from './ui/code-block'

/**
 * A block of code, highlighted for its language, with a copy button. A title (a file name, a
 * step) heads it when given; `highlight` marks lines by number, and `lineNumbers` counts them from
 * `startLine`. Code that is still streaming highlights each line as it completes.
 */
export function Code({
    value,
    language = 'text',
    title,
    lineNumbers = false,
    startLine = 1,
    highlight = [],
    wrap = false,
    size = 'default',
    variant = 'default',
    className,
}: {
    value: string
    language?: string
    title?: ReactNode
    lineNumbers?: boolean
    startLine?: number
    /** Line numbers, counted from `startLine`, drawn on a wash. */
    highlight?: readonly number[]
    wrap?: boolean
    size?: 'default' | 'sm'
    variant?: 'default' | 'destructive'
    className?: string
}) {
    const lines = useHighlightedCode(value, language)
    const marked = new Set(highlight)
    return (
        <CodeBlock size={size} variant={variant} className={className} data-plain={hasLanguage(language) ? undefined : ''}>
            {title !== undefined ? (
                <CodeBlockHeader>
                    <CodeBlockTitle>{title}</CodeBlockTitle>
                    <CodeBlockActions>
                        <CodeBlockCopyButton value={value} />
                    </CodeBlockActions>
                </CodeBlockHeader>
            ) : (
                <CodeBlockActions>
                    <CodeBlockCopyButton value={value} />
                </CodeBlockActions>
            )}
            <CodeBlockContent wrap={wrap} lineNumbers={lineNumbers} startLine={startLine}>
                {lines.map((line, index) => (
                    <CodeBlockLine key={index} variant={marked.has(startLine + index) ? 'highlighted' : 'default'}>
                        {line}
                    </CodeBlockLine>
                ))}
            </CodeBlockContent>
        </CodeBlock>
    )
}
