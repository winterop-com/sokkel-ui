import { ChevronRight, CircleAlert, Info, Lightbulb, MessageSquareWarning, TriangleAlert, type LucideIcon } from 'lucide-react'
import {
    Children,
    createContext,
    memo,
    useCallback,
    useContext,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ComponentType,
    type ReactNode,
} from 'react'
import ReactMarkdown, { defaultUrlTransform, type Components, type Options, type UrlTransform } from 'react-markdown'

import { useWords, type WordsPart } from '../lib/words'
import { cn } from '../lib/cn'
import {
    BLOCK_CONTAINERS,
    cleanTree,
    nodesOf,
    parseTree,
    splitFrontmatter,
    treeText,
    type CalloutKind,
    type MarkdownNode,
    type MarkdownTree,
} from '../lib/markdown-parse'
import { hasMath } from '../lib/math'
import { TABLE_HEAD_TEXT } from '../lib/table'
import { Code } from './Code'
import { highlightMark } from './Highlight'
import { Link } from './Link'
import type { CodeBlockWords } from './ui/code-block'
import type { MermaidDiagramWords } from './MermaidDiagram'

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
        .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
}

/** One heading of a markdown text: its level, its text, and the id `anchors` gives it. */
export interface MarkdownHeading {
    id: string
    label: string
    level: number
}

/**
 * Gives each heading id once: the first heading of a text keeps it, and each later one with the
 * same text takes `-1`, `-2` and so on after it, as GitHub numbers them.
 */
function uniqueIds(): (id: string) => string {
    const taken = new Map<string, number>()
    return (id) => {
        let out = id
        while (taken.has(out)) {
            const count = (taken.get(id) ?? 0) + 1
            taken.set(id, count)
            out = `${id}-${String(count)}`
        }
        taken.set(out, 0)
        return out
    }
}

export { splitFrontmatter }
export type { CalloutKind, MarkdownNode, MarkdownTree }

/** A setext heading's underline: `===` under a level 1 heading, `---` under a level 2 one. */
const SETEXT = /^ {0,3}(=+|-+)\s*$/

/**
 * A line written as a `#` heading: its level and its text without the closing `#`s, or null. Read
 * by hand rather than by one pattern, so a long line takes time in step with its length.
 */
function atxHeading(line: string): { level: number; text: string } | null {
    const open = /^ {0,3}(#{1,6})\s/.exec(line)
    if (open === null) return null
    const rest = line.slice(open[0].length)
    const body = rest.trimStart()
    let text = body === '' ? rest.slice(-1) : body
    let end = text.trimEnd().length
    while (end > 0 && text[end - 1] === '#') end -= 1
    end = text.slice(0, end).trimEnd().length
    text = text.slice(0, Math.max(end, 1))
    return text === '' || /[\n\r\u2028\u2029]/.test(text) ? null : { level: open[1].length, text }
}

/** The text with each `[words](address)` link written as its words alone. */
function linkWords(text: string): string {
    let out = ''
    let at = 0
    let close = -1
    let end = -1
    for (let open = text.indexOf('['); open >= 0; open = text.indexOf('[', open + 1)) {
        if (open < at) continue
        if (close <= open) close = text.indexOf(']', open + 1)
        if (close < 0) break
        if (text[close + 1] !== '(') continue
        if (end <= close) end = text.indexOf(')', close + 2)
        if (end < 0) break
        out += text.slice(at, open) + text.slice(open + 1, close)
        at = end + 1
    }
    return out + text.slice(at)
}

/** How the words of headings are read: as `Markdown` with `links` reads them, math left as written. */
const HEADING_RULES = {
    normalizeMath: false,
    frontmatter: false,
    wikiLinks: true,
    tags: true,
    partMarker: 'part',
    positions: false,
} as const

/** Longer heading words than this are read by hand rather than parsed, so a heading takes time in step with its length. */
const HEADING_WORDS = 1000

/** A heading found by the line scan: the line it starts on, its level, and its words as written. */
interface ScannedHeading {
    line: number
    level: number
    words: string
    /** Underlined rather than written with `#`. */
    setext: boolean
}

/**
 * The headings of a text by its lines, outside fenced code and frontmatter: those written with `#`
 * and those underlined with `===` or `---`. Read by hand, so the time is in step with the text's length.
 */
function scanHeadings(content: string): { lines: string[]; headings: ScannedHeading[]; definitions: string[] } {
    const lines = content.split('\n')
    // The lines the frontmatter takes, its fences with it.
    const taken = content.length - splitFrontmatter(content).body.length
    const skip = content.slice(0, taken).split('\n').length - 1
    const headings: ScannedHeading[] = []
    // The footnote and link definitions a heading's words may name, each line held to its first thousand characters.
    const definitions: string[] = []
    let fenced = false
    for (let index = skip; index < lines.length; index += 1) {
        const line = lines[index]
        if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
        if (fenced) continue
        if (/^ {0,3}\[[^\]\n]+\]:/.test(line.slice(0, HEADING_WORDS))) definitions.push(line.slice(0, HEADING_WORDS))
        const atx = atxHeading(line)
        const under = SETEXT.exec(lines[index + 1] ?? '')
        const before = index === skip ? '' : lines[index - 1]
        // A setext heading is one line of text after a blank one, never a list item or a quote.
        const setext =
            atx === null &&
            under !== null &&
            line.trim() !== '' &&
            before.trim() === '' &&
            !/^\s*([-*+>]|\d+[.)])(\s|$)/.test(line) &&
            !/^ {0,3}(<|\[[^\]\n]+\]:)/.test(line)
        if (atx === null && !setext) continue
        headings.push({
            line: index,
            level: atx === null ? (under?.[1].startsWith('=') === true ? 1 : 2) : atx.level,
            words: atx === null ? line.trim() : atx.text,
            setext: atx === null,
        })
    }
    return { lines, headings, definitions }
}

/**
 * The words each heading shows, as `Markdown` draws them: all read in one parse with the text's
 * footnote and link definitions, each heading's
 * words held to `HEADING_WORDS` (a longer one read by hand: its links as their words, marks left out).
 */
