import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DashboardPanel } from './DashboardGrid'
import { StatPanel } from './StatPanel'
import { TooltipProvider } from '../ui/tooltip'

const classesOf = (html: string, pattern: RegExp) => pattern.exec(html)?.[1].split(' ') ?? []

describe('StatPanel', () => {
    it("wears the dashboard panel's edge, and its tools the panel tools' focus outline", () => {
        const tile = renderToStaticMarkup(
            <TooltipProvider>
                <StatPanel title="Runs" value={3526} info="Runs today." />
            </TooltipProvider>,
        )
        const panel = renderToStaticMarkup(
            <DashboardPanel title="Runs" menu={<span />}>
                <p>3526</p>
            </DashboardPanel>,
        )
        const tileEdge = classesOf(tile, /<section[^>]*class="([^"]*)"/)
        const panelEdge = classesOf(panel, /<section[^>]*class="([^"]*)"/).concat(
            classesOf(panel, /<div[^>]*class="([^"]*rounded-surface[^"]*)"/),
        )
        expect([tileEdge.includes('border-border-strong'), panelEdge.includes('border-border-strong')]).toEqual([true, true])
        const focus = (html: string) =>
            [...html.matchAll(/<button[^>]*class="([^"]*)"/g)]
                .map((match) => match[1].split(' '))
                .filter((classes) => classes.includes('focus-visible:outline-focus'))
                .map((classes) => classes.includes('focus-visible:outline-offset-focus'))
        expect(focus(tile).length).toBeGreaterThan(0)
        expect(focus(tile).every(Boolean)).toBe(true)
        expect(focus(panel).every(Boolean)).toBe(true)
    })

    it("draws the target meter on a muted track, an on-fill one when filled, not the reading's own tone", () => {
        const plain = renderToStaticMarkup(<StatPanel title="Success rate" value={97} target={99} />)
        const filled = renderToStaticMarkup(
            <StatPanel title="Success rate" value={97} target={99} color="chart-2" colorMode="background" />,
        )
        expect(plain).toContain('relative h-1.5 rounded-mini bg-muted')
        expect(filled).toContain('relative h-1.5 rounded-mini bg-on-fill/25')
        expect(plain + filled).not.toContain('bg-current/15')
    })
})
