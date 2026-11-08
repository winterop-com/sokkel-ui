# Plan

The library comes first; apps adopt it once it is whole. Every component has a story in Storybook
with real-shaped data, held to screenshot baselines in both schemes at desktop and phone width.

## Distribution

The library is four packages, built from one Bun workspace and released together at one version:

- `@winterop-com/sokkel-ui` (`packages/core`): the tokens and themes, the primitives, the patterns,
  layout, forms, tables, the shell, media, board, calendar, schema, terminal, `CodeEditor`, the
  dashboard's frame and its panels with no chart, the hooks and helpers. Every app installs it.
- `@winterop-com/sokkel-ui-charts` (`packages/charts`): `Chart`, its kinds, the frame, legend and
  grid around it, and the dashboard panels drawn by ECharts, which it brings as a dependency.
- `@winterop-com/sokkel-ui-maps` (`packages/maps`): `MapView` and its layers, legends, popups,
  basemaps and period slider, on maplibre.
- `@winterop-com/sokkel-ui-graph` (`packages/graph`): the graph canvas, views and editor, on React
  Flow, laid out by elk.

An app installs the core and the add-ons it draws with, so an engine is installed only by an app
that uses it. Each add-on stands on the core as a peer dependency at the same version and imports it
by its name; the core never imports an add-on and no add-on imports another, which
`src/rules.test.ts` holds. A part that needs no engine belongs in the core. The engines left in the
core (Mermaid, KaTeX, CodeMirror) and the Geist fonts are optional peer dependencies, loaded lazily, and the
README lists which part needs which. Mermaid draws every diagram written as text and KaTeX every
formula, through remark-math and rehype-katex in `Markdown`, which loads it the first time a message
holds math, its stylesheet with it.

