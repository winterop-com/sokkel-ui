import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { GraphToolbar, GraphToolbarButton } from './GraphToolbar'

describe('the graph toolbar', () => {
    test('names each button and leaves the saying to the tooltip, not a native title', () => {
        const html = renderToStaticMarkup(<GraphToolbar onUndo={() => undefined} onRedo={() => undefined} canUndo issues={0} />)
        expect(html).toContain('aria-label="Undo"')
        expect(html).toContain('aria-label="Redo"')
        expect(html).not.toContain('title=')
    })

    test("draws an app's button the same way", () => {
        const html = renderToStaticMarkup(
            <GraphToolbarButton label="Remove the chosen step" shortcut="Delete">
                x
            </GraphToolbarButton>,
        )
        expect(html).toContain('aria-label="Remove the chosen step"')
        expect(html).not.toContain('title=')
    })
})
