import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { loadHtml, loadMath, Markdown } from './Markdown'
import { MARKDOWN_COMPONENTS, MarkdownView } from './markdown-view'

beforeAll(loadHtml)
beforeAll(loadMath)

const PAGE = [
    '## Schedule',
    '',
    'The export runs nightly.',
    '',
    '<!-- part:runs -->',
    '',
    '## Owners',
    '',
    'Ask <!-- part:person --> about it.',
].join('\n')

const PARTS = { runs: <b>recent runs</b>, person: <i>ada</i> }

describe('Markdown parts', () => {
    it('draws each part where its marker stands, keeping the headings around it', () => {
        const html = renderToStaticMarkup(<Markdown content={PAGE} parts={PARTS} anchors />)
        expect(html).toContain('<div data-part="runs" class="my-3"><b>recent runs</b></div>')
        expect(html).toContain('Ask <span data-part="person"><i>ada</i></span> about it.')
        expect(html).toContain('<h2 id="schedule">')
        expect(html).toContain('<h2 id="owners">')
        expect(html).not.toContain('<!--')
    })

    it('keeps the markers with raw HTML allowed and sanitized', () => {
        const html = renderToStaticMarkup(<Markdown content={PAGE} parts={PARTS} allowHtml />)
        expect(html).toContain('<b>recent runs</b>')
        expect(html).toContain('<i>ada</i>')
    })

    it('draws nothing for a part it is not given', () => {
        const html = renderToStaticMarkup(<Markdown content={'<!-- part:missing -->\n\ntext'} />)
        expect(html).not.toContain('data-part')
        expect(html).not.toContain('missing')
        expect(html).toContain('<p>text</p>')
    })

    it('takes another marker word and a function that draws each part', () => {
        const content = [
            'Filter the runs:',
            '',
            '<!-- snippet:failed-runs -->',
            '',
            '```jq',
            '.runs[] | select(.state == "failed")',
            '```',
        ].join('\n')
        const html = renderToStaticMarkup(<Markdown content={content} partMarker="snippet" parts={(id) => <b>{id}</b>} />)
        expect(html).toContain('<div data-part="failed-runs" class="my-3"><b>failed-runs</b></div>')
        expect(html).toContain('data-slot="code-block"')
    })
})

const NOTE = [
    '## Steps',
    '',
    'See [[Nightly export]], [[harbor|the harbor project]] and [[Nightly export#Steps]] for #runbook and #on-call.',
    '',
    'A [[Missing note]] and `[[code]]` and [a link](https://example.org/#top).',
].join('\n')

describe('Markdown links', () => {
    const links = { onOpen: () => undefined, exists: (target: string) => target !== 'Missing note', onTag: () => undefined }

    it('draws each link between notes as a link to follow, with its words', () => {
        const html = renderToStaticMarkup(<Markdown content={NOTE} links={links} />)
        expect(html).toContain('<a href="#" data-wiki-link="Nightly export" class="">Nightly export</a>')
        expect(html).toContain('data-wiki-link="harbor" class="">the harbor project</a>')
        expect(html).toContain('data-heading="Steps" class="">Nightly export › Steps</a>')
        expect(html).toContain('data-wiki-link="Missing note" class="opacity-60">')
        expect(html).toContain('<code>[[code]]</code>')
        expect(html).toContain('target="_blank"')
    })

    it('draws tags as chips only when they are followed', () => {
        expect(renderToStaticMarkup(<Markdown content={NOTE} links={links} />)).toContain('data-tag="runbook"')
        const untagged = renderToStaticMarkup(<Markdown content={NOTE} links={{ onOpen: links.onOpen }} />)
        expect(untagged).not.toContain('data-tag')
        expect(untagged).toContain('for #runbook and #on-call.')
    })

    it('leaves the brackets as text without links', () => {
        expect(renderToStaticMarkup(<Markdown content={NOTE} />)).toContain('See [[Nightly export]]')
    })

    it('keeps the links with raw HTML allowed and sanitized', () => {
        const html = renderToStaticMarkup(<Markdown content={NOTE} links={links} allowHtml />)
        expect(html).toContain('data-wiki-link="Nightly export"')
        expect(html).toContain('data-tag="on-call"')
    })

    it('holds prose to the reading measure only with measure', () => {
        const measured = renderToStaticMarkup(<Markdown content="Some text." measure />)
        expect(measured).toContain('max-w-(--reading-measure)')
        expect(renderToStaticMarkup(<Markdown content="Some text." />)).not.toContain('reading-measure')
        expect(renderToStaticMarkup(<Markdown content="Some text." measure inline />)).not.toContain('reading-measure')
    })

    it('keeps a link to a place in the page in it, and opens any other in a new tab', () => {
        const html = renderToStaticMarkup(<Markdown content="See [Steps](#steps) and [the docs](https://example.org/docs)." />)
        expect(html).toMatch(/<a [^>]*href="#steps"(?![^>]*target)[^>]*>Steps<\/a>/)
        expect(html).toMatch(/<a [^>]*href="https:\/\/example\.org\/docs"[^>]*target="_blank"/)
    })
})

