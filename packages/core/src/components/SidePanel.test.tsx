import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PanelTabStrip, stripStep, type PanelStrip } from './panel-strip'
import { ShellPanelStrip } from './shell-context'
import { SidePanel, type SidePanelTab } from './SidePanel'

const TABS: SidePanelTab[] = [
    { id: 'details', label: 'Details', content: <p>nightly-export</p> },
    { id: 'log', label: 'Log', content: <p>fetch started</p> },
    { id: 'outputs', label: 'Outputs', content: <p>1,204 records</p> },
]

/** Every element of a role in the markup, as its opening tag. */
const tags = (html: string, role: string) => html.match(new RegExp(`<[a-z]+[^>]*role="${role}"[^>]*>`, 'g')) ?? []
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]

describe('SidePanel', () => {
    it('draws its tabs as a tablist whose tabs control the content, a tabpanel labelled by the shown tab', () => {
        const html = renderToStaticMarkup(<SidePanel tabs={TABS} defaultActive="log" />)
        expect(tags(html, 'tablist')).toHaveLength(1)
        const tabs = tags(html, 'tab')
        expect(tabs).toHaveLength(3)
        const [panel] = tags(html, 'tabpanel')
        expect(panel).toBeDefined()
        const panelId = attr(panel ?? '', 'id')
        expect(panelId).toBeTruthy()
        for (const tab of tabs) {
            expect(attr(tab, 'id')).toBeTruthy()
            expect(attr(tab, 'aria-controls')).toBe(panelId)
        }
        const selected = tabs.filter((tab) => attr(tab, 'aria-selected') === 'true')
        expect(selected).toHaveLength(1)
        expect(attr(panel ?? '', 'aria-labelledby')).toBe(attr(selected[0] ?? '', 'id'))
        expect(html).toContain('fetch started')
        expect(html).not.toContain('nightly-export')
    })

    it('heads a sole tab with a title naming the panel, or a tablist of one with soleTab="tab"', () => {
        const one = [TABS[0] as SidePanelTab]
        const titled = renderToStaticMarkup(<SidePanel tabs={one} />)
        expect(titled).toMatch(/<h2 [^>]*>Details<\/h2>/)
        expect(tags(titled, 'tablist')).toHaveLength(0)
        expect(tags(titled, 'tabpanel')).toHaveLength(0)
        const id = /<h2 id="([^"]+)"/.exec(titled)?.[1]
        expect(titled).toContain(`aria-labelledby="${String(id)}"`)

        const tabbed = renderToStaticMarkup(<SidePanel tabs={one} soleTab="tab" />)
        expect(tags(tabbed, 'tablist')).toHaveLength(1)
        expect(tags(tabbed, 'tab')).toHaveLength(1)
        expect(tags(tabbed, 'tabpanel')).toHaveLength(1)
        expect(tabbed).not.toContain('<h2')
    })

    it("in the shell's strip, names the shown tab and labels its content by the strip's tab", () => {
        const strip: PanelStrip = { publish: () => undefined, shown: true, tabId: (id) => `strip-tab-${id}`, panelId: 'strip-panel' }
        const html = renderToStaticMarkup(
            <ShellPanelStrip value={strip}>
                <SidePanel tabs={TABS} defaultActive="log" />
            </ShellPanelStrip>,
        )
        expect(tags(html, 'tablist')).toHaveLength(0)
        expect(html).toMatch(/<h2 [^>]*>Log<\/h2>/)
        const [panel] = tags(html, 'tabpanel')
        expect(attr(panel ?? '', 'id')).toBe('strip-panel')
        expect(attr(panel ?? '', 'aria-labelledby')).toBe('strip-tab-log')
        expect(html).not.toContain('Resize the side panel')
    })
})

describe('PanelTabStrip', () => {
    const strip = (open: boolean) =>
        renderToStaticMarkup(
            <PanelTabStrip
                tabs={TABS}
                active="log"
                open={open}
                label="Panel"
                tabId={(id) => `strip-tab-${id}`}
                panelId="strip-panel"
                onPress={() => undefined}
            />,
        )

    it('is a named tablist whose tabs control the sheet, the open one selected and expanded', () => {
        const html = strip(true)
        const [list] = tags(html, 'tablist')
        expect(attr(list ?? '', 'aria-label')).toBe('Panel')
        const tabs = tags(html, 'tab')
        expect(tabs.map((tab) => attr(tab, 'id'))).toEqual(['strip-tab-details', 'strip-tab-log', 'strip-tab-outputs'])
        for (const tab of tabs) expect(attr(tab, 'aria-controls')).toBe('strip-panel')
        const open = tabs.filter((tab) => attr(tab, 'aria-selected') === 'true')
        expect(open.map((tab) => attr(tab, 'id'))).toEqual(['strip-tab-log'])
        expect(attr(open[0] ?? '', 'aria-expanded')).toBe('true')
    })

    it('selects none with the sheet down, the shown tab still taking the Tab key', () => {
        const tabs = tags(strip(false), 'tab')
        expect(tabs.every((tab) => attr(tab, 'aria-selected') === 'false' && attr(tab, 'aria-expanded') === 'false')).toBe(true)
        expect(tabs.filter((tab) => attr(tab, 'tabindex') === '0').map((tab) => attr(tab, 'id'))).toEqual(['strip-tab-log'])
    })

    it('makes every tab at least a finger tall and wide', () => {
        for (const tab of tags(strip(true), 'tab')) expect(attr(tab, 'class')).toMatch(/\bmin-h-finger\b.*\bmin-w-finger\b/)
    })

    it('moves with the arrows, Home and End, wrapping at the ends', () => {
        expect(stripStep('ArrowRight', 2, 3)).toBe(0)
        expect(stripStep('ArrowLeft', 0, 3)).toBe(2)
        expect(stripStep('Home', 2, 3)).toBe(0)
        expect(stripStep('End', 0, 3)).toBe(2)
        expect(stripStep('Enter', 1, 3)).toBeUndefined()
    })
})
