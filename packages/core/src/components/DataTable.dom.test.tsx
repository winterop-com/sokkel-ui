// @vitest-environment happy-dom
import { act, useCallback, useState, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { DataTable, type DataColumn } from './DataTable'

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
