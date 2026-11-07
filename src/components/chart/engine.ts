import {
    BarChart,
    BoxplotChart,
    CandlestickChart,
    FunnelChart,
    GaugeChart,
    HeatmapChart,
    LineChart,
    ParallelChart,
    PictorialBarChart,
    PieChart,
    RadarChart,
    SankeyChart,
    ScatterChart,
    SunburstChart,
    ThemeRiverChart,
    TreemapChart,
} from 'echarts/charts'
import {
    AriaComponent,
    CalendarComponent,
    DataZoomComponent,
    GridComponent,
    LegendComponent,
    MarkAreaComponent,
    MarkLineComponent,
    ParallelComponent,
    PolarComponent,
    RadarComponent,
    SingleAxisComponent,
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
    RadarChart,
    ScatterChart,
    BoxplotChart,
    CandlestickChart,
    FunnelChart,
    ParallelChart,
    PictorialBarChart,
    SankeyChart,
    SunburstChart,
    ThemeRiverChart,
    TreemapChart,
    AriaComponent,
    CalendarComponent,
    DataZoomComponent,
    GridComponent,
    LegendComponent,
    MarkAreaComponent,
    MarkLineComponent,
    ParallelComponent,
    PolarComponent,
    RadarComponent,
    SingleAxisComponent,
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
