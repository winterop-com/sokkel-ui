// @vitest-environment happy-dom
import { act, useCallback, useState, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { DataTable, headWordWidth, type DataColumn } from './DataTable'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

interface Job {
    id: string
    name: string
    lazy?: boolean
}

const columns: DataColumn<Job>[] = [{ id: 'name', header: 'Name', width: '1fr', cell: (job) => job.name }]
const jobs: Job[] = [
    { id: 'nightly-export', name: 'nightly-export', lazy: true },
    { id: 'sync-inventory', name: 'sync-inventory' },
]

// A box 400 tall and 1000 wide, rows 40 tall: happy-dom lays nothing out.
const LAYOUT = [
    ['clientHeight', 400],
    ['clientWidth', 1000],
    ['offsetHeight', 40],
    ['offsetWidth', 1000],
] as const
const before = new Map<string, PropertyDescriptor | undefined>()

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    for (const [name, value] of LAYOUT) {
        before.set(name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name))
        Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get: () => value })
    }
})

afterAll(() => {
    for (const [name, descriptor] of before) {
        if (descriptor !== undefined) Object.defineProperty(HTMLElement.prototype, name, descriptor)
    }
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
})

async function mount(element: ReactElement) {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    await act(async () => made.render(element))
    await settle()
    return host
}

/** Lets promises answer and the effects they set off run. */
async function settle() {
    for (let round = 0; round < 4; round++) await act(async () => new Promise((done) => setTimeout(done, 10)))
}

const buttonNamed = (at: HTMLElement, name: string) =>
    [...at.querySelectorAll('button')].find((button) => button.textContent?.trim() === name || button.getAttribute('aria-label') === name)

describe('a branch whose children do not load', () => {
    it('stays open with a line that says so and tries again, as Tree does', async () => {
        let answer: 'fail' | 'load' = 'fail'
        const loadChildren = vi.fn(async (job: Job): Promise<Job[]> => {
            if (answer === 'fail') throw new Error('refused')
            return [{ id: `${job.id}/fetch`, name: 'fetch' }]
        })
        const at = await mount(
            <div style={{ height: 400, overflow: 'auto' }}>
                <DataTable
                    columns={columns}
                    rows={jobs}
                    rowKey={(job) => job.id}
                    hasChildren={(job) => job.lazy === true}
                    loadChildren={loadChildren}
                    defaultExpanded={new Set(['nightly-export'])}
                />
            </div>,
        )
        expect(loadChildren).toHaveBeenCalledTimes(1)
        const branch = at.querySelector('[data-row="nightly-export"]')
        expect(branch?.getAttribute('aria-expanded')).toBe('true')
        expect(branch?.getAttribute('aria-busy')).toBeNull()
        const refused = at.querySelector('[data-refused="nightly-export"]')
        expect(refused?.textContent).toContain('The server refused this read')
        // It waits for Try again rather than asking on every render.
        await settle()
        expect(loadChildren).toHaveBeenCalledTimes(1)

        answer = 'load'
        const retry = buttonNamed(at, 'Try again')
        expect(retry).toBeDefined()
        await act(async () => retry?.click())
        await settle()
        expect(loadChildren).toHaveBeenCalledTimes(2)
        expect(at.querySelector('[data-refused]')).toBeNull()
        expect(at.querySelector('[data-row="nightly-export/fetch"]')).not.toBeNull()
    })

    it('asks again once closed and opened', async () => {
        const loadChildren = vi.fn(async (): Promise<Job[]> => {
            throw new Error('refused')
        })
        const at = await mount(
            <div style={{ height: 400, overflow: 'auto' }}>
                <DataTable
                    columns={columns}
                    rows={jobs}
                    rowKey={(job) => job.id}
                    hasChildren={(job) => job.lazy === true}
                    loadChildren={loadChildren}
                    defaultExpanded={new Set(['nightly-export'])}
                />
            </div>,
        )
        expect(at.querySelector('[data-refused="nightly-export"]')).not.toBeNull()
        await act(async () => buttonNamed(at, 'Collapse')?.click())
        await settle()
        expect(at.querySelector('[data-refused]')).toBeNull()
        await act(async () => buttonNamed(at, 'Expand')?.click())
        await settle()
        expect(loadChildren).toHaveBeenCalledTimes(2)
        expect(at.querySelector('[data-refused="nightly-export"]')).not.toBeNull()
    })
})

