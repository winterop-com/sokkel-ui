# Charts

Every chart is drawn by ECharts from rows. `Chart` takes the rows, a `kind` that says how to draw
them, and the fields to read, as a table's columns are picked. The same rows are a bar, a line, a
ring or a grid by changing the kind and the fields alone, so a view of data is a choice, not code.
Neither an app nor a story builds an ECharts option: a chart the kinds cannot draw becomes a new
kind, or an option on one.

Charts are their own package, `@winterop-com/sokkel-ui-charts`, beside the core
`@winterop-com/sokkel-ui`. An app that draws charts installs it, which brings `echarts` with it, and
imports its `styles.css` after the core's, in the same stylesheet:

```css
@import '@winterop-com/sokkel-ui/styles.css';
@import '@winterop-com/sokkel-ui-charts/styles.css';
```

It holds `Chart`, `ChartFrame`, `ChartGrid`, `ChartLegend`, the kinds
(`@winterop-com/sokkel-ui-charts/kinds`) and the dashboard panels drawn by ECharts, under
`@winterop-com/sokkel-ui-charts/dashboard/`. `EChart`, the raw ECharts wrapper they draw through, is
private: an app draws with `Chart` and a kind, and a chart no kind draws becomes a new kind. The dashboard's frame and the panels with no chart
(`DashboardGrid`, `DashboardRow`, `StatPanel`, `ScoreTable`, `ThresholdLegend`, `TimeRange`,
`VariablesBar` and the thresholds) are in the core, under `@winterop-com/sokkel-ui/dashboard/`, so a
dashboard of tiles needs no ECharts.

The base set (lines, bars, heatmaps, gauges, pies, radars and scatters, with the grid, tooltip,
legend, zoom, color scale and marks) loads with the first chart. Every other chart type and component loads the first
time an option draws with it, so an app that draws only bars never downloads a sankey. The kinds'
builders load with the first chart too, beside the engine, so a page carries none of the charts'
code at start but `Chart`'s own; `chartLegend` reads every kind at once, so a page that imports it
carries the kinds with the page.

## Drawing a chart

```tsx
import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'

export function RunsByJob({ runs }: { runs: readonly Run[] }) {
    return <Chart kind="bar" label="Runs per job by state" rows={runs} x="job" series="state" stack="stacked" />
}
```

`label` is what the chart shows, for a screen reader. Keep `rows` stable between renders, at module
level or memoized: the chart is built again when they change. A chart fills its box, so give the
box a size.

**In a frame.** `ChartFrame` puts a title, a subtitle, an Export menu (SVG and PNG), an expand
button and a legend around a chart. Expanding opens the chart and its legend near full screen
through core's `WindowedPane`, as every expandable pane opens. `chartLegend`
(`@winterop-com/sokkel-ui-charts/chart-legend`) gives the frame the legend for the same kind and
spec, and the frame's state goes to the chart, so the legend hides and highlights what it lists:

```tsx
const SPEC: ChartSpec = { rows: RUNS, x: 'day', y: 'runs', series: 'project' }
const LEGEND = chartLegend('line', SPEC)

export function RunsPerDay() {
    return (
        <ChartFrame title="Runs" subtitle="per day" legend={LEGEND}>
            {(state) => <Chart kind="line" label="Runs per day by project" {...SPEC} {...state} />}
        </ChartFrame>
    )
}
```

**Small multiples.** `ChartGrid` draws the same kind and fields once per label of `facet`, each
from that label's rows, on one shared scale and in one set of colors, so one frame legend (with
`fit` on the frame) serves them all.

**In a dashboard.** `ChartPanel` is a dashboard panel of a `Chart`: the same `kind` and fields, with
the panel's title, span in a `DashboardGrid`, legend and loading and empty states. Beside it, the
dashboard panels draw what dashboards draw most, each with its own props:

