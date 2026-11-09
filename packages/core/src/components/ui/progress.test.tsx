import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DownloadButton } from '../DownloadButton'
import { Progress, ProgressValue } from './progress'

const value = (props: Parameters<typeof Progress>[0]) => renderToStaticMarkup(<Progress {...props} />)

describe('Progress', () => {
    it('says its share as DownloadButton says it', () => {
        for (const share of [0, 0.004, 0.125, 0.42, 0.996, 1]) {
            const bar = value({ value: share * 100, children: <ProgressValue /> })
            const button = renderToStaticMarkup(<DownloadButton state="running" value={share} />)
            const said = /data-slot="progress-value"[^>]*>([^<]*)</.exec(bar)?.[1]
            expect(said).toBeDefined()
            expect(button).toContain(String(said))
        }
    })

    it('never says 100% before the end, nor 0% once begun', () => {
        expect(value({ value: 99.6, children: <ProgressValue /> })).toContain('&gt;99%')
        expect(value({ value: 0.3, children: <ProgressValue /> })).toContain('&lt;1%')
        expect(value({ value: 99.6 })).toContain('aria-valuetext="&gt;99%"')
    })

    it('reads its share within its own bounds', () => {
        expect(value({ value: 7, max: 12, children: <ProgressValue /> })).toContain('58%')
    })

    it('leaves the words to the app given a format or its own text', () => {
        expect(value({ value: 7, max: 12, children: <ProgressValue>{(_, raw) => `${String(raw)} of 12`}</ProgressValue> })).toContain(
            '7 of 12',
        )
        expect(value({ value: 7, max: 12, format: { style: 'decimal' }, children: <ProgressValue /> })).toContain('>7<')
    })

    it('says nothing while it cannot tell', () => {
        expect(value({ value: null, children: <ProgressValue /> })).toMatch(/data-slot="progress-value"[^>]*><\/span>/)
    })
})
