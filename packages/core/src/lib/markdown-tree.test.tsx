import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { describe, expect, it } from 'vitest'

import { loadMath, Markdown } from '../components/Markdown'
import { loadHtml, markdownHeadings, markdownSection, PlainMarkdown } from '../components/PlainMarkdown'
import { frontmatterOf, parseMarkdown, type MarkdownNode, type MarkdownTree } from './markdown-tree'

const LINKS = { onOpen: () => undefined, onTag: () => undefined }

/** Every node of a tree, depth first. */
function nodes(node: MarkdownNode | MarkdownTree): MarkdownNode[] {
    return [node as MarkdownNode, ...((node as MarkdownNode).children ?? []).flatMap(nodes)]
}

const find = (tree: MarkdownTree, type: string) => nodes(tree).filter((node) => node.type === type)

/** The fastest of five runs of each, run in turn so a busy machine slows both alike. */
function fastest(reads: (() => unknown)[]): number[] {
    const best = reads.map(() => Number.POSITIVE_INFINITY)
    for (let run = 0; run < 5; run += 1) {
        reads.forEach((read, index) => {
            const started = performance.now()
            read()
            best[index] = Math.min(best[index], performance.now() - started)
        })
    }
    return best
}

/**
 * Fails when reading `n` repeats takes far more than eight times reading an eighth as many: in step
 * with the length it is about eight, while a reading that backtracks takes sixty-four and more.
 */
function expectInStep(read: (n: number) => unknown, n: number): void {
    const [short, long] = fastest([() => read(Math.round(n / 8)), () => read(n)])
    if (long < 200) return
    expect(long / Math.max(short, 1)).toBeLessThan(24)
}

const gfm = unified().use(remarkParse).use(remarkGfm)

/**
 * Fails when reading `n` repeats of `unit` grows far faster than the markdown parser under it reads
 * them. One long paragraph of emphasis already grows faster than its length there, and more so on a
 * slow machine, so the reading on top is held to the parser's own growth rather than to eight.
 */
