import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RelativeTime } from './RelativeTime'
import { TooltipProvider } from './ui/tooltip'

const NOW = new Date('2026-11-04T14:02:00Z')

describe('RelativeTime', () => {
    it('shows a date it cannot read as it was given', () => {
        expect(renderToStaticMarkup(<RelativeTime date="sometime in spring" now={NOW} />)).toContain('sometime in spring')
        expect(renderToStaticMarkup(<RelativeTime date={Number.NaN} now={NOW} />)).toBe('')
    })

    it('drops its focus stop on request, its instant riding on its title', () => {
        const html = renderToStaticMarkup(
            <TooltipProvider>
                <RelativeTime
                    date="2026-11-04T13:59:00Z"
                    now={NOW}
                    timeZone="UTC"
                    locale="en"
                    focusable={false}
                    exact={{ year: 'numeric' }}
                />
            </TooltipProvider>,
        )
        expect(html).not.toContain('tabindex')
        expect(html).toContain('title="2026"')
    })
})
