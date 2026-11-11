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

describe('PageState tone', () => {
    it('heads a refused read as the page failing in the critical tone', () => {
        expect(failed()).toContain('The server refused this read')
        expect(failed({ status: 404 })).toContain('Nothing is there')
    })

    it('heads a refused read in the warning tone as a part of the page, not the page', () => {
        const html = failed({ tone: 'warning' })
        expect(html).toContain('Part of this page could not be read')
        expect(html).not.toContain('The server refused this read')
        expect(failed({ tone: 'warning', status: 404 })).toContain('Part of this page is not there')
        expect(failed({ tone: 'warning', status: 'unreachable' })).toContain('The server is not answering')
    })

    it("takes the warning tone's words from the app", () => {
        expect(failed({ tone: 'warning', words: { partRefused: 'The activity list could not be read' } })).toContain(
            'The activity list could not be read',
        )
    })

    it('draws a failure as the page failing by default, as an alert', () => {
        const html = failed()
        expect(html).toContain('role="alert"')
        expect(html).toContain('text-destructive')
        expect(html).not.toContain('warning')
    })

    it('draws a failed read of secondary data in the warning tone, announced as a status', () => {
        const html = failed({ tone: 'warning', onRetry: () => undefined })
        expect(html).toContain('role="status"')
        expect(html).not.toContain('role="alert"')
        expect(html).toContain('border-warning/35')
        expect(html).toContain('bg-warning/8')
        expect(html).toContain('text-warning-ink')
        expect(html).not.toContain('border-border-strong')
        expect(html).not.toContain('text-destructive')
        expect(html).toContain('The scheduler is restarting.')
        expect(html).toContain('Try again')
    })

    it('leaves the states that have not failed as they are', () => {
        const loading = renderToStaticMarkup(
            <PageState loading tone="warning">
                content
            </PageState>,
        )
        expect(loading).not.toContain('warning')
        expect(
            renderToStaticMarkup(
                <PageState loading={false} tone="warning">
                    content
                </PageState>,
            ),
        ).toBe('content')
    })
})
