// @vitest-environment happy-dom
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { EChart, type ChartHandle } from './EChart'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

/** A stand-in for an ECharts instance that records what it is asked. */
interface Fake {
    calls: string[]
    option: Record<string, unknown> | null
}

const engine = vi.hoisted(() => ({ parts: 0, made: [] as Fake[] }))

vi.mock('./engine', () => ({
    init: () => {
        const fake: Fake = { calls: [], option: null }
        engine.made.push(fake)
        return {
            setOption: (option: Record<string, unknown>) => {
                fake.calls.push('setOption')
                fake.option = option
            },
            getOption: () => {
                fake.calls.push('getOption')
                return { dataZoom: [{ start: 40, end: 60 }] }
            },
            dispatchAction: (action: { type: string }) => fake.calls.push(action.type),
            setTheme: () => undefined,
            resize: () => undefined,
            dispose: () => fake.calls.push('dispose'),
            renderToSVGString: () => '<svg />',
        }
    },
    ensure: async () => undefined,
    ensureSvg: async () => undefined,
    partsLoaded: () => engine.parts,
}))

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    Object.defineProperty(document, 'fonts', { value: { ready: Promise.resolve() }, configurable: true })
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    engine.made.length = 0
    engine.parts = 0
})

/** Lets the engine's and the fonts' promises answer, and React draw what they set. */
const settle = async () => {
    for (let round = 0; round < 6; round += 1) await act(async () => await Promise.resolve())
}

async function mount(node: React.ReactNode) {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root?.render(node))
    await settle()
}

const BARS = { series: [{ type: 'bar', name: 'runs', data: [1, 2] }], xAxis: { type: 'category', data: ['mon', 'tue'] } }
const ZOOMED = { ...BARS, dataZoom: [{ type: 'slider', start: 0, end: 100 }] }

describe('EChart', () => {
    it('reads the drawn option back only for an option with a zoom', async () => {
        await mount(<EChart option={BARS} label="Runs" />)
        act(() => root?.render(<EChart option={{ ...BARS }} label="Runs" />))
        await settle()
        expect(engine.made[0]?.calls).not.toContain('getOption')
    })

    it('keeps the reader zoom when the chart is made again for a part another chart loaded', async () => {
        await mount(<EChart option={ZOOMED} label="Runs" />)
        engine.parts = 1
        act(() => root?.render(<EChart option={{ ...ZOOMED }} label="Runs" />))
        await settle()
        expect(engine.made).toHaveLength(2)
        expect(engine.made[1]?.option?.dataZoom).toEqual([{ type: 'slider', start: 40, end: 60 }])
    })

    it('highlights the hovered series again once new data is drawn', async () => {
        await mount(<EChart option={BARS} label="Runs" hovered="runs" />)
        const fake = engine.made[0]
        act(() => root?.render(<EChart option={{ ...BARS }} label="Runs" hovered="runs" />))
        await settle()
        expect(fake?.calls.lastIndexOf('highlight')).toBeGreaterThan(fake?.calls.lastIndexOf('setOption') ?? -1)
    })

    it('fits the category labels to the exported image, as on the page', async () => {
        const days = Array.from({ length: 30 }, (_, day) => `harbor/nightly-export/2026-11-${String(day + 1).padStart(2, '0')}`)
        const option = {
            series: [{ type: 'bar', data: days.map(() => 1) }],
            xAxis: { type: 'category', data: days, axisLabel: { interval: 0 } },
        }
        const handle = createRef<ChartHandle>()
        await mount(<EChart option={option} label="Runs" handle={handle} />)
        await act(async () => {
            await handle.current?.svg()
        })
        const exported = engine.made.at(-1)?.option as { xAxis: { axisLabel: { interval: number } } }
        expect(exported.xAxis.axisLabel.interval).toBeGreaterThan(0)
    })
})
