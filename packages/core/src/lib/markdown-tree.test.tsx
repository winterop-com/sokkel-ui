import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { loadMath, Markdown } from '../components/Markdown'
import { markdownHeadings, PlainMarkdown } from '../components/PlainMarkdown'
import { frontmatterOf, parseMarkdown, type MarkdownNode, type MarkdownTree } from './markdown-tree'

const LINKS = { onOpen: () => undefined, onTag: () => undefined }

/** Every node of a tree, depth first. */
function nodes(node: MarkdownNode | MarkdownTree): MarkdownNode[] {
    return [node as MarkdownNode, ...((node as MarkdownNode).children ?? []).flatMap(nodes)]
}

const find = (tree: MarkdownTree, type: string) => nodes(tree).filter((node) => node.type === type)

const NOTE = `---
title: Nightly export
owner: grace
steps: [fetch, transform, validate]
reviewed: 2026-11-02
---
# Nightly export

<!-- reviewed by grace -->

The export runs at 02:00 UTC and ==never writes back==. See [[Retry a run#Steps|the steps]] and
[[harbor]]. #runbook

![[Retry a run#Steps]]

The chart: ![[runs.png|320x200]] and the log: ![[export.log]]

> [!warning] Before a rerun
> Move \`rejected/\` aside first.

> [!todo]- Open
> - Ask grace

<!-- part:state -->

| Job | State |
| --- | --- |
| nightly-export | failed |

- [x] Rotate the keys
- [ ] Ask margaret

A footnote.[^1] Math $f = n_\\text{failed}$.

$$
x^2
$$

[^1]: In UTC.

\`\`\`rust
fn main() {}
\`\`\`
`

describe('parseMarkdown', () => {
    const tree = parseMarkdown(NOTE)

    it('reads the frontmatter first, its properties as JSON values', () => {
        expect(tree.children[0]).toEqual({
            type: 'yaml',
            value: 'title: Nightly export\nowner: grace\nsteps: [fetch, transform, validate]\nreviewed: 2026-11-02',
            properties: { title: 'Nightly export', owner: 'grace', steps: ['fetch', 'transform', 'validate'], reviewed: '2026-11-02' },
        })
        expect(frontmatterOf(tree)?.properties?.owner).toBe('grace')
        expect(frontmatterOf(parseMarkdown('# No frontmatter'))).toBeUndefined()
        expect(frontmatterOf(parseMarkdown('---\nkey: [unclosed\n---\nBody'))).toEqual({ yaml: 'key: [unclosed' })
    })

    it('reads a rule and a sentence as markdown, not as frontmatter', () => {
        const reply = parseMarkdown('---\nThe export finished.\n---\nAll steps succeeded.')
        expect(reply.children[0].type).toBe('thematicBreak')
    })

    it('reads links between notes, embeds and tags as nodes of their own', () => {
        expect(find(tree, 'wikiLink')).toEqual([
            {
                type: 'wikiLink',
                target: 'Retry a run',
                heading: 'Steps',
                label: 'the steps',
                children: [{ type: 'text', value: 'the steps' }],
            },
            { type: 'wikiLink', target: 'harbor', children: [{ type: 'text', value: 'harbor' }] },
        ])
        expect(find(tree, 'tag')).toEqual([{ type: 'tag', tag: 'runbook' }])
        expect(find(tree, 'embed')).toEqual([
            {
                type: 'embed',
                kind: 'note',
                target: 'Retry a run',
                heading: 'Steps',
                children: [{ type: 'text', value: 'Retry a run › Steps' }],
            },
            { type: 'embed', kind: 'image', target: 'runs.png', alt: 'runs.png', width: 320, height: 200 },
            { type: 'embed', kind: 'file', target: 'export.log', children: [{ type: 'text', value: 'export.log' }] },
        ])
        // A note embed alone in a paragraph stands as a block.
        expect(tree.children.some((node) => node.type === 'embed' && node.kind === 'note')).toBe(true)
    })

    it('reads callouts with their kind, marker, fold and title', () => {
        const [warning, todo] = find(tree, 'callout')
        expect(warning).toMatchObject({
            kind: 'warning',
            marker: 'warning',
            children: [{ type: 'calloutTitle', children: [{ type: 'text', value: 'Before a rerun' }] }, { type: 'paragraph' }],
        })
        expect(warning.fold).toBeUndefined()
        expect(todo).toMatchObject({ kind: 'note', marker: 'todo', fold: 'closed', children: [{ type: 'calloutTitle' }, { type: 'list' }] })
        expect(find(parseMarkdown('> [!NOTE]\n> Body'), 'calloutTitle')).toEqual([])
    })

    it('reads highlights, parts and math, and leaves comments out', () => {
        expect(find(tree, 'highlight')).toEqual([{ type: 'highlight', children: [{ type: 'text', value: 'never writes back' }] }])
        expect(find(tree, 'part')).toEqual([{ type: 'part', id: 'state' }])
        expect(find(tree, 'inlineMath').map((node) => node.value)).toEqual(['f = n_\\text{failed}'])
        expect(find(tree, 'math').map((node) => node.value)).toEqual(['x^2'])
        expect(find(tree, 'html')).toEqual([])
        expect(JSON.stringify(tree)).not.toContain('reviewed by grace')
    })

    it('holds plain objects only: no data, and no positions unless asked', () => {
        expect(nodes(tree).filter((node) => 'data' in node || 'position' in node)).toEqual([])
        expect(JSON.parse(JSON.stringify(tree))).toEqual(tree)
    })

    it('keeps positions that point into the text as given, past the frontmatter', () => {
        const placed = parseMarkdown('---\na: 1\n---\n# Steps', { positions: true })
        expect(placed.children[0].position).toEqual({ start: { line: 1, column: 1, offset: 0 }, end: { line: 3, column: 4, offset: 12 } })
        expect((placed.children[1].position as { start: { line: number } }).start.line).toBe(4)
    })

    it('reads less when asked', () => {
        const plain = parseMarkdown('[[harbor]] #runbook $x$ ---', { wikiLinks: false, math: false })
        expect(find(plain, 'wikiLink')).toEqual([])
        expect(find(plain, 'tag')).toEqual([])
        expect(find(plain, 'inlineMath')).toEqual([])
        expect(parseMarkdown('---\na: 1\n---\nBody', { frontmatter: false }).children[0].type).toBe('thematicBreak')
    })
})

