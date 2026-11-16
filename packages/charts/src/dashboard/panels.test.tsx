import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChartFrameProps, ChartFrameViewProps } from '../ChartFrame'
import { dataColumns } from '../data-columns'
import type { ChartKind, ChartSpec } from '../kinds'
import { BarPanel } from './BarPanel'
import { ChartPanel } from './ChartPanel'
import { ComboPanel } from './ComboPanel'
import { HeatmapPanel } from './HeatmapPanel'
import { RadarPanel } from './RadarPanel'
import { TimeSeriesPanel } from './TimeSeriesPanel'

const frames = vi.hoisted(() => [] as ChartFrameProps[])

vi.mock('../ChartFrame', () => ({
    ChartFrame: (props: ChartFrameProps) => {
        frames.push(props)
        return null
    },
}))

const X = ['00:00', '01:00']
const SERIES = [{ name: 'runs', values: [12, 14] }]

const PANELS: Record<string, (view: ChartFrameViewProps) => ReactElement> = {
    TimeSeriesPanel: (view) => <TimeSeriesPanel title="Runs" x={X} series={SERIES} {...view} />,
    BarPanel: (view) => <BarPanel title="Runs" x={X} series={SERIES} {...view} />,
    ComboPanel: (view) => <ComboPanel title="Runs" x={X} series={[{ ...SERIES[0], kind: 'bar' }]} {...view} />,
    HeatmapPanel: (view) => <HeatmapPanel title="Runs" x={X} y={['api']} cells={[[0, 0, 3]]} {...view} />,
    RadarPanel: (view) => <RadarPanel title="Runs" spokes={[{ name: 'fetch', max: 10 }]} series={SERIES} {...view} />,
    ChartPanel: (view) => <ChartPanel kind="bar" title="Runs" rows={[{ time: '00:00', runs: 12 }]} x="time" y="runs" {...view} />,
}

function frameOf(panel: ReactElement): ChartFrameProps {
    renderToStaticMarkup(panel)
    const frame = frames.at(-1)
    if (frame === undefined) throw new Error('no frame drawn')
    return frame
}

describe('dashboard panels', () => {
    beforeEach(() => {
        frames.length = 0
    })

    for (const [name, draw] of Object.entries(PANELS)) {
        it(`${name} leaves the frame's data view on by default`, () => {
            expect(frameOf(draw({})).data).toBeUndefined()
        })

        it(`${name} with data={false} leaves the Data button out`, () => {
            expect(frameOf(draw({ data: false })).data).toBe(false)
        })

        it(`${name} hands the frame its view and view handler`, () => {
            const onViewChange = vi.fn()
            const frame = frameOf(draw({ defaultView: 'data', view: 'chart', onViewChange }))
            expect(frame).toMatchObject({ defaultView: 'data', view: 'chart', onViewChange })
        })
    }
    const DRAWN = Object.entries(PANELS).filter(([name]) => name !== 'ChartPanel')

    for (const [name, draw] of DRAWN) {
        it(`${name} heads its data view's columns with words an app can translate`, () => {
            const heads = (words?: Record<string, string>) => {
                const frame = frameOf(draw({ words } as ChartFrameViewProps))
                const chart = frame.children({ hidden: new Set(), hovered: null, handle: { current: null }, windowed: false })
                const { kind, ...spec } = (chart as ReactElement<ChartSpec & { kind: ChartKind }>).props
                return dataColumns(kind, spec).map((column) => column.header)
            }
            expect(heads()).toContain('Category')
            expect(heads()).toContain('Value')
            for (const head of heads()) expect(['Category', 'Series', 'Value']).toContain(head)
            const translated = heads({ category: 'Kategori', series: 'Serie', value: 'Verdi' })
            for (const head of translated) expect(['Kategori', 'Serie', 'Verdi']).toContain(head)
        })
    }
})