| Panel                                               | What it draws                                                                    | Story                                      |
| --------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| `ChartPanel`                                        | A `Chart` of any kind, drawn from rows                                           | Patterns/Dashboard panels, Charts/Gauges   |
| `StatPanel`                                         | One reading as a tile: the value large, a trend behind it, a change and a target | Charts/Tiles                               |
| `GaugePanel`                                        | One reading on a dial, colored by its thresholds                                 | Patterns/Dashboard panels                  |
| `BarGauge`                                          | Readings as bars against one scale, each colored by its thresholds               | Patterns/Dashboard panels                  |
| `TimeSeriesPanel`                                   | Values over time as lines or areas, with threshold lines and a legend table      | Patterns/Dashboard panels                  |
| `BarPanel`                                          | Bars per category, side by side, stacked or as shares                            | Patterns/Dashboard panels                  |
| `ComboPanel`                                        | Bars and lines over the same categories, a second axis on the right              | Charts/Combined                            |
| `HeatmapPanel`                                      | A value for each pair of categories, shaded on a scale                           | Patterns/Dashboard panels                  |
| `RadarPanel`                                        | A few items on several measures, one polygon each                                | Charts/Radar                               |
| `ScoreTable`                                        | A scorecard: rows against periods or measures, each value colored by its band    | Charts/Scorecard                           |
| `ThresholdLegend`                                   | The key to a threshold scale, as a list or a bar                                 | Charts/Scorecard                           |
| `DashboardGrid`, `DashboardRow`                     | The grid panels sit in, and a collapsible group of them under a heading          | Patterns/Dashboard panels, Apps/Dashboards |
| `VariablesBar`, `TimeRangePicker`, `RefreshControl` | The bar of variables, the range and the refresh across a dashboard's top         | Patterns/Dashboard panels, Apps/Dashboards |

Every panel takes a `menu` of dropdown items behind a more button in its head, and the panels that
open in a window take `expanded` with `onExpandedChange`, so the app's own menu can open one as
its expand button does (Patterns/Dashboard panels, Panel menus). `RefreshControl` offers the app's
own `intervals` and, with `onPausedChange`, a pause that keeps the interval for when it resumes.

## The spec

What a chart reads. Each kind reads some of these fields; its row in the tables below says which.

| Field         | What it says                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `rows`        | The rows the chart reads, one record of named fields each.                                                                   |
| `x`           | The field along the category axis, or the first number for a kind that plots two.                                            |
| `y`           | The field, or fields, whose numbers are drawn.                                                                               |
| `series`      | The field that splits the rows into series.                                                                                  |
| `value`       | A third field some kinds read: a point's size, a bullet's target.                                                            |
| `aggregate`   | How the values that fall in one place are combined (`sum`, `count`, `avg`, `min`, `max`, `median`, `p90`), or one per `y`.   |
| `stack`       | Bars and areas stacked (`stacked`), or as shares of each category's total (`percent`).                                       |
| `horizontal`  | Bars running sideways, categories down the side.                                                                             |
| `order`       | Categories in this order first.                                                                                              |
| `seriesOrder` | Series in this order first.                                                                                                  |
| `colors`      | A color token for a series or a category by its name, such as `status-failed`.                                               |
| `format`      | How a figure is written in tooltips and labels.                                                                              |
| `unit`        | A unit written after each figure, such as `s` or `%`, or one per `y` field.                                                  |
| `fieldNames`  | What a field is called where the chart names it.                                                                             |
| `smooth`      | A line drawn smooth rather than straight between points.                                                                     |
| `labelEvery`  | Labels every nth category on the category axis.                                                                              |
| `gap`         | How far apart bars stand: `tight` draws a histogram's tall bars, nearly touching.                                            |
| `fill`        | How an area is filled: `solid`, or `gradient`, fading from its line toward the axis.                                         |
| `showScale`   | A heatmap's color scale shown beside the grid.                                                                               |
| `total`       | A ring's total written in its middle with this word under it; under a gauge's figure, the word alone.                        |
| `fit`         | A scatter's axes fitted to its points rather than starting at zero.                                                          |
| `bins`        | How many bins a histogram splits its numbers into, or `{ width }` for how wide each is.                                      |
| `steps`       | Steps along the value axis, each a `value` where it starts, a `color` token and a `label`: thresholds, bands.                |
| `min`, `max`  | Where the value axis starts and ends, for a kind that fixes it, such as a gauge's dial.                                      |
| `words`       | The words a chart writes itself (Count, Total, Rise, Fall, Target and others), for translation.                              |
| `path`        | The fields from the outermost in, for a kind that nests or flows through stages.                                             |
| `dial`        | A gauge's shape: `arc` (the default), `ring`, `half`, `bands` or `needle`.                                                   |
| `panels`      | How each panel of a linked chart is drawn, by its field's or series' name: `mark` (`bar`, `line`, `area`), `hang`, `weight`. |
| `scales`      | Whether a linked chart's panels share one value scale: `shared` for panels split by `series`, `own` for separate fields.     |
| `zoom`        | The part of a linked chart's axis in view at first: `[from, to]` in percent, or the first and last category.                 |

## The kinds

The registry is `packages/charts/src/kinds/index.ts`; each kind is one builder in its own file
there, and its doc comment says what it draws and which fields it reads. Stories are named as they
appear in Storybook.

