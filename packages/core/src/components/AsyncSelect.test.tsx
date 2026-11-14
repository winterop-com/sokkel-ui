import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { releaser } from '../hooks/use-busy-release'
import { WAIT_SHOWN } from '../lib/durations'
import {
    AsyncSelect,
    NO_ANSWER,
    filterLocal,
    nearEnd,
    noteOf,
    offersCreate,
    pageOf,
    waitsForFirst,
    wantsMore,
    withPage,
    type AsyncAnswer,
} from './AsyncSelect'

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

describe('marks', () => {
    const mark = (item: string) => <i data-mark={item} />

    it('draws the chosen value with its mark before its label and its detail after it', () => {
        const html = renderToStaticMarkup(
            <AsyncSelect
                value="nightly-export"
                onValueChange={() => undefined}
                load={() => Promise.resolve([])}
                itemKey={key}
                itemLabel={(item) => item.replace('-', ' ')}
                itemDetail={(item) => `code:${item}`}
                itemMark={mark}
            />,
        )
        expect(html.indexOf('data-mark="nightly-export"')).toBeLessThan(html.indexOf('nightly export'))
        expect(html.indexOf('nightly export')).toBeLessThan(html.indexOf('code:nightly-export'))
        expect(html).toMatch(/class="[^"]*font-mono[^"]*">code:nightly-export/)
    })

    it('puts the mark in each chosen chip', () => {
        const html = renderToStaticMarkup(
            <AsyncSelect
                multiple
                value={['fetch', 'upload']}
                onValueChange={() => undefined}
                load={() => Promise.resolve([])}
                itemKey={key}
                itemLabel={key}
                itemMark={mark}
            />,
        )
        expect(html).toContain('data-mark="fetch"')
        expect(html).toContain('data-mark="upload"')
    })
})

describe('a list held here', () => {
    const JOBS = [
        { code: 'nightly-export', name: 'Nightly export' },
        { code: 'sync-inventory', name: 'Sync inventory' },
        { code: 'rebuild-index', name: 'Rebuild index' },
    ]
    const label = (job: (typeof JOBS)[number]) => job.name

    it('keeps the options whose label or text detail holds every word typed, in any case', () => {
        expect(filterLocal(JOBS, '', label)).toEqual(JOBS)
        expect(filterLocal(JOBS, 'NIGHTLY', label).map((job) => job.code)).toEqual(['nightly-export'])
        expect(filterLocal(JOBS, 'in', label).map((job) => job.code)).toEqual(['sync-inventory', 'rebuild-index'])
        expect(filterLocal(JOBS, 'rebuild-index', label)).toEqual([])
        expect(filterLocal(JOBS, 'rebuild-index', label, (job) => job.code).map((job) => job.code)).toEqual(['rebuild-index'])
        expect(filterLocal(JOBS, 'sync  inv', label).map((job) => job.code)).toEqual(['sync-inventory'])
    })

    it('reads as a select over items, with no loader', () => {
        const html = renderToStaticMarkup(
            <AsyncSelect
                value={JOBS[1] ?? null}
                onValueChange={() => undefined}
                items={JOBS}
                itemKey={(job) => job.code}
                itemLabel={label}
            />,
        )
        expect(html).toContain('Sync inventory')
    })
})

/** The jobs a loader over Tidevann's jobs finds for a query: those whose name holds it. */
const JOB_NAMES = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders']
const jobsFor = (query: string) => JOB_NAMES.filter((job) => job.includes(query))

/**
 * A list opened over a loader that answers `answerIn` ms after each read, each query read after the
 * pause in typing (`debounce`): its answer held as `AsyncSelect` holds it, a newer query dropping a
 * read in flight; its wait timed as `useBusyRelease` times it (`releaser` over `wait-shown`); and
 * each change of the line under the list kept, with when it was drawn.
 */
function opened(answerIn: number, found: (query: string) => string[] = jobsFor, debounce = 250) {
    let answer: AsyncAnswer<string> = NO_ANSWER
    let waiting = false
    let slow = false
    let pause: ReturnType<typeof setTimeout> | undefined
    let read: ReturnType<typeof setTimeout> | undefined
    const start = Date.now()
    const drawn: { note: ReturnType<typeof noteOf>; at: number }[] = []
    const draw = () => {
        const now = waitsForFirst(answer, false)
        if (now !== waiting) {
            waiting = now
            timing.busy(now)
        }
        const note = noteOf(answer, { short: false, empty: answer.items.length === 0, creating: null, slow: waiting && slow })
        if (drawn.at(-1)?.note !== note) drawn.push({ note, at: Date.now() - start })
    }
    const timing = releaser(WAIT_SHOWN, (released) => {
        if (released === slow) return
        slow = released
        draw()
    })
    const type = (query: string) => {
        clearTimeout(pause)
        clearTimeout(read)
        pause = setTimeout(() => {
            answer = { ...answer, loading: 'first', failed: null }
            draw()
            read = setTimeout(() => {
                answer = withPage(answer, { items: found(query) }, 'first', key)
                draw()
            }, answerIn)
        }, debounce)
        draw()
    }
    type('')
    return { drawn, type, notes: () => drawn.map((drawing) => drawing.note) }
}

describe("the list's wait", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('waits for nothing on a query too short to ask, and says what to type', () => {
        expect(waitsForFirst(NO_ANSWER, true)).toBe(false)
        expect(noteOf(NO_ANSWER, { short: true, empty: true, creating: null, slow: true })).toBe('typeMore')
    })

    it('never says Searching for an answer that comes within wait-shown, the line keeping its room unseen until then', () => {
        const list = opened(40)
        vi.advanceTimersByTime(1000)
        expect(list.drawn).toEqual([
            { note: 'waiting', at: 0 },
            { note: null, at: 290 },
        ])
        const none = opened(40, () => [])
        vi.advanceTimersByTime(1000)
        expect(none.notes()).toEqual(['waiting', 'empty'])
    })

    it('says Searching once the list has gone wait-shown without an answer, the pause in typing counted, and not before', () => {
        const list = opened(1000)
        vi.advanceTimersByTime(WAIT_SHOWN - 1)
        expect(list.notes()).toEqual(['waiting'])
        vi.advanceTimersByTime(1)
        expect(list.drawn.at(-1)).toEqual({ note: 'searching', at: WAIT_SHOWN })
        vi.advanceTimersByTime(1000)
        expect(list.drawn.at(-1)).toEqual({ note: null, at: 1250 })
    })

    it('keeps saying nothing matches through a quick wait for the next query', () => {
        const list = opened(40, () => [])
        vi.advanceTimersByTime(1000)
        list.type('zz')
        vi.advanceTimersByTime(1000)
        expect(list.notes()).toEqual(['waiting', 'empty'])
    })

    it('says Searching once a read has run wait-shown, counted from the first read across keys typed meanwhile', () => {
        const list = opened(1000, () => [])
        vi.advanceTimersByTime(2000)
        expect(list.notes()).toEqual(['waiting', 'searching', 'empty'])
        // The next read starts after the pause, at 2250; a key typed while it runs, at 2350, reads again at 2600.
        list.type('zz')
        vi.advanceTimersByTime(350)
        list.type('zzz')
        vi.advanceTimersByTime(WAIT_SHOWN - 101)
        expect(list.drawn.at(-1)?.note).toBe('empty')
        vi.advanceTimersByTime(1)
        expect(list.drawn.at(-1)).toEqual({ note: 'searching', at: 2250 + WAIT_SHOWN })
    })
})
