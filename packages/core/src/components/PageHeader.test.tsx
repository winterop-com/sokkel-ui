import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PageHeader } from './PageHeader'
import { ShellTrailAsk } from './shell-context'

describe('a page header', () => {
    it('keeps its actions to their own width unless asked', () => {
        const html = renderToStaticMarkup(<PageHeader title="Jobs" actions={<button type="button">New</button>} />)
        expect(html).toMatch(/data-slot="page-header-actions" class="[^"]*shrink-0/)
    })

    it('lets a title alone take its own width, and a title with more under it a fair share', () => {
        expect(renderToStaticMarkup(<PageHeader title="Pipelines" actions={<button type="button">New</button>} />)).toContain(
            'flex-[1_1_auto]',
        )
        expect(renderToStaticMarkup(<PageHeader title="Pipelines" actions={<button type="button">New</button>} />)).toContain(
            '@lg/page-header:flex-[1_1_0%]',
        )
        expect(renderToStaticMarkup(<PageHeader title="Jobs" description="Every job of harbor." />)).toContain('flex-[1_1_16rem]')
    })

    it('cuts a code standing as the title short, with the whole of it on hover', () => {
        const html = renderToStaticMarkup(<PageHeader title="nightly-export" code="nightly-export" />)
        expect(html).toMatch(/<h1[^>]*title="nightly-export"[^>]*class="[^"]*truncate/)
        expect(renderToStaticMarkup(<PageHeader title="nightly-export" code="nightly-export" singleLine={false} />)).not.toContain(
            'truncate',
        )
    })

    it('keeps a wide header with folding actions to one line, the title at most 60% of it', () => {
        const html = renderToStaticMarkup(<PageHeader title="nightly-export" code="nightly-export" items={[{ id: 'log', label: 'Log' }]} />)
        expect(html).toContain('@lg/page-header:flex-nowrap')
        expect(html).toContain('@lg/page-header:max-w-[60%]')
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

    it('says the whole code on hover where it is cut short', () => {
        const html = renderToStaticMarkup(<PageHeader title="Sync inventory" code="juniper/jobs/sync-inventory" />)
        expect(html).toMatch(/<p title="juniper\/jobs\/sync-inventory" class="truncate font-mono/)
    })

    it('names More and a split item chevron from its words', () => {
        const html = renderToStaticMarkup(
            <PageHeader
                title="Sync inventory"
                items={[{ id: 'run', label: 'Run now', more: [{ label: 'Run with options', onSelect: () => undefined }] }]}
                words={{ more: 'More actions', moreWays: 'Other ways' }}
            />,
        )
        expect(html).toContain('aria-label="More actions"')
        expect(html).toContain('aria-label="Other ways"')
    })

    it('starts the actions with a lead that stays out of the folding', () => {
        const folding = renderToStaticMarkup(
            <PageHeader
                title="nightly-export"
                lead={<span>failed</span>}
                items={[{ id: 'history', label: 'Run history' }]}
                actions={<button type="button">Run</button>}
            />,
        )
        expect(folding).toMatch(/data-slot="toolbar-items-lead"[^>]*><span>failed<\/span>/)
        expect(folding.indexOf('<span>failed</span>')).toBeLessThan(folding.lastIndexOf('>Run history<'))
        const plain = renderToStaticMarkup(
            <PageHeader title="nightly-export" lead={<span>failed</span>} actions={<button type="button">Run</button>} />,
        )
        expect(plain).toMatch(/data-slot="page-header-actions"[^>]*><span>failed<\/span><button/)
        const alone = renderToStaticMarkup(<PageHeader title="nightly-export" lead={<span>failed</span>} />)
        expect(alone).toContain('data-slot="page-header-actions"')
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

    it('draws its trail outside a shell, and inside one leaves it to the top bar unless told to draw it', () => {
        const trail = [{ label: 'Jobs', href: '#/jobs' }]
        const header = <PageHeader title="nightly-export" trail={trail} />
        const inShell = (drawn: ReactNode) => renderToStaticMarkup(<ShellTrailAsk value={() => () => undefined}>{drawn}</ShellTrailAsk>)
        expect(renderToStaticMarkup(header)).toContain('aria-label="Where you are"')
        expect(inShell(header)).not.toContain('aria-label="Where you are"')
        expect(inShell(header)).toContain('nightly-export')
        expect(inShell(<PageHeader title="nightly-export" trail={trail} trailInTop={false} />)).toContain('aria-label="Where you are"')
    })
})