describe('Markdown headings', () => {
    it('gives a repeated heading its own id under anchors, matching markdownHeadings', () => {
        const html = renderToStaticMarkup(<Markdown content={'## Example\n\nOne.\n\n## Example\n\nTwo.'} anchors />)
        expect(html).toContain('<h2 id="example">')
        expect(html).toContain('<h2 id="example-1">')
    })
})

describe('Markdown streaming', () => {
    it('draws every view with one map of renderers, which reads streaming from the view', () => {
        const seen: boolean[] = []
        const Diagram = ({ streaming }: { code: string; streaming: boolean }) => {
            seen.push(streaming)
            return <svg />
        }
        const fence = '```mermaid\ngraph LR\n  fetch --> upload\n```'
        renderToStaticMarkup(<MarkdownView content={fence} Diagram={Diagram} streaming />)
        renderToStaticMarkup(<MarkdownView content={fence} Diagram={Diagram} />)
        expect(seen).toEqual([true, false])
        expect(Object.keys(MARKDOWN_COMPONENTS).sort()).toEqual(['a', 'blockquote', 'div', 'pre', 'span', 'th'])
    })

    it('shows a display formula still being written as its source, with no error', () => {
        const html = renderToStaticMarkup(<Markdown content={'The ratio:\n\n$$\n\\frac{a}{'} streaming />)
        expect(html).not.toContain('class="katex-error"')
        expect(html).toContain('\\frac{a}{')
    })

    it('draws the formula once it closes', () => {
        const html = renderToStaticMarkup(<Markdown content={'The ratio:\n\n$$\n\\frac{a}{b}\n$$'} streaming />)
        expect(html).toContain('class="katex-display"')
    })
})

/** Raw HTML that would run script, fetch an address, restyle the page or leave it, as a text could be sent it. */
const PAYLOADS = [
    '<img src="x" onerror="alert(1)">',
    '<svg><script>alert(1)</script></svg>',
    '<a href="javascript:alert(1)">run</a>',
    '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">run</a>',
    '<iframe src="https://example.org/frame"></iframe>',
    '<object data="https://example.org/x.swf"></object>',
    '<embed src="https://example.org/x.swf">',
    '<form action="https://example.org/steal"><input name="token"><button>Send</button></form>',
    '<div style="background:url(https://example.org/track.png)">styled</div>',
    '<style>body { display: none }</style>',
    '<link rel="stylesheet" href="https://example.org/x.css">',
    '<meta http-equiv="refresh" content="0;url=https://example.org">',
    '<base href="https://example.org/">',
    '<details open ontoggle="alert(1)"><summary>more</summary></details>',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)></style></mglyph></table></mtext></math>',
    '<p onclick="alert(1)" onmouseover="alert(1)">hover</p>',
    '<video src="https://example.org/v.mp4" autoplay></video>',
]

describe('Markdown raw HTML', () => {
    it.each(PAYLOADS)('draws %s with nothing live in it', (payload) => {
        // React hints an image it draws ahead with a preload link; images are on, so that one is expected.
        const html = renderToStaticMarkup(<Markdown content={`Before.\n\n${payload}\n\nAfter.`} allowHtml />).replace(
            /^<link rel="preload" as="image" [^>]*>/,
            '',
        )
        expect(html).toContain('After.')
        expect(html).not.toMatch(/<[^>]*\son[a-z]+=/i)
        expect(html).not.toMatch(/<(script|iframe|object|embed|form|style|link|meta|base|video)\b/i)
        expect(html).not.toMatch(/(?:href|src|action|data)="\s*(?:javascript|data|vbscript):/i)
        expect(html).not.toMatch(/style="[^"]*url\(/i)
    })
})

describe('Markdown math', () => {
    it('draws no link, class, style or picture a formula asks for', () => {
        const html = renderToStaticMarkup(
            <Markdown
                content={
                    'Inline $\\href{javascript:alert(1)}{run}$ and $\\url{javascript:alert(1)}$, then $\\htmlStyle{color: red}{x}$, $\\htmlClass{evil}{y}$ and $\\includegraphics{https://example.org/x.png}$.'
                }
            />,
        )
        expect(html).toContain('class="katex')
        expect(html).not.toMatch(/<a\b/)
        expect(html).not.toContain('<img')
        expect(html).not.toMatch(/href="\s*javascript:/i)
        expect(html).not.toMatch(/class="[^"]*evil/)
        expect(html).not.toMatch(/style="[^"]*red/)
    })
})
