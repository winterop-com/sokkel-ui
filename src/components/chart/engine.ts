import { BarChart, GaugeChart, HeatmapChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import {
    AriaComponent,
    DataZoomComponent,
    GridComponent,
    LegendComponent,
    MarkAreaComponent,
    MarkLineComponent,
    TitleComponent,
    TooltipComponent,
    VisualMapComponent,
} from 'echarts/components'
import { init as start, use } from 'echarts/core'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'

/** The chart types, components and renderers this library draws with, registered on first use. */
const PARTS = [
    LineChart,
    BarChart,
    HeatmapChart,
    GaugeChart,
    PieChart,
    ScatterChart,
    AriaComponent,
    DataZoomComponent,
    GridComponent,
    LegendComponent,
    MarkAreaComponent,
    MarkLineComponent,
    TitleComponent,
    TooltipComponent,
    VisualMapComponent,
    CanvasRenderer,
    SVGRenderer,
]

let registered = false

/**
 * ECharts' `init`, with the parts this library draws with registered first. Registering inside the
 * call keeps it from being dropped by a bundler that treats this module as free of side effects.
 */
export function init(...args: Parameters<typeof start>): ReturnType<typeof start> {
    if (!registered) {
        use(PARTS)
        registered = true
    }
    return start(...args)
}
