import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DescriptionList, DescriptionListGroup } from './DescriptionList'

describe('DescriptionList', () => {
    it('holds its own term column alone', () => {
        const html = renderToStaticMarkup(<DescriptionList termWidth="auto" items={[{ term: 'Job', value: 'send-digest' }]} />)
        expect(html).toContain('--term-width:fit-content(40%)')
        expect(html).not.toContain('data-grouped')
    })

    it("takes its group's term column in a group, and what sits between the lists takes the full width", () => {
        const html = renderToStaticMarkup(
            <DescriptionListGroup termWidth="auto">
                <DescriptionList items={[{ term: 'Job', value: 'send-digest' }]} />
                <p>between</p>
                <DescriptionList items={[{ term: 'Skip when the last run failed', value: 'on' }]} />
                <DescriptionList columns={2} items={[{ term: 'Owner', value: 'margaret' }]} />
            </DescriptionListGroup>,
        )
        expect(html).toMatch(
            /^<div data-slot="description-list-group" class="[^"]*\*:col-span-full[^"]*" style="--term-width:fit-content\(40%\)"/,
        )
        expect(html.match(/data-grouped=""/g)).toHaveLength(2)
        // The group's column, and the two-column list's own.
        expect(html.match(/--term-width:/g)).toHaveLength(2)
    })
})
