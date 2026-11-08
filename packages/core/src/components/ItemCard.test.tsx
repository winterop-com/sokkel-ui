import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ItemCard } from './ItemCard'

describe('ItemCard', () => {
    it('draws an icon on a tile before the title', () => {
        const html = renderToStaticMarkup(<ItemCard title="Tasks" icon={<svg data-icon="tasks" />} />)
        expect(html.indexOf('data-icon="tasks"')).toBeLessThan(html.indexOf('Tasks'))
        expect(renderToStaticMarkup(<ItemCard title="Tasks" />)).not.toContain('size-8')
    })
})
