/**
 * A markdown text read into the tree `Markdown` draws, for a server or an app that reads a text
 * once and draws it, or reads it, many times: on the web with `Markdown`'s `tree`, and in any other
 * renderer that reads the same tree. It names no React and no DOM.
 *
 * The tree is mdast (CommonMark, GitHub-flavored markdown and math) with the nodes linked notes add:
 * `yaml` (the frontmatter, its `properties` read), `callout` and `calloutTitle`, `wikiLink`, `embed`,
 * `tag`, `highlight` and `part`. HTML comments are left out. sokkel-design's `markdown/` holds its
 * schema and the texts every reader of it must read the same.
 */

import remarkMath from 'remark-math'
import { parse } from 'yaml'

import { parseTree, type MarkdownNode, type MarkdownTree } from './markdown-parse'

export { splitFrontmatter } from './markdown-parse'
export type { CalloutKind, MarkdownNode, MarkdownTree } from './markdown-parse'

/** What `parseMarkdown` reads. Each is on by default. */
export interface ParseMarkdownOptions {
    /** LaTeX math as `math` and `inlineMath`; off, every `$` is a dollar. */
    math?: boolean
    /** `[[links]]` and `![[embeds]]`. */
    wikiLinks?: boolean
    /** `#tags`, with `wikiLinks`. */
    tags?: boolean
    /** A frontmatter block at the top as a `yaml` node; off, it is read as markdown, a rule and a heading. */
    frontmatter?: boolean
    /** The word a part's marker starts with: `part` by default, for `<!-- part:ID -->`. */
    partMarker?: string
    /** Keeps each node's place in the text (`position`), off by default. */
    positions?: boolean
}

/** A value as JSON has it, so a tree crosses a wire unchanged. */
function asJson(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value)) as unknown
}

/**
 * A markdown text read into its tree. The frontmatter's YAML is read too: a mapping becomes the
 * `yaml` node's `properties`, as JSON values; YAML that does not read, or is not a mapping, has none.
 */
export function parseMarkdown(text: string, options: ParseMarkdownOptions = {}): MarkdownTree {
    const math = options.math ?? true
    const wikiLinks = options.wikiLinks ?? true
    const tree = parseTree(text, {
        math: math ? remarkMath : undefined,
        normalizeMath: math,
        frontmatter: options.frontmatter ?? true,
        wikiLinks,
        tags: wikiLinks && (options.tags ?? true),
        partMarker: options.partMarker ?? 'part',
        positions: options.positions ?? false,
    })
    const yaml = tree.children[0]
    if (yaml?.type === 'yaml') {
        try {
            // A key written twice keeps its last value rather than losing every property.
            const read = parse(yaml.value ?? '', { uniqueKeys: false }) as unknown
            if (read !== null && typeof read === 'object' && !Array.isArray(read)) yaml.properties = asJson(read)
        } catch {
            // YAML that does not read leaves the node without properties.
        }
    }
    return tree
}

/** A tree's frontmatter: its YAML as written, and its properties when they read. */
export function frontmatterOf(tree: MarkdownTree): { yaml: string; properties?: Record<string, unknown> } | undefined {
    const first: MarkdownNode | undefined = tree.children[0]
    if (first?.type !== 'yaml') return undefined
    const properties = first.properties as Record<string, unknown> | undefined
    return { yaml: first.value ?? '', ...(properties === undefined ? {} : { properties }) }
}