describe('loading more without `loading`', () => {
    const page = (from: number) =>
        Array.from({ length: 5 }, (_, index) => ({ id: `run-${String(from + index)}`, name: `run ${String(from + index)}` }))

    it('asks again while the rows that arrived are still short of the view', async () => {
        const asked = vi.fn()
        function Runs() {
            const [rows, setRows] = useState<Job[]>(page(0))
            const more = useCallback(() => {
                asked()
                setRows((now) => [...now, ...page(now.length)])
            }, [])
            return <DataTable columns={columns} rows={rows} rowKey={(job) => job.id} hasMore onLoadMore={more} />
        }
        const at = await mount(
            <div style={{ height: 400, overflow: 'auto' }}>
                <Runs />
            </div>,
        )
        expect(asked.mock.calls.length).toBeGreaterThan(1)
        const calls = asked.mock.calls.length
        await settle()
        // It stops once the rows reach past the view.
        expect(asked.mock.calls.length).toBe(calls)
        expect(at.querySelectorAll('[data-row]').length).toBeGreaterThan(10)
    })

    it('does not ask again for a new `onLoadMore` given on each render', async () => {
        const asked = vi.fn()
        let renderAgain = () => undefined as void
        function Runs() {
            const [count, setCount] = useState(0)
            renderAgain = () => setCount((now) => now + 1)
            return <DataTable columns={columns} rows={page(0)} rowKey={(job) => job.id} hasMore onLoadMore={() => asked(count)} />
        }
        await mount(
            <div style={{ height: 400, overflow: 'auto' }}>
                <Runs />
            </div>,
        )
        expect(asked).toHaveBeenCalledTimes(1)
        for (let round = 0; round < 3; round++) await act(async () => renderAgain())
        await settle()
        expect(asked).toHaveBeenCalledTimes(1)
    })
})

describe('every row on every server page', () => {
    it('is said as selected, and no longer offered, once the app holds it so', async () => {
        const rows = Array.from({ length: 5 }, (_, index) => ({ id: `run-${String(index)}`, name: `run ${String(index)}` }))
        const page = new Set(rows.map((row) => row.id))
        const table = (every: boolean) => (
            <div style={{ height: 400, overflow: 'auto' }}>
                <DataTable
                    columns={columns}
                    rows={rows}
                    rowKey={(job) => job.id}
                    selectable
                    selection={page}
                    paging="server"
                    total={200}
                    pageSize={5}
                    onSelectAllPages={() => undefined}
                    allPagesSelected={every}
                />
            </div>
        )
        const at = await mount(table(false))
        expect(buttonNamed(at, 'Select all 200')).toBeDefined()
        await act(async () => root?.render(table(true)))
        await settle()
        expect(buttonNamed(at, 'Select all 200')).toBeUndefined()
        expect(at.textContent).toContain('All 200 selected')
    })
})

describe('a tree in client pages', () => {
    it('pages its top-level rows, each with the open rows under it', async () => {
        interface Step {
            id: string
            name: string
            steps?: Step[]
        }
        const step = (job: string, name: string): Step => ({ id: `${job}/${name}`, name })
        const runs: Step[] = [
            {
                id: 'nightly-export',
                name: 'nightly-export',
                steps: ['fetch', 'transform', 'upload'].map((name) => step('nightly-export', name)),
            },
            { id: 'sync-inventory', name: 'sync-inventory' },
            { id: 'send-digest', name: 'send-digest' },
        ]
        const at = await mount(
            <div style={{ height: 400, overflow: 'auto' }}>
                <DataTable
                    columns={[{ id: 'name', header: 'Name', width: '1fr', cell: (row: Step) => row.name }]}
                    rows={runs}
                    rowKey={(row) => row.id}
                    childRows={(row) => row.steps}
                    defaultExpanded={new Set(['nightly-export'])}
                    paging="client"
                    pageSize={2}
                />
            </div>,
        )
        const keys = [...at.querySelectorAll('[data-row]')].map((row) => row.getAttribute('data-row'))
        expect(keys).toEqual([
            'nightly-export',
            'nightly-export/fetch',
            'nightly-export/transform',
            'nightly-export/upload',
            'sync-inventory',
        ])
        expect(at.textContent).toContain('1–2 of 3')
    })
})

describe('a press on a row', () => {
    it('opens it, unless it ends a drag that selected its words', async () => {
        const opened = vi.fn()
        const at = await mount(
            <div style={{ height: 400, overflow: 'auto' }}>
                <DataTable columns={columns} rows={jobs} rowKey={(job) => job.id} onOpen={(job) => opened(job.id)} />
            </div>,
        )
        const row = at.querySelector<HTMLElement>('[data-row="sync-inventory"]')
        if (row === null) throw new Error('no row')
        const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
        let text = walker.nextNode()
        while (text !== null && text.textContent !== 'sync-inventory') text = walker.nextNode()
        if (text === null) throw new Error('no words')
        const range = document.createRange()
        range.setStart(text, 0)
        range.setEnd(text, 4)
        document.getSelection()?.addRange(range)
        await act(async () => row.click())
        expect(opened).not.toHaveBeenCalled()
        document.getSelection()?.removeAllRanges()
        await act(async () => row.click())
        expect(opened).toHaveBeenCalledWith('sync-inventory')
    })
})

