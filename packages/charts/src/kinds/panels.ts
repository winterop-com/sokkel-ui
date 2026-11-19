/** Panels stacked on one shared category axis and zoomed together, apart from any builder, so the kinds that stack panels share them. */

import { extent } from '../data'
import { textWidth, withAlpha, type ChartLook } from '../look'
import { niceExtent } from '../scales'
import { categoryLabels, type ChartSpec } from './spec'

/** The height the fixed parts of stacked panels are laid out against, in pixels; a taller chart widens its gaps in proportion. */
const NOMINAL = 320
/** Above the first panel, for its name. */
export const PANEL_TOP = 22
/** Between two panels, for the lower one's name. */
const GAP = 28
/** Under the last panel, for the shared axis' labels and the zoom slider. */
export const PANEL_BOTTOM = 58
/** Under the last panel, for the shared axis' labels where no zoom slider is drawn. */
export const LABELS_BOTTOM = 26
/** The zoom slider's height and its distance from the bottom. */
const SLIDER = { height: 18, bottom: 6 }
/** The room at the panels' end. */
export const PANEL_RIGHT = 10

const percent = (value: number) => `${(Math.round(value * 100) / 100).toString()}%`

/**
 * Where each panel's grid sits, by the panels' weights: the first `top` pixels from the top, the
 * last `bottom` pixels from the bottom, and the boundaries between them at shares of the height,
 * so every panel keeps its share as the chart grows.
 */
export function panelLayout(
    weights: readonly number[],
    top = PANEL_TOP,
    bottom = PANEL_BOTTOM,
): { top: number | string; bottom: number | string }[] {
    const share = (pixels: number) => (pixels / NOMINAL) * 100
    const gaps = share(GAP) * Math.max(0, weights.length - 1)
    const room = Math.max(weights.length * 4, 100 - share(top) - share(bottom) - gaps)
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1
    let start = share(top)
    return weights.map((weight, index) => {
        const end = start + (room * weight) / total
        const box = {
            top: index === 0 ? top : percent(start),
            bottom: index === weights.length - 1 ? bottom : percent(100 - end),
        }
        start = end + share(GAP)
        return box
    })
}

/**
 * The widest tick label a value axis over these figures draws, in pixels, with three or so ticks:
 * from zero, or fitted to the figures where `fit` is set.
 */
export function widestTick(values: readonly (number | null)[], write: (value: number) => string, size: number, fit = false): number {
    const numbers = values.filter((value): value is number => value !== null)
    const [low, high] = extent(numbers) ?? [0, 0]
    const { min, max, interval } = niceExtent(fit ? [low, high] : [Math.min(0, low), Math.max(0, high)], 3)
    let widest = 0
    // One step past the end too, as the axis may round up further when the zoom shows a part.
    for (let tick = min; tick <= max + interval / 2; tick += interval) widest = Math.max(widest, textWidth(write(tick), size))
    return widest
}

/** The shared axis' labels, under the last panel: the end labels kept inside the chart, every `labelEvery`th where the spec asks. */
export function sharedLabels(spec: ChartSpec) {
    return {
        show: true,
        hideOverlap: true,
        // The end labels stay inside the chart rather than half over its edge.
        alignMinLabel: 'left',
        alignMaxLabel: 'right',
        ...(spec.labelEvery === undefined ? {} : { interval: spec.labelEvery - 1 }),
        ...categoryLabels(spec),
    }
}

/** The part of the axis `zoom` opens on: in percent, or by its first and last category. */
export function zoomWindow(spec: ChartSpec) {
    if (spec.zoom === undefined) return {}
    return typeof spec.zoom[0] === 'number'
        ? { start: spec.zoom[0], end: spec.zoom[1] }
        : { startValue: spec.zoom[0], endValue: spec.zoom[1] }
}

/**
 * One zoom over every panel: dragging across a panel, a pinch or Ctrl and the wheel, and a slider
 * under the last panel, shaded by the first series of its first axis in `shade`; both open on the
 * window `zoom` sets.
 */
export function panelZoom(
    spec: ChartSpec,
    look: ChartLook,
    { axes, sliderAxes = axes, left, shade }: { axes: number[]; sliderAxes?: number[]; left: number; shade: string },
) {
    const view = zoomWindow(spec)
    return [
        {
            type: 'inside',
            xAxisIndex: axes,
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
            right: PANEL_RIGHT,
            bottom: SLIDER.bottom,
            height: SLIDER.height,
            showDetail: false,
            brushSelect: false,
            borderColor: look.border,
            borderRadius: look.corner,
            backgroundColor: 'transparent',
            fillerColor: withAlpha(shade, 0.14),
            dataBackground: { lineStyle: { color: look.faint, width: 1 }, areaStyle: { color: look.grid, opacity: 0.5 } },
            selectedDataBackground: { lineStyle: { color: shade, width: 1 }, areaStyle: { color: shade, opacity: 0.25 } },
            handleStyle: { color: look.card, borderColor: look.muted, borderWidth: 1 },
            moveHandleStyle: { color: look.grid, opacity: 1 },
            emphasis: { handleStyle: { borderColor: look.foreground }, moveHandleStyle: { color: look.muted } },
            textStyle: { color: look.muted, fontFamily: look.font, fontSize: look.size.small },
            ...view,
        },
    ]
}
