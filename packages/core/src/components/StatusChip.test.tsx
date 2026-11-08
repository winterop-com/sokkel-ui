import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { StatusMap } from '../lib/status'
import { Dot } from './Dot'
import { StatusChip } from './StatusChip'
import { StatusProvider } from './StatusProvider'
import { Timeline } from './Timeline'

const STATES: StatusMap = {
    draft: { color: 'neutral' },
    review: { label: 'in review', color: 'warning' },
    published: { color: 'good' },
}

describe('StatusChip', () => {
    it('draws a run state as it always has', () => {
        const html = renderToStaticMarkup(<StatusChip status="completed_with_errors" />)
        expect(html).toContain('bg-status-completed-with-errors/15 text-status-completed-with-errors-ink')
        expect(html).toContain('>completed with errors<')
    })

    it("says an app's state in the provider's words and color", () => {
        const html = renderToStaticMarkup(
            <StatusProvider statuses={STATES}>
                <StatusChip status="review" />
                <StatusChip status="running" />
            </StatusProvider>,
        )
        expect(html).toContain('bg-warning/15 text-warning-ink">in review<')
        expect(html).toContain('bg-status-running/15 text-status-running-ink">running<')
    })

    it('takes its own states over the provider, and its label over both', () => {
        const html = renderToStaticMarkup(
            <StatusProvider statuses={STATES}>
                <StatusChip status="review" statuses={{ review: { label: 'to check', color: 'info' } }} />
                <StatusChip status="published" label="3 published" />
            </StatusProvider>,
        )
        expect(html).toContain('bg-info/15 text-info-ink">to check<')
        expect(html).toContain('bg-good/15 text-good-ink">3 published<')
    })

    it('adds an inner provider to an outer one', () => {
        const html = renderToStaticMarkup(
            <StatusProvider statuses={STATES}>
                <StatusProvider statuses={{ archived: { color: 'skipped' } }}>
                    <StatusChip status="draft" />
                    <StatusChip status="archived" />
                </StatusProvider>
            </StatusProvider>,
        )
        expect(html).toContain('bg-faint/15 text-muted-foreground">draft<')
        expect(html).toContain('border-dashed border-status-skipped/50 text-status-skipped-ink">archived<')
    })

    it('draws a state no map knows neutral, by its name', () => {
        expect(renderToStaticMarkup(<StatusChip status="on_hold" />)).toContain('bg-faint/15 text-muted-foreground">on hold<')
    })
})

describe('the other status parts', () => {
    it("fill a dot in a state's color from the map", () => {
        const html = renderToStaticMarkup(
            <StatusProvider statuses={STATES}>
                <Dot status="published" />
                <Dot status="failed" />
            </StatusProvider>,
        )
        expect(html).toContain('background:var(--good)')
        expect(html).toContain('background:var(--status-failed)')
    })

    it("ink a timeline's dot by an app's state as by a run state", () => {
        const html = renderToStaticMarkup(
            <StatusProvider statuses={STATES}>
                <Timeline
                    events={[
                        { id: 'a', title: 'Written', tone: 'draft' },
                        { id: 'b', title: 'Sent for review', tone: 'review' },
                        { id: 'c', title: 'Checked', tone: 'succeeded' },
                    ]}
                />
            </StatusProvider>,
        )
        expect(html).toContain('background:var(--faint)')
        expect(html).toContain('background:var(--warning)')
        expect(html).toContain('background:var(--status-succeeded)')
    })
})
