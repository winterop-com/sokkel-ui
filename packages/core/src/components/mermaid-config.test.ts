import { describe, expect, it } from 'vitest'

import { MERMAID_SECURE, mermaidConfig } from './mermaid-config'

const DEFAULT_SECURE = ['secure', 'securityLevel', 'startOnLoad', 'maxTextSize', 'suppressErrorRendering', 'maxEdges']

describe('mermaidConfig', () => {
    const config = mermaidConfig({ fontFamily: 'Inter', primaryColor: '#eeeeee' }, '6px')

    it('draws in the base theme with strict security and no error graphic', () => {
        expect(config).toMatchObject({
            startOnLoad: false,
            theme: 'base',
            themeVariables: { fontFamily: 'Inter', primaryColor: '#eeeeee' },
            securityLevel: 'strict',
            suppressErrorRendering: true,
        })
        expect(config.themeCSS).toContain('rx: 6px')
    })

    it("locks mermaid's own secure keys and every style key", () => {
        expect(config.secure).toEqual([...MERMAID_SECURE])
        for (const key of DEFAULT_SECURE) expect(config.secure).toContain(key)
        for (const key of ['theme', 'themeVariables', 'themeCSS', 'look', 'darkMode', 'fontFamily', 'altFontFamily', 'fontSize']) {
            expect(config.secure).toContain(key)
        }
    })

    it('keeps a diagram from setting its own CSS, typeface or theme', async () => {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize(config)
        const init = {
            themeCSS: '.node { background: url(https://example.org/p.png) }',
            fontFamily: 'x; background: url(https://example.org/f.png)',
            theme: 'dark',
            themeVariables: { primaryColor: '#000000' },
            flowchart: { htmlLabels: false, themeCSS: '.edge { fill: red }' },
        }
        await mermaid.parse(`%%{init: ${JSON.stringify(init)}}%%\nflowchart LR\n  fetch --> upload`)
        const drawn = mermaid.mermaidAPI.getConfig()
        expect(drawn.themeCSS).toBe(config.themeCSS)
        expect(drawn.fontFamily).not.toContain('example.org')
        expect(drawn.theme).toBe('base')
        expect(drawn.themeVariables?.primaryColor).not.toBe('#000000')
        expect(JSON.stringify(drawn)).not.toContain('example.org')
        expect(drawn.flowchart?.htmlLabels).toBe(false)
    }, 60_000)
})
