import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Dock } from './Dock'

describe('Dock', () => {
    it("takes a section's props, its name among them", () => {
        const html = renderToStaticMarkup(
            <Dock title="Log" aria-label="Run log" data-run="nightly-export" resizable={false}>
                lines
            </Dock>,
        )
        expect(html).toContain('aria-label="Run log"')
        expect(html).toContain('data-run="nightly-export"')
    })

    it('wraps its head when its tools need more than one line', () => {
        expect(
            renderToStaticMarkup(
                <Dock title="Log" resizable={false}>
                    lines
                </Dock>,
            ),
        ).toContain('flex-wrap')
    })
})
