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
})
