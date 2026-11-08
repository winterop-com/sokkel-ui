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
})
