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

ECharts' core loads with the first chart, with the canvas renderer, the legend and the tooltip.
Every chart type, and every other component and mark (the grid, zoom, color scale, the lines a
series marks), loads the first time an option draws with it, so an app that draws only bars loads
the bar series and the grid, and never a line, a gauge or a sankey. The SVG renderer loads only for
an export to SVG, and the title component only for an export with a title. A kind's builder loads
with the first chart of that kind, beside the engine, so a page carries none of the charts' code at
start but `Chart`'s own, and a page that draws lines never loads a gauge's or a sankey's builder.
`chartLegend` reads each kind's legend and the shaping it shares with the builder
(`kinds/legends.ts`), never a builder, so a page that imports it carries the legends alone.

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

**The data view.** A `Chart` or `ChartGrid` in a frame tells the frame what it draws, and the
frame's Data button shows those rows as a table (`DataTable`, unframed and with no bar) in the
chart's place, until Chart brings it back. The columns are the fields the spec reads, from the
outermost in (a grid's facet, `path`, `x`, `series`), then the figures (`y`, `value`, `history`,
`points`), headed by their `fieldNames` and written with the spec's `format` and `unit`. A fan's
`bands` stand around its `y` in quantile order: the bands' lows from the outermost in, the median,
then their highs from the innermost out (`q10`, `q25`, `median`, `q75`, `q90`). The spec's
`dataFields` add fields the chart does not draw but a reader needs beside it, such as the place the
frame's title names or how far ahead a forecast reaches: after the drawn ones, headed by their
`fieldNames` and written as they are. They live on the spec, beside the rows and `fieldNames` they
read, so a `Chart`, a `ChartGrid` and a `ChartPanel` carry them to the frame alike. The first
column stays pinned while the rest scroll sideways in a narrow frame. Every column is as wide as its
longest cell or head, so a period such as `2020-01` reads whole and more figures fit; a column of
labels stops growing at 14rem. The table loads the first time the view opens, so no page carries it at start.
`defaultView`, or `view` with `onViewChange`, opens it from the start or from outside; `data={false}`
leaves the button out, and a gauge, a single figure, has none. Every dashboard panel drawn in a frame
(`ChartPanel`, `TimeSeriesPanel`, `BarPanel`, `ComboPanel`, `HeatmapPanel`, `RadarPanel`) takes
`data`, `defaultView`, `view` and `onViewChange` and hands them to its frame, the view on by default.

`dataColumns(kind, spec, facet?)` (`@winterop-com/sokkel-ui-charts/data-columns`) gives the data
view's columns in order, each with its `field` and `header`, so an app's test can pin what its
readers see:

```ts
import { dataColumns } from '@winterop-com/sokkel-ui-charts/data-columns'

expect(dataColumns('fan', FORECAST).map((column) => column.header)).toEqual(['Week', 'q10', 'Median', 'q90', 'Project'])
```

`dataCell` writes a row's cell as the view writes it, and `dataTrack` gives a column's width.

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

The panels are thin: each shapes its props into rows and draws them with `Chart` and a kind, so a
panel looks as its kind does and a chart a panel needs is a field of the kind. `BarPanel` draws
`bar`; `TimeSeriesPanel` `area`, or `line` without a fill and `step` for steps; `ComboPanel`
`dual`; `HeatmapPanel` `heatmap`; `RadarPanel` `radar`; and `GaugePanel` `gauge`.

Every panel takes a `menu` of dropdown items behind a more button in its head, and the panels that
open in a window take `expanded` with `onExpandedChange`, so the app's own menu can open one as
its expand button does (Patterns/Dashboard panels, Panel menus). `RefreshControl` offers the app's
own `intervals` and, with `onPausedChange`, a pause that keeps the interval for when it resumes.

## The spec

What a chart reads. Each kind reads some of these fields; its row in the tables below says which.

