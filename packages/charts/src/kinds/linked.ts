import { textWidth, tooltipMarkup, withAlpha, type ChartLook } from '../look'
import { niceExtent } from '../scales'
import { farCorners, fading, shaped, tickWriter, written } from './categories'
import { colorOf, unitAt, type ChartBuilder, type LinkedPanel } from './spec'

/** The height the fixed parts of a linked chart are laid out against, in pixels; a taller chart widens its gaps in proportion. */
const NOMINAL = 320
/** Above the first panel, for its name. */
const TOP = 22
/** Between two panels, for the lower one's name. */
const GAP = 28
/** Under the last panel, for the shared axis' labels and the zoom slider. */
const BOTTOM = 58
/** The zoom slider's height and its distance from the bottom. */
const SLIDER = { height: 18, bottom: 6 }
const RIGHT = 10
const NO_STYLE: LinkedPanel = {}

const percent = (value: number) => `${(Math.round(value * 100) / 100).toString()}%`

/**
 * Where each panel's grid sits, by the panels' weights: the first a fixed distance from the top, the
 * last a fixed distance from the bottom, and the boundaries between them at shares of the height,
 * so every panel keeps its share as the chart grows.
 */
export function linkedLayout(weights: readonly number[]): { top: number | string; bottom: number | string }[] {
    const share = (pixels: number) => (pixels / NOMINAL) * 100
    const gaps = share(GAP) * Math.max(0, weights.length - 1)
    const room = Math.max(weights.length * 4, 100 - share(TOP) - share(BOTTOM) - gaps)
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1
    let start = share(TOP)
    return weights.map((weight, index) => {
        const end = start + (room * weight) / total
        const box = {
            top: index === 0 ? TOP : percent(start),
            bottom: index === weights.length - 1 ? BOTTOM : percent(100 - end),
        }
        start = end + share(GAP)
        return box
    })
}

/** The widest tick label a value axis over these figures draws, in pixels, with three or so ticks from zero. */
function widestTick(values: readonly (number | null)[], write: (value: number) => string, size: number): number {
    const numbers = values.filter((value): value is number => value !== null)
    const { min, max, interval } = niceExtent([Math.min(0, ...numbers), Math.max(0, ...numbers)], 3)
    let widest = 0
    // One step past the end too, as the axis may round up further when the zoom shows a part.
    for (let tick = min; tick <= max + interval / 2; tick += interval) widest = Math.max(widest, textWidth(write(tick), size))
    return widest
}

/**
 * Panels stacked on one shared `x` axis of categories or days, one panel per `y` field, or per
 * label of `series` when it names a field, each with a value axis of its own, on one scale where
 * `scales` says so, as it does by default for panels split by `series`, fitted to the part in view. Moving over one
 * panel points at the same category in all of them, and one zoom moves them together: a slider
 * under the last panel, dragging across a panel, and a pinch or Ctrl and the wheel. `panels` says
 * how each is drawn: as bars, a line or an area, standing or hanging from its top, and its share of
 * the height. `zoom` sets the part in view at first. The legend's hidden series drop their panels.
 * Reads `x`, `y`, `series`, `aggregate`, `order`, `seriesOrder`, `colors`, `format`, `unit`,
 * `fieldNames`, `smooth`, `fill`, `labelEvery`, `scales`, `panels` and `zoom`.
 */
