import { describe, expect, it } from 'vitest'

import { MERMAID_SECURE, mermaidConfig, plotVariables } from './mermaid-config'

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

describe('plotVariables', () => {
    const hex = (name: string) => `#${String(name.length).padStart(2, '0')}${name.slice(-1).padStart(4, '0')}`
    const plot = plotVariables(hex)
    const series = [1, 2, 3, 4, 5].map((n) => hex(`chart-${String(n)}`))

    it("paints an xychart's bars and lines with the chart tokens, in their order", async () => {
        expect(plot.xyChart.plotColorPalette).toBe(series.join(', '))
        const mermaid = (await import('mermaid')).default
        mermaid.initialize(mermaidConfig({ background: '#ffffff', primaryColor: '#f4f4f5', ...plot }, '6px'))
        const drawn = mermaid.mermaidAPI.getConfig().themeVariables as { xyChart: { plotColorPalette: string } }
        expect(drawn.xyChart.plotColorPalette).toBe(series.join(', '))
    })

    it("paints a pie's slices with the chart tokens, starting over after the last", () => {
        expect([plot.pie1, plot.pie5, plot.pie6, plot.pie12]).toEqual([series[0], series[4], series[0], series[1]])
    })
})
