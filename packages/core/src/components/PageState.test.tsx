import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PageState } from './PageState'

const failed = (props: Partial<Parameters<typeof PageState>[0]> = {}) =>
    renderToStaticMarkup(
        <PageState loading={false} status={503} error="The scheduler is restarting." {...props}>
            content
        </PageState>,
    )

describe('PageState retry', () => {
    it('draws a Try again button under a failed read given onRetry', () => {
        const html = failed({ onRetry: () => undefined })
        expect(html).toMatch(/role="alert".*The scheduler is restarting\..*<button[^>]*>.*Try again<\/button>/)
    })

    it('keeps the button out of the alert, so the alert says only what failed', () => {
        const html = failed({ onRetry: () => undefined })
        const alert = /<div role="alert"[^>]*>(.*?)<\/div>/.exec(html)?.[1] ?? ''
        expect(alert).not.toContain('Try again')
    })

    it('takes its word from the app', () => {
        expect(failed({ onRetry: () => undefined, words: { retry: 'Read again' } })).toContain('Read again')
    })

    it('draws no button without onRetry, nor on a state that has not failed', () => {
        expect(failed()).not.toContain('<button')
        expect(
            renderToStaticMarkup(
                <PageState loading onRetry={() => undefined}>
                    content
                </PageState>,
            ),
        ).not.toContain('Try again')
        expect(
            renderToStaticMarkup(
                <PageState loading={false} onRetry={() => undefined}>
                    content
                </PageState>,
            ),
        ).toBe('content')
    })
})
