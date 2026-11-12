import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { GraphNodeBox, LINE_GAP } from './GraphNode'

const box = (data: Parameters<typeof GraphNodeBox>[0]['data']) => renderToStaticMarkup(<GraphNodeBox data={data} />)
const edgeOf = (html: string) => /border-(critical|warning)\/80/.exec(html)?.[1] ?? null

describe('a node box', () => {
    test('draws its code line with the gap its size counts', () => {
        expect(box({ code: 'transform', kind: 'python', count: '×4', countPlacement: 'line' })).toContain(LINE_GAP.className)
    })

    test('takes the edge of a critical or warning badge, as an issue of its tone gives', () => {
        expect(edgeOf(box({ code: 'transform', badge: { label: 'not installed', tone: 'critical' } }))).toBe('critical')
        expect(edgeOf(box({ code: 'transform', badge: { label: 'edited', tone: 'warning' } }))).toBe('warning')
        expect(edgeOf(box({ code: 'transform', badge: { label: 'edited' } }))).toBeNull()
        const issue = { tone: 'critical' as const, text: 'needs a query' }
        expect(edgeOf(box({ code: 'transform', badge: { label: 'edited', tone: 'warning' }, issues: [issue] }))).toBe('critical')
    })
})
