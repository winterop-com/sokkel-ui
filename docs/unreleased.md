# Unreleased

What changed since 0.28.2, for the next release's notes. A release copies this into its GitHub
release and empties it. These changes break or change what an app sees, so the next release is
0.29.0.

## Breaking

Model output (#607, #608):

- `AssistantReply` and `AnswerColumn` draw no images unless `images` is set: an image in the answer
  or its thinking is drawn as its alt text and address, and nothing is fetched. Pass `images` to
  draw them. Both also take `linkSchemes` and `onLink`, passed to the answer and the thinking.
- A mermaid diagram can no longer set its theme, CSS, look or typefaces through `%%{init}%%` or
  front matter; those keys are dropped. Other diagram keys still apply.

Overlays (#611):

- `useOverlayRoute`'s `back` option is called with a step count, `back(steps)`, and must go back
  that many entries. The default is `history.go(-steps)`. `close()` now goes back past every move
  made inside the overlay, so a move inside it should push, not replace.

Schema forms (#609):

- A required boolean with no schema `default` starts as `false` (`initialValue` and
  `useSchemaForm`'s starting value); it used to start unset.
- A new list item that is a string starts as `''`, a boolean as `false`; both used to be
  `undefined`. A cleared row in a list of strings holds `''`.
- `validate` reports an unset list item as `required` instead of `type`.
- Booleans in lists and maps are drawn as switches, no longer as text inputs.

Code editor and numbers (#613):

- `CodeEditor` no longer calls `onChange` for a `value` the app set.
- `CodeEditor`'s `onProblems` waits for the schema checker, and a checker that fails to load is an
  error problem ("The schema cannot be checked") instead of an empty list.
- `localeNumber` refuses group marks out of place (`3.5` in de-DE, `1,5` in en-US), which it read as
  35 and 15. `readNumber` accepts exponents (`1e3`).
- `nextRuns` fires a `*` minute or hour on both passes of a repeated autumn hour, as cron does.
  An unknown time zone gives no runs instead of throwing.

Tables and files (#606, #612):

- `FileTile`'s `words` take `selectEntry(name)` in place of `select`.
- `DataTable` acts only on keys pressed on the grid or its head; keys in inputs, links, checkboxes
  and menus inside it (portals included) are left to them.
- An editable cell's press opens its editor and no longer also calls `onOpen`.
- An open cell editor whose row scrolls out of the drawn window is saved and closed.

Charts, maps and graph (#614):

- A `Date` in chart rows is read by its local calendar day, with its time when it is not midnight
  (`2026-03-01 10:00`), no longer by its UTC day.
- `ChartGrid` shares each value axis by its index, and shares histogram bins, bullet ranges and
  radar spokes across panels.
- `PointLayer` with equal or negative `size.domain` ends draws points at a constant radius.
- Bounds of data on both sides of 180 degrees cross the antimeridian (east past 180) instead of
  spanning the world.
- `layoutGraph` takes an `AbortSignal` as its fifth argument and rejects with `LayoutAbandoned` when
  aborted. A graph sized to its canvas waits 150 ms for the canvas to stop resizing before laying
  out again.

Markdown (#611):

- Repeated headings get unique ids (`-1`, `-2`), and `markdownHeadings` gives the same ids and reads
  setext headings.
- A `#fragment` link opens in the page, not a new tab.
- An unclosed `$$` block while streaming is drawn as a code block until it closes.

Media (#610):

- `hlsSource` reloads the playlist after a playlist load failure, and only fatal errors reach
  `onError`.

Removed (#620):

- `FieldError`/`FieldErrorProps` (`primitives/field`) and `NavigationMenuIndicator`
  (`primitives/navigation-menu`) are gone.
- Eight unused tokens are gone: `binding-ink`, `brand-foreground`, `critical-wash`, `panel-line`,
  `terminal-node`, `terminal-node-edge`, `terminal-graph-edge`, `terminal-graph-faint`, with their
  `color-*` utilities.

Peers (#624):

- The core's `katex` peer is `^0.18.2` (was `^0.16.47`; advisory GHSA-238p-pmpm-9mq7).
  `rehype-katex` and `remark-math` still ask for 0.16, so an app adds
  `"overrides": { "katex": "^0.18.2" }` to its `package.json`.
- `tailwindcss` `^4.3.4` is a required peer of the core.

Composers and chat (#621):

- On a touch screen, Enter in `Composer` and `MessageComposer` breaks the line and only the send
  button sends. Desktop keeps Enter to send.
- `Composer`'s `accept` filters dropped and pasted files too, and a drop is refused with no
  `onAttach` or while disabled.
- `ChatMessage`, `AssistantReply` and `TrackList` rows are memoized: pass stable `words`, `onPlay`
  and `actions` to skip redraws.
- `useOverlayRoute`'s `open` is false as soon as `close()` is called.
- `SidebarProvider` keeps no `sidebar_state` cookie, and its Mod+B goes through the shortcut
  registry (quiet in fields and under dialogs).
- A plugin language named like a built-in `CodeEditor` language replaces it.
- The highlighter gives each line at most one second; the rest is drawn plain.

Forms, cron and the API playground (#622):

- `parseCron` and `nextRuns` require both day fields to match when both are given and one starts
  with `*`, as cron does (`0 0 */2 * 1` is odd days that are Mondays). `Cron` gains `bothDays`.
- `parseCron` and `describeCron` give null for a step past a field's largest value (`*/90`).
- `CronWords`, `SchemaFormWords` and `PeriodPickerWords` gain entries; partial words still work.
- `requestTarget` always starts with `/`.
- A schema pattern with a repeat inside a repeat (`^(a+)+$`) is checked only on text up to a short
  cap; longer text is left to the server.

Charts and maps (#623):

- `MapLegendWords` gains `all`, `below`, `above` and `noData`; `classLabels(scale, words?)`.
- The dashboard panels' data view heads its columns Category, Series and Value.
- `ChartFrame` shows Export only while a `Chart` inside has registered its handle, so a frame around
  a `ChartGrid` has none.
- `asShares` with negative figures gives shares of the summed sizes; `binsFor` makes at most 1000
  bins.

Tables, trees and drag and drop (#625):

- `DataTable` keeps a branch whose children fail to load open, with a Try again line, as `Tree`
  does. `TableLine` gains `RefusedLine`: check `isRowLine` where code read lines as head or row.
- A tree `DataTable` with client paging pages top-level rows.
- `Tree` opens down to its first choice when first drawn.
- `formatSize` moves up a unit rather than say `1000 KB`, and says `10 KB`, not `10.0 KB`.
- `BoardItem` and `SortableItem` run the app's own key and pointer handlers before the drag's.

## New

- `NotFound`, the page for an address no page answers; `lib/download` (`download`,
  `fileName`); `useUnsavedChanges`'s `overlays` and `hashRouteHead` (#626).
- `DataTable`'s `allPagesSelected`; `joinHandlers` in `DragDrop` (#625).
- `Composer`'s `onRefuse`; `SidebarProvider`'s `shortcut` and `shortcutLabel`; `ScrollingWaveform`'s
  `active` and `seed` (#621).
- `readPointer`, `requestAddress`, `PeriodLabelWords`, words on the period functions,
  `SchemaIssueCount`'s `words`, and `parseAnsi`'s `rest` (#622).
- `ChartWords` `all` and `to`; `PanelWords` and `usePanelFields`; `windowed` on `Chart` and
  `ChartGrid`; `scope` on `useHistoryKeys` and `useGraphHistory` (#623).
- Graph edge bends follow `--radius`; `edgePath` takes the bend; switch sizes are tokens (#620).
- `hls.js` is an optional peer at `^1.7.3`, no longer an exact version (#624).
- `ErrorBoundary` (`@winterop-com/sokkel-ui/ErrorBoundary`): draws a failed page with Try again,
  cleared by `resetKey` or an address change. `Shell` wraps its page in one (`errorWords`,
  `onPageError`) (#616).
- `InlineValue`, a read-only value that lines up with `InlineEdit` rows (#616).
- `DataTable` and `Tree` take `childrenVersion` to load a node's children again (#612). `FileList`
  passes `rowActions`, `loading`, `error`, `status`, `onRetry`, `scrollKey` and `tableWords` to its
  table (#612).
- `TerminalHandle.write(data, done?)` calls `done` once the output is parsed (#610). Links a program
  marks with OSC 8 go through `onLink` (#610).
- `CodeEditor` reads YAML aliases, merge keys and every document of a stream; `onDocument` gets the
  documents as a second argument (#613).
- Histogram `bins` takes `{ width, start, count }` (`HistogramBins`) (#614). Charts follow the
  `data-theme-scope` around them (#614). Graph nodes take `reserveStatus` (#614).
- `AssistantReply` takes `words.calls`, `MermaidDiagram` `words.copy` and `words.copied` (#611).

## Fixed

Every high and medium finding of the 2026-11-16 review that a fix could reach: the chart frame's
endless render (#605), the terminal blank under StrictMode (#603), a release that stopped partway
(#604), the schema form's re-render loop and decimal steps (#609), DataTable scrolling, focus and
paging (#606, #612), the calendar on daylight-saving days (#613), and the rounds in #610 to #616.

`DateTimeField`'s picker stacks its times under the calendar below 640px, so it fits a 344px window.
