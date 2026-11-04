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
import { init, use } from 'echarts/core'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'

use([
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
])

export { init }