function expectInStepWithParser(read: (text: string) => unknown, unit: string, n: number): void {
    const small = unit.repeat(Math.round(n / 8))
    const large = unit.repeat(n)
    const [short, long, parserShort, parserLong] = fastest([
        () => read(small),
        () => read(large),
        () => gfm.runSync(gfm.parse(small)),
        () => gfm.runSync(gfm.parse(large)),
    ])
    if (long < 200) return
    expect(long / Math.max(short, 1) / (parserLong / Math.max(parserShort, 1))).toBeLessThan(3)
}

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
            properties: {
                title: 'Nightly export',
                owner: 'grace',
                steps: ['fetch', 'transform', 'validate'],
                reviewed: '2026-11-02',
            },
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
            {
                type: 'wikiLink',
                target: 'harbor',
                children: [{ type: 'text', value: 'harbor' }],
            },
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
            {
                type: 'embed',
                kind: 'image',
                target: 'runs.png',
                alt: 'runs.png',
                width: 320,
                height: 200,
            },
            {
                type: 'embed',
                kind: 'file',
                target: 'export.log',
                children: [{ type: 'text', value: 'export.log' }],
            },
        ])
        // A note embed alone in a paragraph stands as a block.
        expect(tree.children.some((node) => node.type === 'embed' && node.kind === 'note')).toBe(true)
    })

    it('reads callouts with their kind, marker, fold and title', () => {
        const [warning, todo] = find(tree, 'callout')
        expect(warning).toMatchObject({
            kind: 'warning',
            marker: 'warning',
            children: [
                {
                    type: 'calloutTitle',
                    children: [{ type: 'text', value: 'Before a rerun' }],
                },
                { type: 'paragraph' },
            ],
        })
        expect(warning.fold).toBeUndefined()
        expect(todo).toMatchObject({
            kind: 'note',
            marker: 'todo',
            fold: 'closed',
            children: [{ type: 'calloutTitle' }, { type: 'list' }],
        })
        expect(find(parseMarkdown('> [!NOTE]\n> Body'), 'calloutTitle')).toEqual([])
    })

    it('reads highlights, parts and math, and leaves comments out', () => {
        expect(find(tree, 'highlight')).toEqual([
            {
                type: 'highlight',
                children: [{ type: 'text', value: 'never writes back' }],
            },
        ])
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
        const placed = parseMarkdown('---\na: 1\n---\n# Steps', {
            positions: true,
        })
        expect(placed.children[0].position).toEqual({
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 3, column: 4, offset: 12 },
        })
        expect((placed.children[1].position as { start: { line: number } }).start.line).toBe(4)
    })

    it('reads a highlight through inline nodes on one line, and none across a line or in code', () => {
        const words = (text: string) => JSON.stringify(parseMarkdown(text).children[0])
        expect(find(parseMarkdown('==a **b** c=='), 'highlight')).toEqual([
            {
                type: 'highlight',
                children: [
                    { type: 'text', value: 'a ' },
                    { type: 'strong', children: [{ type: 'text', value: 'b' }] },
                    { type: 'text', value: ' c' },
                ],
            },
        ])
        expect(find(parseMarkdown('==**bold**=='), 'highlight')).toHaveLength(1)
        expect(find(parseMarkdown('a == b **c** d == e'), 'highlight')).toEqual([])
        expect(find(parseMarkdown('==a **b**\nc=='), 'highlight')).toEqual([])
        expect(find(parseMarkdown('==open **b** never'), 'highlight')).toEqual([])
        expect(words('`==x==`')).not.toContain('highlight')
    })

    it('reads frontmatter written with CRLF line ends as LF', () => {
        expect(parseMarkdown('---\r\na: 1\r\nb: 2\r\n---\r\n# T').children[0]).toEqual({
            type: 'yaml',
            value: 'a: 1\nb: 2',
            properties: { a: 1, b: 2 },
        })
    })

    it('reads less when asked', () => {
        const plain = parseMarkdown('[[harbor]] #runbook $x$ ---', {
            wikiLinks: false,
            math: false,
        })
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

describe('what a review found', () => {
    it('draws no element or property a given tree names through data', () => {
        const hostile = {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    data: {
                        hName: 'iframe',
                        hProperties: { srcDoc: '<script>alert(1)</script>' },
                    },
                    children: [{ type: 'text', value: 'x' }],
                },
                {
                    type: 'paragraph',
                    data: {
                        hName: 'div',
                        hProperties: {
                            dangerouslySetInnerHTML: {
                                __html: '<img src=x onerror=alert(2)>',
                            },
                        },
                    },
                    children: [],
                },
                {
                    type: 'callout',
                    kind: 'evil',
                    marker: 'evil',
                    children: [{ type: 'paragraph', children: [{ type: 'text', value: 'y' }] }],
                },
            ],
        } as unknown as MarkdownTree
        const html = renderToStaticMarkup(<PlainMarkdown tree={hostile} />)
        expect(html).not.toContain('<iframe')
        expect(html).not.toContain('onerror')
        expect(html).toContain('<blockquote>')
    })

    it('keeps callouts, highlights and embeds with HTML allowed', async () => {
        await loadHtml()
        const html = renderToStaticMarkup(
            <PlainMarkdown
                content={'> [!warning]- Title\n> body\n\n==marked== ![[harbor]]'}
                allowHtml
                links={{ ...LINKS, embed: () => 'drawn' }}
            />,
        )
        expect(html).toMatch(/<details data-callout="warning"/)
        expect(html).toContain('<mark data-marked="">marked</mark>')
        expect(html).toContain('drawn')
    })

    it('draws a tree’s math as written where math is off', () => {
        const html = renderToStaticMarkup(<PlainMarkdown tree={parseMarkdown('Area $x^2$.')} />)
        expect(html).toContain('Area $x^2$.')
        expect(html).toBe(renderToStaticMarkup(<PlainMarkdown content="Area $x^2$." />))
    })

    it('gives anchors the ids markdownHeadings lists, from text and from a tree', async () => {
        await loadMath()
        const text =
            '## Note[^1]\n\n## Area $x^2$\n\n## [[Page|Shown]] #tag\n\n## a <b>x</b>\n\n## [[Note#Steps]]\n\n## Note\n\n[^1]: A note.'
        const drawn = [...renderToStaticMarkup(<Markdown content={text} anchors links={LINKS} />).matchAll(/<h2 id="([^"]+)"/g)].map(
            (match) => match[1],
        )
        expect(markdownHeadings(text).map((heading) => heading.id)).toEqual(drawn)
        expect(markdownHeadings(parseMarkdown(text)).map((heading) => heading.id)).toEqual(drawn)
        const fromTree = [
            ...renderToStaticMarkup(<Markdown tree={parseMarkdown(text)} anchors links={LINKS} />).matchAll(/<h2 id="([^"]+)"/g),
        ].map((match) => match[1])
        expect(fromTree).toEqual(drawn)
        expect(renderToStaticMarkup(<PlainMarkdown content="## Plain" />)).not.toContain('data-heading-text')
    })

    // Tried again on a spike of load: a reading that backtracks fails every try.
    it('reads a long line of unclosed highlights in linear time', { retry: 3 }, () => {
        expectInStep((n) => parseMarkdown('==a '.repeat(n), { math: false }), 40_000)
        expect(find(parseMarkdown('==a b==c=='), 'highlight')).toHaveLength(1)
    })

    it('reads a highlight that runs past an inline node with no closing mark in the text after it', () => {
        expect(find(parseMarkdown('==a **b** c *d* e=='), 'highlight')).toHaveLength(1)
    })

    it('keeps a link’s words whole, and highlights a link', () => {
        expect(find(parseMarkdown('[[a==b==c]]'), 'wikiLink')).toEqual([
            {
                type: 'wikiLink',
                target: 'a==b==c',
                children: [{ type: 'text', value: 'a==b==c' }],
            },
        ])
        const [marked] = find(parseMarkdown('==[[harbor]]=='), 'highlight')
        expect(marked.children?.[0].type).toBe('wikiLink')
    })

    it('reads frontmatter keys in any script and of a few words, and keeps a key written twice', () => {
        expect(frontmatterOf(parseMarkdown('---\nfødt: 1990\ncreated at: 2024\n---\nBody'))?.properties).toEqual({
            født: 1990,
            'created at': 2024,
        })
        expect(frontmatterOf(parseMarkdown('---\nowner: grace\nowner: ada\n---\nBody'))?.properties).toEqual({ owner: 'ada' })
    })

    it('finds a section past frontmatter, under a setext heading, and by a repeated heading’s id', () => {
        expect(markdownSection('---\n# Steps\nstatus: x\n---\nIntro\n\n## Steps\n\nFetch.', 'Steps')).toBe('## Steps\n\nFetch.')
        expect(markdownSection('Steps\n-----\n\nFetch.\n\nAfter\n-----\n\nDone.', 'Steps')).toBe('Steps\n-----\n\nFetch.')
        expect(markdownSection('## A\n\nfirst\n\n## A\n\nsecond', 'a-1')).toBe('## A\n\nsecond')
    })

    it('draws no data image the text wrote, even when the app’s resolver rewrites its address', () => {
        const html = renderToStaticMarkup(
            <PlainMarkdown content="![x](DATA:image/png;base64,AAAA)" resolveUrl={(url) => url.replace(/^DATA:/, 'data:')} />,
        )
        expect(html).not.toContain('data:image')
    })
})

