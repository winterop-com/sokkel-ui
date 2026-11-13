import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Markdown } from './Markdown'
import { linkAllowed } from './markdown-view'
import { loadHtml, PlainMarkdown } from './PlainMarkdown'

const draw = (content: string, props: Partial<Parameters<typeof PlainMarkdown>[0]> = {}) =>
    renderToStaticMarkup(<PlainMarkdown content={content} {...props} />)

const IMAGES = [
    'The run graph: ![nightly-export runs](https://example.org/runs.png)',
    '',
    '[![badge](https://example.org/badge.svg)](https://example.org/harbor)',
].join('\n')

describe('PlainMarkdown images', () => {
    it('draws images by default', () => {
        expect(draw(IMAGES)).toContain('<img src="https://example.org/runs.png" alt="nightly-export runs"/>')
    })

    it('draws no image, no preload link and no address to fetch with images off', () => {
        const html = draw(IMAGES, { images: false })
        expect(html).not.toContain('<img')
        expect(html).not.toContain('<link')
        expect(html).not.toContain('src=')
        expect(html).toContain('The run graph: nightly-export runs (https://example.org/runs.png)')
        expect(html).toContain('>badge (https://example.org/badge.svg)</a>')
    })

    it('draws no raw image either, with HTML allowed', async () => {
        await loadHtml()
        const html = draw('<picture><source srcset="https://example.org/a.webp"><img src="https://example.org/a.png" alt="a"></picture>', {
            images: false,
            allowHtml: true,
        })
        expect(html).not.toMatch(/<(img|link|source)/)
        expect(html).not.toContain('srcset')
        expect(html).toContain('a (https://example.org/a.png)')
    })
})

const LINKS = [
    'Mail [ada](mailto:ada@example.org), read [the docs](https://example.org/docs),',
    'open [the run](/runs/42), jump to [steps](#steps), call [grace](tel:+4700000000),',
    'try [this](javascript:alert(1)) and [that](JaVaScRiPt:alert(1)), see [plain](http://example.org)',
    'and [off-site](//example.org/away).',
].join('\n')

describe('PlainMarkdown links', () => {
    it('keeps the safe links and draws a javascript: link as its words by default', () => {
        const html = draw(LINKS)
        expect(html).toContain('href="mailto:ada@example.org"')
        expect(html).toContain('href="/runs/42"')
        expect(html).toContain('href="//example.org/away"')
        expect(html).not.toContain('javascript')
        expect(html).not.toContain('href=""')
        expect(html).toContain('try this and that')
    })

    it('draws a link whose scheme is not listed as its words, with no anchor', () => {
        const html = draw(LINKS, { linkSchemes: ['https', 'mailto'] })
        expect(html).toContain('href="mailto:ada@example.org"')
        expect(html).toContain('href="https://example.org/docs"')
        expect((html.match(/<a /g) ?? []).length).toBe(2)
        expect(html).toContain('open the run, jump to steps, call grace,')
        expect(html).toContain('see plain')
        expect(html).toContain('and off-site.')
        expect(html).not.toContain('href=""')
    })

    it('takes relative links and any other scheme the app lists', () => {
        const html = draw(LINKS, { linkSchemes: ['relative', 'tel'] })
        expect(html).toContain('href="/runs/42"')
        expect(html).toContain('href="#steps"')
        expect(html).toContain('href="tel:+4700000000"')
        expect(html).not.toContain('mailto:')
        expect(html).not.toContain('//example.org/away')
    })

    it('never draws a javascript: link live, even when it is listed or written as raw HTML', async () => {
        await loadHtml()
        for (const props of [
            {},
            { linkSchemes: ['javascript', 'https'] },
            { allowHtml: true },
            { allowHtml: true, linkSchemes: ['javascript'] },
        ]) {
            const html = draw(`${LINKS}\n\n<a href="javascript:alert(1)">raw</a> <a href=" java\tscript:alert(1)">spaced</a>`, props)
            // oxlint-disable-next-line no-control-regex -- a browser drops these from an address.
            const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1].replace(/[\s\u0000-\u0020]/g, '').toLowerCase())
            expect(hrefs.filter((href) => href.includes('script:'))).toEqual([])
            expect(hrefs).not.toContain('')
        }
    })

    it('reads a scheme as a browser does', () => {
        expect(linkAllowed(' \tjavascript:alert(1)')).toBe(false)
        expect(linkAllowed('java\nscript:alert(1)', ['https'])).toBe(false)
        expect(linkAllowed('data:text/html,x', ['data'])).toBe(false)
        expect(linkAllowed('HTTPS://example.org', ['https'])).toBe(true)
        expect(linkAllowed('/\\example.org', ['relative'])).toBe(false)
        expect(linkAllowed('runs/42:latest', ['relative'])).toBe(true)
        expect(linkAllowed('', ['relative'])).toBe(false)
    })

    it('keeps the links between notes, which go nowhere themselves', () => {
        const html = renderToStaticMarkup(
            <Markdown content="See [[Nightly export]] and [x](/y)." links={{ onOpen: () => undefined }} linkSchemes={['https']} />,
        )
        expect(html).toContain('data-wiki-link="Nightly export"')
        expect(html).not.toContain('href="/y"')
    })
})

