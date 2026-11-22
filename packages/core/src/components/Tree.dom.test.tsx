// @vitest-environment happy-dom
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Tree, type TreeNode, type TreeProps } from './Tree'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
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

async function rerender(element: ReactElement) {
    await act(async () => root?.render(element))
    await settle()
}

/** Lets promises answer, frames run and the effects they set off finish. */
async function settle() {
    for (let round = 0; round < 4; round++) await act(async () => new Promise((done) => setTimeout(done, 20)))
}

const rowOf = (at: HTMLElement, id: string) => at.querySelector<HTMLElement>(`[data-id="${id}"]`)

const sites: TreeNode[] = [
    {
        id: 'europe',
        label: 'Europe',
        children: [{ id: 'norway', label: 'Norway', children: [{ id: 'bergen', label: 'Bergen' }] }],
    },
    { id: 'asia', label: 'Asia', hasChildren: true },
]

describe('a long tree', () => {
    it('keeps the focus on its row once the row scrolls out of the rows drawn', async () => {
        const nodes = Array.from({ length: 300 }, (_, index) => ({ id: `site-${String(index)}`, label: `Site ${String(index)}` }))
        const at = await mount(
            <div style={{ height: '400px', overflowY: 'auto' }}>
                <Tree nodes={nodes} selection="none" label="Sites" />
            </div>,
        )
        const box = at.firstElementChild as HTMLElement
        const list = at.querySelector<HTMLElement>('[role="tree"]')
        if (list === null) throw new Error('no tree')
        // happy-dom lays nothing out: the list stands as far above the box as the box is scrolled.
        let scrolled = 0
        list.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: -scrolled, width: 300, height: 9600 })

        const first = rowOf(at, 'site-0')
        await act(async () => first?.focus())
        expect(document.activeElement).toBe(first)

        scrolled = 4000
        await act(async () => box.dispatchEvent(new Event('scroll')))
        await settle()
        // The rows drawn are now far below the first, and the first is still drawn and focused.
        expect(rowOf(at, 'site-125')).not.toBeNull()
        expect(document.activeElement?.getAttribute('data-id')).toBe('site-0')
        expect(rowOf(at, 'site-0')?.style.position).toBe('absolute')

        // Once the focus leaves, the row is no longer kept.
        await act(async () => rowOf(at, 'site-0')?.blur())
        await settle()
        expect(rowOf(at, 'site-0')).toBeNull()
    })
})

describe('a choice', () => {
    it('is opened to when the tree is first drawn', async () => {
        const at = await mount(<Tree nodes={sites} selected={['bergen']} label="Sites" />)
        expect(rowOf(at, 'bergen')?.getAttribute('aria-selected')).toBe('true')
    })

    it('not in the tree yet is opened to once it arrives', async () => {
        const props: TreeProps = { nodes: sites, label: 'Sites' }
        const at = await mount(<Tree {...props} selected={[]} />)
        await rerender(<Tree {...props} selected={['osaka']} />)
        expect(rowOf(at, 'osaka')).toBeNull()
        const arrived: TreeNode[] = [
            sites[0],
            { id: 'asia', label: 'Asia', children: [{ id: 'japan', label: 'Japan', children: [{ id: 'osaka', label: 'Osaka' }] }] },
        ]
        await rerender(<Tree {...props} nodes={arrived} selected={['osaka']} />)
        expect(rowOf(at, 'osaka')?.getAttribute('aria-selected')).toBe('true')
    })
})

describe('a level that did not load', () => {
    it('asks again once closed and opened', async () => {
        const loadChildren = vi.fn(async (): Promise<TreeNode[]> => {
            throw new Error('refused')
        })
        const at = await mount(<Tree nodes={sites} defaultExpanded={['asia']} loadChildren={loadChildren} label="Sites" />)
        expect(loadChildren).toHaveBeenCalledTimes(1)
        expect(at.textContent).toContain('This level did not load.')
        const toggle = rowOf(at, 'asia')?.querySelector('button')
        await act(async () => toggle?.click())
        await settle()
        await act(async () => rowOf(at, 'asia')?.querySelector('button')?.click())
        await settle()
        expect(loadChildren).toHaveBeenCalledTimes(2)
    })
})

describe('a branch with nothing in it', () => {
    it('opens by its arrow to a row that says it is empty, in the words given', async () => {
        const nodes: TreeNode[] = [{ id: 'juniper', label: 'Juniper', children: [] }]
        const at = await mount(<Tree nodes={nodes} label="Folders" words={{ emptyBranch: 'Nothing here' }} />)
        const row = rowOf(at, 'juniper')
        expect(row?.getAttribute('aria-expanded')).toBe('false')
        await act(async () => row?.querySelector('button')?.click())
        expect(rowOf(at, 'juniper')?.getAttribute('aria-expanded')).toBe('true')
        expect(at.textContent).toContain('Nothing here')
    })
})