describe('what a second review found', () => {
    it('does not throw on raw HTML that names a callout kind it does not know', async () => {
        await loadHtml()
        for (const html of [
            '<div data-callout-title="bogus">hi</div>',
            '<blockquote data-callout="constructor">x</blockquote>',
            '<blockquote data-callout="__proto__">x</blockquote>',
        ]) {
            expect(() => renderToStaticMarkup(<PlainMarkdown content={html} allowHtml />)).not.toThrow()
        }
    })

    // Tried again on a spike of load: a reading that backtracks fails every try.
    it('reads many highlights opened across inline nodes in linear time', { retry: 3 }, () => {
        const read = (text: string) => parseMarkdown(text, { math: false })
        expectInStepWithParser(read, '==a *b* ', 4_000)
        expectInStepWithParser(read, '==a [[b]] ', 3_200)
        expect(find(parseMarkdown('===a *b* c=='), 'highlight')).toHaveLength(1)
    })

    it('draws a malformed tree without throwing, and no style a tree writes', () => {
        const trees: unknown[] = [
            { type: 'root' },
            { type: 'root', children: 5 },
            { type: 'root', children: 'abc' },
            { type: 'root', children: [null, 7, 'x'] },
            {
                type: 'root',
                children: [
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'link',
                                url: 5,
                                children: [{ type: 'text', value: 'a' }],
                            },
                        ],
                    },
                ],
            },
            { type: 'root', children: [{ type: 'code', lang: 5, value: 'x' }] },
            {
                type: 'root',
                children: [
                    {
                        type: 'paragraph',
                        children: [{ type: 'wikiLink', target: { toString: 1 }, children: [] }],
                    },
                ],
            },
            {
                type: 'root',
                children: [
                    {
                        type: 'heading',
                        depth: 99,
                        children: [{ type: 'text', value: 'deep' }],
                    },
                ],
            },
        ]
        let deep: Record<string, unknown> = { type: 'text', value: 'bottom' }
        for (let level = 0; level < 5_000; level += 1) deep = { type: 'emphasis', children: [deep] }
        trees.push({
            type: 'root',
            children: [{ type: 'paragraph', children: [deep] }],
        })
        for (const tree of trees) {
            expect(() => renderToStaticMarkup(<PlainMarkdown tree={tree as MarkdownTree} links={LINKS} />)).not.toThrow()
        }
        const table = {
            type: 'root',
            children: [
                {
                    type: 'table',
                    align: ['left;position:fixed;inset:0', 'center'],
                    children: [
                        {
                            type: 'tableRow',
                            children: [
                                { type: 'tableCell', children: [{ type: 'text', value: 'a' }] },
                                { type: 'tableCell', children: [{ type: 'text', value: 'b' }] },
                            ],
                        },
                    ],
                },
            ],
        }
        const html = renderToStaticMarkup(<PlainMarkdown tree={table as unknown as MarkdownTree} />)
        expect(html).not.toContain('position:fixed')
        expect(html).toContain('text-align:center')
    })

    it('lists no heading Markdown does not draw, and a setext heading’s words as drawn', () => {
        expect(markdownHeadings('C #\n---', [2]).map((heading) => heading.id)).toEqual(
            [...renderToStaticMarkup(<PlainMarkdown content={'C #\n---'} anchors />).matchAll(/id="([^"]+)"/g)].map((match) => match[1]),
        )
        expect(markdownHeadings('[a]: https://example.org\n---\n\n<!-- note -->\n---', [2])).toEqual([])
    })
})