describe('stacked cards with a free title', () => {
    it('are each as tall as their title needs, and only those in view and a few past it are drawn', async () => {
        // A box 300 wide, narrower than the columns, stacks the rows.
        const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 300 })
        try {
            const rows = Array.from({ length: 60 }, (_, index) => ({ id: `run-${String(index)}`, name: `run ${String(index)}` }))
            const free: DataColumn<Job>[] = [
                { id: 'name', header: 'Name', width: '1fr', stack: 'primary', stackTitle: 'free', cell: (job) => job.name },
                { id: 'id', header: 'Id', width: '12rem', stack: 'line', cell: (job) => job.id },
            ]
            const at = await mount(
                <div style={{ height: 400, overflow: 'auto' }}>
                    <DataTable columns={free} rows={rows} rowKey={(job) => job.id} />
                </div>,
            )
            const cards = [...at.querySelectorAll<HTMLElement>('[data-row]')]
            // A view 400 tall over cards measured at 40 and 16 apart: about seven in view, and half a view either side.
            expect(cards.length).toBeGreaterThan(5)
            expect(cards.length).toBeLessThan(20)
            expect(cards[0].className).toContain('group/card')
            expect(cards[0].style.height).toBe('')
            expect(cards[0].style.minHeight).not.toBe('')
        } finally {
            if (width !== undefined) Object.defineProperty(HTMLElement.prototype, 'clientWidth', width)
        }
    })
})

describe('a content column’s head', () => {
    // Each letter of a word is 8 wide; the name on one line is 8 a letter, its head 24 wider for its padding.
    const rect = Element.prototype.getBoundingClientRect
    const rangeRect = Range.prototype.getBoundingClientRect
    beforeEach(() => {
        Range.prototype.getBoundingClientRect = function (this: Range) {
            return DOMRect.fromRect({ width: 8 * this.toString().length, height: 24 })
        }
        Element.prototype.getBoundingClientRect = function (this: Element) {
            const name = this.matches('[data-head-name]') ? this : this.querySelector('[data-head-name]')
            const width = this.matches('[data-head-name]') ? 0 : this.matches('[role="columnheader"]') ? 24 : 0
            return DOMRect.fromRect({ width: width + 8 * (name?.textContent?.length ?? 0), height: 40 })
        }
    })
    afterEach(() => {
        Element.prototype.getBoundingClientRect = rect
        Range.prototype.getBoundingClientRect = rangeRect
    })

    it('reads its longest word with the head’s padding, and nothing for a head drawn from `head`', () => {
        const head = document.createElement('span')
        head.setAttribute('role', 'columnheader')
        head.innerHTML = '<span data-head-name>Delivers through</span>'
        expect(headWordWidth(head)).toBe(8 * 'Delivers'.length + 24)
        head.innerHTML = '<span><b>Delivers</b> through</span>'
        expect(headWordWidth(head)).toBe(0)
    })

    it('keeps its column at least as wide as that word, past the column’s most', async () => {
        const narrow: DataColumn<Job>[] = [
            { id: 'name', header: 'Name', width: '1fr', cell: (job) => job.name },
            { id: 'through', header: 'Delivers through', width: 'content', maxWidth: '2rem', cell: () => 'api' },
        ]
        const at = await mount(
            <div style={{ height: 400, overflow: 'auto' }}>
                <DataTable columns={narrow} rows={jobs} rowKey={(job) => job.id} />
            </div>,
        )
        const template = at.querySelector<HTMLElement>('[data-row]')?.style.gridTemplateColumns ?? ''
        expect(template).toContain(`${String(8 * 'Delivers'.length + 24)}px)`)
        expect(template).toContain('2rem')
    })
})

