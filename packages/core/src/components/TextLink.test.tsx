import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { InlineCode } from './InlineCode'
import { LinkProvider, type LinkRender } from './Link'
import { TextLink } from './TextLink'

const routed: LinkRender = (props) => <a data-routed="" {...props} />

describe('TextLink', () => {
    it('draws an internal link through the provider', () => {
        const html = renderToStaticMarkup(
            <LinkProvider render={routed}>
                <TextLink href="/jobs/nightly-export">nightly-export</TextLink>
            </LinkProvider>,
        )
        expect(html).toContain('data-routed')
        expect(html).toContain('href="/jobs/nightly-export"')
    })

    it('opens an external link in a new tab as a plain anchor, saying so', () => {
        const html = renderToStaticMarkup(
            <LinkProvider render={routed}>
                <TextLink href="https://status.example.org" external words={{ newTab: 'new tab' }}>
                    status
                </TextLink>
            </LinkProvider>,
        )
        expect(html).not.toContain('data-routed')
        expect(html).toContain('target="_blank"')
        expect(html).toContain('rel="noopener noreferrer"')
        expect(html).toContain('data-slot="external-mark"')
        expect(html).toContain('<span class="sr-only"> (new tab)</span>')
    })

    it('draws a button with what it is given when it opens something in place', () => {
        const html = renderToStaticMarkup(
            <TextLink variant="inline" aria-expanded={false} onPress={() => {}}>
                Show the steps
            </TextLink>,
        )
        expect(html).toMatch(/^<button type="button" aria-expanded="false"/)
        expect(html).not.toContain('href')
    })
})

describe('InlineCode', () => {
    it('holds the whole value in its title, in its tone', () => {
        const html = renderToStaticMarkup(<InlineCode value="worker-1.example.org" tone="critical" />)
        expect(html).toContain('title="worker-1.example.org"')
        expect(html).toContain('data-tone="critical"')
        expect(html).toContain('truncate')
    })
})