describe('what the tree port found', () => {
    it('leaves a quote a quote when its marker is a word every object has', () => {
        for (const word of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
            const tree = parseMarkdown(`> [!${word}] x\n> body`)
            expect(tree.children[0].type).toBe('blockquote')
        }
    })

    it('never highlights an escaped `==`, and keeps the `=` it is', () => {
        for (const text of ['x \\=\\=y\\=\\= z', 'x \\==y== z', 'x ==y\\== z', '> a \\=\\=y\\=\\=\n> b', '- [[n]] \\=\\=y\\=\\=']) {
            const tree = parseMarkdown(text)
            expect(find(tree, 'highlight'), text).toHaveLength(0)
            expect(
                nodes(tree).some((node) => node.value?.includes('\uFDD0')),
                text,
            ).toBe(false)
        }
        expect(find(parseMarkdown('x \\=\\=y\\=\\= z'), 'text')[0].value).toBe('x ==y== z')
        expect(find(parseMarkdown('a \\= ==b== \\=c'), 'highlight')).toHaveLength(1)
        expect(find(parseMarkdown('[[a\\=\\=b]] ==c=='), 'wikiLink')[0].target).not.toContain('\uFDD0')
    })

    it('reads an escaped `[[`, `![[` and `#` as the words they are, wherever the escape stands', () => {
        const shape = (tree: MarkdownTree) =>
            (tree.children[0].children ?? []).map((node) => (node.type === 'text' ? node.value : `${node.type}:${node.target ?? ''}`))
        expect(shape(parseMarkdown('\\[[old]] \\![[pic.png]] \\#hidden but [[real]]'))).toEqual([
            '[[old]] !',
            'wikiLink:pic.png',
            ' #hidden but ',
            'wikiLink:real',
        ])
        for (const text of [
            '\\[[old]]',
            '\\#hidden',
            '\\![[pic.png]]',
            '> \\[[old]] \\#hidden',
            '- \\[[old]]\n- \\#hidden',
            'a \\[[old]] b',
        ]) {
            const tree = parseMarkdown(text)
            expect(find(tree, 'wikiLink'), text).toHaveLength(text.includes('![[') ? 1 : 0)
            expect(find(tree, 'tag'), text).toHaveLength(0)
            expect(find(tree, 'embed'), text).toHaveLength(0)
            expect(
                nodes(tree).some((node) => Object.values(node).some((field) => typeof field === 'string' && /[\uFDD0-\uFDD3]/.test(field))),
                text,
            ).toBe(false)
        }
        expect(find(parseMarkdown('\\#hidden'), 'text')[0].value).toBe('#hidden')
        expect(find(parseMarkdown('- \\[[old]]'), 'text')[0].value).toBe('[[old]]')
        expect(find(parseMarkdown('x \\#a #b'), 'tag').map((node) => node.tag)).toEqual(['b'])
    })

    it('keeps each node where it was written when an escape opens the text', () => {
        const text = '\\[[old]] [[real]] \\#hidden #seen'
        const tree = parseMarkdown(text, { positions: true })
        const placed = (node: MarkdownNode) => {
            const at = node.position as { start: { offset: number }; end: { offset: number } }
            return text.slice(at.start.offset, at.end.offset)
        }
        expect(placed(find(tree, 'wikiLink')[0])).toBe('[[real]]')
        expect(placed(find(tree, 'tag')[0])).toBe('#seen')
        expect(placed(find(tree, 'text')[0])).toBe('\\[[old]] ')
    })
})

