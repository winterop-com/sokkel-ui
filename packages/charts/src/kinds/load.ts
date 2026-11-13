import type { ChartKind } from '.'
import type { ChartBuilder } from './spec'

type Load = () => Promise<Record<string, unknown>>

const categories: Load = () => import('./categories')
const hierarchy: Load = () => import('./hierarchy')
const steps: Load = () => import('./steps')

/** The file each kind's builder is in, and the builder's name there where it is not the kind's own. */
const FILES: Record<ChartKind, Load | [Load, string]> = {
    bar: categories,
    line: categories,
    area: categories,
    donut: categories,
    pie: categories,
    heatmap: categories,
    scatter: [() => import('./points'), 'scatter'],
    histogram: () => import('./histogram'),
    boxplot: () => import('./boxplot'),
    waterfall: () => import('./waterfall'),
    funnel: () => import('./funnel'),
    bullet: () => import('./bullet'),
    radar: () => import('./radar'),
    rose: () => import('./rose'),
    gauge: () => import('./gauge'),
    rings: () => import('./rings'),
    dual: () => import('./dual'),
    treemap: hierarchy,
    sunburst: hierarchy,
    sankey: () => import('./flows'),
    calendar: () => import('./calendar'),
    parallel: () => import('./parallel'),
    stream: () => import('./stream'),
    step: steps,
    range: steps,
    fan: () => import('./fan'),
    linked: () => import('./linked'),
}

/**
 * Fetches a kind's builder from its own file, the first time a chart of that kind is drawn, so a
 * page that draws bars loads the bar's builder and never a gauge's or a sankey's. Kinds in one file
 * (bar, line, area, donut, pie and heatmap; treemap and sunburst; step and range) arrive together.
 */
export async function loadKind(kind: ChartKind): Promise<ChartBuilder> {
    const file = FILES[kind]
    const [load, name] = Array.isArray(file) ? file : [file, kind]
    return (await load())[name] as ChartBuilder
}