export const linked: ChartBuilder = (spec, look, hidden) => {
    const { categories, series } = shaped({ ...spec, stack: undefined })
    const panels = series
        .map((entry, index) => ({
            ...entry,
            index,
            unit: spec.series === undefined ? index : 0,
            style: spec.panels?.[entry.name] ?? NO_STYLE,
        }))
        .filter((panel) => hidden?.has(panel.name) !== true)
    if (panels.length === 0) return { series: [] }

    const last = panels.length - 1
    const layout = linkedLayout(panels.map((panel) => Math.max(0, panel.style.weight ?? 1)))
    const ticks = (unit: number) => tickWriter(spec.format, unitAt(spec, unit))
    // One measure split into panels shares a scale, so their heights compare; separate fields keep their own.
    const shared = (spec.scales ?? (spec.series === undefined ? 'own' : 'shared')) === 'shared'
    const figures = panels.flatMap((panel) => panel.values).filter((value): value is number => value !== null)
    const left = 12 + Math.max(...panels.map((panel) => widestTick(shared ? figures : panel.values, ticks(panel.unit), look.size.label)))
    // Bars need room at the axis' ends, and every panel takes the same room so the categories line up.
    const boundaryGap = panels.some((panel) => panel.style.mark === 'bar')
    const labels = {
        show: true,
        hideOverlap: true,
        // The end labels stay inside the chart rather than half over its edge.
        alignMinLabel: 'left',
        alignMaxLabel: 'right',
        ...(spec.labelEvery === undefined ? {} : { interval: spec.labelEvery - 1 }),
    }
    const lastHangs = panels[last].style.hang === true
    const xAxis = [
        ...panels.map((panel, index) => ({
            type: 'category',
            gridIndex: index,
            data: categories,
            boundaryGap,
            position: panel.style.hang === true ? 'top' : 'bottom',
            axisLabel: index === last && !lastHangs ? labels : { show: false },
        })),
        // A hanging last panel keeps its axis line at its top, so the shared labels get an axis of their own under it.
        ...(lastHangs
            ? [
                  {
                      type: 'category',
                      gridIndex: last,
                      data: categories,
                      boundaryGap,
                      position: 'bottom',
                      axisLine: { show: false, onZero: false },
                      axisLabel: labels,
                  },
              ]
            : []),
    ]
    const linkedAxes = xAxis.map((_, index) => index)
    // The slider shades the first series of its first axis, so a standing line leads when there is one.
    const shade = panels.findIndex((panel) => panel.style.mark !== 'bar' && panel.style.hang !== true)
    const sliderAxes = shade <= 0 ? linkedAxes : [shade, ...linkedAxes.filter((index) => index !== shade)]
    const shaded = panels[Math.max(0, shade)]
    const shadeColor = colorOf(spec, look, shaded.name, shaded.index)
    const unitOf = new Map(panels.map((panel) => [panel.name, panel.unit]))
    const view =
        spec.zoom === undefined
            ? {}
            : typeof spec.zoom[0] === 'number'
              ? { start: spec.zoom[0], end: spec.zoom[1] }
              : { startValue: spec.zoom[0], endValue: spec.zoom[1] }

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'line' },
            formatter: (points: { axisValueLabel: string; seriesName: string; value: number | null; color: string }[]) =>
                tooltipMarkup(
                    points[0]?.axisValueLabel ?? '',
                    points
                        .filter((point) => point.seriesName !== SHARED_SCALE)
                        .map((point) => ({
                            label: spec.fieldNames?.[point.seriesName] ?? point.seriesName,
                            value: written(spec, point.value, unitOf.get(point.seriesName) ?? 0),
                            color: point.color,
                        })),
                ),
        },
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        dataZoom: [
            {
                type: 'inside',
                xAxisIndex: linkedAxes,
                zoomOnMouseWheel: 'ctrl',
                moveOnMouseWheel: false,
                moveOnMouseMove: true,
                // A touch that drags across the chart still scrolls the page.
                preventDefaultMouseMove: false,
                ...view,
            },
            {
                type: 'slider',
                xAxisIndex: sliderAxes,
                left,
                right: RIGHT,
                bottom: SLIDER.bottom,
                height: SLIDER.height,
                showDetail: false,
                brushSelect: false,
                borderColor: look.border,
                borderRadius: look.corner,
                backgroundColor: 'transparent',
                fillerColor: withAlpha(shadeColor, 0.14),
                dataBackground: { lineStyle: { color: look.faint, width: 1 }, areaStyle: { color: look.grid, opacity: 0.5 } },
                selectedDataBackground: { lineStyle: { color: shadeColor, width: 1 }, areaStyle: { color: shadeColor, opacity: 0.25 } },
                handleStyle: { color: look.card, borderColor: look.muted, borderWidth: 1 },
                moveHandleStyle: { color: look.grid, opacity: 1 },
                emphasis: { handleStyle: { borderColor: look.foreground }, moveHandleStyle: { color: look.muted } },
                textStyle: { color: look.muted, fontFamily: look.font, fontSize: look.size.small },
                ...view,
            },
        ],
        grid: panels.map((_, index) => ({ left, right: RIGHT, ...layout[index], outerBoundsMode: 'none' })),
        xAxis,
        yAxis: panels.map((panel, index) => {
            const hang = panel.style.hang === true
            return {
                type: 'value',
                gridIndex: index,
                inverse: hang,
                splitNumber: 3,
                name: spec.fieldNames?.[panel.name] ?? panel.name,
                // The panel's name sits above it, at zero's end of a hanging panel's axis.
                nameLocation: hang ? 'start' : 'end',
                nameGap: 8,
                nameTextStyle: { align: 'left', padding: 0 },
                axisLabel: { formatter: ticks(panel.unit), hideOverlap: true },
            }
        }),
        series: [
            ...panels.map((panel, index) =>
                seriesOf(panel, index, spec.smooth === true, spec.fill, look, colorOf(spec, look, panel.name, panel.index)),
            ),
            ...(shared ? sharedScale(panels, categories.length) : []),
        ],
    }
}

