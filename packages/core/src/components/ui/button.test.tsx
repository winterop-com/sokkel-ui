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

/** The id a button's `aria-describedby` names, and the text of the element it names. */
function described(html: string): { ids: string[]; said: string[] } {
    const ids = (/aria-describedby="([^"]*)"/.exec(html)?.[1] ?? '').split(' ').filter(Boolean)
    const said = ids.map((id) => {
        const at = html.indexOf(`id="${id}"`)
        if (at < 0) return ''
        const open = html.indexOf('>', at) + 1
        return html.slice(open, html.indexOf('<', open))
    })
    return { ids, said }
}

describe('Button reason', () => {
    it('is described by its reason, from a copy always drawn beside it, so a screen reader says it', () => {
        const html = renderToStaticMarkup(<Button reason="Nothing to save yet">Save</Button>)
        const { ids, said } = described(html)
        expect(ids).toHaveLength(1)
        expect(said).toEqual(['Nothing to save yet'])
        // The copy stands outside the button, so the button's name stays its own words.
        expect(html).toMatch(/>Save<\/button>/)
        expect(html).toMatch(/<span id="[^"]+" aria-hidden="true" class="sr-only">Nothing to save yet<\/span>/)
    })

    it('keeps a description it was given, and adds the reason after it', () => {
        const html = renderToStaticMarkup(
            <Button reason="The project is archived" aria-describedby="export-help">
                Export
            </Button>,
        )
        const { ids, said } = described(html)
        expect(ids[0]).toBe('export-help')
        expect(said[1]).toBe('The project is archived')
    })

    it('gives each shut button a description of its own', () => {
        const html = renderToStaticMarkup(
            <>
                <Button reason="Paused by ada">Run now</Button>
                <Button reason="No run to cancel">Cancel run</Button>
            </>,
        )
        const ids = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1])
        expect(new Set(ids).size).toBe(2)
    })

    it('is described by nothing without a reason', () => {
        expect(renderToStaticMarkup(<Button>Save</Button>)).not.toContain('aria-describedby')
        expect(renderToStaticMarkup(<Button disabled>Save</Button>)).not.toContain('aria-describedby')
    })
})

/** The classes of the first element in `html`. */
const classes = (html: string) => (/class="([^"]*)"/.exec(html)?.[1] ?? '').split(/\s+/)

describe('Button size', () => {
    it("takes each size's height from the density's control heights", () => {
        const height = (size: 'xs' | 'sm' | 'default' | 'lg') => classes(renderToStaticMarkup(<Button size={size}>Run now</Button>))
        expect(height('xs')).toContain('h-(--density-control-xs)')
        expect(height('sm')).toContain('h-(--density-control-sm)')
        expect(height('default')).toContain('h-(--density-control)')
        expect(height('lg')).toContain('h-(--density-control-lg)')
        const square = (size: 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg') =>
            classes(
                renderToStaticMarkup(
                    <Button size={size} aria-label="Delete job">
                        <Trash2 />
                    </Button>,
                ),
            )
        expect(square('icon-xs')).toContain('size-(--density-control-xs)')
        expect(square('icon-sm')).toContain('size-(--density-control-sm)')
        expect(square('icon')).toContain('size-(--density-control)')
        expect(square('icon-lg')).toContain('size-(--density-control-lg)')
    })

    it('gives an xs button a finger hit area below md and keeps its drawn size', () => {
        for (const size of ['xs', 'icon-xs'] as const) {
            const own = classes(renderToStaticMarkup(<Button size={size}>Retry</Button>))
            expect(own).toContain('max-md:after:size-finger')
            expect(own).toContain('relative')
            expect(own).not.toContain('max-md:min-h-finger')
        }
        expect(classes(renderToStaticMarkup(<Button size="sm">Retry</Button>))).not.toContain('max-md:after:size-finger')
    })

    it('leaves the hit area out for an xs button placed by its own position', () => {
        const own = classes(
            renderToStaticMarkup(
                <Button size="icon-xs" aria-label="Remove" render={<span className="absolute top-1 right-1" />}>
                    <Trash2 />
                </Button>,
            ),
        )
        expect(own).not.toContain('max-md:after:size-finger')
    })
})
