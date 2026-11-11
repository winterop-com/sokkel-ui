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

    it('breaks a long label and wraps its note within the label room, the switch kept apart', () => {
        const html = renderToStaticMarkup(<SwitchField id="follow" label="follow_redirects_with_auth" note="default" />)
        expect(html).toMatch(/<span class="flex min-w-0 flex-wrap[^"]*"><span id="follow-label" class="min-w-0 wrap-anywhere">/)
        expect(html).toMatch(/<span class="min-w-0 text-xs wrap-anywhere text-faint">default<\/span>/)
    })
})