/** Texts that cover what the tree holds, each drawn from its text and from its tree. */
const TEXTS = [
    NOTE,
    '# Title\n\nPlain words, **strong**, *emphasis*, ~~struck~~, `code` and a [link](https://example.org).',
    '> [!NOTE]\n> The export reads only.\n\n> [!tip]+ Open\n> Body\n\n> [!unknown] Stays a quote',
    'Inline <!-- part:run --> part, and a block:\n\n<!-- part:run -->',
    '<b>raw</b> HTML <!-- hidden --> shown as typed',
    '1. one\n2. two\n\n---\n\n| | |\n| --- | --- |\n| Owner | grace |',
]

describe('a tree draws as its text does', () => {
    it.each(TEXTS)('in PlainMarkdown: %#', (text) => {
        const fromText = renderToStaticMarkup(<PlainMarkdown content={text} links={LINKS} anchors parts={{ run: 'the run' }} />)
        const fromTree = renderToStaticMarkup(
            <PlainMarkdown tree={parseMarkdown(text, { math: false })} links={LINKS} anchors parts={{ run: 'the run' }} />,
        )
        expect(fromTree).toBe(fromText)
    })

    it.each(TEXTS)('in Markdown, with math: %#', async (text) => {
        await loadMath()
        const fromText = renderToStaticMarkup(<Markdown content={text} links={LINKS} />)
        const fromTree = renderToStaticMarkup(<Markdown tree={parseMarkdown(text)} links={LINKS} />)
        expect(fromTree).toBe(fromText)
    })

    it('after a trip through JSON', () => {
        const tree = JSON.parse(JSON.stringify(parseMarkdown(NOTE, { math: false }))) as MarkdownTree
        expect(renderToStaticMarkup(<PlainMarkdown tree={tree} links={LINKS} />)).toBe(
            renderToStaticMarkup(<PlainMarkdown content={NOTE} links={LINKS} />),
        )
    })

    it('shows the frontmatter from the tree, and lists its headings', () => {
        expect(renderToStaticMarkup(<PlainMarkdown tree={parseMarkdown(NOTE)} frontmatter="show" />)).toContain('owner: grace')
        expect(markdownHeadings(parseMarkdown(NOTE), [1, 2])).toEqual(markdownHeadings(NOTE, [1, 2]))
    })

    it('draws links between notes as their words, and tags as text, when the app follows neither', () => {
        const html = renderToStaticMarkup(<PlainMarkdown tree={parseMarkdown('See [[harbor|the harbor]] #runbook')} />)
        expect(html).toContain('See the harbor #runbook')
        expect(html).not.toContain('<a')
    })
})

/** The contract's fixtures: texts and the trees every reader reads them into (sokkel-design `markdown/fixtures`, copied into `design/`). */
const FIXTURES = join(__dirname, '..', '..', '..', '..', 'design', 'markdown', 'fixtures')
const fixtures = readdirSync(FIXTURES)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3))
    .sort()

describe('the contract’s fixtures', () => {
    it('are there', () => {
        expect(fixtures.length).toBeGreaterThan(0)
    })

    it.each(fixtures)('%s reads into its tree', (name) => {
        const text = readFileSync(join(FIXTURES, `${name}.md`), 'utf8')
        const tree = JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8')) as MarkdownTree
        expect(parseMarkdown(text)).toEqual(tree)
    })

    it.each(fixtures)('%s draws from its tree as from its text', async (name) => {
        await loadMath()
        const text = readFileSync(join(FIXTURES, `${name}.md`), 'utf8')
        const tree = JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8')) as MarkdownTree
        expect(renderToStaticMarkup(<Markdown tree={tree} links={LINKS} />)).toBe(
            renderToStaticMarkup(<Markdown content={text} links={LINKS} />),
        )
    })
})
