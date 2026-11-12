import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { LogView, type LogLine } from './LogView'

const LINES: LogLine[] = [
    { level: 'info', source: 'fetch', text: 'read 2,184 rows' },
    { level: 'error', source: 'validate', text: 'field amount must be a number' },
]

describe('LogView', () => {
    it('draws each source as plain words without onSource', () => {
        const html = renderToStaticMarkup(<LogView lines={LINES} />)
        expect(html).not.toContain('<button')
        expect(html).toContain('>fetch</td>')
    })

    it('makes each source a button with onSource', () => {
        const html = renderToStaticMarkup(<LogView lines={LINES} onSource={() => undefined} />)
        expect(html.match(/<button type="button"[^>]*>(fetch|validate)<\/button>/g)).toHaveLength(2)
    })

    it('says its empty words with no lines, and the app can replace or translate them', () => {
        expect(renderToStaticMarkup(<LogView lines={[]} />)).toContain('Nothing logged yet.')
        expect(renderToStaticMarkup(<LogView lines={[]} words={{ empty: 'Ingen linjer' }} />)).toContain('Ingen linjer')
        const html = renderToStaticMarkup(<LogView lines={[]} empty={<b>Waiting for a worker</b>} />)
        expect(html).toContain('<b>Waiting for a worker</b>')
        expect(html).not.toContain('Nothing logged yet.')
    })

    it('says nothing of being empty once it has lines', () => {
        expect(renderToStaticMarkup(<LogView lines={LINES} />)).not.toContain('Nothing logged yet.')
    })

    it('marks its rows and cells by slot, for an app and its tests', () => {
        const html = renderToStaticMarkup(<LogView lines={LINES} />)
        expect(html.match(/data-slot="log-line"/g)).toHaveLength(2)
        expect(html).toContain('data-slot="log-source"')
        expect(html).toContain('data-slot="log-text"')
        expect(html).toContain('data-level="error"')
    })

    it("draws a line's item before its text and its fields after it", () => {
        const html = renderToStaticMarkup(
            <LogView lines={[{ item: 'harbor', text: 'read 812 rows', fields: { rows: 812, took: '0.3s' } }]} />,
        )
        expect(html).toMatch(/data-slot="log-item"[^>]*>\[harbor\]/)
        expect(html).toMatch(/data-slot="log-fields"[^>]*>rows=812 took=0.3s/)
    })

    it('keeps the columns any line has, and a line can keep its source plain', () => {
        const lines: LogLine[] = [
            { source: 'run', sourceLink: false, text: 'started' },
            { source: 'fetch', text: 'read 812 rows' },
            { text: 'no source at all' },
        ]
        const html = renderToStaticMarkup(<LogView lines={lines} onSource={() => undefined} />)
        expect(html.match(/data-slot="log-source"/g)).toHaveLength(3)
        expect(html.match(/<button type="button"[^>]*>(run|fetch)<\/button>/g)).toEqual([expect.stringContaining('>fetch<')])
    })
})