### Categories and time

| Kind       | For                                                                                   | Reads                                                                                                                           | Story                     |
| ---------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `bar`      | Bars per category, one per series side by side, stacked, or as shares                 | `x`, `y`, `series`, `aggregate`, `stack`, `horizontal`, `gap`, `order`, `seriesOrder`, `colors`, `format`, `unit`, `labelEvery` | Charts/Bars, Charts/Chart |
| `line`     | A line per series across the categories                                               | `x`, `y`, `series`, `aggregate`, `stack`, `smooth`, `order`, `seriesOrder`, `colors`, `format`, `unit`, `labelEvery`            | Charts/Line               |
| `area`     | Lines with the area under them filled, alone or stacked                               | what `line` reads, and `fill`                                                                                                   | Charts/Area               |
| `step`     | A line that holds each figure until the next category: a pool's size, a limit         | what `line` reads                                                                                                               | Charts/Trends             |
| `range`    | A band with a line through it: percentiles around the median, or low, middle and high | `x`, `y` (one or three), `series`, `aggregate`, `colors`, `format`, `unit`                                                      | Charts/Trends             |
| `stream`   | Series as bands flowing along time, stacked around a middle line                      | `x`, `y`, `series`, `aggregate`, `order`, `seriesOrder`, `colors`, `format`, `unit`                                             | Charts/Trends             |
| `heatmap`  | A grid of cells, `x` along and `series` down, each shaded by its figure               | `x`, `y`, `series`, `aggregate`, `showScale`, `colors.value`, `format`, `unit`, `labelEvery`                                    | Charts/Heatmap            |
| `calendar` | Days on a calendar, each shaded by its figure: a month as a wall calendar, or a year  | `x` (dates), `y`, `aggregate`, `horizontal`, `colors.value`, `format`, `unit`                                                   | Charts/Calendar           |
| `dual`     | Two measures over the same categories, bars on the left axis and a line on the right  | `x`, `y` (two), `aggregate`, `order`, `colors`, `format`, `unit`, `smooth`                                                      | Charts/Dual               |

### Distributions

| Kind        | For                                                                             | Reads                                                                     | Story               |
| ----------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------- |
| `histogram` | The spread of one number, in bins on round edges, overlaid or stacked by series | `x`, `series`, `seriesOrder`, `bins`, `stack`, `colors`, `format`, `unit` | Charts/Distribution |
| `boxplot`   | The spread of `y` per category: quartiles, whiskers and outliers                | `x`, `y`, `order`, `horizontal`, `colors`, `format`, `unit`, `words`      | Charts/Distribution |

### Flows and targets

| Kind        | For                                                                                     | Reads                                                                                                             | Story          |
| ----------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------- |
| `waterfall` | A running total: each category rises or falls from where the last ended, then the total | `x`, `y`, `aggregate`, `order`, `colors`, `format`, `unit`, `words`                                               | Charts/Flows   |
| `funnel`    | Stages narrowing by their figure, each with its share of the first                      | `x`, `y`, `aggregate`, `order`, `colors`, `format`, `unit`, `words`                                               | Charts/Flows   |
| `sankey`    | Rows flowing through stages, one column per field of `path`                             | `path`, `y`, `order`, `colors`, `format`, `unit`                                                                  | Charts/Flows   |
| `bullet`    | A figure against its target over qualitative bands, one bar per category                | `x`, `y`, `value`, `aggregate`, `steps`, `min`, `max`, `order`, `horizontal`, `colors`, `format`, `unit`, `words` | Charts/Targets |

### Shares and hierarchies

| Kind       | For                                                                          | Reads                                                                               | Story            |
| ---------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------- |
| `donut`    | A ring of slices, each its share of the whole, the total in its middle       | `x`, `y`, `aggregate`, `order`, `colors`, `format`, `unit`, `total`                 | Charts/Donut     |
| `rose`     | Categories around a circle, each wedge as long as its figure: hours, regions | `x`, `y`, `series`, `aggregate`, `order`, `seriesOrder`, `colors`, `format`, `unit` | Charts/Polar     |
| `treemap`  | Nested boxes, each sized by its share, grouped by the fields of `path`       | `path`, `y`, `order`, `colors`, `format`, `unit`                                    | Charts/Hierarchy |
| `sunburst` | Rings of the same nesting from the middle out; a click opens a slice         | `path`, `y`, `order`, `colors`, `format`, `unit`                                    | Charts/Hierarchy |

### Relations

