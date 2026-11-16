// @vitest-environment happy-dom
import { act, useImperativeHandle, type Ref } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Chart } from './Chart'
import { ChartFrame } from './ChartFrame'
import { ChartGrid } from './ChartGrid'
import type { ChartHandle } from './EChart'
import { FrameDataContext, type FrameData } from './frame-data'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const { drawn, build } = vi.hoisted(() => ({ drawn: [] as unknown[], build: () => ({}) }))

vi.mock('./EChart', () => ({
    EChart: ({ handle, option }: { handle?: Ref<ChartHandle | null>; option: unknown }) => {
        drawn.push(option)
        useImperativeHandle(handle, () => ({ svg: async () => '', png: async () => '' }) as unknown as ChartHandle)
        return null
    },
}))
vi.mock('./use-builder', () => ({ useBuilder: () => build }))

const ROWS = [
    { day: 'mon', project: 'harbor', runs: 3 },
    { day: 'tue', project: 'juniper', runs: 5 },
]

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
})

function mount(node: React.ReactNode) {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root?.render(node))
    return host
}

const exportButton = (element: HTMLElement) => element.querySelector('[aria-label="Export"]')

describe('ChartFrame export', () => {
    it('offers Export around a chart that draws an image', () => {
        const element = mount(
            <ChartFrame title="Runs">{(state) => <Chart kind="bar" label="Runs" rows={ROWS} x="day" y="runs" {...state} />}</ChartFrame>,
        )
        expect(exportButton(element)).not.toBeNull()
    })

    it('leaves Export out around a grid, which draws no one image', () => {
        const element = mount(
            <ChartFrame title="Runs" fit>
                {(state) => <ChartGrid kind="bar" label="Runs" rows={ROWS} x="day" y="runs" facet="project" {...state} />}
            </ChartFrame>,
        )
        expect(exportButton(element)).toBeNull()
    })
})

describe('the frame state handed through', () => {
    it('stays out of the spec a chart or a grid tells its frame', () => {
        const told: FrameData[] = []
        const tell = (data: FrameData | null) => {
            if (data !== null) told.push(data)
        }
        const handle = { current: null }
        mount(
            <FrameDataContext value={tell}>
                <Chart kind="bar" label="Runs" rows={ROWS} x="day" y="runs" handle={handle} windowed />
                <ChartGrid kind="bar" label="Runs" rows={ROWS} x="day" y="runs" facet="project" handle={handle} windowed />
            </FrameDataContext>,
        )
        expect(told).toHaveLength(2)
        for (const data of told) {
            expect(data.spec).not.toHaveProperty('handle')
            expect(data.spec).not.toHaveProperty('windowed')
        }
    })
})

describe('a legend toggle', () => {
    const draw = (kind: 'bar' | 'rings', hidden: ReadonlySet<string>) => (
        <Chart kind={kind} label="Runs" rows={ROWS} x="day" y="runs" hidden={hidden} />
    )

    it('builds a kind ECharts hides by series again only when its builder reads what is hidden', () => {
        for (const [kind, rebuilt] of [
            ['bar', false],
            ['rings', true],
        ] as const) {
            drawn.length = 0
            mount(draw(kind, new Set()))
            act(() => root?.render(draw(kind, new Set(['harbor']))))
            expect(drawn.length).toBeGreaterThanOrEqual(2)
            expect(drawn.at(-1) !== drawn[0]).toBe(rebuilt)
            act(() => root?.unmount())
            root = undefined
        }
    })
})
