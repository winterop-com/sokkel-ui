import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const SOURCE = readFileSync(join(import.meta.dirname, 'Shell.tsx'), 'utf8')

describe('Shell', () => {
    it('places what is positioned inside the content against the content, not the window', () => {
        expect(SOURCE).toMatch(/<main className="(?:[^"]* )?relative [^"]*overflow-y-auto/)
    })

    it('is the container its pages size their inset against', () => {
        expect(SOURCE).toMatch(/<main className="[^"]*@container[ "]/)
    })

    it('clips both of its roots, so nothing inside can make the page scroll', () => {
        const roots = SOURCE.match(/className="(?:group\/shell )?relative (flex|grid) h-svh[^"]*"/g) ?? []
        expect(roots).toHaveLength(2)
        for (const root of roots) expect(root).toContain('overflow-hidden')
    })

    it('marks the column its rail stands in, which the top bar reads to leave the room for the window buttons', () => {
        expect(SOURCE.match(/<div data-shell-rail /g) ?? []).toHaveLength(2)
    })

    it('keeps both of its roots clear of the safe areas on all four sides', () => {
        const roots = SOURCE.match(/className="(?:group\/shell )?relative (flex|grid) h-svh[^"]*"/g) ?? []
        expect(roots).toHaveLength(2)
        for (const root of roots)
            for (const side of [
                'pt-[env(safe-area-inset-top)]',
                'pr-[env(safe-area-inset-right)]',
                'pb-[env(safe-area-inset-bottom)]',
                'pl-[env(safe-area-inset-left)]',
            ])
                expect(root).toContain(side)
    })

    it('draws the banner between the top bar and the content, outside what scrolls', () => {
        expect(SOURCE).toMatch(/<\/header>\s*\)\}\s*\{banner [^\n]*\{banner\}<\/div>\}\s*<div ref=\{setPage\}/)
    })

    it("holds a screen's head above the scroller, outside it, with the scroller's room for its bar", () => {
        expect(SOURCE).toMatch(/ref=\{setHeadTarget\}\s+className="[^"]*scroller-thin[^"]*overflow-hidden[^"]*"\s+\/>\s*<main /)
        expect(SOURCE).toMatch(/<main className="[^"]*scroller-thin[^"]*overflow-y-auto/)
        expect(SOURCE).toContain('<ShellScroller value={main}>')
    })

    it('makes the button that opens the drawer a finger square below md, a control square from md', () => {
        expect(SOURCE).toMatch(/aria-label=\{words\.menu\}[\s\S]*?'flex size-\(--density-control\) [^']*max-md:size-finger[^']*'/)
    })

    it('draws the rail in its drawer under the drawer context, so it draws expanded there', () => {
        expect(SOURCE).toContain('<ShellDrawer value={drawerContext}>{rail}</ShellDrawer>')
    })

    it("opens its palette by the one rule, which lets it over a search's results, and tells a Search it opened", () => {
        expect(SOURCE).toContain('if (!paletteMayOpen(shortcutRegistry, latest.current.mayOpenPalette)) return')
        expect(SOURCE).toContain('<ShellPaletteOpen value={palette !== undefined && paletteIsOpen}>')
        const search = readFileSync(join(import.meta.dirname, 'Search.tsx'), 'utf8')
        expect(search).toContain('useContext(ShellPaletteOpen)')
        expect(search).toMatch(/if \(paletteOpen && open\) setOpen\(false\)/)
    })
})
