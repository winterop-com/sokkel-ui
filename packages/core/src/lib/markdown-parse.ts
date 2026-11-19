/**
 * A markdown text read into its tree: mdast, as remark reads CommonMark and GitHub-flavored markdown
 * (and math, when a math reader is given), with the nodes linked notes add. It names no React, so a
 * server reads text into the same tree `Markdown` draws. The tree holds what the text says, never what
 * an app allows: links, images and schemes are held when the tree is drawn.
 *
 * The nodes it adds to mdast, each a plain object with no `data`:
 *
 *   yaml          { value, properties? }  the frontmatter, first in the root
 *   callout       { kind, marker, fold?, children: [calloutTitle?, ...blocks] }
 *   calloutTitle  { children: phrasing }
 *   wikiLink      { target, heading?, label?, children: the words shown }
 *   embed         { kind: 'note', target, heading?, children }  a block where it stands alone
 *                 { kind: 'image', target, alt, width?, height? }
 *                 { kind: 'file', target, children }
 *   tag           { tag }
 *   highlight     { children: phrasing }
 *   part          { id }  a block in a block container, inline in a sentence
 *
 * HTML comments are dropped. Positions are dropped unless asked for.
 */

import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified, type Pluggable } from 'unified'

import { normalizeMath } from './math'
import { readWikiLink, tagMatches, wikiLinksIn } from './wiki-links'

/** A node of the tree: mdast's, or one of those linked notes add. */
export interface MarkdownNode {
    type: string
    children?: MarkdownNode[]
    value?: string
    [field: string]: unknown
}

/** A text read into its tree. */
export interface MarkdownTree {
    type: 'root'
    children: MarkdownNode[]
    position?: unknown
}

/** The kinds of callout a quote becomes when its first line is `[!NOTE]`, `[!TIP]` and so on. */
export type CalloutKind = 'note' | 'tip' | 'important' | 'warning' | 'caution'

/**
 * The kind each callout marker draws: GitHub's five as themselves, and the further markers linked
 * notes use, each as the one of the five nearest it. Any other marker leaves the quote a quote.
 */
export const CALLOUT_MARKERS: Readonly<Record<string, CalloutKind>> = {
    note: 'note',
    info: 'note',
    todo: 'note',
    abstract: 'note',
    summary: 'note',
    tldr: 'note',
    example: 'note',
    quote: 'note',
    cite: 'note',
    tip: 'tip',
    hint: 'tip',
    success: 'tip',
    check: 'tip',
    done: 'tip',
    important: 'important',
    question: 'important',
    help: 'important',
    faq: 'important',
    warning: 'warning',
    attention: 'warning',
    caution: 'caution',
    danger: 'caution',
    error: 'caution',
    failure: 'caution',
    fail: 'caution',
    missing: 'caution',
    bug: 'caution',
}

/** A frontmatter block: `---` on the first line, then anything, closed by `---` or `...` on a line of its own. */
const FRONTMATTER = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/

/**
 * Whether a block reads as YAML properties: each line blank, a comment, indented under the line
 * before, a list item, or a key without spaces and a colon. A text that opens with a rule and a
 * sentence is no frontmatter.
 */