/** The name of the unseen series that hold the panels to one scale. */
export const SHARED_SCALE = '\u0000shared scale'

/**
 * Unseen lines, one in each panel, through every category's highest and lowest figure across all
 * panels. Each panel's axis fits the figures in view, these included, so the panels come out on one
 * scale that still fits again as the zoom moves.
 */
function sharedScale(panels: readonly { values: readonly (number | null)[] }[], count: number) {
    const across = (pick: (values: number[]) => number) =>
        Array.from({ length: count }, (_, at) => {
            const values = panels.map((panel) => panel.values[at]).filter((value): value is number => value !== null && value !== undefined)
            return values.length === 0 ? null : pick(values)
        })
    const highest = across((values) => Math.max(...values))
    const lowest = across((values) => Math.min(...values))
    const unseen = {
        type: 'line',
        name: SHARED_SCALE,
        silent: true,
        symbol: 'none',
        lineStyle: { opacity: 0 },
        tooltip: { show: false },
        emphasis: { disabled: true },
        animation: false,
    }
    return panels.flatMap((_, index) => [
        { ...unseen, xAxisIndex: index, yAxisIndex: index, data: highest },
        { ...unseen, xAxisIndex: index, yAxisIndex: index, data: lowest },
    ])
}

/** One panel's series, drawn by its mark. */
function seriesOf(
    panel: { name: string; values: (number | null)[]; style: LinkedPanel },
    index: number,
    smooth: boolean,
    fill: 'solid' | 'gradient' | 'none' | undefined,
    look: ChartLook,
    color: string,
) {
    const hang = panel.style.hang === true
    const common = { name: panel.name, xAxisIndex: index, yAxisIndex: index }
    if (panel.style.mark === 'bar')
        return {
            ...common,
            type: 'bar',
            barCategoryGap: '20%',
            itemStyle: { color },
            // Each bar is rounded at its far end from the axis, which is the bottom of a hanging one.
            data: panel.values.map((value) =>
                value === null || value === 0
                    ? value
                    : { value, itemStyle: { borderRadius: farCorners(look.corner, false, hang ? -value : value) } },
            ),
        }
    return {
        ...common,
        type: 'line',
        data: panel.values,
        smooth,
        connectNulls: false,
        itemStyle: { color },
        lineStyle: { color },
        areaStyle:
            panel.style.mark !== 'area' || fill === 'none'
                ? undefined
                : fill === 'gradient'
                  ? { opacity: 1, color: fading(look, color, false, hang) }
                  : { color, opacity: 0.15 },
    }
}
