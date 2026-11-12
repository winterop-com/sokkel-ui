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
    type CodeBlockWords,
} from './ui/code-block'

export interface CodeProps {
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
    /** Buttons of the app's own beside the copy button, such as a `WindowedPaneButton` (with `button="none"` on its pane). */
    actions?: ReactNode
    /**
     * A head row over the code even without a title, holding the copy button and `actions` off the
     * text rather than floating them over its first lines; on whenever a title is given.
     */
    header?: boolean
    /** The copy button's words. */
    words?: Partial<CodeBlockWords>
}

/**
 * A block of code, highlighted for its language, with a copy button. A title (a file name, a
 * step) heads it when given; `highlight` marks lines by number, and `lineNumbers` counts them from
 * `startLine`. Code that is still streaming highlights each line as it completes. `actions` sets the
 * app's own buttons beside copy, a pane's expand button among them, and `header` gives them a row of
 * their own over the code when there is no title, so they never cover its first lines.
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
    actions,
    header = title !== undefined,
    words,
}: CodeProps) {
    const lines = useHighlightedCode(value, language)
    const marked = new Set(highlight)
    return (
        <CodeBlock size={size} variant={variant} className={className} data-plain={hasLanguage(language) ? undefined : ''}>
            {header ? (
                <CodeBlockHeader>
                    {title !== undefined && <CodeBlockTitle>{title}</CodeBlockTitle>}
                    <CodeBlockActions>
                        {actions}
                        <CodeBlockCopyButton value={value} words={words} />
                    </CodeBlockActions>
                </CodeBlockHeader>
            ) : (
                <CodeBlockActions>
                    {actions}
                    <CodeBlockCopyButton value={value} words={words} />
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
