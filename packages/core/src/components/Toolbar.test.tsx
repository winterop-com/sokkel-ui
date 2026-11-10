import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Toolbar, toolbarEntries, toolbarSplit, type ToolbarItem } from './Toolbar'

const noop = () => undefined

describe('toolbarEntries', () => {
    it('lists a plain tool as one entry under its label', () => {
        expect(toolbarEntries({ id: 'export', label: 'Export', face: 'Out', onSelect: noop })).toEqual([
            expect.objectContaining({ key: 'export', label: 'Export', shut: false, destructive: false }),
        ])
    })

    it('shuts a tool with a reason and says the reason under its entry', () => {
        const [entry] = toolbarEntries({ id: 'run', label: 'Run', reason: 'A run of nightly-export is going', onSelect: noop })
        expect(entry).toMatchObject({ shut: true, note: 'A run of nightly-export is going' })
    })

    it('shuts a disabled tool quietly', () => {
        const [entry] = toolbarEntries({ id: 'run', label: 'Run', disabled: true })
        expect(entry).toMatchObject({ shut: true, note: undefined })
    })

    it('lists a split tool as its own entry, then its related ways in order, shut with it', () => {
        const entries = toolbarEntries({
            id: 'run',
            label: 'Run now',
            reason: 'Paused',
            more: [
                { label: 'Run with options', onSelect: noop },
                { label: 'Run from a step', description: 'Skips fetch', onSelect: noop },
                { label: 'Cancel every run', destructive: true, onSelect: noop },
            ],
        })
        expect(entries.map((entry) => entry.label)).toEqual(['Run now', 'Run with options', 'Run from a step', 'Cancel every run'])
        expect(entries.every((entry) => entry.shut)).toBe(true)
        expect(entries[2]?.note).toBe('Skips fetch')
        expect(entries[3]?.destructive).toBe(true)
        expect(entries.map((entry) => entry.inset)).toEqual([false, false, false, false])
    })

    it('sets icon-less related ways in under a tool with an icon', () => {
        const entries = toolbarEntries({ id: 'run', label: 'Run now', icon: 'run', more: [{ label: 'Run with options', onSelect: noop }] })
        expect(entries.map((entry) => entry.inset)).toEqual([false, true])
    })

    it('carries a destructive tool and a toggle', () => {
        expect(toolbarEntries({ id: 'delete', label: 'Delete', destructive: true })[0]?.destructive).toBe(true)
        expect(toolbarEntries({ id: 'pin', label: 'Pinned', pressed: false })[0]?.pressed).toBe(false)
    })
})

