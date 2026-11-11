import { Play, Trash2 } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Button } from './button'

describe('Button busy', () => {
    it('is shut but keeps its focus: aria-busy and aria-disabled, never the native disabled', () => {
        const html = renderToStaticMarkup(<Button busy>Save</Button>)
        expect(html).toContain('aria-busy="true"')
        expect(html).toContain('aria-disabled="true"')
        expect(html).not.toMatch(/\sdisabled=""/)
    })

    it('draws a spinner before the label and keeps the label', () => {
        const html = renderToStaticMarkup(<Button busy>Save</Button>)
        expect(html).toMatch(/data-slot="spinner".*Save/)
        expect(html).not.toContain('role="status"')
    })

    it('puts the spinner in place of a leading icon', () => {
        const html = renderToStaticMarkup(
            <Button busy>
                <Play data-icon="inline-start" />
                Run now
            </Button>,
        )
        expect(html).toContain('data-slot="spinner"')
        expect(html).not.toContain('lucide-play')
        expect(html).toContain('Run now')
    })

    it("puts the spinner in place of an icon-only button's icon, its name kept", () => {
        const html = renderToStaticMarkup(
            <Button busy size="icon-sm" aria-label="Delete job">
                <Trash2 />
            </Button>,
        )
        expect(html).toContain('aria-label="Delete job"')
        expect(html).toContain('data-slot="spinner"')
        expect(html).not.toContain('lucide-trash')
    })

    it('draws nothing of it when not busy', () => {
        const html = renderToStaticMarkup(
            <Button>
                <Play />
                Run now
            </Button>,
        )
        expect(html).not.toContain('aria-busy')
        expect(html).not.toContain('data-slot="spinner"')
        expect(html).toContain('lucide-play')
    })
})
