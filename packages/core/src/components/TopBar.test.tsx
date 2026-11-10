import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ShellPalette } from './shell-context'
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
    it('is a finger square below md and keeps its desktop height', () => {
        const html = renderToStaticMarkup(<TopBar onSearch={() => undefined} />)
        expect(html).toContain('aria-label="Search"')
        expect(html).toMatch(/<button[^>]*class="[^"]*\bh-8\b[^"]*max-md:size-finger/)
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
