import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ShellPalette, ShellTrail } from './shell-context'
import { TopBar } from './TopBar'

const links = (html: string) => html.match(/<a /g)?.length ?? 0

describe('TopBar trail', () => {
    it('ends at the current screen by default: plain words marked as the page, shown alone on a phone', () => {
        const html = renderToStaticMarkup(
            <TopBar
                trail={[
                    { label: 'harbor', href: '/harbor' },
                    { label: 'Runs', href: '/harbor/runs' },
                ]}
            />,
        )
        expect(links(html)).toBe(1)
        expect(html).toContain('aria-current="page"')
        expect(html).toMatch(/<span aria-current="page"[^>]*>Runs<\/span>/)
        expect(html).not.toContain('lucide-chevron-left')
    })

    it('ends at an ancestor: every crumb a link, none the page, the last the way back on a phone', () => {
        const html = renderToStaticMarkup(
            <TopBar
                trailEnds="ancestor"
                trail={[
                    { label: 'harbor', href: '/harbor' },
                    { label: 'Runs', href: '/harbor/runs' },
                ]}
            />,
        )
        expect(links(html)).toBe(2)
        expect(html).not.toContain('aria-current')
        expect(html).toMatch(/href="\/harbor\/runs"[^>]*>Runs<\/a>/)
        const items = html.match(/<li[^>]*>/g) ?? []
        // harbor hidden on a phone, its chevron, Runs shown, the chevron after it.
        expect(items).toHaveLength(4)
        expect(items[0]).toContain('max-md:hidden')
        expect(items[2]).not.toContain('max-md:hidden')
        expect(html.match(/lucide-chevron-left/g)).toHaveLength(1)
        expect(html.match(/lucide-chevron-right/g)).toHaveLength(2)
    })
})

describe('TopBar palette button', () => {
    it('is a finger square below md and a control tall from md, as the search field beside it is', () => {
        const html = renderToStaticMarkup(<TopBar onSearch={() => undefined} />)
        expect(html).toContain('aria-label="Search"')
        expect(html).toMatch(/<button[^>]*class="[^"]*h-\(--density-control\)[^"]*max-md:size-finger/)
        expect(html).not.toContain('max-md:size-8')
    })

    it('is left out with palette={false}, even in a shell that holds a palette', () => {
        const html = renderToStaticMarkup(
            <ShellPalette.Provider value={() => undefined}>
                <TopBar palette={false} trail={[{ label: 'Runs' }]} />
            </ShellPalette.Provider>,
        )
        expect(html).not.toContain('<button')
        expect(html).toContain('>Runs</span>')
        const shown = renderToStaticMarkup(
            <ShellPalette.Provider value={() => undefined}>
                <TopBar trail={[{ label: 'Runs' }]} />
            </ShellPalette.Provider>,
        )
        expect(shown).toContain('<button')
    })
})

describe('TopBar stated trail', () => {
    it('draws the trail a screen states in place of its own, keeping its actions', () => {
        const html = renderToStaticMarkup(
            <ShellTrail
                value={{
                    trail: [
                        { label: 'harbor', href: '/harbor' },
                        { label: 'nightly-export', code: true },
                    ],
                }}
            >
                <TopBar trail={[{ label: 'Jobs' }]} actions={<button type="button">New</button>} />
            </ShellTrail>,
        )
        expect(html).not.toContain('>Jobs<')
        expect(html).toMatch(/<span aria-current="page"[^>]*font-mono[^>]*>nightly-export<\/span>/)
        expect(links(html)).toBe(1)
        expect(html).toContain('>New</button>')
    })

    it('takes the end the screen states, not its own', () => {
        const html = renderToStaticMarkup(
            <ShellTrail value={{ trail: [{ label: 'harbor', href: '/harbor' }], ends: 'ancestor' }}>
                <TopBar trail={[{ label: 'Jobs' }]} />
            </ShellTrail>,
        )
        expect(html).not.toContain('aria-current')
        expect(html).toContain('lucide-chevron-left')
    })
})