| Field            | What it says                                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rows`           | The rows the chart reads, one record of named fields each.                                                                                                                   |
| `x`              | The field along the category axis, or the first number for a kind that plots two.                                                                                            |
| `y`              | The field, or fields, whose numbers are drawn.                                                                                                                               |
| `series`         | The field that splits the rows into series.                                                                                                                                  |
| `value`          | A third field some kinds read: a point's size, a bullet's target.                                                                                                            |
| `aggregate`      | How the values that fall in one place are combined (`sum`, `count`, `avg`, `min`, `max`, `median`, `p90`), or one per `y`.                                                   |
| `stack`          | Bars and areas stacked (`stacked`), or as shares of each category's total (`percent`).                                                                                       |
| `horizontal`     | Bars running sideways, categories down the side.                                                                                                                             |
| `order`          | Categories in this order first.                                                                                                                                              |
| `seriesOrder`    | Series in this order first.                                                                                                                                                  |
| `colors`         | A color token for a series or a category by its name, such as `status-failed`; `muted-foreground/45` draws it at 45% opacity.                                                |
| `palette`        | The color tokens series and categories take in turn where `colors` names none, in place of the theme's order.                                                                |
| `format`         | How a figure is written in tooltips, labels and the value axis' ticks; a tick's figure is written short, so `1,500 GB` reads `1.5K GB`.                                      |
| `unit`           | A unit written after each figure, such as `s` or `%`, or one per `y` field.                                                                                                  |
| `fieldNames`     | What a field is called where the chart names it.                                                                                                                             |
| `dataFields`     | Fields the chart does not draw, shown after its own in a frame's data view, written as they are.                                                                             |
| `smooth`         | A line drawn smooth rather than straight between points.                                                                                                                     |
| `labelEvery`     | Labels every nth category on the category axis.                                                                                                                              |
| `formatCategory` | How a category is written on the category axis and as the tooltip's title, such as an hour `15:00` as `15:00-16:00`; the rows, `order` and `marks` keep the category itself. |
| `gap`            | How far apart bars stand: `tight` draws a histogram's tall bars, nearly touching.                                                                                            |
| `quiet`          | Bars and lines on a quiet axis: no value axis or lines across, the categories in mono.                                                                                       |
| `baseline`       | A bar of zero drawn as a line one pixel high, so an empty category still shows.                                                                                              |
| `fill`           | How an area is filled: `solid`, `gradient`, fading from its line toward the axis, or `none`.                                                                                 |
| `showScale`      | A heatmap's color scale shown beside the grid.                                                                                                                               |
| `total`          | A ring's total written in its middle with this word under it; under a gauge's figure, the word alone.                                                                        |
| `fit`            | A scatter's axes fitted to its points rather than starting at zero.                                                                                                          |
| `bins`           | How many bins a histogram splits its numbers into, or `{ width }` for how wide each is.                                                                                      |
| `steps`          | Steps along the value axis, each a `value` where it starts, a `color` token and a `label`: thresholds, bands. A line draws each after the first as a dashed line across.     |
| `min`, `max`     | Where the value axis starts and ends, for a kind that fixes it, such as a gauge's dial or a heatmap's scale.                                                                 |
| `words`          | The words a chart writes itself (Count, Total, Rise, Fall, Target and others), for translation.                                                                              |
| `path`           | The fields from the outermost in, for a kind that nests or flows through stages.                                                                                             |
| `dial`           | A gauge's shape: `arc` (the default), `ring`, `half`, `bands` or `needle`.                                                                                                   |
| `panels`         | How each panel of a linked chart is drawn, by its field's or series' name: `mark` (`bar`, `line`, `area`), `hang`, `weight`.                                                 |
| `scales`         | Whether a linked chart's panels share one value scale: `shared` for panels split by `series`, `own` for separate fields.                                                     |
| `zoom`           | The part of a linked chart's axis in view at first: `[from, to]` in percent, or the first and last category.                                                                 |
| `stacks`         | The stack each series joins, by its name; series sharing one are drawn on top of each other.                                                                                 |
| `dashed`         | Series drawn as a thin dashed line with no area: a reference, such as a target or the period before.                                                                         |
| `layers`         | How a two-axis chart draws each series or field, by its name: `mark` (`bar`, `line`) and `axis` (`left`, `right`).                                                           |
| `axes`           | A two-axis chart's axes, `left` and `right`: each one's `name`, `unit`, `format`, `min` and `max`. A chart of one value axis reads the `unit` of `left` for its ticks.       |
| `rims`           | Where each radar spoke ends, by its category's name, in place of the one scale.                                                                                              |
| `round`          | A radar's rings drawn as circles rather than polygons.                                                                                                                       |
| `levels`         | How many rings a radar's scale is drawn with.                                                                                                                                |
| `scale`          | The color tokens a heatmap's scale runs through: one shades from the card to it, several are stepped through.                                                                |
| `small`          | A gauge's figure written at the small size, for a dial in a small box.                                                                                                       |
| `bands`          | A fan's bands from the outermost in, each from its `low` field to its `high` field, with a `label` (the fields' figures, `10-90`, by default).                               |
| `points`         | The field drawn as dots, not a line: a fan's observed truth.                                                                                                                 |
| `history`        | The field drawn as a solid line on the rows before a fan's forecast starts.                                                                                                  |
| `bridge`         | Whether a fan's median is drawn from the last `history` figure, so history and forecast read as one line; true by default.                                                   |
| `marks`          | Lines down the chart at categories of `x`, each dashed, with a `label` at its top and a `color` token: where a forecast starts.                                              |

**Ticks.** A value axis writes its ticks as the tooltips write its figures: by `format`, then the
unit, so ticks and tooltips never disagree on a unit. Ticks are short: the figure `format` writes
for a tick's value is swapped for a compact one (`1.5K` for 1,500, up to two decimals below ten),
keeping the words around it, so `1,500 GB` reads `1.5K GB`. A `format` that writes another figure,
as one that moves to a larger unit does (`1.50 TB`), is kept as it writes it. `axes.left.unit` is
the ticks' unit in place of the spec's on a chart of one value axis, and an axis with a `format` of
its own in `axes` writes its ticks with it, unit and all. Figures stacked to 100% are written in
percent; a needle gauge's ticks and a heatmap's scale follow `format` too. A builder that draws a
value axis writes its ticks with `tickWriter` from `kinds/axes.ts`.

**Categories.** `formatCategory` writes a category where the chart shows it: on the category
axis and as the tooltip's title, on the kinds with a category axis (`bar`, `line`, `area`, `step`,
`range`, `fan`, `heatmap`, `dual`, `linked`, `boxplot`, `waterfall`, `bullet` and `rose`). The
category stays the key everywhere else: the rows, `order`, `marks`, `zoom` and the frame's data
view, which shows the rows as they are.

```tsx
<Chart kind="bar" label="Runs per hour" rows={RUNS} x="hour" y="runs" formatCategory={(hour) => `${hour}-${next(hour)}`} />
```

**Missing figures.** A tooltip lists the series with a figure at the category under the pointer.
A series with none there, as a stack missing one of its series, draws nothing at that category, so
the tooltip leaves it out rather than writing a placeholder for it, as a fan's tooltip leaves out a
band with no figure.

## The kinds

The registry is `packages/charts/src/kinds/index.ts`; each kind is one builder in its own file
there, and its doc comment says what it draws and which fields it reads. Stories are named as they
appear in Storybook.

### Categories and time

| Kind       | For                                                                                                       | Reads                                                                                                                                                                                                    | Story                        |
| ---------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `bar`      | Bars per category, one per series side by side, stacked, or as shares                                     | `x`, `y`, `series`, `aggregate`, `stack`, `stacks`, `horizontal`, `gap`, `order`, `seriesOrder`, `min`, `max`, `colors`, `format`, `unit`, `labelEvery`, `quiet`, `baseline`, `formatCategory`           | Charts/Bars, Charts/Chart    |
| `line`     | A line per series across the categories, with threshold lines                                             | `x`, `y`, `series`, `aggregate`, `stack`, `stacks`, `dashed`, `steps`, `marks`, `min`, `max`, `smooth`, `order`, `seriesOrder`, `colors`, `format`, `unit`, `labelEvery`, `quiet`, `formatCategory`      | Charts/Line                  |
| `area`     | Lines with the area under them filled, alone or stacked                                                   | what `line` reads, and `fill`                                                                                                                                                                            | Charts/Area                  |
| `step`     | A line that holds each figure until the next category: a pool's size, a limit                             | what `line` reads, and `fill` for an area under it                                                                                                                                                       | Charts/Trends                |
| `range`    | A band with a line through it: percentiles around the median, or low, middle and high                     | `x`, `y` (one or three), `series`, `aggregate`, `colors`, `format`, `unit`, `formatCategory`                                                                                                             | Charts/Trends                |
| `fan`      | A forecast against the truth: nested bands around the median, the observed as dots, the history as a line | `x`, `y` (the median), `bands`, `points`, `history`, `bridge`, `marks`, `series`, `aggregate`, `order`, `seriesOrder`, `colors`, `smooth`, `format`, `unit`, `words`, `formatCategory`                   | Charts/Forecast              |
| `stream`   | Series as bands flowing along time, stacked around a middle line                                          | `x`, `y`, `series`, `aggregate`, `order`, `seriesOrder`, `colors`, `format`, `unit`                                                                                                                      | Charts/Trends                |
| `heatmap`  | A grid of cells, `x` along and `series` down, each shaded by its figure                                   | `x`, `y`, `series`, `aggregate`, `showScale`, `scale`, `min`, `max`, `colors.value`, `format`, `unit`, `labelEvery`, `formatCategory`                                                                    | Charts/Heatmap               |
| `calendar` | Days on a calendar, each shaded by its figure: a month as a wall calendar, or a year                      | `x` (dates), `y`, `aggregate`, `horizontal`, `colors.value`, `format`, `unit`                                                                                                                            | Charts/Calendar              |
| `dual`     | Bars and lines over the same categories, on a left axis and one of their own on the right                 | `x`, `y` (two, or one with `series`), `series`, `aggregate`, `order`, `seriesOrder`, `layers`, `axes`, `stack`, `stacks`, `dashed`, `colors`, `format`, `unit`, `smooth`, `labelEvery`, `formatCategory` | Charts/Dual, Charts/Combined |

### Distributions

| Kind        | For                                                                             | Reads                                                                                  | Story               |
| ----------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------- |
| `histogram` | The spread of one number, in bins on round edges, overlaid or stacked by series | `x`, `series`, `seriesOrder`, `bins`, `stack`, `colors`, `format`, `unit`              | Charts/Distribution |
| `boxplot`   | The spread of `y` per category: quartiles, whiskers and outliers                | `x`, `y`, `order`, `horizontal`, `colors`, `format`, `unit`, `words`, `formatCategory` | Charts/Distribution |

### Flows and targets

| Kind        | For                                                                                     | Reads                                                                                                                               | Story          |
| ----------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `waterfall` | A running total: each category rises or falls from where the last ended, then the total | `x`, `y`, `aggregate`, `order`, `colors`, `format`, `unit`, `words`, `formatCategory`                                               | Charts/Flows   |
| `funnel`    | Stages narrowing by their figure, each with its share of the first                      | `x`, `y`, `aggregate`, `order`, `colors`, `format`, `unit`, `words`                                                                 | Charts/Flows   |
| `sankey`    | Rows flowing through stages, one column per field of `path`                             | `path`, `y`, `order`, `colors`, `format`, `unit`                                                                                    | Charts/Flows   |
| `bullet`    | A figure against its target over qualitative bands, one bar per category                | `x`, `y`, `value`, `aggregate`, `steps`, `min`, `max`, `order`, `horizontal`, `colors`, `format`, `unit`, `words`, `formatCategory` | Charts/Targets |

### Shares and hierarchies

| Kind       | For                                                                          | Reads                                                                                                 | Story            |
| ---------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------- |
| `donut`    | A ring of slices, each its share of the whole, the total in its middle       | `x`, `y`, `aggregate`, `order`, `colors`, `format`, `unit`, `total`                                   | Charts/Donut     |
| `pie`      | The same slices as a whole circle, with no hole                              | `x`, `y`, `aggregate`, `order`, `colors`, `format`, `unit`                                            | Charts/Donut     |
| `rose`     | Categories around a circle, each wedge as long as its figure: hours, regions | `x`, `y`, `series`, `aggregate`, `order`, `seriesOrder`, `colors`, `format`, `unit`, `formatCategory` | Charts/Polar     |
| `treemap`  | Nested boxes, each sized by its share, grouped by the fields of `path`       | `path`, `y`, `order`, `colors`, `format`, `unit`                                                      | Charts/Hierarchy |
| `sunburst` | Rings of the same nesting from the middle out; a click opens a slice         | `path`, `y`, `order`, `colors`, `format`, `unit`                                                      | Charts/Hierarchy |

### Relations

| Kind       | For                                                                        | Reads                                                                                                                                   | Story                      |
| ---------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `scatter`  | One point per row, `x` against `y`, colored by series and sized by `value` | `x`, `y`, `series`, `seriesOrder`, `value`, `fieldNames`, `fit`, `colors`, `format`, `unit`                                             | Charts/Scatter             |
| `parallel` | One axis per `y` field and each row a line through them                    | `y`, `series`, `seriesOrder`, `order`, `smooth`, `colors`, `format`, `unit`                                                             | Charts/Parallel            |
| `radar`    | Categories as spokes and one polygon per series, on one scale              | `x`, `y`, `series`, `aggregate`, `order`, `seriesOrder`, `max`, `rims`, `levels`, `round`, `fill`, `dashed`, `colors`, `format`, `unit` | Charts/Polar, Charts/Radar |

### Gauges

| Kind    | For                                                                                     | Reads                                                                                         | Story         |
| ------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------- |
| `gauge` | One figure on a dial, in the color of the step it reaches, in the shape `dial` picks    | `y`, `aggregate`, `steps`, `min`, `max`, `dial`, `total`, `small`, `colors`, `format`, `unit` | Charts/Gauges |
| `rings` | Concentric rings, one per label of `series` or per `y` field, each filling to its share | `y`, `series`, `aggregate`, `seriesOrder`, `min`, `max`, `colors`, `format`, `unit`           | Charts/Gauges |

The dials: `arc`, the default, an open dial filled to the figure with the steps as a thin band
outside it; `ring`, the same as a progress ring over a full circle; `half`, a half circle low
enough for a stat tile, for a box about twice as wide as it is tall; `bands`, a graded arc in the
steps' colors with a triangle pointing at the figure; and `needle`, a speedometer with ticks, round
figures and a needle. `GaugePanel` draws the `gauge` kind's arc, so a dashboard's gauges match
the charts'; on a phone gauges stand two to a row, their figures at `--chart-stat-size-small`.

### Linked

| Kind     | For                                                                                        | Reads                                                                                                                                                                           | Story         |
| -------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `linked` | Panels on one shared axis, one per `y` field or per series, pointed at and zoomed together | `x`, `y`, `series`, `aggregate`, `order`, `seriesOrder`, `scales`, `panels`, `zoom`, `colors`, `fill`, `smooth`, `fieldNames`, `format`, `unit`, `labelEvery`, `formatCategory` | Charts/Linked |

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
   file or in `data.ts`, `stats.ts` or `shapes.ts`, where a test can reach it. A builder imports
   what it shares with others (`written` from `kinds/spec.ts`, the axes, ticks and marks from
   `kinds/axes.ts`), and another builder's file only to draw through that builder, as `step` draws
   through `line`, so a kind loads only the builders it draws with.
2. **The registry.** Add the builder to `KINDS` in `kinds/index.ts`, its file to `FILES` in
   `kinds/load.ts`, so it loads the first time a chart of the kind is drawn, and its legend to
   `LEGENDS` in `kinds/legends.ts`: `seriesLegend` for one entry per series, a legend of its own
   for slices, bands or branches, or `none`. A legend's shaping lives beside it in `legends.ts`,
   where the builder imports it from, so a legend never loads a builder. A field the spec lacks
   joins `ChartSpec` in `kinds/spec.ts`, documented, and this file's table. The builder's file is
   private, reached through the registry: name it in `PRIVATE` in `scripts/components-index.ts`
   beside the other kinds.
3. **The engine.** A chart type or component outside the base set joins the `SERIES` or
   `COMPONENTS` map in `engine.ts`, so it loads on first use. Never add it to the base `PARTS`.
4. **Tests.** The kind's spec in `kinds/kinds.test.ts`, so it is drawn and its legend listed, and a
   test for each piece of shaping.
5. **Stories.** In `src/stories/charts/`, drawn with `Framed` from `Ground.tsx` from the Tidevann
   fixtures in `src/stories/fixtures/`, from the simplest spec to the fullest. Name a story, or its
   section, for the kind ("Treemap", "Box plot"), so a search of the catalog for the kind finds it;
   `src/rules.test.ts` checks every kind. Add the kind to the tables above.
