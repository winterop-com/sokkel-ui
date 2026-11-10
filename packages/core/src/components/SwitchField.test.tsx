import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SwitchField } from './SwitchField'

describe('SwitchField', () => {
    it('is a label for its switch across the whole row', () => {
        const html = renderToStaticMarkup(<SwitchField id="notify" label="Tell grace when a run fails" />)
        expect(html.startsWith('<label for="notify"')).toBe(true)
        expect(html).toContain('aria-labelledby="notify-label"')
    })

    it('disables the switch and says why in place of the help mark', () => {
        const html = renderToStaticMarkup(
            <SwitchField id="worker" label="Run on the worker" explain="Steps run on the worker." reason="Held while it is upgraded." />,
        )
        expect(html).toContain('Held while it is upgraded.')
        expect(html).toContain('aria-describedby="worker-reason"')
        expect(html).toContain('aria-disabled="true"')
        expect(html).not.toContain('aria-label="Steps run on the worker."')
    })
})