describe('PlainMarkdown raw HTML', () => {
    it('shows raw HTML as typed with allowHtml off', () => {
        expect(draw('Run <b>nightly-export</b> now.')).toContain('Run &lt;b&gt;nightly-export&lt;/b&gt; now.')
    })

    it('reads and sanitizes it once loaded', async () => {
        await loadHtml()
        const html = draw('Run <b>nightly-export</b> <script>alert(1)</script> now.', { allowHtml: true })
        expect(html).toContain('<b>nightly-export</b>')
        expect(html).not.toContain('script')
    })
})

describe('PlainMarkdown inline', () => {
    it('draws only the content of paragraphs, in a span', () => {
        const html = draw('# Help\n\nThe **job** to run.\n\n- fetch\n- upload\n\n```\nnightly-export\n```', { inline: true })
        expect(html).toMatch(/^<span class="[^"]*">Help The <strong>job<\/strong> to run\. fetch upload nightly-export<\/span>$/)
    })

    it('keeps links and code inside the line', () => {
        expect(draw('See [the docs](https://example.org) for `sync-inventory`.', { inline: true })).toContain(
            'See <a tabindex="0" href="https://example.org" target="_blank" rel="noreferrer noopener">the docs</a> for <code>sync-inventory</code>.</span>',
        )
    })
})

describe('PlainMarkdown headingOffset', () => {
    it('moves every heading down, to h6 at most', () => {
        const html = draw('# Harbor\n\n## Jobs\n\n##### Deep\n\n###### Deepest', { headingOffset: 2 })
        expect(html).not.toMatch(/<h[12][ >]/)
        expect(html).toContain('<h3>Harbor</h3>')
        expect(html).toContain('<h4>Jobs</h4>')
        expect(html).toContain('<h6>Deep</h6>')
        expect(html).toContain('<h6>Deepest</h6>')
    })

    it('keeps the ids anchors give', () => {
        expect(draw('# Harbor', { headingOffset: 1, anchors: true })).toContain('<h2 id="harbor">Harbor</h2>')
    })
})

describe('PlainMarkdown tables', () => {
    it('drops a header row whose cells are all empty', () => {
        const html = draw('| | |\n|---|---|\n| Owner | ada |\n| Schedule | nightly |')
        expect(html).not.toContain('<thead')
        expect(html).not.toContain('<th')
        expect(html).toContain('<td>Owner</td><td>ada</td>')
    })

    it('keeps a header row with words', () => {
        expect(draw('| Job | State |\n|---|---|\n| sync-inventory | failed |')).toContain('<thead>')
    })
})
