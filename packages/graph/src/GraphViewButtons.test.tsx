import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { GraphControlButton, GraphViewButtons } from './GraphViewButtons'

describe('the view buttons', () => {
    test('name each button and leave the saying to the tooltip, not a native title', () => {
        const html = renderToStaticMarkup(<GraphViewButtons controls={null} words={{ zoomInHint: 'Zoom in, or scroll up' }} />)
        expect(html).toContain('aria-label="Zoom in"')
        expect(html).toContain('aria-label="Fit the graph"')
        expect(html).not.toContain('title=')
    })

    test("draw an app's button the same way", () => {
        const html = renderToStaticMarkup(
            <GraphControlButton label="Add a step" tooltip="Add a step after the chosen one">
                +
            </GraphControlButton>,
        )
        expect(html).toContain('aria-label="Add a step"')
        expect(html).not.toContain('title=')
    })
})
