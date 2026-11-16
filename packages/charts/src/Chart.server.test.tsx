import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Chart } from './Chart'

describe('Chart on a server', () => {
    it('renders to a string with no document', () => {
        expect(renderToString(<Chart kind="bar" label="Runs" rows={[]} x="day" y="runs" />)).toContain('Runs')
    })
})
