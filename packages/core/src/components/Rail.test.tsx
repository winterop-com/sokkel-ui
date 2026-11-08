import { Disc3, Radio } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Rail, railShows, railViewAfter, type RailBody, type RailGroup, type RailState } from './Rail'
import { ShellDrawer } from './shell-context'

const GROUPS: RailGroup[] = [
    {
        id: 'listen',
        entries: [
            { id: 'library', label: 'Library', icon: Disc3, href: '#library', active: true },
            { id: 'radio', label: 'Radio', icon: Radio, href: '#radio' },
        ],
    },
]

const BODY: RailBody = { title: 'Artists', search: <input aria-label="Search" />, content: <ul aria-label="The tree" /> }

const state = (body: boolean, collapsed: boolean): RailState => ({ body, collapsed })

describe('railShows', () => {
    it('draws the places without a body, whatever the view asks', () => {
        expect(railShows(state(false, false), 'body')).toBe('places')
        expect(railShows(state(false, false), 'places')).toBe('places')
    })

    it('draws the body or the places as the view asks, when there is a body', () => {
        expect(railShows(state(true, false), 'body')).toBe('body')
        expect(railShows(state(true, false), 'places')).toBe('places')
    })

    it("draws the places' icons while collapsed, since a body has no icon form", () => {
        expect(railShows(state(true, true), 'body')).toBe('icons')
        expect(railShows(state(true, true), 'places')).toBe('icons')
        expect(railShows(state(false, true), 'body')).toBe('icons')
    })
})

describe('railViewAfter', () => {
    it('goes back to the body when a body is given anew', () => {
        expect(railViewAfter('places', state(false, false), state(true, false))).toBe('body')
    })

    it('goes back to the body as the rail collapses, so expanding it shows the body', () => {
        const collapsedNow = railViewAfter('places', state(true, false), state(true, true))
        expect(collapsedNow).toBe('body')
        expect(railShows(state(true, false), railViewAfter(collapsedNow, state(true, true), state(true, false)))).toBe('body')
    })

    it('keeps the view otherwise', () => {
        expect(railViewAfter('places', state(true, false), state(true, false))).toBe('places')
        expect(railViewAfter('places', state(true, true), state(true, false))).toBe('places')
        expect(railViewAfter('places', state(true, false), state(false, false))).toBe('places')
        expect(railViewAfter('body', state(true, false), state(false, false))).toBe('body')
    })
})

/** Which of the rail's two parts between its head and its foot are drawn, and which are hidden. */
function parts(html: string): { body: 'shown' | 'hidden' | 'absent'; places: 'shown' | 'hidden' } {
    const body = html.includes('data-rail-body="" hidden=""') ? 'hidden' : html.includes('data-rail-body=""') ? 'shown' : 'absent'
    return { body, places: html.includes('data-rail-places="" hidden=""') ? 'hidden' : 'shown' }
}

describe('Rail with a body', () => {
    it('draws the body under the row back to the places, the places hidden', () => {
        const html = renderToStaticMarkup(<Rail name="Tidevann" groups={GROUPS} body={BODY} onCollapsedChange={() => undefined} />)
        expect(parts(html)).toEqual({ body: 'shown', places: 'hidden' })
        expect(html).toContain('All places')
        expect(html).toContain('Artists')
        expect(html).toContain('aria-label="The tree"')
        expect(html).toContain('aria-label="Search"')
    })

    it('says the back row in the words given', () => {
        const html = renderToStaticMarkup(<Rail name="Tidevann" groups={GROUPS} body={BODY} words={{ places: 'Alle steder' }} />)
        expect(html).toContain('Alle steder')
        expect(html).not.toContain('All places')
    })

    it('draws the places when the view held from outside asks, the body kept hidden', () => {
        const html = renderToStaticMarkup(<Rail name="Tidevann" groups={GROUPS} body={BODY} view="places" onViewChange={() => undefined} />)
        expect(parts(html)).toEqual({ body: 'hidden', places: 'shown' })
        expect(html).toContain('href="#radio"')
    })

    it("draws the places' icons while collapsed, the body kept hidden", () => {
        const html = renderToStaticMarkup(
            <Rail name="Tidevann" groups={GROUPS} body={BODY} collapsed onCollapsedChange={() => undefined} />,
        )
        expect(html).toContain('data-collapsed="true"')
        expect(parts(html)).toEqual({ body: 'hidden', places: 'shown' })
        expect(html).toContain('href="#radio"')
    })

    it('draws the body in the drawer, expanded even where the app holds the rail collapsed', () => {
        const html = renderToStaticMarkup(
            <ShellDrawer value={{ close: () => undefined, label: 'Close the navigation' }}>
                <Rail name="Tidevann" groups={GROUPS} body={BODY} collapsed onCollapsedChange={() => undefined} />
            </ShellDrawer>,
        )
        expect(html).not.toContain('data-collapsed')
        expect(parts(html)).toEqual({ body: 'shown', places: 'hidden' })
    })

    it('draws only the places without a body', () => {
        const html = renderToStaticMarkup(<Rail name="Tidevann" groups={GROUPS} onCollapsedChange={() => undefined} />)
        expect(parts(html)).toEqual({ body: 'absent', places: 'shown' })
        expect(html).not.toContain('All places')
    })

    it('is left out of a strip', () => {
        const html = renderToStaticMarkup(<Rail variant="strip" name="Tidevann" groups={GROUPS} body={BODY} />)
        expect(html).toContain('href="#radio"')
        expect(html).not.toContain('aria-label="The tree"')
    })
})
