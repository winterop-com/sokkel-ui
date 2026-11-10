import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { WindowedPane, type WindowedPaneWhere } from './WindowedPane'

const where = (at: WindowedPaneWhere) => <p>{`drawn in the ${at}`}</p>

describe('WindowedPane', () => {
    it('draws its content in the pane while closed', () => {
        const html = renderToStaticMarkup(<WindowedPane title="nightly-export.yaml">{where}</WindowedPane>)
        expect(html).toContain('drawn in the pane')
        expect(html).not.toContain('Shown in a window.')
    })

    it('moves its content out of the pane while open, by default', () => {
        const html = renderToStaticMarkup(
            <WindowedPane title="nightly-export.yaml" defaultOpen>
                {where}
            </WindowedPane>,
        )
        expect(html).not.toContain('drawn in the pane')
        expect(html).toContain('Shown in a window.')
    })

    it('with keepPane, keeps its content in the pane while open', () => {
        const html = renderToStaticMarkup(
            <WindowedPane title="nightly-export.yaml" defaultOpen keepPane>
                {where}
            </WindowedPane>,
        )
        expect(html).toContain('drawn in the pane')
        expect(html).not.toContain('Shown in a window.')
    })

    it('draws the inset frame around the content, and the aside only in the window', () => {
        const html = renderToStaticMarkup(
            <WindowedPane title="nightly-export.yaml" frame="inset" aside={<p>step reference</p>}>
                <p>pipeline</p>
            </WindowedPane>,
        )
        expect(html).toContain('data-tone="inset"')
        expect(html).toContain('pipeline')
        expect(html).not.toContain('step reference')
    })

    it('holds the button at the top of the pane with button="sticky"', () => {
        const sticky = renderToStaticMarkup(
            <WindowedPane title="nightly-export.yaml" button="sticky">
                <p>pipeline</p>
            </WindowedPane>,
        )
        expect(sticky).toContain('data-slot="windowed-pane-sticky"')
        expect(sticky).toContain('aria-label="Expand"')
        const corner = renderToStaticMarkup(
            <WindowedPane title="nightly-export.yaml">
                <p>pipeline</p>
            </WindowedPane>,
        )
        expect(corner).not.toContain('windowed-pane-sticky')
        expect(corner).toContain('aria-label="Expand"')
    })
})
