import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ConsequenceList } from './ConsequenceList'

const ITEMS = [{ label: 'Runs', count: 12 }]

describe('ConsequenceList', () => {
    it('heads what is lost as deleted, and what changes or the facts of it as changes', () => {
        expect(renderToStaticMarkup(<ConsequenceList items={ITEMS} />)).toContain('Also deleted')
        expect(renderToStaticMarkup(<ConsequenceList items={ITEMS} tone="neutral" />)).toContain('What this changes')
    })

    it('takes a heading of its own over either', () => {
        const list = renderToStaticMarkup(<ConsequenceList items={ITEMS} tone="neutral" heading="Moves to grace" />)
        expect(list).toContain('Moves to grace')
        expect(list).not.toContain('What this changes')
    })

    it('draws nothing with nothing to say', () => {
        expect(renderToStaticMarkup(<ConsequenceList items={[]} />)).toBe('')
    })

    it('passes other props to its root', () => {
        const list = renderToStaticMarkup(<ConsequenceList items={ITEMS} data-testid="goes" aria-describedby="note" className="mt-2" />)
        expect(list).toMatch(/^<div[^>]*data-testid="goes"/)
        expect(list).toMatch(/^<div[^>]*aria-describedby="note"/)
        expect(list).toMatch(/^<div[^>]*class="[^"]*mt-2/)
    })

    it('labels its list by its heading', () => {
        const list = renderToStaticMarkup(<ConsequenceList items={ITEMS} />)
        const id = /<p id="([^"]+)"/.exec(list)?.[1]
        expect(id).toBeTruthy()
        expect(list).toContain(`<ul aria-labelledby="${id}"`)
    })
})