describe('a toolbar row', () => {
    const render = (items: ToolbarItem[], words?: { more?: string }) => renderToStaticMarkup(<Toolbar items={items} words={words} />)

    it('keeps a shut tool reachable: aria-disabled, never the disabled attribute', () => {
        const html = render([{ id: 'run', label: 'Run', reason: 'A run is going', onSelect: noop }])
        expect(html).toMatch(/<button[^>]*aria-disabled="true"[^>]*>Run<\/button>/)
        expect(html).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>Run</)
    })

    it('names a tool by its label where its face is shorter', () => {
        const html = render([{ id: 'new', label: 'New job', face: 'New', onSelect: noop }])
        expect(html).toMatch(/<button[^>]*aria-label="New job"[^>]*>New<\/button>/)
        expect(html).toContain('title="New job"')
    })

    it('gives a tool with no face no separate name', () => {
        expect(render([{ id: 'export', label: 'Export' }])).not.toContain('aria-label="Export"')
    })

    it('tints a destructive tool in the critical tone', () => {
        expect(render([{ id: 'delete', label: 'Delete', destructive: true }])).toContain('hover:text-critical-ink')
    })

    it('draws a split tool as a split button with its chevron named from the words', () => {
        const html = renderToStaticMarkup(
            <Toolbar
                items={[{ id: 'run', label: 'Run now', more: [{ label: 'Run with options', onSelect: noop }] }]}
                words={{ moreWays: 'Other ways' }}
            />,
        )
        expect(html).toContain('data-slot="split-button"')
        expect(html).toContain('aria-label="Other ways"')
    })

    it('names More from its words', () => {
        expect(render([{ id: 'export', label: 'Export' }], { more: 'More actions' })).toContain('aria-label="More actions"')
    })

    it('sets a lead before the tools, out of the folding', () => {
        const html = renderToStaticMarkup(<Toolbar items={[{ id: 'export', label: 'Export' }]} itemsLead={<span>failed</span>} />)
        expect(html).toContain('data-slot="toolbar-items-lead"')
        expect(html.indexOf('<span>failed</span>')).toBeLessThan(html.lastIndexOf('>Export<'))
    })

    it('draws the primary filled after the tools, named apart from its face, out of the folding', () => {
        const html = renderToStaticMarkup(
            <Toolbar
                items={[{ id: 'export', label: 'Export' }]}
                primary={{ id: 'new', label: 'New job', face: 'New', more: [{ label: 'Import a job', onSelect: noop }] }}
            />,
        )
        const primary = html.slice(html.indexOf('data-slot="toolbar-primary"'))
        expect(html.indexOf('data-slot="toolbar-primary"')).toBeGreaterThan(html.lastIndexOf('>Export<'))
        expect(primary).toContain('bg-primary')
        expect(primary).toContain('aria-label="New job"')
        expect(primary).toContain('data-slot="split-button"')
    })

    it('shuts a primary with a reason, reachable', () => {
        const html = renderToStaticMarkup(<Toolbar primary={{ id: 'run', label: 'Run', reason: 'The job is paused' }} />)
        expect(html.slice(html.indexOf('data-slot="toolbar-primary"'))).toContain('aria-disabled="true"')
    })

    it('keeps the row to one line with nowrap', () => {
        expect(renderToStaticMarkup(<Toolbar items={[{ id: 'export', label: 'Export' }]} nowrap />)).toContain('flex-nowrap')
        expect(renderToStaticMarkup(<Toolbar items={[{ id: 'export', label: 'Export' }]} />)).not.toContain('flex-nowrap')
    })

    it('draws the tools by their words alone when asked', () => {
        const icon = <svg data-testid="glyph" />
        const item = { id: 'export', label: 'Export', icon }
        expect(renderToStaticMarkup(<Toolbar items={[item]} />)).toContain('data-testid="glyph"')
        expect(renderToStaticMarkup(<Toolbar items={[item]} wordsOnly />)).not.toContain('data-testid="glyph"')
    })
})

const ITEMS = ['run', 'export', 'share', 'archive']

describe('toolbarSplit', () => {
    it('keeps every tool in the row when all fit, with no More', () => {
        // 60 + 8 + 70 + 8 + 50 + 8 + 80 = 284.
        expect(toolbarSplit(ITEMS, [60, 70, 50, 80], 284, 8, 28)).toEqual({ inline: ITEMS, overflow: [] })
    })

    it('moves the tools past the room into More, in order, keeping room for More', () => {
        // 28 for More, then 8 + 60 + 8 + 70 = 174; the third would need 232.
        expect(toolbarSplit(ITEMS, [60, 70, 50, 80], 200, 8, 28)).toEqual({ inline: ['run', 'export'], overflow: ['share', 'archive'] })
    })

    it('never skips a tool that does not fit to show a later one that would', () => {
        expect(toolbarSplit(ITEMS, [60, 200, 10, 10], 120, 8, 28)).toEqual({ inline: ['run'], overflow: ['export', 'share', 'archive'] })
    })

    it('moves every tool into More when only More fits', () => {
        expect(toolbarSplit(ITEMS, [60, 70, 50, 80], 40, 8, 28)).toEqual({ inline: [], overflow: ITEMS })
    })

    it('reads no width past the tools it is given', () => {
        expect(toolbarSplit(['run'], [60, 500], 70, 8, 28)).toEqual({ inline: ['run'], overflow: [] })
    })
})
