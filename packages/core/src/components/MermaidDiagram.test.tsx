import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { lookKey, MermaidDiagram } from './MermaidDiagram'

describe('MermaidDiagram', () => {
    it('renders on the server, showing its source', () => {
        const html = renderToStaticMarkup(<MermaidDiagram code={'graph LR\n  fetch --> upload'} />)
        expect(html).toContain('fetch --&gt; upload')
    })

    it('says the copy button through its words', () => {
        const html = renderToStaticMarkup(<MermaidDiagram code="graph LR" words={{ copy: 'Kopier' }} />)
        expect(html).toContain('aria-label="Kopier"')
    })
})

describe('lookKey', () => {
    it('changes with the scheme, the theme and a token override', () => {
        const base = lookKey('dark', 'paper', null)
        expect(lookKey('', 'paper', null)).not.toBe(base)
        expect(lookKey('dark', 'steel', null)).not.toBe(base)
        expect(lookKey('dark', 'paper', '--primary: #0a7')).not.toBe(base)
    })

    it('stays the same when a scroll lock writes the root style', () => {
        const base = lookKey('dark', 'paper', '--primary: #0a7')
        expect(lookKey('dark', 'paper', '--primary: #0a7; overflow: hidden; padding-right: 15px')).toBe(base)
        expect(lookKey('dark', 'paper', 'overflow: hidden')).toBe(lookKey('dark', 'paper', null))
    })
})
