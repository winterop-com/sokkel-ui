import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StatusTile, StatusWall, WALL_STATUS_CSS, WALL_STATUSES, wallSeriesPath } from './StatusWall'

const NOW = Date.UTC(2026, 10, 20, 14, 30)

describe('wallSeriesPath', () => {
    it('spaces the values across the width, the lowest at the foot and the highest at the top', () => {
        expect(wallSeriesPath([0, 10, 5], 100, 32)).toBe('M0.0 31.0 L50.0 1.0 L100.0 16.0')
    })

    it('draws one value, or equal values, as a level line, and nothing for none', () => {
        expect(wallSeriesPath([7], 100, 32)).toBe('M0 16.0 L100.0 16.0')
        expect(wallSeriesPath([3, 3], 100, 32)).toBe('M0.0 16.0 L100.0 16.0')
        expect(wallSeriesPath([])).toBe('')
    })
})

describe('StatusTile', () => {
    it('says each status in its word and draws it in its token', () => {
        const said = { up: 'Up', degraded: 'Degraded', down: 'Down', unknown: 'Unknown' }
        for (const status of WALL_STATUSES) {
            const html = renderToStaticMarkup(<StatusTile name="api" status={status} />)
            expect(html).toContain(`data-status="${status}"`)
            expect(html).toContain(said[status])
            expect(html).toContain(`--wall-tone:${WALL_STATUS_CSS[status]}`)
        }
    })

    it('pulses only while down, and draws unknown hollow with no glow', () => {
        expect(renderToStaticMarkup(<StatusTile name="api" status="down" />)).toContain('animate-live')
        expect(renderToStaticMarkup(<StatusTile name="api" status="up" />)).not.toContain('animate-live')
        const unknown = renderToStaticMarkup(<StatusTile name="api" status="unknown" />)
        expect(unknown).not.toContain('data-slot="status-tile-glow"')
        expect(unknown).toContain('border-color:var(--faint)')
    })

    it('draws the figure, the detail, the flag, the series and the freshness it is given', () => {
        const html = renderToStaticMarkup(
            <StatusTile
                name="Flights"
                caption="Feed"
                status="degraded"
                value="1,240"
                unit="ms"
                detail="Slow answers"
                series={[1, 2, 3]}
                seriesLabel="Latency"
                flag="Simulated"
                updatedAt={NOW - 2000}
                now={NOW}
            />,
        )
        for (const word of ['Flights', 'Feed', '1,240', 'ms', 'Slow answers', 'Simulated', 'Degraded']) expect(html).toContain(word)
        expect(html).toContain('aria-label="Latency"')
        expect(html).toContain('data-slot="freshness"')
        const bare = renderToStaticMarkup(<StatusTile name="api" status="up" />)
        for (const slot of ['status-tile-figure', 'status-tile-series', 'freshness']) expect(bare).not.toContain(`data-slot="${slot}"`)
    })

    it('is one button with onSelect, one link with href, and neither without', () => {
        const button = renderToStaticMarkup(<StatusTile name="api" status="up" selected onSelect={() => undefined} />)
        expect(button).toContain('<button')
        expect(button).toContain('aria-pressed="true"')
        expect(button).toContain('data-selected="true"')
        const link = renderToStaticMarkup(<StatusTile name="api" status="up" href="https://status.example.org/api" />)
        expect(link).toContain('href="https://status.example.org/api"')
        expect(renderToStaticMarkup(<StatusTile name="api" status="up" />)).not.toContain('status-tile-cover')
    })

    it('takes its words', () => {
        expect(renderToStaticMarkup(<StatusTile name="api" status="down" words={{ down: 'Nede' }} />)).toContain('Nede')
    })
})

describe('StatusWall', () => {
    it('names the wall and fills each row with tiles no narrower than its size', () => {
        const html = renderToStaticMarkup(
            <StatusWall label="Sources" tile="lg">
                <StatusTile name="api" status="up" />
            </StatusWall>,
        )
        expect(html).toContain('aria-label="Sources"')
        expect(html).toContain('minmax(min(18rem, 100%), 1fr)')
    })
})
