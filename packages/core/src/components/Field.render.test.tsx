import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Field } from './Field'

/** How many elements open before the control, so two drawings can be told to hold it at one depth. */
const depthOf = (html: string) => html.slice(0, html.indexOf('<input')).split('<div').length

describe('Field', () => {
    it('keeps its control at one place whether or not it has an issue, so an issue never mounts it afresh', () => {
        const plain = renderToStaticMarkup(
            <Field id="period" label="Reporting period">
                <input id="period" />
            </Field>,
        )
        const refused = renderToStaticMarkup(
            <Field id="period" label="Reporting period" error="Say which period the report is for.">
                <input id="period" />
            </Field>,
        )
        expect(depthOf(refused)).toBe(depthOf(plain))
        expect(refused).toContain('pr-9')
        expect(plain).not.toContain('pr-9')
    })
})