describe('positions on the nodes notes add', () => {
    type Point = { line: number; column: number; offset: number }
    const at = (node: MarkdownNode) => node.position as { start: Point; end: Point } | undefined
    const written = (text: string, node: MarkdownNode) => {
        const place = at(node)
        return place === undefined ? undefined : text.slice(place.start.offset, place.end.offset)
    }
    const TEXT = [
        '---',
        'status: draft',
        '---',
        'See [[Nightly export|the export]] and #harbor, ![[chart.png|300]].',
        '',
        '> [!warning] Before a ==rerun==',
        '> Ask ada about ![[Runbook#Steps]] and ==a **bold** step==.',
        '',
        'An \\[escaped\\] ==mark &amp; [[link]]== #tag/deep',
    ].join('\n')
    const tree = parseMarkdown(TEXT, { positions: true })

    it('places each link, embed, tag and highlight on what was written', () => {
        expect(find(tree, 'wikiLink').map((node) => written(TEXT, node))).toEqual(['[[Nightly export|the export]]', '[[link]]'])
        expect(find(tree, 'embed').map((node) => written(TEXT, node))).toEqual(['![[chart.png|300]]', '![[Runbook#Steps]]'])
        expect(find(tree, 'tag').map((node) => written(TEXT, node))).toEqual(['#harbor', '#tag/deep'])
        expect(find(tree, 'highlight').map((node) => written(TEXT, node))).toEqual([
            '==rerun==',
            '==a **bold** step==',
            '==mark &amp; [[link]]==',
        ])
    })

    it('gives lines and columns that agree with the offsets', () => {
        const lines = TEXT.split('\n')
        for (const node of nodes(tree)) {
            const place = at(node)
            if (place === undefined) continue
            for (const point of [place.start, place.end]) {
                const before = lines.slice(0, point.line - 1).reduce((sum, line) => sum + line.length + 1, 0)
                expect(before + point.column - 1, node.type).toBe(point.offset)
            }
        }
    })

    it('keeps each text piece on its words', () => {
        for (const node of find(tree, 'text')) {
            const place = written(TEXT, node)
            if (place === undefined || node.value?.includes('\n') || /[\\&]/.test(place)) continue
            expect(place, JSON.stringify(node.value)).toBe(node.value)
        }
    })

    it('adds no positions unless asked', () => {
        expect(nodes(parseMarkdown(TEXT)).some((node) => node.position !== undefined)).toBe(false)
    })
})

