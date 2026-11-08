import { CircleAlert, Info, Lightbulb, MessageSquareWarning, TriangleAlert, type LucideIcon } from 'lucide-react'
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import ReactMarkdown, { type Components, type Options } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

import { cn } from '../lib/cn'
import { hasMath, markdownSchema, normalizeMath } from '../lib/math'
import { TABLE_HEAD_TEXT } from '../lib/table'
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

/** The id a heading is given under `anchors`: its text lowercased, spaces as dashes, punctuation dropped. */
export function headingId(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
}

/** One heading of a markdown text: its level, its text, and the id `anchors` gives it. */
export interface MarkdownHeading {
    id: string
    label: string
    level: number
}

/** The headings of a markdown text at the given levels, outside fenced code, in order. */
export function markdownHeadings(content: string, levels: readonly number[] = [2, 3]): MarkdownHeading[] {
    const out: MarkdownHeading[] = []
    let fenced = false
    for (const line of content.split('\n')) {
        if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
        if (fenced) continue
        const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
        if (match === null || !levels.includes(match[1].length)) continue
        const label = match[2]
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/[`*_~]/g, '')
            .trim()
        out.push({ id: headingId(label), label, level: match[1].length })
    }
    return out
}

/** The kinds of callout a quote becomes when its first line is `[!NOTE]`, `[!TIP]` and so on. */
export type CalloutKind = 'note' | 'tip' | 'important' | 'warning' | 'caution'

export type MarkdownWords = Record<CalloutKind, string>

const WORDS: MarkdownWords = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' }

const CALLOUTS: Record<CalloutKind, { icon: LucideIcon; frame: string; ink: string }> = {
    note: { icon: Info, frame: 'border-info/45 bg-info/8', ink: 'text-info-ink' },
    tip: { icon: Lightbulb, frame: 'border-good/45 bg-good/8', ink: 'text-good-ink' },
    important: { icon: MessageSquareWarning, frame: 'border-kind-violet/45 bg-kind-violet/8', ink: 'text-kind-violet-ink' },
    warning: { icon: TriangleAlert, frame: 'border-warning/50 bg-warning/8', ink: 'text-warning-ink' },
    caution: { icon: CircleAlert, frame: 'border-critical/45 bg-critical/8', ink: 'text-critical-ink' },
}

/** The slice of a hast node the plugin below reads and writes. */
interface HastNode {
    type: string
    tagName?: string
    value?: string
    properties?: Record<string, unknown>
    children?: HastNode[]
}

function hastText(node: HastNode): string {
    if (node.type === 'text') return node.value ?? ''
    return (node.children ?? []).map(hastText).join('')
}

/** Marks `[!KIND]` quotes as callouts with the marker removed, and gives headings ids when `anchors` is set. */
function rehypeDocument(anchors: boolean) {
    return () => (tree: HastNode) => {
        const visit = (node: HastNode) => {
            if (anchors && node.tagName !== undefined && /^h[1-6]$/.test(node.tagName)) {
                node.properties = { ...node.properties, id: headingId(hastText(node)) }
            }
            if (node.tagName === 'blockquote') {
                const first = node.children?.find((child) => child.type === 'element')
                const text = first?.tagName === 'p' ? first.children?.[0] : undefined
                const marker = text?.type === 'text' ? /^\[!(note|tip|important|warning|caution)\][ \t]*\n?/i.exec(text.value ?? '') : null
                if (first !== undefined && text !== undefined && marker !== null) {
                    text.value = (text.value ?? '').slice(marker[0].length)
                    if (text.value === '' && first.children?.length === 1) {
                        node.children = node.children?.filter((child) => child !== first)
                    }
                    node.properties = { ...node.properties, dataCallout: marker[1].toLowerCase() }
                }
            }
            for (const child of node.children ?? []) visit(child)
        }
        visit(tree)
    }
}

type MathEngine = typeof import('../lib/katex')

let engine: Promise<MathEngine> | undefined
let ready: MathEngine | undefined

/**
 * Loads the math engine `Markdown` draws formulas with, once, and resolves when it is ready. Markdown
 * calls it itself the first time a message holds math; an app that knows formulas are coming can call
 * it ahead, so the first one draws at once.
 */
export function loadMath(): Promise<void> {
    engine ??= import('../lib/katex').then(
        (module) => {
            ready = module
            return module
        },
        (error: unknown) => {
            engine = undefined
            throw error
        },
    )
    return engine.then(() => undefined)
}

/** The math engine once a message has needed it, loaded on the first such message and shared by the rest. */
function useMathEngine(needed: boolean): MathEngine | undefined {
    const [loaded, setLoaded] = useState<MathEngine | undefined>(ready)
    useEffect(() => {
        if (!needed || loaded !== undefined) return
        let live = true
        loadMath().then(
            () => {
                if (live) setLoaded(ready)
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [needed, loaded])
    return loaded
}

/**
 * Heading levels by where the text is read: a message keeps them within a reply's measure (the
 * largest is a detail title), a document runs from a page title down.
 */
const HEADINGS = {
    message: cn(
        '[&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-detail-title',
        '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-section-title [&_h2]:font-semibold',
        '[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-section-title',
        '[&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:text-head',
    ),
    document: cn(
        '[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-page-title',
        '[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-detail-title',
        '[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-section-title',
        '[&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:text-head',
    ),
} as const

const PROSE = cn(
    'min-w-0 text-sm leading-relaxed break-words text-foreground',
    '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
    '[&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
    '[&_a]:text-primary-ink [&_a]:underline [&_a]:underline-offset-2',
    '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
    '[&_hr]:my-4 [&_hr]:border-border',
    '[&_table]:my-2 [&_table]:block [&_table]:border-collapse [&_table]:overflow-x-auto',
    '[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2.5 [&_th]:py-1 [&_th]:text-left',
    '[&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1',
    '[&_:not(pre)>code]:font-mono',
    '[&_.mermaid-block]:my-3 [&_[data-slot=code-block]]:my-3',
    '[&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1',
    '[&_.katex-error]:font-mono',
    '[&_[id]]:scroll-mt-4',
)

/** How code inside a sentence is drawn. */
export type InlineCode = 'chip' | 'plain' | 'wash'

/**
 * `chip` fills each value; `plain` sets it in the code face alone; `wash` gives it a faint fill
 * with no padding to speak of and drops the fill in a table, whose cells already set the values
 * apart.
 */
const INLINE_CODE: Record<InlineCode, string> = {
    chip: '[&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1',
    plain: '[&_td]:tabular-nums',
    wash: '[&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:bg-secondary [&_:not(pre)>code]:px-0.5 [&_td_code]:bg-transparent [&_td_code]:px-0',
}

/** A text caret after the last paragraph or list item, where the next words will land. */
const CARET = cn(
    '[&>:is(ol,ul):last-child>li:last-child]:after:ml-0.5 [&>:is(ol,ul):last-child>li:last-child]:after:inline-block [&>:is(ol,ul):last-child>li:last-child]:after:h-4 [&>:is(ol,ul):last-child>li:last-child]:after:w-1.5 [&>:is(ol,ul):last-child>li:last-child]:after:translate-y-0.5 [&>:is(ol,ul):last-child>li:last-child]:after:animate-pulse [&>:is(ol,ul):last-child>li:last-child]:after:bg-foreground motion-reduce:[&>:is(ol,ul):last-child>li:last-child]:after:animate-none',
    '[&>p:last-child]:after:ml-0.5 [&>p:last-child]:after:inline-block [&>p:last-child]:after:h-4 [&>p:last-child]:after:w-1.5 [&>p:last-child]:after:translate-y-0.5 [&>p:last-child]:after:animate-pulse [&>p:last-child]:after:bg-foreground motion-reduce:[&>p:last-child]:after:animate-none',
)

/**
 * GitHub-flavored markdown, as an assistant or a description writes it: fenced code highlighted
 * with a copy button, mermaid fences drawn as diagrams, links opening in a new tab, and a quote
 * whose first line is `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` drawn as
 * a callout. Raw HTML is dropped unless `allowHtml` is set, and then it is sanitized. While
 * `streaming`, a mermaid fence shows its source until the message completes.
 *
 * `math` (on by default) draws LaTeX with KaTeX: `$…$` and `\(…\)` inline, `$$…$$`, `\[…\]` and a
 * `math` fence on a line of their own. KaTeX loads the first time a message holds math, its
 * stylesheet with it. A single `$` is math only as Pandoc reads it (a non-space after the opening
 * one, a non-space before the closing one and no digit after it, on one line), so "costs $5 and
 * $10" stays prices; turn `math` off where every `$` is a dollar. A formula KaTeX cannot read shows
 * its source in the error color.
 *
 * `anchors` gives each heading the id `headingId` makes of its text, for a table of contents to
 * link to; `markdownHeadings` lists the same ids from the source.
 *
 * `inlineCode` picks how code inside a sentence is drawn, and `caret` marks where a streaming
 * answer's next words will land.
 */
export const Markdown = memo(function Markdown({
    content,
    streaming = false,
    allowHtml = false,
    anchors = false,
    inlineCode = 'chip',
    caret = false,
    math = true,
    scale = 'message',
    className,
    words: given,
}: {
    content: string
    streaming?: boolean
    allowHtml?: boolean
    /** Gives every heading an id made from its text. */
    anchors?: boolean
    /** How code inside a sentence is drawn: filled chips by default. */
    inlineCode?: InlineCode
    /** A caret after the last words while `streaming`. */
    caret?: boolean
    /** Draws LaTeX math with KaTeX, loaded the first time a message holds math. On by default. */
    math?: boolean
    /** Heading sizes: within a message (the default), or a document's from a page title down. */
    scale?: 'message' | 'document'
    className?: string
    words?: Partial<MarkdownWords>
}) {
    const note = given?.note
    const tip = given?.tip
    const important = given?.important
    const warning = given?.warning
    const caution = given?.caution
    const components = useMemo<Components>(
        () => ({
            blockquote: ({ children, node: _node, ...props }) => {
                const kind = (props as Record<string, unknown>)['data-callout'] as CalloutKind | undefined
                const callout = kind === undefined ? undefined : CALLOUTS[kind]
                if (kind === undefined || callout === undefined) return <blockquote {...props}>{children}</blockquote>
                const label = { note, tip, important, warning, caution }[kind] ?? WORDS[kind]
                const Icon = callout.icon
                return (
                    <div
                        data-callout={kind}
                        className={cn(
                            'my-3 flex gap-2.5 rounded-surface border px-3 py-2.5 [&_p]:my-1 [&>div>*:last-child]:mb-0',
                            callout.frame,
                        )}
                    >
                        <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', callout.ink)} />
                        <div className="min-w-0 flex-1">
                            <p className={cn('!mt-0 font-medium', callout.ink)}>{label}</p>
                            {children}
                        </div>
                    </div>
                )
            },
            th: ({ children, node: _node, className, ...props }) => (
                <th {...props} className={cn(TABLE_HEAD_TEXT, className)}>
                    {children}
                </th>
            ),
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
                return <Code value={value} language={language} />
            },
        }),
        [streaming, note, tip, important, warning, caution],
    )
    const needsMath = useMemo(() => math && hasMath(content), [math, content])
    const katex = useMathEngine(needsMath)
    const source = useMemo(() => (math ? normalizeMath(content) : content), [math, content])
    const remark: Options['remarkPlugins'] = useMemo(
        () => (katex === undefined || !math ? [remarkGfm] : [remarkGfm, katex.remarkMath]),
        [katex, math],
    )
    const rehype = useMemo(() => {
        const plugins: NonNullable<Options['rehypePlugins']> = []
        if (allowHtml) plugins.push(rehypeRaw, [rehypeSanitize, markdownSchema])
        // After sanitizing, so KaTeX's own markup is kept.
        if (katex !== undefined && math) plugins.push([katex.rehypeKatex, { throwOnError: false, errorColor: 'var(--status-failed-ink)' }])
        plugins.push(rehypeDocument(anchors))
        return plugins
    }, [allowHtml, anchors, katex, math])
    return (
        <div
            data-settling={needsMath && katex === undefined ? '' : undefined}
            className={cn(PROSE, HEADINGS[scale], INLINE_CODE[inlineCode], caret && streaming && CARET, className)}
        >
            <ReactMarkdown remarkPlugins={remark} rehypePlugins={rehype} components={components}>
                {source}
            </ReactMarkdown>
        </div>
    )
})