function headingWords(headings: readonly ScannedHeading[], definitions: readonly string[]): string[] {
    const short = headings.map((heading) => heading.words.length <= HEADING_WORDS)
    const written = (heading: ScannedHeading) => (heading.setext ? `${heading.words}\n---` : `# ${heading.words}`)
    const text = [...headings.map((heading, index) => (short[index] ? written(heading) : '# x')), ...definitions].join('\n\n')
    const read = parseTree(text, HEADING_RULES).children.filter((node) => node.type === 'heading')
    return headings.map((heading, index) =>
        short[index] && read[index] !== undefined
            ? treeText(read[index]).trim()
            : linkWords(heading.words)
                  .replace(/[`*_~]/g, '')
                  .trim(),
    )
}

/**
 * The headings of a markdown text, or of its tree, at the given levels, in order, outside code and
 * frontmatter: written with `#` or underlined with `===` or `---`. Each has the words it shows and the
 * id `anchors` gives it, a repeated heading numbered after the first. A text is read as `Markdown` reads
 * it with `links`, so a `[[link]]` in a heading is the words it shows.
 */
export function markdownHeadings(content: string | MarkdownTree, levels: readonly number[] = [2, 3]): MarkdownHeading[] {
    const unique = uniqueIds()
    if (typeof content !== 'string') {
        const out: MarkdownHeading[] = []
        for (const { node } of nodesOf(content as unknown as MarkdownNode)) {
            if (node.type !== 'heading') continue
            const label = treeText(node).trim()
            const id = unique(headingId(label))
            const level = Number(node.depth)
            if (levels.includes(level)) out.push({ id, label, level })
        }
        return out
    }
    const { headings, definitions } = scanHeadings(content)
    const words = headingWords(headings, definitions)
    return headings.flatMap((heading, index) => {
        const id = unique(headingId(words[index]))
        return levels.includes(heading.level) ? [{ id, label: words[index], level: heading.level }] : []
    })
}

/**
 * The text under one heading of a markdown text, named by its words or by the id `anchors` gives it
 * (`-1` and on for a repeated one): the heading and what follows, up to the next heading at its level
 * or above, outside code and frontmatter. Undefined when no heading has that name. For a
 * `![[Note#Heading]]` embed drawn by `links.embed`.
 */
export function markdownSection(content: string, heading: string): string | undefined {
    const { lines, headings, definitions } = scanHeadings(content)
    const words = headingWords(headings, definitions)
    const unique = uniqueIds()
    const ids = words.map((one) => unique(headingId(one)))
    const wanted = heading.trim().toLowerCase()
    const start = headings.findIndex((_, index) => words[index].toLowerCase() === wanted || ids[index] === wanted)
    if (start < 0) return undefined
    const level = headings[start].level
    const next = headings.find((one, index) => index > start && one.level <= level)
    return lines
        .slice(headings[start].line, next === undefined ? lines.length : next.line)
        .join('\n')
        .trimEnd()
}

/** The words markdown says: each callout's title, and the words of its code blocks and diagrams. */
export interface MarkdownWords extends Record<CalloutKind, string> {
    /** The words of each code block's copy button. */
    code: Partial<CodeBlockWords>
    /** The words of each diagram. */
    diagram: Partial<MermaidDiagramWords>
}

export const MARKDOWN_WORDS: MarkdownWords = {
    note: 'Note',
    tip: 'Tip',
    important: 'Important',
    warning: 'Warning',
    caution: 'Caution',
    code: {},
    diagram: {},
}

/** Where a catalog holds rendered markdown's words. */
export const MARKDOWN_PART: WordsPart<MarkdownWords> = { id: 'markdown', words: MARKDOWN_WORDS }

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

/** The app's own parts: a map by ID, or a function that draws the part an ID names. */
export type MarkdownParts = Readonly<Record<string, ReactNode>> | ((id: string) => ReactNode)

/**
 * Links between notes and tags on them, followed by the app: `[[Note]]`, `[[Note|words]]` and
 * `[[Note#Heading]]` call `onOpen`, and with `onTag` each `#tag` calls it.
 */
export interface MarkdownLinks {
    /** Follows a `[[link]]`: the note it names, and the heading after its `#`, if any. */
    onOpen: (target: string, heading?: string) => void
    /**
     * The address a `[[link]]` (and an embed's framed link) carries, such as `#/page/notes/a.md`,
     * so the browser can open it in a new tab or copy it. A plain press still calls `onOpen`; a
     * press with a modifier key or another button is the browser's. Without it, or when it returns
     * nothing, the link carries `#` and every press calls `onOpen`.
     */
    href?: (target: string, heading?: string) => string | undefined
    /** Whether the note a link names exists; a link to one that does not is drawn faint, so a press can offer to make it. */
    exists?: (target: string) => boolean
    /** Follows a `#tag`, named without its `#`; without it a tag stays text. */
    onTag?: (tag: string) => void
    /**
     * Draws a `![[Note]]` embed: the note it names and the heading after its `#` (`markdownSection`
     * gives the text under it), set off by a rule at its start. Without it, or when it returns
     * nothing, the embed is drawn as a link to the note in a frame of its own.
     */
    embed?: (target: string, heading?: string) => ReactNode
}

function partFor(parts: MarkdownParts | undefined, id: string): ReactNode {
    return typeof parts === 'function' ? parts(id) : parts?.[id]
}

/** The slice of mdast-util-to-hast's state the handlers below use. */
interface ToHast {
    all: (node: MarkdownNode) => HastNode[]
    one: (node: MarkdownNode, parent: MarkdownNode | undefined) => HastNode | HastNode[] | undefined
    wrap: (nodes: HastNode[], loose?: boolean) => HastNode[]
}

/** Draws one node of the tree as HTML. */
type TreeHandler = (state: ToHast, node: MarkdownNode, parent: MarkdownNode | undefined) => HastNode | HastNode[] | undefined

const element = (tagName: string, properties: Record<string, unknown>, children: HastNode[]): HastNode => ({
    type: 'element',
    tagName,
    properties,
    children,
})

/** Whether a node stands as a block: its parent holds blocks. */
const standsAlone = (parent: MarkdownNode | undefined) => parent !== undefined && BLOCK_CONTAINERS.has(parent.type)

/** The callout kinds a tree may name; any other is drawn as a quote. */
const KINDS: ReadonlySet<string> = new Set(['note', 'tip', 'important', 'warning', 'caution'])

/**
 * How the nodes linked notes add to mdast are drawn as HTML, by what the view follows: `[[links]]`
 * as links with `linked` (else their words), `#tags` as links with `tagged` (else their text), and
 * math for KaTeX with `math` (else as written, with its dollars). Each heading carries the words its
 * id is made of, which `rehypeDocument` reads and takes off.
 */
function treeHandlers(linked: boolean, tagged: boolean, math: boolean): Record<string, TreeHandler> {
    const noteLink = (state: ToHast, node: MarkdownNode) =>
        element('a', { href: '#', dataWikiLink: node.target, dataHeading: node.heading }, state.all(node))
    return {
        part: (_, node, parent) => element(standsAlone(parent) ? 'div' : 'span', { dataPart: node.id }, []),
        highlight: (state, node) => element('mark', { dataMarked: '' }, state.all(node)),
        wikiLink: (state, node) => (linked ? noteLink(state, node) : state.all(node)),
        tag: (_, node) => {
            const words: HastNode = { type: 'text', value: `#${String(node.tag)}` }
            return tagged ? element('a', { href: '#', dataTag: node.tag }, [words]) : words
        },
        embed: (state, node, parent) => {
            if (node.kind === 'image') {
                const properties: Record<string, unknown> = { dataEmbed: node.target }
                if (typeof node.width === 'number') properties.width = node.width
                if (typeof node.height === 'number') properties.height = node.height
                return state.one(
                    { type: 'image', url: String(node.target), alt: node.alt, title: null, data: { hProperties: properties } },
                    parent,
                )
            }
            if (node.kind === 'file')
                return state.one({ type: 'link', url: String(node.target), title: null, children: node.children }, parent)
            return element(
                standsAlone(parent) ? 'div' : 'span',
                { dataEmbed: node.target, dataHeading: node.heading },
                linked ? [noteLink(state, node)] : state.all(node),
            )
        },
        heading: (state, node) => {
            const depth = Math.min(6, Math.max(1, Number(node.depth) || 1))
            return element(`h${String(depth)}`, { dataHeadingText: treeText(node).trim() }, state.all(node))
        },
        callout: (state, node) => {
            if (!KINDS.has(String(node.kind))) return element('blockquote', {}, state.wrap(state.all(node), true))
            const [first, ...rest] = node.children ?? []
            const titled = first?.type === 'calloutTitle'
            const title = element('div', { dataCalloutTitle: node.kind }, titled ? state.all(first) : [])
            const body = state.all({ ...node, children: titled ? rest : (node.children ?? []) })
            const fold = node.fold === 'open' || node.fold === 'closed' ? node.fold : undefined
            return element('blockquote', { dataCallout: node.kind, dataFold: fold }, [title, ...state.wrap(body, true)])
        },
        inlineMath: (_, node) =>
            math
                ? element('code', { className: ['language-math', 'math-inline'] }, [{ type: 'text', value: node.value }])
                : { type: 'text', value: `$${node.value ?? ''}$` },
        math: (_, node) =>
            math
                ? element('pre', {}, [
                      element('code', { className: ['language-math', 'math-display'] }, [{ type: 'text', value: node.value }]),
                  ])
                : element('p', {}, [{ type: 'text', value: `$$\n${node.value ?? ''}\n$$` }]),
    }
}

/** Whether a tree holds math. */
function treeHasMath(tree: MarkdownTree): boolean {
    for (const { node } of nodesOf(tree as unknown as MarkdownNode)) if (node.type === 'math' || node.type === 'inlineMath') return true
    return false
}

/**
 * Gives headings ids when `anchors` is set, each once, from the words the tree's heading shows (as
 * `markdownHeadings` reads them), and takes those words off every heading.
 */
function rehypeDocument(anchors: boolean) {
    return () => (tree: HastNode) => {
        const unique = uniqueIds()
        const visit = (node: HastNode) => {
            if (node.tagName !== undefined && /^h[1-6]$/.test(node.tagName)) {
                const { dataHeadingText: words, ...rest } = node.properties ?? {}
                node.properties = anchors ? { ...rest, id: unique(headingId(typeof words === 'string' ? words : hastText(node))) } : rest
            }
            for (const child of node.children ?? []) visit(child)
        }
        visit(tree)
    }
}

/** The schemes a link may have when `linkSchemes` is not given: those react-markdown keeps, relative links among them. */
const DEFAULT_SCHEMES: readonly string[] = ['http', 'https', 'irc', 'ircs', 'mailto', 'xmpp', 'relative']

/** Schemes that run code or carry a document of their own where they open; a link to one is never live. */
const NEVER = new Set(['javascript', 'vbscript', 'data'])

/**
 * The scheme a link's address names, lowercased, read as a browser reads it once it has dropped
 * spaces and control characters: `relative` for a path, a query or a fragment, and `//` for an
 * address that starts with two slashes and takes only the page's scheme.
 */
function schemeOf(href: string): string {
    // oxlint-disable-next-line no-control-regex -- a browser skips these before it reads the scheme.
    const bare = href.replace(/[\u0000-\u0020\u007f]/g, '')
    if (/^[/\\]{2}/.test(bare)) return '//'
    const match = /^([a-z][a-z\d+.-]*):/i.exec(bare)
    return match === null ? 'relative' : match[1].toLowerCase()
}

/**
 * Whether a link with this address is drawn live under `linkSchemes`: its scheme is listed, or it is
 * relative and `relative` is listed. Without a list, react-markdown's safe schemes and relative links
 * are. An empty address, and a `javascript:`, `vbscript:` or `data:` one, never is; an address that
 * starts with `//` is only without a list.
 */
export function linkAllowed(href: string, schemes?: readonly string[]): boolean {
    if (href.trim() === '') return false
    const scheme = schemeOf(href)
    if (NEVER.has(scheme)) return false
    if (scheme === '//') return schemes === undefined
    return (schemes ?? DEFAULT_SCHEMES).some((listed) => listed.toLowerCase() === scheme)
}

/** Whether a press on a link is a plain one: the main button, no modifier key. Any other is the browser's (a new tab, a download). */
function plainPress(event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): boolean {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

/** Whether a link is one of the links between notes or a tag, which the app follows and which go nowhere themselves. */
function ownLink(properties: Record<string, unknown> | undefined): boolean {
    return properties?.href === '#' && (properties.dataWikiLink !== undefined || properties.dataTag !== undefined)
}

/** The elements that hold a block of their own, which `inline` lays out as their text. */
const BLOCKS = new Set([
    'address',
    'article',
    'aside',
    'blockquote',
    'dd',
    'details',
    'div',
    'dl',
    'dt',
    'figcaption',
    'figure',
    'footer',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hr',
    'li',
    'ol',
    'p',
    'pre',
    'section',
    'summary',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'ul',
])

/** The content of blocks as one run of text and inline elements, each block's content parted from the next by a space. */
function phrasing(nodes: HastNode[]): HastNode[] {
    const blocks = nodes.some((node) => node.type === 'element' && BLOCKS.has(node.tagName ?? ''))
    const out: HastNode[] = []
    for (const node of nodes) {
        if (blocks && node.type === 'text' && (node.value ?? '').trim() === '') continue
        if (node.type !== 'element' || !BLOCKS.has(node.tagName ?? '')) {
            out.push(node)
            continue
        }
        if (node.tagName === 'div' && (node.properties?.dataPart !== undefined || node.properties?.dataEmbed !== undefined)) {
            out.push({ ...node, tagName: 'span' })
            continue
        }
        const inner = node.tagName === 'pre' ? [{ type: 'text', value: hastText(node).replace(/\n$/, '') }] : phrasing(node.children ?? [])
        if (inner.length === 0) continue
        if (out.length > 0) out.push({ type: 'text', value: ' ' })
        out.push(...inner)
    }
    return out
}

/** Whether a table row's cells are all empty: no text and no image. */
function emptyRow(row: HastNode): boolean {
    const cells = (row.children ?? []).filter((cell) => cell.type === 'element')
    const holdsImage = (node: HastNode): boolean => node.tagName === 'img' || (node.children ?? []).some(holdsImage)
    return cells.every((cell) => hastText(cell).trim() === '' && !holdsImage(cell))
}

/** What `rehypeText` changes, from the view's props. */
interface TextRules {
    images: boolean
    schemes: readonly string[] | undefined
    inline: boolean
    headingOffset: number
    /** False: every link becomes its words. */
    live: boolean
    resolveUrl: MarkdownUrlResolver | undefined
}

/**
 * Holds a text to what the app lets it draw: each link's address goes through `resolveUrl` first,
 * then a link whose scheme is not allowed becomes its words,
 * an image its alt text and address when images are off, headings move down by `headingOffset`, a
 * table's header row of empty cells is dropped, with `inline` every block is laid out as its text,
 * and without `live` every link becomes its words.
 */
function rehypeText({ images, schemes, inline, headingOffset, live, resolveUrl }: TextRules) {
    const replace = (node: HastNode): HastNode[] => {
        if (node.type !== 'element') return [node]
        const tag = node.tagName ?? ''
        if (tag === 'a' && !live) return node.children ?? []
        if (resolveUrl !== undefined && tag === 'a' && typeof node.properties?.href === 'string' && !ownLink(node.properties)) {
            node.properties.href = resolveUrl(node.properties.href, 'link')
        }
        if (tag === 'a' && !ownLink(node.properties) && !linkAllowed(String(node.properties?.href ?? ''), schemes)) {
            return node.children ?? []
        }
        if (!images && tag === 'img') {
            const alt = String(node.properties?.alt ?? '').trim()
            const src = String(node.properties?.src ?? '').trim()
            const value = alt !== '' && src !== '' ? `${alt} (${src})` : alt || src
            return value === '' ? [] : [{ type: 'text', value }]
        }
        if (!images && tag === 'source') return []
        if (!images && tag === 'picture') return node.children ?? []
        if (headingOffset > 0 && /^h[1-6]$/.test(tag)) node.tagName = `h${Math.min(6, Number(tag[1]) + headingOffset)}`
        if (tag === 'table') {
            node.children = node.children?.filter((part) => {
                if (part.tagName !== 'thead') return true
                return !(part.children ?? []).filter((row) => row.tagName === 'tr').every(emptyRow)
            })
        }
        return [node]
    }
    const visit = (node: HastNode) => {
        if (node.children === undefined) return
        node.children = node.children.flatMap((child) => {
            visit(child)
            return replace(child)
        })
    }
    return () => (tree: HastNode) => {
        visit(tree)
        if (inline) tree.children = phrasing(tree.children ?? [])
    }
}

/** Marks each place the words stand in the text's own words, in any case, outside code and math. */
function rehypeHighlight(words: string) {
    const needle = words.trim().toLowerCase()
    const mark = highlightMark()
    const split = (value: string): HastNode[] => {
        const lower = value.toLowerCase()
        const out: HastNode[] = []
        let at = 0
        for (let from = lower.indexOf(needle); from !== -1; from = lower.indexOf(needle, from + needle.length)) {
            if (from > at) out.push({ type: 'text', value: value.slice(at, from) })
            out.push({
                type: 'element',
                tagName: 'mark',
                properties: { className: mark },
                children: [{ type: 'text', value: value.slice(from, from + needle.length) }],
            })
            at = from + needle.length
        }
        if (out.length === 0) return [{ type: 'text', value }]
        if (at < value.length) out.push({ type: 'text', value: value.slice(at) })
        return out
    }
    const skipped = (node: HastNode) =>
        /^(code|pre)$/.test(node.tagName ?? '') ||
        (node.tagName === 'mark' && node.properties?.dataMarked === undefined) ||
        String(node.properties?.className ?? '').includes('katex')
    const visit = (node: HastNode) => {
        if (node.children === undefined || skipped(node)) return
        node.children = node.children.flatMap((child) => {
            if (child.type === 'text') return split(child.value ?? '')
            visit(child)
            return [child]
        })
    }
    return () => (tree: HastNode) => {
        if (needle !== '') visit(tree)
    }
}

/** What `allowHtml` reads and cleans raw HTML with, loaded the first time a text allows it. */
type HtmlEngine = typeof import('../lib/markdown-html')

let html: Promise<HtmlEngine> | undefined
let htmlReady: HtmlEngine | undefined

/**
 * Loads what `allowHtml` reads raw HTML with (rehype-raw and rehype-sanitize), once, and resolves
 * when it is ready. A text with `allowHtml` loads it itself and draws its words without the tags
 * until then; an app that knows such a text is coming can call it ahead, so it draws whole at once.
 */
export function loadHtml(): Promise<void> {
    html ??= import('../lib/markdown-html').then(
        (module) => {
            htmlReady = module
            return module
        },
        (error: unknown) => {
            html = undefined
            throw error
        },
    )
    return html.then(() => undefined)
}

/** The HTML engine once a text has allowed HTML, loaded on the first such text and shared by the rest. */
function useHtmlEngine(needed: boolean): HtmlEngine | undefined {
    const [loaded, setLoaded] = useState<HtmlEngine | undefined>(htmlReady)
    useEffect(() => {
        if (!needed || loaded !== undefined) return
        let live = true
        loadHtml().then(
            () => {
                if (live) setLoaded(htmlReady)
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [needed, loaded])
    return needed ? (loaded ?? htmlReady) : undefined
}

/** The math engine `Markdown` draws formulas with, handed to the view so this module never names it. */
export type MathEngine = Pick<typeof import('../lib/katex'), 'remarkMath' | 'rehypeKatex'>

/** A diagram drawn from a `mermaid` fence, handed to the view so this module never names the engine. */
export type DiagramRenderer = ComponentType<{ code: string; streaming: boolean; words: Partial<MermaidDiagramWords> }>

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

/** The type of a block of text; an `inline` line takes its container's instead. */
const PROSE_TYPE = 'text-sm leading-relaxed text-foreground'

const PROSE = cn(
    'min-w-0 break-words',
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
    '[&_mark[data-marked]]:rounded-mini [&_mark[data-marked]]:bg-warning/25 [&_mark[data-marked]]:box-decoration-clone [&_mark[data-marked]]:text-inherit',
)

/** How code inside a sentence is drawn. */
export type MarkdownInlineCode = 'chip' | 'plain' | 'wash'

/**
 * `chip` fills each value; `plain` sets it in the code face alone; `wash` gives it a faint fill
 * with no padding to speak of and drops the fill in a table, whose cells already set the values
 * apart.
 */
/** Paragraphs, lists, quotes and headings held to the reading measure; tables, code, diagrams, math and parts keep the full width. */
const MEASURE = '[&>:is(p,ul,ol,dl,blockquote,h1,h2,h3,h4,h5,h6)]:max-w-(--reading-measure)'

const INLINE_CODE: Record<MarkdownInlineCode, string> = {
    chip: '[&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1',
    plain: '[&_td]:tabular-nums',
    wash: '[&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:bg-secondary [&_:not(pre)>code]:px-0.5 [&_td_code]:bg-transparent [&_td_code]:px-0',
}

/**
 * A text caret where the next words will land: after the last paragraph or list item, in the last
 * cell of a table's last row, or at the end of a code block's last line.
 */
const CARET =
    '[:is(&>p:last-child,&>:is(ol,ul):last-child>li:last-child,&>table:last-child>:last-child>tr:last-child>:last-child,&>[data-slot=code-block]:last-child_[data-slot=code-block-line]:last-child>*)]:after:ml-0.5 [:is(&>p:last-child,&>:is(ol,ul):last-child>li:last-child,&>table:last-child>:last-child>tr:last-child>:last-child,&>[data-slot=code-block]:last-child_[data-slot=code-block-line]:last-child>*)]:after:inline-block [:is(&>p:last-child,&>:is(ol,ul):last-child>li:last-child,&>table:last-child>:last-child>tr:last-child>:last-child,&>[data-slot=code-block]:last-child_[data-slot=code-block-line]:last-child>*)]:after:h-4 [:is(&>p:last-child,&>:is(ol,ul):last-child>li:last-child,&>table:last-child>:last-child>tr:last-child>:last-child,&>[data-slot=code-block]:last-child_[data-slot=code-block-line]:last-child>*)]:after:w-1.5 [:is(&>p:last-child,&>:is(ol,ul):last-child>li:last-child,&>table:last-child>:last-child>tr:last-child>:last-child,&>[data-slot=code-block]:last-child_[data-slot=code-block-line]:last-child>*)]:after:translate-y-0.5 [:is(&>p:last-child,&>:is(ol,ul):last-child>li:last-child,&>table:last-child>:last-child>tr:last-child>:last-child,&>[data-slot=code-block]:last-child_[data-slot=code-block-line]:last-child>*)]:after:animate-pulse [:is(&>p:last-child,&>:is(ol,ul):last-child>li:last-child,&>table:last-child>:last-child>tr:last-child>:last-child,&>[data-slot=code-block]:last-child_[data-slot=code-block-line]:last-child>*)]:after:bg-foreground motion-reduce:[:is(&>p:last-child,&>:is(ol,ul):last-child>li:last-child,&>table:last-child>:last-child>tr:last-child>:last-child,&>[data-slot=code-block]:last-child_[data-slot=code-block-line]:last-child>*)]:after:animate-none'

/** What an address in the text is for: an image's source, or a link's target. */
export type MarkdownUrlUse = 'image' | 'link'

/** Rewrites an address in the text before it is drawn, such as a relative path to the app's own server. */
export type MarkdownUrlResolver = (url: string, use: MarkdownUrlUse) => string

/** What becomes of a text's frontmatter: left out, shown as YAML above the text, or read as markdown. */
export type MarkdownFrontmatter = 'hide' | 'show' | 'markdown'

export interface MarkdownProps {
    /** The text, as written. */
    content?: string
    /**
     * The text already read into its tree, as `parseMarkdown` from `lib/markdown-tree` reads it (on a
     * server, once for every renderer): drawn in place of `content`, with nothing read again. The tree
     * holds what the text says; what the app allows (`links`, `images`, `linkSchemes`, `resolveUrl`,
     * `live`, `allowHtml`) is held as it is drawn, as for text. It draws as its text does with `links`
     * (and `onTag`) given; without them a `[[link]]` is its words and a `#tag` its text, and an image
     * embed still an image (`images={false}` holds it to text). Its math is drawn as written where
     * `math` is off. `frontmatter="markdown"` and `partMarker` are the reader's, so a tree keeps what it
     * was read with. No node's `data` is drawn: only text read here may name an element.
     */
    tree?: MarkdownTree
    /**
     * What becomes of a YAML frontmatter block at the top of the text (`---` on the first line, closed
     * by `---` or `...`, every line between reading as properties, so a text that opens with a rule
     * and a sentence keeps them): left out (the default), shown as YAML code above the text, or read
     * as markdown, as CommonMark reads it, a rule and a heading.
     */
    frontmatter?: MarkdownFrontmatter
    /**
     * Rewrites each image's and link's address before it is drawn, its use naming which: a relative
     * path such as `attachments/pic.png` pointed at the app's own server. It gets the address as the
     * text has it, percent-encoded; links between notes and tags never come here. A link's result is
     * then held to `linkSchemes`; an image's may be a `blob:` or `data:image/` address, which the text
     * itself can never give. Pass the same function each render, or each render parses again.
     */
    resolveUrl?: MarkdownUrlResolver
    streaming?: boolean
    /** Reads raw HTML in the text and sanitizes it; off, it is shown as typed. */
    allowHtml?: boolean
    /** Draws images; off, an image is its alt text and address as plain text, and nothing is fetched. On by default. */
    images?: boolean
    /**
     * The schemes a link may have to be drawn live, such as `['https', 'mailto']`, with `relative`
     * for a path, a query or a fragment. Any other link is drawn as its words. By default http,
     * https, irc, ircs, mailto, xmpp and relative links are live. A `javascript:` link never is.
     */
    linkSchemes?: readonly string[]
    /**
     * Draws only the content of paragraphs, for one line of help, in a span that takes its container's
     * type and color: a block in the text is laid out as its text.
     */
    inline?: boolean
    /** Moves every heading down this many levels, to h6 at most, so a `#` in a text set under a page's own headings is no second h1. */
    headingOffset?: number
    /** Gives every heading an id made from its text. */
    anchors?: boolean
    /** How code inside a sentence is drawn: filled chips by default. */
    inlineCode?: MarkdownInlineCode
    /** A caret after the last words while `streaming`. */
    caret?: boolean
    /** Draws LaTeX math with KaTeX, loaded the first time a message holds math. On by default. */
    math?: boolean
    /** Heading sizes: within a message (the default), or a document's from a page title down. */
    scale?: 'message' | 'document'
    /**
     * Holds paragraphs, lists, quotes and headings to a reading measure (`--reading-measure`, 68
     * characters), while tables, code, diagrams, math and parts keep the full width: a document
     * read in a wide pane. Off, every block takes the full width, as a message in a narrow column does.
     */
    measure?: boolean
    /** The app's own parts by ID, a map or a function, each drawn where the text has the marker `<!-- part:ID -->`. */
    parts?: MarkdownParts
    /** The word a part's marker starts with: `part` by default. */
    partMarker?: string
    /** Draws `[[links]]` between notes, and `#tags` with `onTag`, as links the app follows. */
    links?: MarkdownLinks
    /**
     * False draws every link as its words, a `[[link]]` as the words it shows, for a text set inside
     * something pressed as a whole, such as a backlink's line in a row that opens its note.
     */
    live?: boolean
    /** Marks each place these words stand in the text, in any case and outside code, as a search's matches are marked. */
    highlight?: string
    /**
     * Follows a link inside the app: called with a link's address on a plain press, which stays in
     * the page when it answers true, such as a time in an episode's notes (`#t=754`) or a route of
     * the app's own. Any other link opens in a new tab.
     */
    onLink?: (href: string) => boolean
    className?: string
    words?: Partial<MarkdownWords>
}

/**
 * GitHub-flavored markdown, as an assistant or a description writes it: fenced code highlighted
 * with a copy button, mermaid fences drawn as diagrams, links opening in a new tab (a link to a
 * place in the page, `#…`, staying in it), and a quote
 * whose first line is `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` drawn as
 * a callout. Raw HTML is escaped and shown as typed unless `allowHtml` is set; then it is read and
 * sanitized, with rehype-raw and rehype-sanitize loaded the first time a text allows it. While
 * `streaming`, a mermaid fence shows its source until the message completes, and a `$$` block its
 * source until it closes.
 *
 * `math` (on by default) draws LaTeX with KaTeX: `$…$` and `\(…\)` inline, `$$…$$`, `\[…\]` and a
 * `math` fence on a line of their own. KaTeX loads the first time a message holds math, its
 * stylesheet with it. A single `$` is math only as Pandoc reads it (a non-space after the opening
 * one, a non-space before the closing one and no digit after it, on one line), so "costs $5 and
 * $10" stays prices; turn `math` off where every `$` is a dollar. A formula KaTeX cannot read shows
 * its source in the error color.
 *
 * `anchors` gives each heading the id `headingId` makes of its text, for a table of contents to
 * link to, a repeated heading numbered after the first (`-1`, `-2`); `markdownHeadings` lists the
 * same ids from the source.
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
 *
 * `links` draws the links of linked notes: `[[Note]]` as a link to the note of that name,
 * `[[Note|words]]` showing the words, `[[Note#Heading]]` naming the heading too, each followed by
 * `onOpen`, and a link to a note `exists` says is not there drawn faint. With `onTag` each `#tag` is
 * a chip that follows the tag. Neither is read in code. `wikiLinksIn` and `tagsIn` in
 * `lib/wiki-links` read the same links and tags from the text, for backlinks and a list of tags.
 *
 * `onLink` keeps the links the app answers for in the page, such as the times in a podcast's show
 * notes, which seek the player; a press with a modifier key, or on a link it declines, opens a new tab.
 * `live={false}` draws every link as its words, a `[[link]]` as the words it shows, for a text set
 * inside something pressed as a whole, and `highlight` marks where some words stand, as a search's
 * matches are marked: a backlink's line drawn in the row that opens its note.
 *
 * For text other people wrote, `images={false}` draws each image as its alt text and address, so
 * nothing is fetched, and `linkSchemes` lists the schemes a link may have to be live, `relative`
 * standing for a path, a query or a fragment: any other link is drawn as its words, with no anchor.
 * An address starting with `//` leaves the app on the page's scheme, so it is live only without a
 * list, and a `javascript:`, `vbscript:` or `data:` link never is. `headingOffset` moves headings
 * down, so `#` in a text set under the page's own headings is no second h1, and `inline` draws only
 * the content of paragraphs, for one line of help, laying out any block as its text. A table whose
 * header cells are all empty, as a key/value table written `| | |` has, is drawn without the header.
 *
 * Linked notes are read as their vaults write them. A YAML frontmatter block at the top is left out
 * (`frontmatter="show"` draws it as YAML code above the text, and `splitFrontmatter` hands it to the
 * app to read), and an HTML comment is never drawn, HTML allowed or not. A callout's marker may be
 * followed by its title (`> [!warning] Before a rerun`) and by `-` or `+`, which folds it closed or
 * open under its title; the further markers notes use (`info`, `todo`, `success`, `question`,
 * `danger`, `bug` and the like) draw as the nearest of the five kinds, titled with the marker's own
 * word, and any other marker leaves a quote. `==words==` is drawn highlighted. With `links`,
 * `![[Note]]` embeds a note, drawn by `links.embed` or as a link in a frame, `![[chart.png|300]]`
 * draws an image 300 wide, and `![[file.pdf]]` links to the file. `resolveUrl` rewrites each image's
 * and link's address first, such as a relative path to the app's own server. A `%% comment %%` is
 * hidden, as an HTML comment is. Not read, and so shown as typed: inline footnotes `^[...]` and block
 * ids `^id`; a single line break stays a space, as CommonMark has it.
 *
 * `measure` holds the prose to a reading measure in a wide pane, tables and code keeping the full width.
 */
export type MarkdownViewProps = MarkdownProps & {
    /** Loads the math engine when a text needs it, called on every render of the view. */
    useMath?: (needed: boolean) => MathEngine | undefined
    /** Draws a `mermaid` fence as a diagram. */
    Diagram?: DiagramRenderer
}

/** What the renderers read from the view drawing them, so they stay the same components as it changes. */
interface ViewContext {
    streaming: boolean
    words: MarkdownWords
    parts: MarkdownParts | undefined
    links: MarkdownLinks | undefined
    /** The latest `onLink`, read on a press. */
    follow: { readonly current: ((href: string) => boolean) | undefined }
    following: boolean
    Diagram: DiagramRenderer | undefined
}

const View = createContext<ViewContext>({
    streaming: false,
    words: MARKDOWN_WORDS,
    parts: undefined,
    links: undefined,
    follow: { current: undefined },
    following: false,
    Diagram: undefined,
})

/**
 * A `![[Note]]` embed: what the app's `embed` draws for it, or its link in a frame of its own, as a
 * block where it stands alone in a paragraph and inline where it sits in a sentence.
 */
function Embed({
    target,
    heading,
    links,
    block = false,
    children,
}: {
    target: string
    heading: string | undefined
    links: MarkdownLinks | undefined
    block?: boolean
    children: ReactNode
}) {
    const drawn = links?.embed?.(target, heading)
    const Tag = block ? 'div' : 'span'
    if (drawn !== undefined && drawn !== null && drawn !== false) {
        return (
            <Tag data-embed={target} className={cn(block && 'my-3 block border-l-2 border-border-strong pl-3 [&>*:first-child]:mt-0')}>
                {drawn}
            </Tag>
        )
    }
    return (
        <Tag data-embed={target} className={cn('rounded-sm border border-border px-1', block && 'my-2 inline-block')}>
            {children}
        </Tag>
    )
}

/**
 * How each element is drawn. One map for every view: what changes between views and renders comes
 * through `View`, so a code block, a diagram or a part keeps its place in the tree as a reply
 * finishes streaming or the parent hands new `parts` or `links`.
 */
export const MARKDOWN_COMPONENTS: Components = {
    blockquote: function Blockquote({ children, node: _node, ...props }) {
        const record = props as Record<string, unknown>
        const kind = record['data-callout'] as CalloutKind | undefined
        const fold = record['data-fold'] as 'open' | 'closed' | undefined
        // A kind raw HTML may name too, so only the five are read.
        const callout = kind !== undefined && Object.hasOwn(CALLOUTS, kind) ? CALLOUTS[kind] : undefined
        if (kind === undefined || callout === undefined) return <blockquote {...props}>{children}</blockquote>
        const Icon = callout.icon
        const icon = <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', callout.ink)} />
        const frame = cn('my-3 rounded-surface border px-3 py-2.5 [&_p]:my-1', callout.frame)
        if (fold === undefined) {
            return (
                <div data-callout={kind} className={cn('flex gap-2.5 [&>div>*:last-child]:mb-0', frame)}>
                    {icon}
                    <div className="min-w-0 flex-1">{children}</div>
                </div>
            )
        }
        // The title, drawn first, is what a press folds and unfolds by.
        const [title, ...body] = Children.toArray(children).filter((child) => typeof child !== 'string' || child.trim() !== '')
        return (
            <details data-callout={kind} open={fold === 'open'} className={cn('group', frame)}>
                <summary className="flex cursor-pointer list-none gap-2.5 [&::-webkit-details-marker]:hidden">
                    {icon}
                    <span className="min-w-0 flex-1 [&>p]:!my-0">{title}</span>
                    <ChevronRight
                        aria-hidden
                        className={cn('mt-0.5 size-4 shrink-0 transition-transform group-open:rotate-90', callout.ink)}
                    />
                </summary>
                <div className="min-w-0 pl-6.5 [&>*:last-child]:mb-0">{body}</div>
            </details>
        )
    },
    div: function Div({ children, node: _node, ...props }) {
        const { parts, words, links } = useContext(View)
        const record = props as Record<string, unknown>
        const titled = record['data-callout-title'] as CalloutKind | undefined
        if (titled !== undefined) {
            const written = Children.count(children) > 0
            if (Object.hasOwn(CALLOUTS, titled))
                return <p className={cn('!mt-0 font-medium', CALLOUTS[titled].ink)}>{written ? children : words[titled]}</p>
        }
        const embed = record['data-embed'] as string | undefined
        if (embed !== undefined)
            return (
                <Embed target={embed} heading={record['data-heading'] as string | undefined} links={links} block>
                    {children}
                </Embed>
            )
        const part = record['data-part'] as string | undefined
        if (part === undefined) return <div {...props}>{children}</div>
        const drawn = partFor(parts, part)
        if (drawn === undefined || drawn === null) return null
        return (
            <div data-part={part} className="my-3">
                {drawn}
            </div>
        )
    },
    span: function Span({ children, node: _node, ...props }) {
        const { parts, links } = useContext(View)
        const record = props as Record<string, unknown>
        const embed = record['data-embed'] as string | undefined
        if (embed !== undefined)
            return (
                <Embed target={embed} heading={record['data-heading'] as string | undefined} links={links}>
                    {children}
                </Embed>
            )
        const part = record['data-part'] as string | undefined
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
    a: function Anchor({ children, node: _node, ...props }) {
        const { links, follow, following } = useContext(View)
        const record = props as Record<string, unknown>
        const target = record['data-wiki-link'] as string | undefined
        const tag = record['data-tag'] as string | undefined
        if (target !== undefined && links !== undefined) {
            const heading = record['data-heading'] as string | undefined
            const given = links.href?.(target, heading)
            // The address comes from the app, but the target in it from the text, so it is held to the link schemes too.
            const address = given !== undefined && linkAllowed(given) ? given : undefined
            return (
                <a
                    {...props}
                    href={address ?? '#'}
                    className={cn(links.exists?.(target) === false && 'opacity-60')}
                    onClick={(event) => {
                        if (address !== undefined && !plainPress(event)) return
                        event.preventDefault()
                        links.onOpen(target, heading)
                    }}
                >
                    {children}
                </a>
            )
        }
        if (tag !== undefined && links?.onTag !== undefined) {
            const onTag = links.onTag
            return (
                <a
                    {...props}
                    // The chip carries no underline, which the text's links take from the block around them.
                    style={{ textDecorationLine: 'none' }}
                    className="rounded-sm bg-primary/12 px-1"
                    onClick={(event) => {
                        event.preventDefault()
                        onTag(tag)
                    }}
                >
                    {children}
                </a>
            )
        }
        if (typeof props.href !== 'string' || props.href === '') return <>{children}</>
        // A link to a place in the page stays in it; any other opens in a new tab.
        const away = !props.href.startsWith('#')
        return (
            <Link
                {...props}
                target={away ? '_blank' : undefined}
                rel={away ? 'noreferrer noopener' : undefined}
                onClick={
                    following
                        ? (event) => {
                              const href = event.currentTarget.getAttribute('href')
                              if (plainPress(event) && href !== null && follow.current?.(href) === true) event.preventDefault()
                          }
                        : undefined
                }
            >
                {children}
            </Link>
        )
    },
    pre: function Pre({ children }) {
        const { streaming, words, Diagram } = useContext(View)
        const { language, value } = fence(children)
        if (language === 'mermaid' && Diagram !== undefined) {
            return (
                <div className="mermaid-block">
                    <Diagram code={value} streaming={streaming} words={words.diagram} />
                </div>
            )
        }
        return <Code value={value} language={language} words={words.code} />
    },
}

/**
 * `Markdown` as drawn, given its engines: `useMath` loads math when a text needs it, `Diagram` draws
 * a `mermaid` fence. Without them math stays text and a `mermaid` fence is code, and nothing of
 * KaTeX or Mermaid is named, so a build that never passes them carries neither.
 */
export const MarkdownView = memo(function MarkdownView({
    useMath,
    Diagram,
    content = '',
    tree,
    frontmatter = 'hide',
    resolveUrl,
    streaming = false,
    allowHtml = false,
    images = true,
    linkSchemes,
    inline = false,
    headingOffset = 0,
    anchors = false,
    inlineCode = 'chip',
    caret = false,
    math = true,
    scale = 'message',
    measure = false,
    parts,
    partMarker: word = 'part',
    links,
    live = true,
    highlight = '',
    onLink,
    className,
    words: givenWords,
}: MarkdownViewProps) {
    // The words are held by their text, so an object made anew each render keeps the context.
    const said = JSON.stringify(givenWords ?? null)
    const own = useWords(MARKDOWN_PART)
    const words = useMemo<MarkdownWords>(() => ({ ...own, ...(JSON.parse(said) as Partial<MarkdownWords> | null) }), [own, said])
    // The latest handler, read on a press, so a handler made anew each render keeps the context.
    const follow = useRef(onLink)
    follow.current = onLink
    const following = onLink !== undefined
    const view = useMemo<ViewContext>(
        () => ({ streaming, words, parts, links, follow, following, Diagram }),
        [streaming, words, parts, links, following, Diagram],
    )
    // While streaming, the text drawn trails the text given when React is busy, so tokens that land
    // faster than a parse are drawn together rather than one parse each.
    const deferred = useDeferredValue(content)
    const given = streaming ? deferred : content
    const needsMath = useMemo(
        () => math && useMath !== undefined && (tree === undefined ? hasMath(given) : treeHasMath(tree)),
        [math, useMath, tree, given],
    )
    // The same hook every render of a view: `Markdown` always passes one, `PlainMarkdown` never does.
    const katex = useMath?.(needsMath)
    // Without `live` the links between notes are read too, so each is drawn as the words it shows.
    const linked = links !== undefined || !live
    const tagged = live && links?.onTag !== undefined
    const reader = math && katex !== undefined ? katex.remarkMath : undefined
    // The tree, read once while the text and what it is read by stand: a render for anything else (a
    // highlight, a caret, a scheme) draws it again without reading it again.
    const parsed = useMemo(
        () =>
            tree ??
            parseTree(given, {
                math: reader,
                normalizeMath: math && useMath !== undefined,
                streaming,
                frontmatter: frontmatter !== 'markdown',
                wikiLinks: linked,
                tags: tagged,
                partMarker: word,
                positions: false,
            }),
        [tree, given, reader, math, useMath, streaming, frontmatter, linked, tagged, word],
    )
    // A tree given from elsewhere is rebuilt from what a node may hold; one read here is that already.
    const safe = useMemo(() => (tree === undefined ? parsed : cleanTree(parsed)), [tree, parsed])
    const yaml = safe.children[0]?.type === 'yaml' ? (safe.children[0].value ?? '') : undefined
    // A copy for each draw, with no node's `data` kept: a given tree names what is drawn only through its nodes.
    const remark: Options['remarkPlugins'] = useMemo(() => [() => () => structuredClone(safe)], [safe])
    const mathDrawn = math && useMath !== undefined
    const toHast = useMemo(
        () => ({ handlers: treeHandlers(linked, tagged, mathDrawn) }) as Options['remarkRehypeOptions'],
        [linked, tagged, mathDrawn],
    )
    const htmlEngine = useHtmlEngine(allowHtml)
    // The schemes are held by their text, so a list made anew each render keeps the plugins.
    const schemesKey = JSON.stringify(linkSchemes ?? null)
    const schemes = useMemo(() => (JSON.parse(schemesKey) as readonly string[] | null) ?? undefined, [schemesKey])
    const offset = Math.max(0, Math.floor(headingOffset))
    const rehype = useMemo(() => {
        const plugins: NonNullable<Options['rehypePlugins']> = []
        if (allowHtml && htmlEngine !== undefined) {
            plugins.push(htmlEngine.rehypeRaw, [htmlEngine.rehypeSanitize, htmlEngine.schemaWithSchemes(schemes)])
        }
        // After sanitizing, so KaTeX's own markup is kept.
        if (katex !== undefined && math) plugins.push([katex.rehypeKatex, { throwOnError: false, errorColor: 'var(--status-failed-ink)' }])
        plugins.push(rehypeText({ images, schemes, inline, headingOffset: offset, live, resolveUrl }))
        plugins.push(rehypeDocument(anchors))
        if (highlight.trim() !== '') plugins.push(rehypeHighlight(highlight))
        return plugins
    }, [allowHtml, htmlEngine, anchors, katex, math, images, schemes, inline, offset, live, highlight, resolveUrl])
    const urlTransform = useCallback<UrlTransform>(
        (url, key, node) => {
            if (key === 'src' && node.tagName === 'img' && resolveUrl !== undefined) {
                const resolved = resolveUrl(url, 'image')
                // An image the app itself points at a blob or a data image is drawn; the text alone never can.
                const own = resolved !== url && !/^(blob|data):/i.test(url.trim())
                return own && /^(blob:|data:image\/)/i.test(resolved) ? resolved : defaultUrlTransform(resolved)
            }
            if (key !== 'href' || node.tagName !== 'a') return defaultUrlTransform(url)
            return ownLink(node.properties) || linkAllowed(url, schemes) ? url : ''
        },
        [schemes, resolveUrl],
    )
    const skipHtml = allowHtml && htmlEngine === undefined
    // Held while the text and its plugins stand, so a render for anything else (a deferred token, a
    // caret) draws no parse.
    const drawn = useMemo(
        () => (
            <ReactMarkdown
                remarkPlugins={remark}
                remarkRehypeOptions={toHast}
                rehypePlugins={rehype}
                components={MARKDOWN_COMPONENTS}
                urlTransform={urlTransform}
                // Until the HTML engine loads, the tags are left out rather than shown as typed.
                skipHtml={skipHtml}
            >
                {''}
            </ReactMarkdown>
        ),
        [remark, toHast, rehype, urlTransform, skipHtml],
    )
    const Root = inline ? 'span' : 'div'
    return (
        <Root
            data-settling={(needsMath && katex === undefined) || (allowHtml && htmlEngine === undefined) ? '' : undefined}
            className={cn(
                PROSE,
                !inline && PROSE_TYPE,
                HEADINGS[scale],
                INLINE_CODE[inlineCode],
                measure && !inline && MEASURE,
                caret && streaming && CARET,
                className,
            )}
        >
            {frontmatter === 'show' && !inline && yaml !== undefined ? <Code value={yaml} language="yaml" words={words.code} /> : null}
            <View.Provider value={view}>{drawn}</View.Provider>
        </Root>
    )
})
