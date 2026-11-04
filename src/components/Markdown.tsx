import { memo, useMemo, type ReactNode } from 'react'
import ReactMarkdown, { type Components, type Options } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

import { cn } from '../lib/cn'
import { Code } from './Code'
import { MermaidDiagram } from './MermaidDiagram'

/** The text inside a node, through any wrapping elements. */
function text(node: ReactNode): string {
    if (node === null || node === undefined || typeof node === 'boolean') return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(text).join('')
    if (typeof node === 'object' && 'props' in node) return text((node as { props?: { children?: ReactNode } }).props?.children)
    return ''
}

/** The language a fence names, from its `language-*` class, and the fence's text. */
function fence(children: ReactNode): { language: string; value: string } {
    const code = Array.isArray(children) ? children[0] : children
    const className =
        typeof code === 'object' && code !== null && 'props' in code
            ? ((code as { props?: { className?: string } }).props?.className ?? '')
            : ''
    return { language: /language-([\w-]+)/.exec(className)?.[1] ?? 'text', value: text(children).replace(/\n$/, '') }
}

const PROSE = cn(
    'min-w-0 text-sm leading-relaxed break-words text-foreground',
    '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
    '[&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
    '[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-title [&_h1]:font-semibold',
    '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold',
    '[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold',
    '[&_a]:text-primary-ink [&_a]:underline [&_a]:underline-offset-2',
    '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
    '[&_hr]:my-4 [&_hr]:border-border',
    '[&_table]:my-2 [&_table]:block [&_table]:border-collapse [&_table]:overflow-x-auto',
    '[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2.5 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium',
    '[&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1',
    '[&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.9em]',
    '[&_.mermaid-block]:my-3 [&_[data-slot=code-block]]:my-3',
)

/**
 * GitHub-flavored markdown, as an assistant or a description writes it: fenced code highlighted
 * with a copy button, mermaid fences drawn as diagrams, links opening in a new tab. Raw HTML is
 * dropped unless `allowHtml` is set, and then it is sanitized. While `streaming`, a mermaid fence
 * shows its source until the message completes.
 */
export const Markdown = memo(function Markdown({
    content,
    streaming = false,
    allowHtml = false,
    className,
}: {
    content: string
    streaming?: boolean
    allowHtml?: boolean
    className?: string
}) {
    const components = useMemo<Components>(
        () => ({
            a: ({ children, node: _node, ...props }) => (
                <a {...props} target="_blank" rel="noreferrer noopener">
                    {children}
                </a>
            ),
            pre: ({ children }) => {
                const { language, value } = fence(children)
                if (language === 'mermaid') {
                    return (
                        <div className="mermaid-block">
                            <MermaidDiagram code={value} streaming={streaming} />
                        </div>
                    )
                }
                return <Code value={value} language={language} size="sm" />
            },
        }),
        [streaming],
    )
    const rehype: Options['rehypePlugins'] = allowHtml ? [rehypeRaw, rehypeSanitize] : []
    return (
        <div className={cn(PROSE, className)}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehype} components={components}>
                {content}
            </ReactMarkdown>
        </div>
    )
})
