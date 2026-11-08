import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Markdown } from './Markdown'

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