function propertiesLike(block: string): boolean {
    const lines = block.split(/\r?\n/)
    return (
        lines.some((line) => line.trim() !== '') &&
        lines.every((line) => line.trim() === '' || /^(\s|#|- |-$|[\w.-]+:(\s|$)|"[^"\n]*":(\s|$)|'[^'\n]*':(\s|$))/.test(line))
    )
}

/** Where a text's frontmatter stands: its YAML, and how long the block is with its `---` lines. */
function frontmatterIn(content: string): { yaml: string; length: number } | undefined {
    const match = FRONTMATTER.exec(content)
    if (match === null) return undefined
    const block = match[1] ?? ''
    if (block.trim() !== '' && !propertiesLike(block)) return undefined
    return { yaml: block, length: match[0].length }
}

/**
 * A markdown text parted into its frontmatter and the rest: the YAML between a `---` on the text's
 * first line and the next line that is `---` or `...`, when every line of it reads as properties,
 * and the text after it. Otherwise the frontmatter is undefined and the body is the whole text. The
 * YAML is returned as written; `parseMarkdown` in `lib/markdown-tree` reads its properties too.
 */
export function splitFrontmatter(content: string): { frontmatter: string | undefined; body: string } {
    const found = frontmatterIn(content)
    return found === undefined ? { frontmatter: undefined, body: content } : { frontmatter: found.yaml, body: content.slice(found.length) }
}

/** The marker of a part an app embeds: `<!-- WORD:ID -->`, where the ID is letters, digits, `-`, `_`, `.` and `:`. */
function partMarker(word: string): RegExp {
    return new RegExp(`^<!--\\s*${word.replace(/[^\w-]/g, '')}:([\\w.:-]+)\\s*-->$`)
}

/** An HTML comment and nothing else, which is never drawn. */
const COMMENT = /^<!--(?:(?!-->)[\s\S])*-->$/

/** `==words==`: a non-space after the opening `==`, a non-space before the closing one, on one line. */
const MARKED = /==(?=[^\s=])([^\n]*?[^\s=])==/g

/** The file endings a `![[file]]` embed draws as an image. */
const IMAGE_FILE = /\.(apng|avif|bmp|gif|jpe?g|png|svg|webp)$/i

/** A file ending other than a note's: `![[file]]` with one is a link to the file. */
const OTHER_FILE = /\.(?!md$)[a-z\d]{1,8}$/i

/** The size after an image embed's `|`: a width, or a width and a height as `300x200`. */
const IMAGE_SIZE = /^(\d+)(?:x(\d+))?$/

/** A callout's marker: `[!kind]`, `-` folded or `+` unfolded, and the space before its title. */
const CALLOUT = /^\[!([a-z][\w-]*)\]([+-]?)[ \t]*/i

/** The containers whose children are blocks: a part or an embed in one stands as a block. */
export const BLOCK_CONTAINERS: ReadonlySet<string> = new Set(['root', 'blockquote', 'callout', 'listItem', 'footnoteDefinition'])

/** Rewrites each node's children, depth first, by what `turn` makes of each child. */
function rewrite(node: MarkdownNode, turn: (child: MarkdownNode, parent: MarkdownNode) => MarkdownNode[] | undefined) {
    if (node.children === undefined) return
    node.children = node.children.flatMap((child) => {
        const turned = turn(child, node)
        if (turned !== undefined) return turned
        rewrite(child, turn)
        return [child]
    })
}

/** Each part marker as a part, and each other HTML comment dropped. */
function partsAndComments(tree: MarkdownNode, word: string) {
    const marker = partMarker(word)
    rewrite(tree, (child) => {
        if (child.type !== 'html') return undefined
        const value = (child.value ?? '').trim()
        const part = marker.exec(value)
        if (part !== null) return [{ type: 'part', id: part[1] }]
        return COMMENT.test(value) ? [] : undefined
    })
}

/** Text split at each match of a pattern, each match made a node by `make`. */
function splitText(value: string, matches: { from: number; to: number; node: MarkdownNode }[]): MarkdownNode[] {
    if (matches.length === 0) return [{ type: 'text', value }]
    const out: MarkdownNode[] = []
    let at = 0
    for (const { from, to, node } of matches.sort((a, b) => a.from - b.from)) {
        if (from < at) continue
        if (from > at) out.push({ type: 'text', value: value.slice(at, from) })
        out.push(node)
        at = to
    }
    if (at < value.length) out.push({ type: 'text', value: value.slice(at) })
    return out
}

/** Each `==words==` in text as a highlight. */
function highlights(tree: MarkdownNode) {
    rewrite(tree, (child) => {
        if (child.type !== 'text') return undefined
        const value = child.value ?? ''
        return splitText(
            value,
            [...value.matchAll(MARKED)].map((match) => ({
                from: match.index,
                to: match.index + match[0].length,
                node: { type: 'highlight', children: [{ type: 'text', value: match[1] }] },
            })),
        )
    })
}

/** What a `![[...]]` embed stands for: an image, a file, or a note. */
function embedNode(inside: string): MarkdownNode {
    const read = readWikiLink(inside)
    if (IMAGE_FILE.test(read.target)) {
        const size = IMAGE_SIZE.exec(read.label ?? '')
        return {
            type: 'embed',
            kind: 'image',
            target: read.target,
            alt: size === null ? (read.label ?? read.target) : read.target,
            ...(size === null ? {} : { width: Number(size[1]), ...(size[2] === undefined ? {} : { height: Number(size[2]) }) }),
        }
    }
    if (OTHER_FILE.test(read.target)) {
        return { type: 'embed', kind: 'file', target: read.target, children: [{ type: 'text', value: read.label ?? read.target }] }
    }
    return {
        type: 'embed',
        kind: 'note',
        target: read.target,
        ...(read.heading === undefined ? {} : { heading: read.heading }),
        children: [{ type: 'text', value: read.label ?? (read.heading === undefined ? read.target : `${read.target} › ${read.heading}`) }],
    }
}

/** Each `[[link]]` and `![[embed]]` in text, and each `#tag` when tags are read; a note embed alone in a paragraph stands as a block. */
function linksAndTags(tree: MarkdownNode, tags: boolean) {
    const split = (value: string): MarkdownNode[] =>
        splitText(value, [
            ...wikiLinksIn(value).map((link) => {
                // A `!` before the link makes it an embed, the `!` part of it.
                if (value[link.from - 1] === '!') {
                    return { from: link.from - 1, to: link.to, node: embedNode(value.slice(link.from + 2, link.to - 2)) }
                }
                const node: MarkdownNode = {
                    type: 'wikiLink',
                    target: link.target,
                    ...(link.heading === undefined ? {} : { heading: link.heading }),
                    ...(link.label === undefined ? {} : { label: link.label }),
                    children: [
                        {
                            type: 'text',
                            value: link.label ?? (link.heading === undefined ? link.target : `${link.target} › ${link.heading}`),
                        },
                    ],
                }
                return { from: link.from, to: link.to, node }
            }),
            ...(tags ? tagMatches(value).map((match) => ({ from: match.from, to: match.to, node: { type: 'tag', tag: match.tag } })) : []),
        ])
    const lift = (node: MarkdownNode): MarkdownNode => {
        if (node.type !== 'paragraph') return node
        const held = (node.children ?? []).filter((child) => !(child.type === 'text' && (child.value ?? '').trim() === ''))
        return held.length === 1 && held[0].type === 'embed' && held[0].kind === 'note' ? held[0] : node
    }
    const visit = (node: MarkdownNode) => {
        if (node.children === undefined || node.type === 'link' || node.type === 'linkReference') return
        node.children = node.children.flatMap((child) => {
            if (child.type === 'text') return split(child.value ?? '')
            visit(child)
            return [BLOCK_CONTAINERS.has(node.type) ? lift(child) : child]
        })
    }
    visit(tree)
}

/**
 * Takes a callout's title off its first paragraph: the nodes before the first line's end, or before
 * a hard break. The paragraph keeps the rest.
 */
function takeTitle(first: MarkdownNode): MarkdownNode[] {
    const title: MarkdownNode[] = []
    const rest: MarkdownNode[] = []
    let done = false
    for (const child of first.children ?? []) {
        if (done) rest.push(child)
        else if (child.type === 'break') done = true
        else if (child.type === 'text' && (child.value ?? '').includes('\n')) {
            const value = child.value ?? ''
            const end = value.indexOf('\n')
            if (end > 0) title.push({ type: 'text', value: value.slice(0, end) })
            if (end + 1 < value.length) rest.push({ type: 'text', value: value.slice(end + 1) })
            done = true
        } else title.push(child)
    }
    first.children = rest
    const last = title.at(-1)
    if (last?.type === 'text') last.value = (last.value ?? '').trimEnd()
    return title.filter((node) => !(node.type === 'text' && node.value === ''))
}

/**
 * Each quote whose first line is `[!kind]` as a callout: the rest of that line its title, `-` or `+`
 * after the marker folded or unfolded. A further marker with no title is titled with its own word.
 */
function callouts(tree: MarkdownNode) {
    rewrite(tree, (child) => {
        if (child.type !== 'blockquote') return undefined
        const first = child.children?.[0]
        const text = first?.type === 'paragraph' ? first.children?.[0] : undefined
        const marker = text?.type === 'text' ? CALLOUT.exec(text.value ?? '') : null
        const named = marker === null ? undefined : marker[1].toLowerCase()
        const kind = named === undefined ? undefined : CALLOUT_MARKERS[named]
        if (first === undefined || text === undefined || marker === null || named === undefined || kind === undefined) return undefined
        text.value = (text.value ?? '').slice(marker[0].length)
        let title = takeTitle(first)
        if (title.length === 0 && named !== kind) title = [{ type: 'text', value: named[0].toUpperCase() + named.slice(1) }]
        const empty = (first.children ?? []).every((node) => node.type === 'text' && (node.value ?? '').trim() === '')
        const callout: MarkdownNode = {
            type: 'callout',
            kind,
            marker: named,
            ...(marker[2] === '-' ? { fold: 'closed' } : marker[2] === '+' ? { fold: 'open' } : {}),
            children: [
                ...(title.length === 0 ? [] : [{ type: 'calloutTitle', children: title }]),
                ...(child.children ?? []).filter((node) => !(node === first && empty)),
            ],
        }
        // A callout inside this one.
        callouts(callout)
        return [callout]
    })
}

/**
 * Drops each node's `data`, which only remark's own steps read, and its position unless it is kept,
 * and joins text that stands next to text (where a comment was left out) into one node.
 */
function clean(node: MarkdownNode, positions: boolean) {
    delete node.data
    if (!positions) delete node.position
    if (node.children === undefined) return
    const joined: MarkdownNode[] = []
    for (const child of node.children) {
        const before = joined.at(-1)
        if (child.type === 'text' && before?.type === 'text') {
            before.value = (before.value ?? '') + (child.value ?? '')
            const end = (child.position as { end?: unknown } | undefined)?.end
            if (positions && before.position !== undefined && end !== undefined) before.position = { ...(before.position as object), end }
            continue
        }
        clean(child, positions)
        joined.push(child)
    }
    node.children = joined
}

/** What `parseTree` reads a text by. */
export interface ParseRules {
    /** The math reader (remark-math); without it, math stays text. */
    math?: Pluggable
    /** Rewrites the text's math for the reader first: `\\(...\\)` and `\\[...\\]` as dollars, and a lone `$` read as Pandoc reads it. */
    normalizeMath: boolean
    /** The text is still arriving: an unclosed `$$` block stays its source. */
    streaming?: boolean
    /** Reads a frontmatter block at the top as a `yaml` node; off, it is read as markdown. */
    frontmatter: boolean
    /** Reads `[[links]]` and `![[embeds]]`. */
    wikiLinks: boolean
    /** Reads `#tags`, with `wikiLinks`. */
    tags: boolean
    /** The word a part's marker starts with. */
    partMarker: string
    /** Keeps each node's place in the text. */
    positions: boolean
}

/**
 * A markdown text read into its tree. The frontmatter is blanked rather than cut, so every position
 * after it still points into the text as given.
 */
export function parseTree(content: string, rules: ParseRules): MarkdownTree {
    const front = rules.frontmatter ? frontmatterIn(content) : undefined
    let text = front === undefined ? content : content.slice(0, front.length).replace(/[^\r\n]/g, ' ') + content.slice(front.length)
    if (rules.normalizeMath) text = normalizeMath(text, { streaming: rules.streaming ?? false })
    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(rules.math === undefined ? [] : [rules.math])
    const tree = processor.runSync(processor.parse(text)) as unknown as MarkdownNode
    // Parts first, so a part's marker is never dropped as a comment; highlights before links, so a
    // link's words are never read for `==`; callouts last, from what the rest left of each quote.
    partsAndComments(tree, rules.partMarker)
    highlights(tree)
    if (rules.wikiLinks) linksAndTags(tree, rules.tags)
    callouts(tree)
    clean(tree, rules.positions)
    if (front !== undefined) {
        const yaml: MarkdownNode = { type: 'yaml', value: front.yaml }
        if (rules.positions) {
            const block = content.slice(0, front.length).replace(/\r?\n$/, '')
            const lines = block.split('\n')
            yaml.position = {
                start: { line: 1, column: 1, offset: 0 },
                end: { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1, offset: block.length },
            }
        }
        tree.children = [yaml, ...(tree.children ?? [])]
    }
    return tree as unknown as MarkdownTree
}

/** Each node of a tree, depth first, with its parent. */
export function* nodesOf(tree: MarkdownNode, parent?: MarkdownNode): Generator<{ node: MarkdownNode; parent: MarkdownNode | undefined }> {
    yield { node: tree, parent }
    for (const child of tree.children ?? []) yield* nodesOf(child, tree)
}

/** The words a node shows, through its children: text, code, math, a tag with its `#`. */
export function treeText(node: MarkdownNode): string {
    if (node.type === 'tag') return `#${String(node.tag)}`
    if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'inlineMath') return node.value ?? ''
    return (node.children ?? []).map(treeText).join('')
}