describe('a %% comment', () => {
    const paragraphs = (text: string) =>
        find(parseMarkdown(text), 'paragraph').map((node) =>
            nodes(node)
                .filter((n) => n.type === 'text')
                .map((n) => n.value)
                .join(''),
        )

    it('is never drawn inline, as an HTML comment is not', () => {
        expect(paragraphs('Before %%hidden%% after.')).toEqual(['Before  after.'])
        expect(paragraphs('Before %% a [[note]] and #tag %% after.')).toEqual(['Before  after.'])
        expect(find(parseMarkdown('Before %% a [[note]] and #tag %% after.'), 'wikiLink')).toHaveLength(0)
    })

    it('hides a block over several lines, blank ones and blocks inside it included', () => {
        const tree = parseMarkdown('First.\n\n%%\nhidden\n\n- a list\n\n# a heading\n%%\n\nLast.')
        expect(paragraphs('First.\n\n%%\nhidden\n\n- a list\n\n# a heading\n%%\n\nLast.')).toEqual(['First.', 'Last.'])
        expect(find(tree, 'list')).toHaveLength(0)
        expect(find(tree, 'heading')).toHaveLength(0)
        expect(tree.children).toHaveLength(2)
    })

    it('is words inside code, written escaped, or left open', () => {
        expect(find(parseMarkdown('Run `%%x%%` now.'), 'inlineCode')[0]?.value).toBe('%%x%%')
        expect(find(parseMarkdown('```\n%% kept %%\n```'), 'code')[0]?.value).toBe('%% kept %%')
        expect(paragraphs('A \\%%not hidden%% here.')).toEqual(['A %%not hidden%% here.'])
        expect(paragraphs('Open %% and never closed.')).toEqual(['Open %% and never closed.'])
    })

    it('reads many comments between code spans in linear time', { retry: 3 }, () => {
        const read = (text: string) => parseMarkdown(text, { math: false })
        expectInStepWithParser(read, '%%a%% `b%%` ', 3_000)
        expectInStepWithParser(read, '`a` %% ', 3_000)
    })

    it('keeps the place of what follows it', () => {
        const text = 'A %%x%% [[note]] b'
        const at = find(parseMarkdown(text, { positions: true }), 'wikiLink')[0]?.position as {
            start: { offset: number }
            end: { offset: number }
        }
        expect(text.slice(at.start.offset, at.end.offset)).toBe('[[note]]')
    })
})
