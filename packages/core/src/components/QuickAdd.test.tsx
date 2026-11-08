import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { QuickAdd } from './QuickAdd'

const add = async () => undefined

describe('QuickAdd', () => {
    it('is a field named by its placeholder, with no button until something is typed', () => {
        const html = renderToStaticMarkup(<QuickAdd placeholder="Add a task" onAdd={add} />)
        expect(html).toContain('aria-label="Add a task"')
        expect(html).not.toContain('<button')
        expect(renderToStaticMarkup(<QuickAdd defaultValue="Rerun nightly-export" onAdd={add} />)).toContain('aria-label="Add"')
    })

    it('holds the text read only with a spinner while an add runs', () => {
        const html = renderToStaticMarkup(<QuickAdd defaultValue="Rerun nightly-export" defaultState={{ adding: true }} onAdd={add} />)
        expect(html).toContain('readOnly')
        expect(html).toContain('aria-label="Adding"')
        expect(html).toContain('aria-busy="true"')
    })

    it('keeps the text of a refused add, marked with the reason', () => {
        const html = renderToStaticMarkup(
            <QuickAdd defaultValue="Rerun nightly-export" defaultState={{ error: 'Already open.' }} onAdd={add} />,
        )
        expect(html).toContain('value="Rerun nightly-export"')
        expect(html).toContain('aria-invalid="true"')
        expect(html).toContain('Error: Already open.')
    })

    it('says its words in the app’s language', () => {
        expect(renderToStaticMarkup(<QuickAdd defaultValue="x" words={{ add: 'Legg til' }} onAdd={add} />)).toContain(
            'aria-label="Legg til"',
        )
    })
})
