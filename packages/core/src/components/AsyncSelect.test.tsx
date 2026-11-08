import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AsyncSelect, NO_ANSWER, nearEnd, offersCreate, pageOf, wantsMore, withPage, type AsyncAnswer } from './AsyncSelect'

const key = (item: string) => item

describe('paging', () => {
    it('reads a plain list as the one and last page', () => {
        expect(pageOf(['a', 'b'])).toEqual({ items: ['a', 'b'] })
        expect(pageOf({ items: ['a'], next: 2 })).toEqual({ items: ['a'], next: 2 })
    })

    it('replaces the options with a first page and adds a later page, once each', () => {
        const first = withPage(NO_ANSWER as AsyncAnswer<string>, { items: ['a', 'b', 'b'], next: 'p2' }, 'first', key)
        expect(first).toEqual({ items: ['a', 'b'], next: 'p2', loading: null, failed: null, answered: true })
        const second = withPage({ ...first, loading: 'more' }, { items: ['b', 'c'], next: null }, 'more', key)
        expect(second.items).toEqual(['a', 'b', 'c'])
        expect(second.next).toBeUndefined()
        const again = withPage(second, { items: ['z'] }, 'first', key)
        expect(again.items).toEqual(['z'])
    })

    it('wants the next page only when there is one, nothing runs and nothing failed', () => {
        const answered: AsyncAnswer<string> = { items: ['a'], next: 20, loading: null, failed: null, answered: true }
        expect(wantsMore(answered)).toBe(true)
        expect(wantsMore({ ...answered, next: undefined })).toBe(false)
        expect(wantsMore({ ...answered, loading: 'more' })).toBe(false)
        expect(wantsMore({ ...answered, loading: 'first' })).toBe(false)
        expect(wantsMore({ ...answered, failed: { at: 'more', reason: '503' } })).toBe(false)
        expect(wantsMore(NO_ANSWER)).toBe(false)
    })

    it('counts a list scrolled near its end, or too short to scroll, as at its end', () => {
        expect(nearEnd({ scrollTop: 0, clientHeight: 320, scrollHeight: 960 })).toBe(false)
        expect(nearEnd({ scrollTop: 600, clientHeight: 320, scrollHeight: 960 })).toBe(true)
        expect(nearEnd({ scrollTop: 0, clientHeight: 320, scrollHeight: 300 })).toBe(true)
        expect(nearEnd({ scrollTop: 590, clientHeight: 320, scrollHeight: 960 }, 8)).toBe(false)
    })
})

describe('creating', () => {
    it('offers the typed text when no option is called that', () => {
        const labels = ['nightly', 'Export']
        expect(offersCreate('weekly', labels, key)).toBe(true)
        expect(offersCreate(' export ', labels, key)).toBe(false)
        expect(offersCreate('  ', labels, key)).toBe(false)
        expect(offersCreate('night', labels, key)).toBe(true)
    })
})

describe('several values', () => {
    it('draws each chosen value as a chip with its remove button, the search after them', () => {
        const html = renderToStaticMarkup(
            <AsyncSelect
                id="labels"
                multiple
                value={['nightly', 'export']}
                onValueChange={() => undefined}
                load={() => Promise.resolve([])}
                itemKey={key}
                itemLabel={key}
            />,
        )
        expect(html).toContain('aria-label="Remove nightly"')
        expect(html).toContain('aria-label="Remove export"')
        expect(html.indexOf('Remove export')).toBeLessThan(html.indexOf('id="labels"'))
    })

    it('reads as a select with one value', () => {
        const html = renderToStaticMarkup(
            <AsyncSelect value={null} onValueChange={() => undefined} load={() => Promise.resolve([])} itemKey={key} itemLabel={key} />,
        )
        expect(html).toContain('Choose')
        expect(html).not.toContain('Remove')
    })
})