`dist/` is built, not committed, so an install from a repository URL gets no compiled code (bun also
blocks such a dependency's install scripts). The tag workflow publishes the four packages to GitHub
Packages, and apps pin that version.

Each package carries the library alone: `dist/`, the sources beside it and its styles (the core
also its tokens), with no stories, story fixtures or tests. Each package's `styles.css` is Tailwind
source that scans only that package's components: the core's also carries Tailwind, the fonts, the
tokens and the base styles, and an add-on's is imported after it in the same stylesheet. An app's
CSS so carries the classes of the packages it uses and none of the stories'; every app runs Tailwind
4.1 or later itself. The themes are in the core. Storybook gets every package's classes and the
stories' from its own entry, `.storybook/storybook.css`, which imports each package's styles and
adds the stories as a source. The stories in `src/stories/` import the packages by their names; in
Storybook and the tests those names resolve to the packages' sources, so neither needs a build.

`examples/` consumes the packages as an app does: `examples/web` is a small Tidevann app that
installs the core package from `packages/core` and imports only its public entry points, and the Electron and
Tauri shells in `examples/electron` and `examples/tauri` load that app's build. The examples
workflow builds all three, so a break in a package fails a check rather than an app.

`examples/sizes` holds the size budget: a forms page, a dashboard and a map page, each built against
the packages in CI and measured gzipped (the JavaScript at start, what loads later, the CSS). A check
fails when one grows past its budget in `examples/sizes/budget.json` or bundles an engine it does not
use, so a forms page never carries ECharts, maplibre, React Flow, CodeMirror, Mermaid or KaTeX. A change
that grows an app on purpose raises its budget in the same PR. The forms page imports only the core
package, the dashboard adds the charts package and the map page the maps package.

## Themes

Every theme is defined in `packages/core/tokens/tokens.json`, and `scripts/build-tokens.ts` writes it out.
`tokens.css`, which `styles.css` carries, holds the default theme and the density levels, so an app
that picks no theme needs nothing more. Every other theme is a file of its own in
`packages/core/src/styles/themes/`, exported as `@winterop-com/sokkel-ui/themes/<name>.css`, with its light and
dark tokens on `html[data-theme]` for the whole app and on `[data-theme-scope]` for one element,
such as a theme picker's swatch; `themes.css` imports them all. An app imports the files of the
themes it offers and sets one on `<html data-theme>`, so its CSS carries no theme it never shows.
Storybook imports `themes.css`, so its toolbar offers every theme.

Applying and keeping the look is the library's too, never an app's: `useAppearance` keeps the theme,
scheme, density, corners, typeface and motion in `localStorage` and wears them on `<html>`,
`useScheme` does the same for the scheme alone, and `appearanceScript` wears the kept look before
the page draws. Storybook's toolbar wears its globals through the same `applyAppearance`. The
option lists a picker offers (`THEMES`, made from the tokens by `scripts/build-tokens.ts`,
`CORNERS`, `TYPEFACES` and `FACES`) are in `lib/appearance`.

Every app has the same frame: `Shell` with a `Rail` of its places, the command palette on ⌘K or
Ctrl K through `Shell`'s `palette`, an `AccountMenu` in the rail's foot, `local` until the app has
sign-in, and a `StatusLine` as the shell's `foot`, which the account sits level with as one bar
across the window's bottom edge.

## Typefaces

Plex Sans and Plex Mono are the default. Geist and Geist Mono are the one alternative a theme sets,
through `--typeface-sans` and `--typeface-mono`, with mono's x-height at `--mono-x-height: 0.462`
and `--mono-x-height-small: 0.503`, the same share of Geist's x-height as the default's of Plex's.
Both pairs were picked from the typeface research once mono was sized to its sans.

Terminal text has a face of its own, `--typeface-terminal`: JetBrains Mono NL patched as a Nerd Font
Mono, subset to Latin, box drawing and the Powerline and Octicons glyphs a prompt or a run state
shows, shipped as files in the core (`src/styles/fonts/`) under the SIL OFL. `LogView` sets its own
`--typeface-mono` to it, so the size rule still applies; a theme's or the look's typeface does not
change it.

Text is 15px (`text-sm`) on the page and in the components alike, with inputs at 16px on a phone so
a focused field does not zoom. Every size comes from a token: `text-xs`, `text-sm`, `text-title`,
`text-page`, `text-stat` and `text-display` (a fullscreen view's title) in the interface, and `--chart-text-size`, `--chart-text-size-small`
and `--chart-stat-size` for the text ECharts draws.

## Primitives

The shadcn `base-nova` set on Base UI, restyled to the tokens: accordion, alert, alert-dialog,
aspect-ratio, attachment, avatar, badge, breadcrumb, bubble, button, button-group, calendar, card,
carousel, checkbox, code-block, collapsible, combobox, command, context-menu, dialog,
direction, drawer, dropdown-menu, empty, field, hover-card, input, input-group, input-otp, item,
kbd, label, marker, menubar, message, message-scroller, native-select, navigation-menu, pagination,
popover, progress, progress-ring, questionnaire, radio-group, resizable, scroll-area, select, separator, sheet,
sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toast, toggle,
toggle-group, tooltip, trace.

## Patterns

Shell, Rail, AppBar, SubNav, Page, PageHeader, PaneHeader, Toolbar, Section, Surface, the layout
components (Stack, Row, Columns, Split, Fill), Field, TextField, InlineField, SliderField,
CheckboxField, CheckboxList, ChoiceList, CodeField, SwitchField, SearchField, FilterChip, FormBar,
SelectionBar, DataTable, StatusChip, PersonAvatar, PersonRow, MetaLine, DueText, AttachmentList,
IconButton, StarButton, AccountMenu, SidePanel, DialogShell, ConfirmDialog, TreeSelect, AsyncSelect,
CapabilityPicker.
Every example arranges and builds its screens from these, never by hand, so a fix in one reaches
them all.

DataTable is the one table, for five rows or fifty thousand: only the rows in view are drawn, at
the density's one row height, so 50k rows sort, scroll and select at once; rows that grow to fit
their cells are an option for short listings. It sorts from its heads, selects with a bulk bar or
picks one row for a list beside its detail, hides columns, resizes them from their heads' edges as
panels resize, pins its first column and its row menu, opens child rows of any depth (loaded when
a branch first opens, if the app wants), and moves by the keyboard. It pages in the browser or
from a server, loads more as its end comes near, and shows the same rows as a grid of cards (an
album view) that keeps the selection, menus and sort. A short listing drops the bar above its
head and may carry a foot line.

Tree and TreeSelect pick from a hierarchy of any depth and size. A node marked `hasChildren` loads
its level through the app's `loadChildren` when first opened, with a loading row meanwhile and a row
to try again when it fails; the app's `search` looks through the whole hierarchy, loaded or not, and
lists each match with its path, and choosing one opens the tree down to it. TreeSelect names its
choice by its path, from `trails` when the choice's level has not loaded yet. Past a few hundred
visible rows a tree draws only those in view of its nearest scrolling box, so fifty thousand open
rows scroll as smoothly as fifty.

PersonAvatar draws a person as their picture, or as their initials on their color. A picture takes
the initials' place only once it has loaded (Base UI's avatar tracks it), so until then, and for good
when it fails, the initials stay in the same box: nothing moves and a broken image never shows. The
parts that show people (PersonRow, ChatMessage, ChannelHeader, ChannelList, BoardCard, PeopleFilter,
AccountMenu) take the picture as an address. The stories draw Tidevann's people as SVG portraits,
mixed with initials as a real team is.

A team chat is built from Rail's `strip` (labeled icons with counts or an unread dot at the
icon's corner), ChannelList, ChannelHeader, Conversation and ThreadView (the columns of a
conversation and of a thread), ConversationStart, ChatMessage with ChatDay, and MessageComposer.
An app's own navigation strip is the library's `Rail`, with no hand-drawn badge.

