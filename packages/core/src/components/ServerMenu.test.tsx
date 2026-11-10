import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { StatusMap } from '../lib/status'
import { ServerMenu } from './ServerMenu'
import { TooltipProvider } from './ui/tooltip'

const STATES: StatusMap = {
    healthy: { label: 'Healthy', color: 'good' },
    degraded: { label: 'Degraded', color: 'warning' },
    unhealthy: { label: 'Unhealthy', color: 'critical' },
}

const drawn = (node: React.ReactNode) => renderToStaticMarkup(<TooltipProvider>{node}</TooltipProvider>)

describe('ServerMenu', () => {
    it('draws the name, the version and a menu by default', () => {
        const html = drawn(<ServerMenu name="Tidevann" version="3.1.0" state="up" />)
        expect(html).toContain('aria-label="Server: Tidevann 3.1.0, Connected"')
        expect(html).toContain('aria-haspopup="menu"')
        expect(html).toContain('>Tidevann</span>')
        expect(html).toContain('3.1.0')
        expect(html).toContain('background:var(--status-succeeded)')
    })

    it('takes the app’s own states, with their words and colors', () => {
        const html = drawn(<ServerMenu name="Tidevann" state="degraded" states={STATES} />)
        expect(html).toContain('aria-label="Server: Tidevann, Degraded"')
        expect(html).toContain('background:var(--warning)')
    })

    it('keeps a quiet face silent while well and says its words when something is wrong', () => {
        const well = drawn(<ServerMenu name="Tidevann" version="3.1.0" state="healthy" states={STATES} quiet />)
        expect(well).not.toContain('>Tidevann</span>')
        expect(well).not.toContain('>Healthy<')
        expect(well).not.toContain('lucide-chevron-down')
        const checking = drawn(<ServerMenu name="Tidevann" state="checking" quiet />)
        expect(checking).not.toContain('>Checking<')
        expect(checking).toContain('animate-pulse')
        const wrong = drawn(<ServerMenu name="Tidevann" state="unhealthy" states={STATES} quiet />)
        expect(wrong).toContain('>Unhealthy</span>')
        expect(wrong).toContain('background:var(--critical)')
    })

    it('calls the app on press in place of a menu', () => {
        const html = drawn(<ServerMenu name="Tidevann" state="up" onPress={() => undefined} />)
        expect(html).not.toContain('aria-haspopup')
        expect(html).not.toContain('lucide-chevron-down')
        expect(html).toContain('aria-label="Server: Tidevann, Connected"')
    })

    it('puts the checks in a tooltip on the face, menu or press', () => {
        const checks = [
            { name: 'api', state: 'healthy' },
            { name: 'worker', state: 'degraded', detail: '214 jobs queued' },
        ]
        const menu = drawn(<ServerMenu name="Tidevann" state="degraded" states={STATES} checks={checks} />)
        expect(menu).toContain('data-slot="tooltip-trigger"')
        expect(menu).toContain('aria-haspopup="menu"')
        const pressed = drawn(<ServerMenu name="Tidevann" state="degraded" states={STATES} checks={checks} onPress={() => undefined} />)
        expect(pressed).toContain('data-slot="tooltip-trigger"')
        expect(pressed).not.toContain('aria-haspopup')
    })

    it('draws a tooltip for when the server was last asked, even without checks', () => {
        const plain = drawn(<ServerMenu name="Tidevann" state="up" />)
        expect(plain).not.toContain('data-slot="tooltip-trigger"')
        const asked = drawn(<ServerMenu name="Tidevann" state="up" checkedAt={new Date('2026-11-10T09:58:00Z')} />)
        expect(asked).toContain('data-slot="tooltip-trigger"')
    })
})
