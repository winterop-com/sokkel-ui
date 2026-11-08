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
import type { CodeBlockWords } from './ui/code-block'
import { MermaidDiagram, type MermaidDiagramWords } from './MermaidDiagram'

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

/** The words markdown says: each callout's title, and the words of its code blocks and diagrams. */
export interface MarkdownWords extends Record<CalloutKind, string> {
    /** The words of each code block's copy button. */
    code: Partial<CodeBlockWords>
    /** The words of each diagram. */
    diagram: Partial<MermaidDiagramWords>
}

const WORDS: MarkdownWords = {
    note: 'Note',
    tip: 'Tip',
    important: 'Important',
    warning: 'Warning',
    caution: 'Caution',
    code: {},
    diagram: {},
}

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

/** The slice of an mdast node the plugin below reads and writes. */
interface MdastNode {
    type: string
    value?: string
    data?: Record<string, unknown>
    children?: MdastNode[]
}

/** The marker of a part an app embeds: `<!-- WORD:ID -->`, where the ID is letters, digits, `-`, `_`, `.` and `:`. */
function partMarker(word: string): RegExp {
    return new RegExp(`^<!--\\s*${word.replace(/[^\w-]/g, '')}:([\\w.:-]+)\\s*-->$`)
}

/** The app's own parts: a map by ID, or a function that draws the part an ID names. */
export type MarkdownParts = Readonly<Record<string, ReactNode>> | ((id: string) => ReactNode)

/**
 * Turns each part marker into a placeholder element the `parts` map fills: a block where the
 * marker stands on a line of its own, inline where it sits inside a paragraph.
 */
function remarkParts(word: string) {
    const marker = partMarker(word)
    return () => (tree: MdastNode) => {
        const visit = (node: MdastNode, inline: boolean) => {
            if (node.children === undefined) return
            node.children = node.children.map((child) => {
                const match = child.type === 'html' ? marker.exec((child.value ?? '').trim()) : null
                if (match === null) {
                    visit(child, inline || child.type === 'paragraph' || child.type === 'heading')
                    return child
                }
                return { type: 'part', children: [], data: { hName: inline ? 'span' : 'div', hProperties: { dataPart: match[1] } } }
            })
        }
        visit(tree, false)
    }
}

function partFor(parts: MarkdownParts | undefined, id: string): ReactNode {
    return typeof parts === 'function' ? parts(id) : parts?.[id]
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
 * `parts` embeds an app's own parts in the text without splitting it, so headings, anchors and
 * the flow stay one document's. The text marks where each goes with an HTML comment,
 * `<!-- part:ID -->` (letters, digits, `-`, `_`, `.` and `:` in the ID), and `parts[ID]`, or
 * `parts(ID)` when it is a function, is drawn there. `partMarker` changes the word before the
 * colon, for texts written with another, such as `<!-- snippet:ID -->`. A part is drawn as a block when the marker stands on a line of its own between blank lines, inline when it
 * sits in a sentence. The marker works with `allowHtml` off, and a reader of the raw text sees
 * nothing; a marker whose ID `parts` lacks draws nothing.
 *
 * Fences are highlighted by Shiki in the `code-*` tokens: the common languages, `jq`, `ansi` output,
 * and any an app adds with `registerLanguage` from `lib/highlighter`.
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
    parts,
    partMarker: word = 'part',
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
    /** The app's own parts by ID, a map or a function, each drawn where the text has the marker `<!-- part:ID -->`. */
    parts?: MarkdownParts
    /** The word a part's marker starts with: `part` by default. */
    partMarker?: string
    className?: string
    words?: Partial<MarkdownWords>
}) {
    // The words are held by their text, so an object made anew each render keeps the renderers.
    const said = JSON.stringify(given ?? null)
    const words = useMemo<MarkdownWords>(() => ({ ...WORDS, ...(JSON.parse(said) as Partial<MarkdownWords> | null) }), [said])
    const components = useMemo<Components>(
        () => ({
            blockquote: ({ children, node: _node, ...props }) => {
                const kind = (props as Record<string, unknown>)['data-callout'] as CalloutKind | undefined
                const callout = kind === undefined ? undefined : CALLOUTS[kind]
                if (kind === undefined || callout === undefined) return <blockquote {...props}>{children}</blockquote>
                const label = words[kind]
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
            div: ({ children, node: _node, ...props }) => {
                const part = (props as Record<string, unknown>)['data-part'] as string | undefined
                if (part === undefined) return <div {...props}>{children}</div>
                const drawn = partFor(parts, part)
                if (drawn === undefined || drawn === null) return null
                return (
                    <div data-part={part} className="my-3">
                        {drawn}
                    </div>
                )
            },
            span: ({ children, node: _node, ...props }) => {
                const part = (props as Record<string, unknown>)['data-part'] as string | undefined
                if (part === undefined) return <span {...props}>{children}</span>
                const drawn = partFor(parts, part)
                if (drawn === undefined || drawn === null) return null
                return <span data-part={part}>{drawn}</span>
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
                            <MermaidDiagram code={value} streaming={streaming} words={words.diagram} />
                        </div>
                    )
                }
                return <Code value={value} language={language} words={words.code} />
            },
        }),
        [streaming, words, parts],
    )
    const needsMath = useMemo(() => math && hasMath(content), [math, content])
    const katex = useMathEngine(needsMath)
    const source = useMemo(() => (math ? normalizeMath(content) : content), [math, content])
    const remark: Options['remarkPlugins'] = useMemo(
        () => (katex === undefined || !math ? [remarkGfm, remarkParts(word)] : [remarkGfm, remarkParts(word), katex.remarkMath]),
        [katex, math, word],
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