describe('a table first drawn hidden', () => {
    it('measures its content columns once it is shown', async () => {
        // Hidden, every box is 0 wide; shown, the box is 1000 wide and each cell 120. The observers are
        // called by hand, as happy-dom lays nothing out.
        let hidden = true
        const heard = new Set<() => void>()
        class Observer {
            constructor(private readonly call: () => void) {}
            observe() {
                heard.add(this.call)
            }
            unobserve() {}
            disconnect() {
                heard.delete(this.call)
            }
        }
        const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
        const rect = Element.prototype.getBoundingClientRect
        vi.stubGlobal('ResizeObserver', Observer)
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => (hidden ? 0 : 1000) })
        Element.prototype.getBoundingClientRect = function (this: Element) {
            return DOMRect.fromRect({ width: hidden || !this.hasAttribute('data-track') ? 0 : 120, height: 40 })
        }
        try {
            const sized: DataColumn<Job>[] = [
                { id: 'name', header: 'Name', width: 'content', cell: (job) => job.name },
                { id: 'id', header: 'Id', width: '1fr', cell: (job) => job.id },
            ]
            const at = await mount(
                <div style={{ height: 400, overflow: 'auto' }}>
                    <DataTable columns={sized} rows={jobs} rowKey={(job) => job.id} />
                </div>,
            )
            const template = () => at.querySelector<HTMLElement>('[data-row]')?.style.gridTemplateColumns ?? ''
            expect(template()).toContain('max-content')
            hidden = false
            await act(async () => {
                for (const call of heard) call()
            })
            await settle()
            expect(template()).not.toContain('max-content')
            expect(template()).toContain('120px')
        } finally {
            vi.unstubAllGlobals()
            Element.prototype.getBoundingClientRect = rect
            if (width !== undefined) Object.defineProperty(HTMLElement.prototype, 'clientWidth', width)
        }
    })
})

describe('the own search', () => {
    it('draws a field of its own and keeps the rows whose text holds every word typed', async () => {
        const at = await mount(
            <DataTable variant="list" columns={columns} rows={jobs} rowKey={(job) => job.id} searchBy={(job) => job.name} />,
        )
        // The field comes with the search's own module, fetched once the table has a `searchBy`.
        await vi.waitFor(() => expect(at.querySelector('[data-slot="search-field"] input')).not.toBeNull())
        const field = at.querySelector<HTMLInputElement>('[data-slot="search-field"] input')
        const type = async (text: string) => {
            await act(async () => {
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(field, text)
                field?.dispatchEvent(new Event('input', { bubbles: true }))
            })
            await settle()
        }
        const keys = () => [...at.querySelectorAll('[data-row]')].map((row) => row.getAttribute('data-row'))
        expect(keys()).toEqual(['nightly-export', 'sync-inventory'])
        await type('SYNC inv')
        expect(keys()).toEqual(['sync-inventory'])
        await type('sync export')
        expect(keys()).toEqual([])
    })
})

describe('a stacked card', () => {
    const leads: DataColumn<Job>[] = [
        { id: 'mark', header: 'Mark', width: '2rem', stack: 'lead', cell: (job) => <span data-mark={job.id}>*</span> },
        { id: 'box', header: 'Box', width: '2rem', stack: 'lead', cell: (job) => <button type="button" data-box={job.id} /> },
        ...columns,
        { id: 'note', header: 'Note', width: '1fr', stack: 'primary', cell: (job) => job.name },
    ]
    // A box 300 wide, narrower than the columns, stacks the rows.
    const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    beforeEach(() => Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 300 }))
    afterEach(() => {
        if (width !== undefined) Object.defineProperty(HTMLElement.prototype, 'clientWidth', width)
    })

    it('opens on a press on a lead that is not a control, and leaves a press on a control to it', async () => {
        const onOpen = vi.fn()
        const at = await mount(<DataTable columns={leads} rows={jobs} rowKey={(job) => job.id} onOpen={onOpen} />)
        expect(at.querySelector('[data-row="sync-inventory"]')?.className).toContain('group/card')
        await act(async () => at.querySelector<HTMLElement>('[data-mark="sync-inventory"]')?.click())
        expect(onOpen).toHaveBeenCalledTimes(1)
        expect(onOpen.mock.calls[0][0]).toBe(jobs[1])
        await act(async () => at.querySelector<HTMLElement>('[data-box="sync-inventory"]')?.click())
        expect(onOpen).toHaveBeenCalledTimes(1)
    })

    it('grows to its own height from the least a primary value takes, so a short one leaves no blank space', async () => {
        const at = await mount(<DataTable columns={leads} rows={jobs} rowKey={(job) => job.id} />)
        const card = at.querySelector<HTMLElement>('[data-row="sync-inventory"]')
        expect(card?.className).toContain('group/card')
        expect(card?.style.height).toBe('')
        // Its padding and edge, the title, and one line of the note.
        expect(card?.style.minHeight).toBe(`${String(2 * 8 + 2 + 24 + 22)}px`)
    })
})
