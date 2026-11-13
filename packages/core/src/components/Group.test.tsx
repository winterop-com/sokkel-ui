import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DescriptionList } from './DescriptionList'
import { Group } from './Group'

describe('Group', () => {
    it('is labelled by its title and draws a quiet count beside it', () => {
        const html = renderToStaticMarkup(
            <Group title="Steps" count={5} headingId="steps">
                <p>fetch</p>
            </Group>,
        )
        expect(html).toContain('aria-labelledby="steps"')
        expect(html).toContain('<h3 id="steps"')
        expect(html).toContain('data-tone="quiet"')
        expect(html).toContain('>5</span>')
    })

    it('draws no count for zero, and says a count in its tone and label', () => {
        expect(
            renderToStaticMarkup(
                <Group title="Skipped" count={0}>
                    -
                </Group>,
            ),
        ).not.toContain('data-tone')
        const html = renderToStaticMarkup(
            <Group title="Failed checks" count={2} countTone="critical" countLabel={(count) => `${String(count)} failed`}>
                -
            </Group>,
        )
        expect(html).toContain('data-tone="critical"')
        expect(html).toContain('aria-label="2 failed"')
    })
})

describe('DescriptionList', () => {
    it('sizes the term column to the longest term with auto, and holds a fixed width otherwise', () => {
        const auto = renderToStaticMarkup(<DescriptionList termWidth="auto" items={[{ term: 'Job', value: 'send-digest' }]} />)
        expect(auto).toContain('--term-width:fit-content(40%)')
        const fixed = renderToStaticMarkup(<DescriptionList items={[{ term: 'Job', value: 'send-digest' }]} />)
        expect(fixed).toContain('--term-width:6rem')
    })

    it('sets a side pair on the list tracks, and a wide one under its term across them', () => {
        const html = renderToStaticMarkup(
            <DescriptionList
                items={[
                    { term: 'Job', value: 'import-orders' },
                    { term: 'Rule', value: 'orders.total >= 0', wide: true },
                ]}
            />,
        )
        expect(html).toContain('grid-cols-subgrid')
        expect(html).toMatch(/class="[^"]*flex flex-col[^"]*col-span-full/)
    })

    it('sets the small size at the size of help text', () => {
        const html = renderToStaticMarkup(<DescriptionList size="sm" items={[{ term: 'Job', value: 'import-orders' }]} />)
        expect(html).toContain('data-size="sm"')
        expect(html).toMatch(/<dl[^>]*class="text-xs leading-4/)
    })
})