describe('a row that moves', () => {
    it('keeps the press on its menu button, which the drag leaves alone', async () => {
        const at = await mount(
            <Tree
                nodes={sites}
                selection="none"
                onMove={() => undefined}
                actions={() => [{ id: 'rename', label: 'Rename', onSelect: () => undefined }]}
                label="Sites"
            />,
        )
        const menu = rowOf(at, 'asia')?.querySelector('[aria-label="Actions"]')
        expect(menu).toBeDefined()
        // A press inside `data-no-drag` is the control's own, never the start of a drag.
        expect(menu?.closest('[data-no-drag]')).not.toBeNull()
    })
})

describe('openOnChoose', () => {
    it('opens a closed branch as it is chosen, and leaves one closed without it', async () => {
        const onSelect = vi.fn()
        const at = await mount(<Tree label="Sites" nodes={sites} onSelect={onSelect} openOnChoose />)
        expect(rowOf(at, 'norway')).toBeNull()
        await act(async () => rowOf(at, 'europe')?.click())
        expect(onSelect).toHaveBeenLastCalledWith(['europe'])
        expect(rowOf(at, 'europe')?.getAttribute('aria-expanded')).toBe('true')
        expect(rowOf(at, 'norway')).not.toBeNull()
        // Chosen again, an open branch stays open.
        await act(async () => rowOf(at, 'europe')?.click())
        expect(rowOf(at, 'norway')).not.toBeNull()

        await rerender(<Tree label="Sites" nodes={sites} onSelect={onSelect} key="plain" />)
        await act(async () => rowOf(at, 'europe')?.click())
        expect(rowOf(at, 'europe')?.getAttribute('aria-expanded')).toBe('false')
    })
})

describe('a branch of many thousand rows', () => {
    const big = (count: number): TreeNode[] => [
        {
            id: 'films',
            label: 'films',
            children: Array.from({ length: count }, (_, index) => ({
                id: `film-${String(index)}`,
                label: `Film ${String(count - index)}`,
            })),
        },
    ]
    const order = { sorted: true, band: (node: TreeNode) => (node.children === undefined ? 'notes' : 'folders') }

    /** The time to open the branch by choosing it, then to go to its last row by key. */
    async function openAndEnd(count: number): Promise<number> {
        const at = await mount(
            <div style={{ height: '400px', overflowY: 'auto' }}>
                <Tree
                    nodes={big(count)}
                    label="Notes"
                    selection="single"
                    selected={[]}
                    onSelect={() => undefined}
                    openOnChoose
                    order={order}
                    onMove={() => undefined}
                />
            </div>,
        )
        const branch = rowOf(at, 'films')
        if (branch === null) throw new Error('no branch')
        const started = performance.now()
        await act(async () => branch.click())
        await act(async () => branch.focus())
        await act(async () => branch.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })))
        const took = performance.now() - started
        expect(at.querySelectorAll('[role="treeitem"]').length).toBeLessThan(200)
        act(() => root?.unmount())
        host?.remove()
        root = undefined
        host = undefined
        return took
    }

    it(
        'opens and walks a branch of 50,000 in time that grows with its rows, drawing only those in view',
        { retry: 3, timeout: 120_000 },
        async () => {
            await openAndEnd(500)
            const short = Math.min(await openAndEnd(5_000), await openAndEnd(5_000))
            const long = Math.min(await openAndEnd(50_000), await openAndEnd(50_000))
            if (long < 100) return
            expect(long / Math.max(short, 1)).toBeLessThan(30)
        },
    )
})

describe('a long label', () => {
    const series: TreeNode[] = [
        { id: 'a', label: 'Hours of Queen Isabella the Catholic, Queen of Spain: Fol. 170r' },
        { id: 'b', label: 'Hours of Queen Isabella the Catholic, Queen of Spain: Fol. 95v' },
    ]

    it('keeps its tail apart with cut="middle", the query marked on both sides', async () => {
        const at = await mount(<Tree nodes={series} label="Pages" cut="middle" query="queen" />)
        const row = rowOf(at, 'a')
        const tail = [...(row?.querySelectorAll('span.whitespace-pre') ?? [])].map((span) => span.textContent)
        expect(tail).toEqual([': Fol. 170r'])
        expect([...(row?.querySelectorAll('mark') ?? [])].map((mark) => mark.textContent)).toEqual(['Queen', 'Queen'])
    })

    it('gives its whole text on hover once it is cut short', async () => {
        const wide = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(400)
        const narrow = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(120)
        const at = await mount(<Tree nodes={series} label="Pages" />)
        expect(rowOf(at, 'b')?.querySelector('[title]')?.getAttribute('title')).toBe(series[1].label)
        wide.mockRestore()
        narrow.mockRestore()
    })

    it('gives no hover text to a label that fits', async () => {
        const at = await mount(<Tree nodes={series} label="Pages" />)
        expect(rowOf(at, 'a')?.querySelector('[title]')).toBeNull()
    })
})
