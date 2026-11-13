import { tooltipMarkup } from '../look'
import { ringFigures } from './legends'
import { written, colorOf, type ChartBuilder } from './spec'

/** How thick each ring is drawn, in pixels, and the card-colored line that parts it from the next. */
const RING = 12
const PARTING = 2

/**
 * Concentric rings, one per label of `series` or per `y` field, each filling from the top to its
 * figure's share of `min` (0) to `max` (100), with the figures written in the middle in their
 * rings' colors, the outermost first. The legend's hidden rings drop out. Give it room: each ring is
 * a fixed thickness, so a small chart leaves little room in the middle.
 * Reads `y`, `series`, `aggregate`, `seriesOrder`, `min`, `max`, `colors`, `format` and `unit`.
 */
export const rings: ChartBuilder = (spec, look, hidden) => {
    const figures = ringFigures(spec)
        .map((figure, index) => ({ ...figure, color: colorOf(spec, look, figure.name, index) }))
        .filter((figure) => hidden?.has(figure.name) !== true)
    const min = spec.min ?? 0
    const max = spec.max ?? 100
    const single = figures.length === 1
    const line = Math.round(look.size.body * 1.5)
    const ring = {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        min,
        max,
        center: ['50%', '50%'],
        radius: '92%',
        // The rings share this width, from the outermost in, as ECharts parts it among the figures.
        axisLine: { show: false, lineStyle: { width: RING * figures.length } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: { show: false },
    }
    return {
        tooltip: {
            trigger: 'item',
            formatter: (point: { name: string; value: number; color: string; dataIndex: number }) =>
                tooltipMarkup('', [
                    {
                        label: point.name,
                        value: written(spec, figures[point.dataIndex]?.value, figures[point.dataIndex]?.unit),
                        color: figures[point.dataIndex]?.color,
                    },
                ]),
        },
        series: [
            {
                ...ring,
                name: 'figures',
                z: 3,
                progress: { show: true, overlap: false, clip: true, itemStyle: { borderColor: look.card, borderWidth: PARTING } },
                data: figures.map((figure, index) => ({
                    name: figure.name,
                    value: figure.value ?? min,
                    itemStyle: { color: figure.color },
                    detail: {
                        offsetCenter: [0, (index - (figures.length - 1) / 2) * line],
                        fontSize: single ? look.size.stat : look.size.body,
                        fontWeight: 600,
                        fontFamily: look.font,
                        color: figure.color,
                        formatter: () => written(spec, figure.value, figure.unit),
                    },
                })),
            },
            {
                ...ring,
                name: 'tracks',
                silent: true,
                tooltip: { show: false },
                progress: { show: true, overlap: false, itemStyle: { color: look.grid, borderColor: look.card, borderWidth: PARTING } },
                detail: { show: false },
                data: figures.map((figure) => ({ name: figure.name, value: max })),
            },
        ],
    }
}
