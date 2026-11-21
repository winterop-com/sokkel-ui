import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Markdown } from './Markdown'
import { linkAllowed, markdownHeadings } from './markdown-view'
import { loadHtml, markdownSection, PlainMarkdown, splitFrontmatter } from './PlainMarkdown'

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

describe('PlainMarkdown inert lines with marks', () => {
    const LINE = 'Runs after **[[Nightly export|the export]]**, see `nightly export` and [the log](https://example.org/log).'

    it('draws every link as its words without live', () => {
        const html = draw(LINE, { inline: true, live: false })
        expect(html).not.toContain('<a')
        expect(html).not.toContain('[[')
        expect(html).toContain('<strong>the export</strong>')
        expect(html).toContain('the log')
    })

    it('marks the words in any case, outside code', () => {
        const html = draw(LINE, { inline: true, live: false, highlight: 'THE EXPORT' })
        expect(html).toMatch(/<mark class="[^"]*bg-primary\/15[^"]*">the export<\/mark>/)
        expect(draw(LINE, { inline: true, highlight: 'nightly export' })).toContain('<code>nightly export</code>')
        expect(draw(LINE, { inline: true, highlight: '  ' })).not.toContain('<mark')
    })
})

const NOTES = { onOpen: () => undefined }

describe('PlainMarkdown notes as vaults write them', () => {
    const FRONT = '---\ntitle: Nightly export\ntags: [harbor]\n---\n# Steps\n\nFetch, then upload.'

    it('leaves the frontmatter out, with no rule and no heading made of it', () => {
        const html = draw(FRONT)
        expect(html).not.toContain('<hr')
        expect(html).not.toContain('title: Nightly export')
        expect(html).toContain('<h1')
        expect(html).toContain('Fetch, then upload.')
    })

    it('keeps a reply that opens with a rule and a sentence whole', () => {
        const reply = '---\nThe export finished at noon.\n---\nAll steps succeeded.'
        expect(splitFrontmatter(reply).frontmatter).toBeUndefined()
        expect(draw(reply)).toContain('The export finished at noon.')
        expect(draw(reply)).toContain('<hr')
    })

    it('shows the frontmatter as YAML code, or reads it as markdown, when asked', () => {
        expect(draw(FRONT, { frontmatter: 'show' })).toContain('title: Nightly export')
        expect(draw(FRONT, { frontmatter: 'show' })).not.toContain('<hr')
        expect(draw(FRONT, { frontmatter: 'markdown' })).toContain('<hr')
    })

    it('parts the frontmatter from the body, and lists no heading made of it', () => {
        expect(splitFrontmatter(FRONT)).toEqual({
            frontmatter: 'title: Nightly export\ntags: [harbor]',
            body: '# Steps\n\nFetch, then upload.',
        })
        expect(splitFrontmatter('---\n---\nBody')).toEqual({ frontmatter: '', body: 'Body' })
        expect(splitFrontmatter('Body\n---\nmore')).toEqual({ frontmatter: undefined, body: 'Body\n---\nmore' })
        expect(splitFrontmatter('---\nnever closed')).toEqual({ frontmatter: undefined, body: '---\nnever closed' })
        expect(splitFrontmatter('---\nlist:\n  - a\n- b\n# comment\n"quoted key": 1\n---\n').frontmatter).toBe(
            'list:\n  - a\n- b\n# comment\n"quoted key": 1',
        )
        expect(markdownHeadings('---\ntitle: x\n---\n## Steps', [1, 2]).map((heading) => heading.label)).toEqual(['Steps'])
    })

    it('never draws an HTML comment, HTML allowed or not', async () => {
        const text = 'Before <!-- unseen --> after\n\n<!--\na block\n-->\n\nEnd'
        expect(draw(text)).not.toContain('unseen')
        expect(draw(text)).not.toContain('a block')
        expect(draw(text)).not.toContain('&lt;!--')
        expect(draw(text)).toContain('End')
        await loadHtml()
        expect(draw(text, { allowHtml: true })).not.toContain('unseen')
    })

    it('keeps a part marker, which is a comment too', () => {
        expect(draw('<!-- part:run -->', { parts: { run: <span>the run</span> } })).toContain('the run')
    })

    it('draws a note embed as a link in a frame, never a stray "!"', () => {
        const html = draw('![[nightly-export]]', { links: NOTES })
        expect(html).not.toContain('!')
        expect(html).toMatch(/<div data-embed="nightly-export"[^>]*><a href="#" data-wiki-link="nightly-export"/)
        expect(draw('See ![[nightly-export#Steps]] here.', { links: NOTES })).toMatch(/See <span data-embed="nightly-export"/)
    })

    it('draws a note embed with the app’s embed when it gives one', () => {
        const html = draw('![[nightly-export#Steps]]', {
            links: { ...NOTES, embed: (target, heading) => <em>{`${target}/${heading ?? ''}`}</em> },
        })
        expect(html).toContain('<em>nightly-export/Steps</em>')
    })

    it('draws an image embed as an image, a number after the bar as its width, and other files as links', () => {
        const html = draw('![[tide chart.png|300]] ![[map.png|the harbor]] ![[runs.pdf]]', { links: NOTES })
        expect(html).toContain('<img src="tide%20chart.png" alt="tide chart.png" data-embed="tide chart.png" width="300"/>')
        expect(html).toContain('alt="the harbor"')
        expect(html).toMatch(/<a [^>]*href="runs.pdf"[^>]*>runs.pdf<\/a>/)
        expect(html).not.toContain('!')
    })

    it('rewrites image and link addresses through resolveUrl, then holds links to their schemes', () => {
        const resolveUrl = (url: string, use: 'image' | 'link') =>
            use === 'image' ? `https://files.example.org/${url}` : `ftp://example.org/${url}`
        const html = draw('![chart](attachments/chart.png) [notes](attachments/notes.pdf) [[harbor]]', {
            resolveUrl,
            links: NOTES,
            linkSchemes: ['https'],
        })
        expect(html).toContain('src="https://files.example.org/attachments/chart.png"')
        expect(html).not.toContain('ftp:')
        expect(html).toContain('data-wiki-link="harbor"')
    })

    it('draws a blob or data image only when resolveUrl gives it, never from the text alone', () => {
        const dataImage = 'data:image/png;base64,AAAA'
        expect(draw('![chart](chart.png)', { resolveUrl: () => dataImage })).toContain(`src="${dataImage}"`)
        expect(draw('![chart](chart.png)', { resolveUrl: () => 'blob:https://example.org/1' })).toContain(
            'src="blob:https://example.org/1"',
        )
        expect(draw(`![chart](${dataImage})`, { resolveUrl: (url) => url })).not.toContain('data:image')
        expect(draw(`![chart](${dataImage})`)).not.toContain('data:image')
        expect(draw('![chart](chart.png)', { resolveUrl: () => 'javascript:alert(1)' })).not.toContain('javascript:')
    })

    it('titles a callout with the rest of its first line', () => {
        const html = draw('> [!warning] Before a *rerun*\n> Move the file aside.')
        expect(html).toMatch(/<p class="[^"]*">Before a <em>rerun<\/em><\/p>/)
        expect(html).not.toContain('>Warning<')
        expect(html).toContain('Move the file aside.')
    })

    it('keeps the kind’s word as the title when none is written', () => {
        expect(draw('> [!NOTE]\n> The export reads only.')).toMatch(/<p class="[^"]*">Note<\/p>/)
    })

    it('draws further markers as the nearest kind, titled with their own word', () => {
        const html = draw('> [!todo]\n> Rebuild the index.')
        expect(html).toContain('data-callout="note"')
        expect(html).toMatch(/<p class="[^"]*">Todo<\/p>/)
        expect(draw('> [!bug] Fails on upload')).toContain('data-callout="caution"')
        expect(draw('> [!unknown] Stays a quote')).toContain('<blockquote>')
    })

    it('folds a callout closed with "-" and open with "+"', () => {
        const closed = draw('> [!tip]- Folded\n> Out of sight.')
        expect(closed).toMatch(/<details data-callout="tip" class="[^"]*">/)
        expect(closed).toContain('Out of sight.')
        expect(draw('> [!tip]+ Unfolded\n> In sight.')).toMatch(/<details data-callout="tip" open=""/)
    })

    it('draws ==words== highlighted, but not "a == b"', () => {
        const html = draw('The ==failed== step, where a == b, and `==code==`.')
        expect(html).toContain('<mark data-marked="">failed</mark>')
        expect(html).toContain('a == b')
        expect(html).toContain('<code>==code==</code>')
    })

    it('marks search words inside a highlight too', () => {
        expect(draw('==nightly export==', { highlight: 'export' })).toMatch(
            /<mark data-marked="">nightly <mark class="[^"]*">export<\/mark><\/mark>/,
        )
    })

    it('hides a %%comment%%, and shows what it does not read as typed: inline footnotes, block ids, and a single line break', () => {
        const html = draw('%%draft%% then ^[an aside] and a block ^abc123\nnext line')
        expect(html).not.toContain('draft')
        expect(html).toContain('^[an aside]')
        expect(html).toContain('^abc123\nnext line')
        expect(html).not.toContain('<br')
    })

    it('gives the text under a heading, up to the next at its level or above', () => {
        const text = '# Retry\n\nIntro\n\n## Steps\n\n1. Fetch\n\n```\n# not a heading\n```\n\n### Detail\n\nMore\n\n## After\n\nDone'
        expect(markdownSection(text, 'Steps')).toBe('## Steps\n\n1. Fetch\n\n```\n# not a heading\n```\n\n### Detail\n\nMore')
        expect(markdownSection(text, 'after')).toBe('## After\n\nDone')
        expect(markdownSection(text, 'Missing')).toBeUndefined()
    })
})
