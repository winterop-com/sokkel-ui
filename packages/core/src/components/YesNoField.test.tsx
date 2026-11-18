import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Field } from './Field'
import { PeriodPicker } from './PeriodPicker'
import { YesNoField } from './YesNoField'

describe('a yes or no field with an issue', () => {
    it("draws the issue's edge on the choice, its row keeping the mark's room", () => {
        const html = renderToStaticMarkup(
            <YesNoField id="cleaned" label="Cleaned" value={null} onValueChange={() => {}} error="Answer this" />,
        )
        expect(/role="group"[^>]*class="([^"]+)"/.exec(html)?.[1]).toContain('border-critical/80')
        expect(/data-field-edge="own" class="([^"]+)"/.exec(html)?.[1]).toContain('pr-9')
    })
})

describe('a period picker in a field with an issue', () => {
    it("draws the issue's edge and the mark's room on its trigger, never on the whole picker", () => {
        const html = renderToStaticMarkup(
            <Field id="period" label="Period" error="Choose a period">
                <PeriodPicker id="period" type="monthly" value={null} onValueChange={() => {}} />
            </Field>,
        )
        const root = /data-field-edge="own" class="([^"]+)"/.exec(html)?.[1] ?? ''
        expect(root).not.toContain('pr-9')
        const trigger = /<button[^>]*id="period"[^>]*>/.exec(html)?.[0] ?? ''
        expect(trigger).toContain('pr-9')
        expect(trigger).toContain('border-critical/80')
    })
})
