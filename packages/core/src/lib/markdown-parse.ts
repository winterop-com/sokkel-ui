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
 * A YAML properties line: blank, a comment, indented, a list item, or a key and a colon. A key is
 * up to four words of letters, digits, `_`, `.` and `-` in any script, or quoted.
 */
export const PROPERTY_LINE = /^(\s|#|- |-$|[\p{L}\p{M}\p{N}_.-]+(?: [\p{L}\p{M}\p{N}_.-]+){0,3}:(\s|$)|"[^"\n]*":(\s|$)|'[^'\n]*':(\s|$))/u

/**
 * Whether a block reads as YAML properties: each line blank, a comment, indented under the line
 * before, a list item, or a key without spaces and a colon. A text that opens with a rule and a
 * sentence is no frontmatter.
 */
function propertiesLike(block: string): boolean {
    const lines = block.split(/\r?\n/)
    return lines.some((line) => line.trim() !== '') && lines.every((line) => line.trim() === '' || PROPERTY_LINE.test(line))
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

/**
 * Each `==words==` in a text, read in one pass: an opening `==` with a non-space, non-`=` after it,
 * closed by the first `==` after it on its line with a non-space, non-`=` before it.
 */
function markedRanges(value: string): { from: number; to: number }[] {
    const out: { from: number; to: number }[] = []
    let open = -1
    // The end of the open highlight's line, searched for again only once past it; -1 when no line ends ahead.
    let lineEnd = -2
    for (let at = value.indexOf('=='); at >= 0;) {
        if (open >= 0 && lineEnd >= 0 && at > lineEnd) open = -1
        if (open < 0) {
            const next = value[at + 2] as string | undefined
            if (next !== undefined && !/[\s=]/.test(next)) {
                open = at
                if (lineEnd !== -1 && lineEnd < at) lineEnd = value.indexOf('\n', at)
                at = value.indexOf('==', at + 2)
            } else at = value.indexOf('==', at + 1)
            continue
        }
        if (at >= open + 3 && /[^\s=]/.test(value[at - 1])) {
            out.push({ from: open, to: at + 2 })
            open = -1
            at = value.indexOf('==', at + 2)
        } else at = value.indexOf('==', at + 1)
    }
    return out
}

/** Nodes whose words are a link's own, never read for highlights. */
const OWN_WORDS = new Set(['wikiLink', 'embed', 'tag', 'inlineCode', 'code', 'inlineMath', 'math', 'html'])

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

/** What each character of a `%%` comment is written as before the text is read, so the comment reads as nothing and every other character keeps its place. */
const HIDDEN = '\uFDDF'

/** The nodes whose words are code (or markup), where a `%%` opens no comment. */
const CODE_NODES = new Set(['code', 'inlineCode', 'math', 'inlineMath', 'html'])

/**
 * The text with each `%% comment %%` written as `HIDDEN`, its line ends kept: a `%%` outside code,
 * not written escaped (`\%%`), up to the next such `%%`, over any number of lines. One left open
 * stays words. The text as given when it has no comment, or already holds `HIDDEN`.
 */
function hideComments(text: string, read: (text: string) => MarkdownNode): string {
    if (!text.includes('%%') || text.includes(HIDDEN)) return text
    const code: [number, number][] = []
    for (const { node } of nodesOf(read(text))) {
        const at = node.position as { start?: { offset?: number }; end?: { offset?: number } } | undefined
        const [from, to] = [at?.start?.offset, at?.end?.offset]
        if (CODE_NODES.has(node.type) && from !== undefined && to !== undefined) code.push([from, to])
    }
    // Each `%%` is looked at in order, so the code before it is passed once.
    code.sort((a, b) => a[0] - b[0])
    let passed = 0
    let reach = -1
    const opens = (at: number) => {
        while (passed < code.length && code[passed][0] <= at) reach = Math.max(reach, code[passed++][1])
        if (at < reach) return false
        let slashes = 0
        while (text[at - 1 - slashes] === '\\') slashes += 1
        return slashes % 2 === 0
    }
    const next = (from: number) => {
        for (let at = text.indexOf('%%', from); at >= 0; at = text.indexOf('%%', at + 1)) if (opens(at)) return at
        return -1
    }
    let out = ''
    let kept = 0
    for (let open = next(0); open >= 0;) {
        const close = next(open + 2)
        if (close < 0) break
        out += text.slice(kept, open) + text.slice(open, close + 2).replace(/[^\r\n]/g, HIDDEN)
        kept = close + 2
        open = next(kept)
    }
    return kept === 0 ? text : out + text.slice(kept)
}

/** Takes each hidden comment out of the words, and drops a text, and a paragraph, it leaves with none. */
function dropComments(tree: MarkdownNode) {
    rewrite(tree, (child) => {
        for (const field of ['value', 'url', 'alt', 'title'] as const) {
            const value = child[field]
            if (typeof value === 'string' && value.includes(HIDDEN)) child[field] = value.replaceAll(HIDDEN, '')
        }
        if (child.type === 'text' && child.value === '') return []
        return undefined
    })
    rewrite(tree, (child) => {
        if (child.type !== 'paragraph') return undefined
        const left = (child.children ?? []).filter(
            (node) => !(node.type === 'text' && (node.value ?? '').trim() === '') && node.type !== 'break',
        )
        return left.length === 0 ? [] : undefined
    })
}

/** Where each character of a text's words was written: its first offset in the text and the one after it. */
interface Spans {
    starts: number[]
    ends: number[]
}

/** While a parse keeps positions: each text node's spans, and a point in the text for an offset. */
let placing:
    | { spans: WeakMap<MarkdownNode, Spans>; point: (offset: number) => { line: number; column: number; offset: number } }
    | undefined

/** An HTML character reference, as `&amp;` or `&#61;`. */
const REFERENCE = /^&(?:#\d{1,7}|#x[\da-f]{1,6}|[a-z][a-z\d]{1,31});/i

/**
 * Each text node's spans, read beside the text it was written as: a character escaped with `\` spans
 * two, a character reference its whole length, and what was written but is not in the words (a quote's
 * `>`, an indent) is passed over.
 */
function placeTexts(tree: MarkdownNode, source: string) {
    const starts: number[] = [0]
    for (let at = source.indexOf('\n'); at >= 0; at = source.indexOf('\n', at + 1)) starts.push(at + 1)
    const point = (offset: number) => {
        let low = 0
        let high = starts.length - 1
        while (low < high) {
            const middle = (low + high + 1) >> 1
            if (starts[middle] <= offset) low = middle
            else high = middle - 1
        }
        return { line: low + 1, column: offset - starts[low] + 1, offset }
    }
    const spans = new WeakMap<MarkdownNode, Spans>()
    for (const { node } of nodesOf(tree)) {
        if (node.type !== 'text' || node.value === undefined) continue
        const at = node.position as { start?: { offset?: number }; end?: { offset?: number } } | undefined
        const from = at?.start?.offset
        const to = at?.end?.offset
        if (from === undefined || to === undefined) continue
        const value = node.value
        const read: Spans = { starts: [], ends: [] }
        let i = from
        let k = 0
        while (k < value.length && i < to) {
            const reference = source[i] === '&' && value[k] !== '&' ? REFERENCE.exec(source.slice(i, i + 40)) : null
            if (source[i] === '\\' && source[i + 1] === value[k] && /[!-/:-@[-`{-~]/.test(value[k])) {
                read.starts.push(i)
                read.ends.push(i + 2)
                i += 2
                k += 1
            } else if (source[i] === value[k]) {
                read.starts.push(i)
                read.ends.push(i + 1)
                i += 1
                k += 1
            } else if (reference !== null) {
                // A reference stands for one character, or two halves of one.
                const after = source[i + reference[0].length]
                for (let held = 0; held < 2 && k < value.length && (held === 0 || value[k] !== after); held += 1) {
                    read.starts.push(i)
                    read.ends.push(i + reference[0].length)
                    k += 1
                }
                i += reference[0].length
            } else i += 1
        }
        for (; k < value.length; k += 1) {
            read.starts.push(to)
            read.ends.push(to)
        }
        spans.set(node, read)
    }
    placing = { spans, point }
}

/** The position of a text's words from `from` up to `to`, when the text's spans are known. */
function placeOf(text: MarkdownNode, from: number, to: number, end: MarkdownNode = text): { start: unknown; end: unknown } | undefined {
    const first = placing?.spans.get(text)
    const last = placing?.spans.get(end)
    if (placing === undefined || first === undefined || last === undefined || from >= first.starts.length || to < 1) return undefined
    return { start: placing.point(first.starts[from]), end: placing.point(last.ends[Math.min(to, last.ends.length) - 1]) }
}

/** A piece of a text, `from` up to `to`, as a text node with its place when the whole's is known. */
function pieceOf(whole: MarkdownNode | undefined, value: string, from: number, to: number): MarkdownNode {
    const piece: MarkdownNode = { type: 'text', value: value.slice(from, to) }
    const spans = whole === undefined ? undefined : placing?.spans.get(whole)
    if (whole === undefined || spans === undefined || from >= to) return piece
    piece.position = placeOf(whole, from, to)
    placing?.spans.set(piece, { starts: spans.starts.slice(from, to), ends: spans.ends.slice(from, to) })
    return piece
}

/**
 * Text split at each match of a pattern, each match made a node. With the text node it came from, each
 * piece and each match keeps its place in the text.
 */
function splitText(value: string, matches: { from: number; to: number; node: MarkdownNode }[], whole?: MarkdownNode): MarkdownNode[] {
    if (matches.length === 0) return [whole ?? { type: 'text', value }]
    const out: MarkdownNode[] = []
    let at = 0
    for (const { from, to, node } of matches.sort((a, b) => a.from - b.from)) {
        if (from < at) continue
        if (from > at) out.push(pieceOf(whole, value, at, from))
        if (whole !== undefined) {
            const place = placeOf(whole, from, to)
            if (place !== undefined) node.position = place
        }
        out.push(node)
        at = to
    }
    if (at < value.length) out.push(pieceOf(whole, value, at, value.length))
    return out
}

/** Whether a node, or anything in it, runs over a line's end. */
const breaksLine = (node: MarkdownNode): boolean =>
    node.type === 'break' || (node.value ?? '').includes('\n') || (node.children ?? []).some(breaksLine)

/**
 * The first `==` in a text that closes a highlight: a non-space, non-`=` before it (or, at the text's
 * start, the inline node that ends just before it). Undefined past a line's end.
 */
function closerIn(value: string): number | undefined {
    const lineEnd = value.indexOf('\n')
    for (let at = value.indexOf('=='); at >= 0; at = value.indexOf('==', at + 1)) {
        if (lineEnd >= 0 && at > lineEnd) return undefined
        if (at === 0 || /[^\s=]/.test(value[at - 1])) return at
    }
    return undefined
}

/**
 * A highlight whose words run through inline nodes, as `==a **b** c==`: its opening `==` in one text,
 * its closing one in a later text of the same parent, on one line.
 */
function spanHighlights(parent: MarkdownNode) {
    const kids = parent.children
    if (kids === undefined) return
    for (let i = 0; i < kids.length; i += 1) {
        const first = kids[i]
        if (first.type !== 'text') continue
        const value = first.value ?? ''
        // Only the first opening `==` on the text's last line can open one; a later one would close where it does.
        let open = value.indexOf('==', value.lastIndexOf('\n') + 1)
        while (open >= 0 && /[\s=]/.test(value[open + 2] ?? 'x')) open = value.indexOf('==', open + 1)
        if (open < 0) continue
        let matched = false
        let j = i + 1
        for (; j < kids.length; j += 1) {
            const last = kids[j]
            if (last.type !== 'text') {
                if (breaksLine(last)) break
                continue
            }
            const close = closerIn(last.value ?? '')
            if (close === undefined) {
                if ((last.value ?? '').includes('\n')) break
                continue
            }
            const lastValue = last.value ?? ''
            const inner = [
                ...(open + 2 < value.length ? [pieceOf(first, value, open + 2, value.length)] : []),
                ...kids.slice(i + 1, j),
                ...(close > 0 ? [pieceOf(last, lastValue, 0, close)] : []),
            ]
            const highlight: MarkdownNode = { type: 'highlight', children: inner }
            const place = placeOf(first, open, close + 2, last)
            if (place !== undefined) highlight.position = place
            kids.splice(
                i,
                j - i + 1,
                ...(open > 0 ? [pieceOf(first, value, 0, open)] : []),
                highlight,
                ...(close + 2 < lastValue.length ? [pieceOf(last, lastValue, close + 2, lastValue.length)] : []),
            )
            matched = true
            break
        }
        // No closing `==` before `j`: an opening one in the texts up to it would find none either, so
        // the next opening one is looked for from `j` on, and each node is scanned once.
        if (!matched) i = j - 1
    }
    for (const child of kids) if (!OWN_WORDS.has(child.type)) spanHighlights(child)
}

/**
 * What an escaped `=`, `[`, `#` and `!` stand as while links, tags and highlights are read, so `\=\=`
 * never opens a highlight, `\[[` a link, `\#` a tag or `\![[` an embed. One character each, so every
 * offset into a text stays where it was.
 */
const STAND_INS: Record<string, string> = { '=': '\uFDD0', '[': '\uFDD1', '#': '\uFDD2', '!': '\uFDD3' }
const STAND_IN = /[\uFDD0-\uFDD3]/
const ESCAPABLE = /\\[=[#!]/
const RESTORED: Record<string, string> = Object.fromEntries(Object.entries(STAND_INS).map(([mark, standIn]) => [standIn, mark]))

/**
 * Each `=`, `[`, `#` and `!` written escaped in a text node, swapped for its stand-in: the parse drops
 * the backslash, so the written text is read beside the node's words. False when the text already
 * holds a stand-in, and nothing is swapped.
 */
function markEscapes(tree: MarkdownNode, source: string): boolean {
    if (!ESCAPABLE.test(source) || STAND_IN.test(source)) return false
    for (const { node } of nodesOf(tree)) {
        if (node.type !== 'text' || node.value === undefined) continue
        const at = node.position as { start?: { offset?: number }; end?: { offset?: number } } | undefined
        const from = at?.start?.offset
        const to = at?.end?.offset
        if (from === undefined || to === undefined) continue
        // A text whose span starts after the backslash that opens it still reads that backslash.
        const opened = source[from] !== '\\' && source[from - 1] === '\\'
        const written = source.slice(opened ? from - 1 : from, to)
        if (!ESCAPABLE.test(written)) continue
        const value = node.value
        let out = ''
        let k = 0
        // The words and the written text side by side: an escape is a backslash before the word's
        // character; any other written character not in the words (a quote's `>`, an indent) is passed.
        for (let i = 0; i < written.length && k < value.length; i += 1) {
            if (written[i] === '\\' && written[i + 1] === value[k] && /[!-/:-@[-`{-~]/.test(value[k])) {
                out += STAND_INS[value[k]] ?? value[k]
                i += 1
                k += 1
            } else if (written[i] === value[k]) {
                out += value[k]
                k += 1
            }
        }
        node.value = out + value.slice(k)
    }
    return true
}

/** Each stand-in for an escaped character back as the character it is, in a node's words and fields. */
function unmarkEscapes(tree: MarkdownNode) {
    for (const { node } of nodesOf(tree)) {
        for (const [key, field] of Object.entries(node)) {
            if (typeof field === 'string' && STAND_IN.test(field))
                node[key] = field.replace(/[\uFDD0-\uFDD3]/g, (standIn) => RESTORED[standIn])
        }
    }
}

/** Each `==words==` as a highlight: within one text first, then through inline nodes. */
function highlights(tree: MarkdownNode) {
    rewrite(tree, (child) => {
        if (OWN_WORDS.has(child.type)) return [child]
        if (child.type !== 'text') return undefined
        const value = child.value ?? ''
        return splitText(
            value,
            markedRanges(value).map(({ from, to }) => ({
                from,
                to,
                node: { type: 'highlight', children: [pieceOf(child, value, from + 2, to - 2)] },
            })),
            child,
        )
    })
    spanHighlights(tree)
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
    const split = (whole: MarkdownNode, value: string): MarkdownNode[] =>
        splitText(
            value,
            [
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
                ...(tags
                    ? tagMatches(value).map((match) => ({ from: match.from, to: match.to, node: { type: 'tag', tag: match.tag } }))
                    : []),
            ],
            whole,
        )
    const lift = (node: MarkdownNode): MarkdownNode => {
        if (node.type !== 'paragraph') return node
        const held = (node.children ?? []).filter((child) => !(child.type === 'text' && (child.value ?? '').trim() === ''))
        return held.length === 1 && held[0].type === 'embed' && held[0].kind === 'note' ? held[0] : node
    }
    const visit = (node: MarkdownNode) => {
        if (node.children === undefined || node.type === 'link' || node.type === 'linkReference') return
        node.children = node.children.flatMap((child) => {
            if (child.type === 'text') return split(child, child.value ?? '')
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
            if (end > 0) title.push(pieceOf(child, value, 0, end))
            if (end + 1 < value.length) rest.push(pieceOf(child, value, end + 1, value.length))
            done = true
        } else title.push(child)
    }
    first.children = rest
    const last = title.at(-1)
    if (last?.type === 'text') title[title.length - 1] = pieceOf(last, last.value ?? '', 0, (last.value ?? '').trimEnd().length)
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
        // Only the markers named, never a word every object has (`constructor`, `toString`).
        const kind = named !== undefined && Object.hasOwn(CALLOUT_MARKERS, named) ? CALLOUT_MARKERS[named] : undefined
        if (first === undefined || text === undefined || marker === null || named === undefined || kind === undefined) return undefined
        if (first.children !== undefined) first.children[0] = pieceOf(text, text.value ?? '', marker[0].length, (text.value ?? '').length)
        let title = takeTitle(first)
        if (title.length === 0 && named !== kind) title = [{ type: 'text', value: named[0].toUpperCase() + named.slice(1) }]
        const empty = (first.children ?? []).every((node) => node.type === 'text' && (node.value ?? '').trim() === '')
        const callout: MarkdownNode = {
            type: 'callout',
            kind,
            marker: named,
            ...(child.position === undefined ? {} : { position: child.position }),
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

/** The fields of a node a tree may give as words, as numbers and as yes or no; any other is left out. */
const WORD_FIELDS = [
    'value',
    'url',
    'title',
    'alt',
    'lang',
    'meta',
    'identifier',
    'label',
    'referenceType',
    'target',
    'heading',
    'tag',
    'id',
    'kind',
    'marker',
    'fold',
]
const NUMBER_FIELDS = ['depth', 'start', 'width', 'height']
const FLAG_FIELDS = ['ordered', 'spread', 'checked']

/** The alignments a table column may have. */
const ALIGNS: ReadonlySet<unknown> = new Set(['left', 'right', 'center'])

/** How deep a given tree is drawn; anything deeper is left out. */
const DEEPEST = 64

/** One node of a given tree, rebuilt from the fields a node may have, each of its kind; undefined for what is no node. */
function safeNode(given: unknown, depth: number): MarkdownNode | undefined {
    if (given === null || typeof given !== 'object' || Array.isArray(given)) return undefined
    const raw = given as Record<string, unknown>
    if (typeof raw.type !== 'string') return undefined
    const node: MarkdownNode = { type: raw.type }
    for (const key of WORD_FIELDS) {
        const value = Object.hasOwn(raw, key) ? raw[key] : undefined
        if (typeof value === 'string') node[key] = value
        else if (typeof value === 'number' && Number.isFinite(value)) node[key] = String(value)
    }
    for (const key of NUMBER_FIELDS) {
        const value = Object.hasOwn(raw, key) ? raw[key] : undefined
        if (typeof value === 'number' && Number.isFinite(value)) node[key] = value
    }
    for (const key of FLAG_FIELDS) {
        const value = Object.hasOwn(raw, key) ? raw[key] : undefined
        if (typeof value === 'boolean') node[key] = value
    }
    if (Array.isArray(raw.align)) node.align = raw.align.map((align) => (ALIGNS.has(align) ? align : null))
    if (Array.isArray(raw.children)) {
        node.children = depth >= DEEPEST ? [] : raw.children.flatMap((child) => safeNode(child, depth + 1) ?? [])
    } else if (raw.type !== 'text' && !WORD_FIELDS.some((key) => key in node)) node.children = []
    return node
}

/**
 * A tree given from elsewhere, made safe to draw: rebuilt from the fields each node may have, each
 * of its kind (words as text, numbers as numbers, a table's alignments from `left`, `right` and
 * `center`), and no more: no `data`, which in mdast can name any element and property to draw, so
 * only text read here may say what is drawn. What is no node is left out, and so is anything deeper
 * than 64 levels.
 */
export function cleanTree(tree: MarkdownTree): MarkdownTree {
    const root = safeNode(tree, 0)
    const safe: MarkdownNode = { type: 'root', children: root?.type === 'root' ? (root.children ?? []) : [] }
    clean(safe, false)
    return safe as unknown as MarkdownTree
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
    placing = undefined
    const front = rules.frontmatter ? frontmatterIn(content) : undefined
    let text = front === undefined ? content : content.slice(0, front.length).replace(/[^\r\n]/g, ' ') + content.slice(front.length)
    if (rules.normalizeMath) text = normalizeMath(text, { streaming: rules.streaming ?? false })
    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(rules.math === undefined ? [] : [rules.math])
    const read = (given: string) => processor.runSync(processor.parse(given)) as unknown as MarkdownNode
    const hidden = hideComments(text, read)
    const tree = read(hidden)
    if (hidden !== text) {
        text = hidden
        dropComments(tree)
    }
    // Parts first, so a part's marker is never dropped as a comment; links before highlights, so a
    // link's own words are never read for `==` (a highlight may hold a link); callouts last, from
    // what the rest left of each quote.
    // Escapes, and each text's spans when positions are kept, are read while each text still has its
    // place in the text written.
    if (rules.positions) placeTexts(tree, text)
    const escaped = markEscapes(tree, text)
    partsAndComments(tree, rules.partMarker)
    if (rules.wikiLinks) linksAndTags(tree, rules.tags)
    highlights(tree)
    if (escaped) unmarkEscapes(tree)
    callouts(tree)
    placing = undefined
    clean(tree, rules.positions)
    if (front !== undefined) {
        // The YAML with its line ends as `\n`, whatever the text was written with.
        const yaml: MarkdownNode = { type: 'yaml', value: front.yaml.replace(/\r\n?/g, '\n') }
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