| Kind       | For                                                                        | Reads                                                                                       | Story           |
| ---------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- |
| `scatter`  | One point per row, `x` against `y`, colored by series and sized by `value` | `x`, `y`, `series`, `seriesOrder`, `value`, `fieldNames`, `fit`, `colors`, `format`, `unit` | Charts/Scatter  |
| `parallel` | One axis per `y` field and each row a line through them                    | `y`, `series`, `seriesOrder`, `order`, `smooth`, `colors`, `format`, `unit`                 | Charts/Parallel |
| `radar`    | Categories as spokes and one polygon per series, on one scale              | `x`, `y`, `series`, `aggregate`, `order`, `seriesOrder`, `max`, `colors`, `format`, `unit`  | Charts/Polar    |

### Gauges

| Kind    | For                                                                                     | Reads                                                                                | Story         |
| ------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------- |
| `gauge` | One figure on a dial, in the color of the step it reaches, in the shape `dial` picks    | `y`, `aggregate`, `steps`, `min`, `max`, `dial`, `total`, `colors`, `format`, `unit` | Charts/Gauges |
| `rings` | Concentric rings, one per label of `series` or per `y` field, each filling to its share | `y`, `series`, `aggregate`, `seriesOrder`, `min`, `max`, `colors`, `format`, `unit`  | Charts/Gauges |

The dials: `arc`, the default, an open dial filled to the figure with the steps as a thin band
outside it; `ring`, the same as a progress ring over a full circle; `half`, a half circle low
enough for a stat tile, for a box about twice as wide as it is tall; `bands`, a graded arc in the
steps' colors with a triangle pointing at the figure; and `needle`, a speedometer with ticks, round
figures and a needle. `GaugePanel` draws its arc with the same dial, so a dashboard's gauges match
the charts'; on a phone gauges stand two to a row, their figures at `--chart-stat-size-small`.

### Linked

| Kind     | For                                                                                        | Reads                                                                                                                                                         | Story         |
| -------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `linked` | Panels on one shared axis, one per `y` field or per series, pointed at and zoomed together | `x`, `y`, `series`, `aggregate`, `order`, `seriesOrder`, `scales`, `panels`, `zoom`, `colors`, `fill`, `smooth`, `fieldNames`, `format`, `unit`, `labelEvery` | Charts/Linked |

Each panel has a value axis of its own. Panels split by `series` share one scale, fitted to the days
in view, so a panel's height compares with the others'; panels of separate `y` fields keep their own, as rain in
millimeters beside flow in cubic meters; `scales` (`shared`, `own`) picks otherwise. Pointing at a category points at it in every panel, and
one zoom moves them all: the slider under the last panel, a drag across a panel, or a pinch (Ctrl
and the wheel with a mouse). `panels` draws each, by its field's or series' name, as bars, a line
or an area (`mark`), hanging from its top on an inverted axis (`hang`), as rain hangs over the
flow it feeds, and sets its share of the height (`weight`). `zoom` opens it on a window. Hiding a
series in the legend drops its panel.

## Adding a kind

1. **A builder.** A file under `packages/charts/src/kinds/`, exporting a `ChartBuilder`: a function
   of the spec, the theme's look and the legend's hidden names that returns an ECharts option. Every
   color comes from the look (`look.token`, `colorOf`, `look.mix`) and every size from `look.size`,
   so a theme reaches it; every corner from `look.corner`. Its doc comment says what it draws and
   which fields it reads. Shaping rows into figures goes in a function of its own, in the builder's
   file or in `data.ts`, `stats.ts` or `shapes.ts`, where a test can reach it.
2. **The registry.** Add the builder to `KINDS` in `kinds/index.ts`, with a `legend` when its legend
   is not one entry per series (slices, bands, branches), or `() => []` when it has none. A field
   the spec lacks joins `ChartSpec` in `kinds/spec.ts`, documented, and this file's table. The
   builder's file is private, reached through the registry: name it in `PRIVATE` in
   `scripts/components-index.ts` beside the other kinds.
3. **The engine.** A chart type or component outside the base set joins the `SERIES` or
   `COMPONENTS` map in `engine.ts`, so it loads on first use. Never add it to the base `PARTS`.
4. **Tests.** The kind's spec in `kinds/kinds.test.ts`, so it is drawn and its legend listed, and a
   test for each piece of shaping.
5. **Stories.** In `src/stories/charts/`, drawn with `Framed` from `Ground.tsx` from the Tidevann
   fixtures in `src/stories/fixtures/`, from the simplest spec to the fullest. Name a story, or its
   section, for the kind ("Treemap", "Box plot"), so a search of the catalog for the kind finds it;
   `src/rules.test.ts` checks every kind. Add the kind to the tables above.
