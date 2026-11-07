# Plan

The library comes first; apps adopt it once it is whole. Every component has a story in Storybook
with real-shaped data, held to screenshot baselines in both schemes at desktop and phone width.

## Distribution

`dist/` is built, not committed, so an install from a git URL gets no compiled code (bun also
blocks a git dependency's install scripts). The library is published as `@winterop-com/sokkel-ui` to
GitHub Packages by the tag workflow, and apps pin that version. The heavy engines (ECharts, maplibre, React Flow
and elk, Mermaid, CodeMirror) and the Geist fonts are optional peer dependencies: an app installs
one only when it uses its part, and the README lists which part needs which.

The package carries the library alone: `dist/`, the component, hook and helper sources beside it,
the styles and the tokens, with no stories, story fixtures or tests. `styles.css` is Tailwind
source that scans only the components, hooks and helpers, so an app's CSS carries none of the
stories' classes; every app runs Tailwind 4.1 or later itself. Storybook gets the stories' classes
from its own entry, `.storybook/storybook.css`, which adds them as a source.

`examples/` consumes the package as an app does: `examples/web` is a small Tidevann app that
installs it from the repository root and imports only its public entry points, and the Electron and
Tauri shells in `examples/electron` and `examples/tauri` load that app's build. The examples
workflow builds all three, so a break in the package fails a check rather than an app.

`examples/sizes` holds the size budget: a forms page, a dashboard and a map page, each built against
the package in CI and measured gzipped (the JavaScript at start, what loads later, the CSS). A check
fails when one grows past its budget in `examples/sizes/budget.json` or bundles an engine it does not
use, so a forms page never carries ECharts, maplibre, React Flow, CodeMirror or Mermaid. A change
that grows an app on purpose raises its budget in the same PR.

## Themes

Every theme is defined in `tokens/tokens.json`, and `scripts/build-tokens.ts` writes it out.
`tokens.css`, which `styles.css` carries, holds the default theme and the density levels, so an app
that picks no theme needs nothing more. Every other theme is a file of its own in
`src/styles/themes/`, exported as `@winterop-com/sokkel-ui/themes/<name>.css`, with its light and
dark tokens on `html[data-theme]` for the whole app and on `[data-theme-scope]` for one element,
such as a theme picker's swatch; `themes.css` imports them all. An app imports the files of the
themes it offers and sets one on `<html data-theme>`, so its CSS carries no theme it never shows.
Storybook imports `themes.css`, so its toolbar offers every theme.

## Typefaces

Plex Sans and Plex Mono are the default. Geist and Geist Mono are the one alternative a theme sets,
through `--typeface-sans` and `--typeface-mono`, with mono's x-height at `--mono-x-height: 0.462`
and `--mono-x-height-small: 0.503`, the same share of Geist's x-height as the default's of Plex's.
Both pairs were picked from the typeface research once mono was sized to its sans.

Text is 15px (`text-sm`) on the page and in the components alike, with inputs at 16px on a phone so
a focused field does not zoom. Every size comes from a token: `text-xs`, `text-sm`, `text-title`,
`text-page` and `text-stat` in the interface, and `--chart-text-size`, `--chart-text-size-small`
and `--chart-stat-size` for the text ECharts draws.

## Primitives

The shadcn `base-nova` set on Base UI, restyled to the tokens: accordion, alert, alert-dialog,
aspect-ratio, attachment, avatar, badge, breadcrumb, bubble, button, button-group, calendar, card,
carousel, checkbox, code-block, collapsible, combobox, command, context-menu, dialog,
direction, drawer, dropdown-menu, empty, field, hover-card, input, input-group, input-otp, item,
kbd, label, marker, menubar, message, message-scroller, native-select, navigation-menu, pagination,
popover, progress, questionnaire, radio-group, resizable, scroll-area, select, separator, sheet,
sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toast, toggle,
toggle-group, tooltip, trace.

## Patterns

Shell, Rail, AppBar, SubNav, Page, PageHeader, PaneHeader, Toolbar, Section, Surface, the layout
components (Stack, Row, Columns, Split, Fill), Field, TextField, InlineField, SliderField,
CheckboxField, CheckboxList, ChoiceList, CodeField, SwitchField, SearchField, FilterChip, FormBar,
SelectionBar, DataTable, StatusChip, PersonRow, MetaLine, DueText, AttachmentList, IconButton,
StarButton, AccountMenu, SidePanel, DialogShell, ConfirmDialog, TreeSelect, AsyncSelect,
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

A team chat is built from Rail's `strip` (labeled icons with counts or an unread dot at the
icon's corner), ChannelList, ChannelHeader, Conversation and ThreadView (the columns of a
conversation and of a thread), ConversationStart, ChatMessage with ChatDay, and MessageComposer.
An app's own navigation strip is the library's `Rail`, with no hand-drawn badge.

## Graphs

Their own entry under `graph/`, so an app that draws no graph loads neither React Flow nor elk.
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
primitive draws a recording's waveform under its position. SoundVisualizer is the one live picture
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
