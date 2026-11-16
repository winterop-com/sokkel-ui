import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MapView } from './MapView'

describe('MapView on a server', () => {
    it('renders to a string with no document', () => {
        expect(renderToString(<MapView label="Sites" />)).toContain('Sites')
    })
})
