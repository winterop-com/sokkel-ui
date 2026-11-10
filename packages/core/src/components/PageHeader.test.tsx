import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PageHeader } from './PageHeader'

describe('a page header', () => {
    it('keeps its actions to their own width unless asked', () => {
        const html = renderToStaticMarkup(<PageHeader title="Jobs" actions={<button type="button">New</button>} />)
        expect(html).toMatch(/data-slot="page-header-actions" class="[^"]*shrink-0/)
        expect(html).toContain('flex-[1_1_16rem]')
    })

    it('gives the actions the room the title leaves with actionsFill', () => {
        const html = renderToStaticMarkup(<PageHeader title="Jobs" actionsFill actions={<div>tools</div>} />)
        expect(html).toMatch(/data-slot="page-header-actions" class="[^"]*flex-\[1_1_8rem\]/)
        expect(html).toContain('flex-[0_1_auto]')
    })

    it('draws items before the actions in a folding toolbar', () => {
        const html = renderToStaticMarkup(
            <PageHeader
                title="nightly-export"
                items={[
                    { id: 'history', label: 'Run history' },
                    { id: 'schedule', label: 'Change the schedule' },
                ]}
                actions={<button type="button">Run</button>}
            />,
        )
        expect(html).toContain('data-slot="toolbar-items"')
        expect(html.lastIndexOf('Change the schedule')).toBeLessThan(html.lastIndexOf('>Run<'))
        expect(html).toContain('flex-[1_1_8rem]')
    })

    it('sets the aside down the side of every line after the back button', () => {
        const html = renderToStaticMarkup(
            <PageHeader
                title="Harbor"
                code="harbor"
                description="Orders and exports."
                aside={<span>mark</span>}
                onBack={() => undefined}
            />,
        )
        expect(html).toContain('grid-cols-[auto_auto_minmax(0,1fr)]')
        expect(html).toMatch(/col-start-2 row-span-3"><span>mark/)
    })
})