## Maps at scale

Each map layer is one GeoJSON source with hover and selection as feature state, so thousands of
areas or points draw and answer the cursor with no work per feature in React. `BoundaryLayer`
simplifies heavy geometry once as it arrives (`simplify`) and names its areas (`label`) in a symbol
layer that maplibre declutters, the larger areas placed first; names need a basemap with fonts.
`PointLayer` gathers points into counted clusters, and the map fits whatever its layers draw.

## Graphs

Their own package, `@winterop-com/sokkel-ui-graph`, so an app that draws no graph installs neither
React Flow nor elk.
GraphCanvas (React Flow in the tokens, fit, zoom buttons, a stage or a fitted frame), GraphNode
(the node box), the layout (a rank layout at once, elk loaded lazily and answering after),
useGraphLayout and useNodeGraph, and the views PipelineGraph, RunGraph, DependencyGraph (a lineage
of datasets and jobs) and StateMachine (labeled transitions, initial and final markers, the
current state). A canvas given `editing`, and PipelineGraph with it, becomes an editor: ports
to connect, Delete to remove, boxes to drag, a menu on right-click and a connection dropped on
empty ground, each reported to the app, which owns the graph. Views select only by default.
An editor also refuses a connection with the reason said on the canvas, adds a step from the add
button at a node's output or an edge's middle, takes blocks dragged in from a palette, and chooses
several nodes with Shift. BlockPalette, BlockPicker, GraphOverlay, GraphNotice, GraphToolbar and
useGraphHistory are its parts; the Pipeline editor stories show each way of building a pipeline.

## Media

VideoPlayer, MediaBar, MediaCard and TrackList carry video and music, and the `AudioScrubber`
primitive draws a recording's waveform under its position. AudioPlayer plays a recording in one line
(a clip or voice note in a message, an answer read aloud) from the same controls.

MediaBar resizes from its top edge. Up to about 96 pixels every layout is the one-line bar; above
it the bar grows by its `layout`, picked from the player growth research, continuously and with no
jump: `rows` (the default: the cover across two rows, what plays, the transport and the volume over
a full-width waveform that grows from 18 to 96 pixels), `panel` (the large now-playing panel) or
`stage` (a centered stage). The heights where things change and the sizes between them are pure
arithmetic in `media/bar-growth.ts`. The visualizer rises faintly behind the words from about 96
pixels, standing on the waveform. A corner button, or an app's own key through `fullscreen`, opens
MediaFullscreen, a now-playing view arranged after the layout, with the visualizer at full strength
and a picker of its kind; it asks the browser for its fullscreen and falls back to covering the
window, and it is a dark room in every theme: `.dark` around an element scoped to the document's
theme with `data-theme-scope`. SoundVisualizer is the one live picture
of sound: it reads a playing media element or a live stream, such as a microphone's, through Web
Audio and draws it on a canvas as a spectrum, an area, a wave or a ring, filling its box in a color
token, faint behind text when it is a backdrop. It moves only while the source sounds and the box
is in view; paused, hidden or unmounted it holds still with no frame loop running, and a still frame
of levels or samples draws without any audio. Each element is wired to the page's one audio context
once, on its first play, and is heard through it from then on, so cross-origin media needs CORS; a
source Web Audio cannot read is never wired and draws at rest. An app that wires its element into
its own audio graph passes an `AnalyserNode` from it instead, with `playing`, since an element can
be wired only once. The `bar-visualizer` primitive, a
voice input's level bars, is drawn by it.

## Validation

Option F, picked from the validation research. A field with a problem gets a colored
edge and a mark at the end of its input; pressing the mark opens what is wrong, what to do, and a
fix when one is plain. The dialog footer counts what stops the submit, beside the verb, and pressing
the count opens the first. Nothing is inserted between fields, so a form never changes height.
Issues show once a field is left with a value, or once the form is submitted, and go the moment the
value is put right. A server's refusal lands on its field until that field is changed.

`IssueMark` and `IssueCount` carry it for any form; SchemaForm is built on them, and checks values
with ajv against JSON Schema 2020-12.

For what happens outside a form, the activity list was picked from the notification research: what
happened while a person was away, newest first, unread drawn stronger, each item with its own way to
act. `ActivityList`, `ActivityButton` and `ActivityMenu` carry it (Patterns/Activity).

What comes next is in `docs/roadmap.md`.
