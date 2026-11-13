import { boxplot } from './boxplot'
import { bullet } from './bullet'
import { calendar } from './calendar'
import { area, bar, donut, heatmap, line, pie } from './categories'
import { dual } from './dual'
import { fan } from './fan'
import { sankey } from './flows'
import { funnel } from './funnel'
import { gauge } from './gauge'
import { sunburst, treemap } from './hierarchy'
import { histogram } from './histogram'
import { linked } from './linked'
import { parallel } from './parallel'
import { scatter } from './points'
import { radar } from './radar'
import { rings } from './rings'
import { rose } from './rose'
import { range, step } from './steps'
import { stream } from './stream'
import { waterfall } from './waterfall'
import type { ChartKindDef } from './spec'

/**
 * Every kind a `Chart` draws, by name. A kind lives in its own file under this folder and is added
 * here, its legend in `LEGENDS` in `legends.ts` and its file in `FILES` in `load.ts`; its
 * builder's doc comment says which of the spec's fields it reads.
 */
export const KINDS = {
    bar: { build: bar },
    line: { build: line },
    area: { build: area },
    donut: { build: donut },
    pie: { build: pie },
    heatmap: { build: heatmap },
    scatter: { build: scatter },
    histogram: { build: histogram },
    boxplot: { build: boxplot },
    waterfall: { build: waterfall },
    funnel: { build: funnel },
    bullet: { build: bullet },
    radar: { build: radar },
    rose: { build: rose },
    gauge: { build: gauge },
    rings: { build: rings },
    dual: { build: dual },
    treemap: { build: treemap },
    sunburst: { build: sunburst },
    sankey: { build: sankey },
    calendar: { build: calendar },
    parallel: { build: parallel },
    stream: { build: stream },
    step: { build: step },
    range: { build: range },
    fan: { build: fan },
    linked: { build: linked },
} satisfies Record<string, ChartKindDef>

export type ChartKind = keyof typeof KINDS

export type {
    ChartAxis,
    ChartBand,
    ChartBuilder,
    ChartKindDef,
    ChartLayer,
    ChartMark,
    ChartSpec,
    ChartStep,
    ChartWords,
    GaugeDial,
    LinkedPanel,
} from './spec'
