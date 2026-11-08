# Plan

The library comes first; apps adopt it once it is whole. Every component has a story in Storybook
with real-shaped data, rendered by CI at every narrow width, failing one that throws or scrolls sideways.

## Distribution

The library is five packages, built from one Bun workspace and released together at one version:

- `@winterop-com/sokkel-ui` (`packages/core`): the tokens and themes, the primitives, the patterns,
  layout, forms, tables, the shell, media, board, calendar, schema, `CodeEditor`, the
  dashboard's frame and its panels with no chart, the hooks and helpers. Every app installs it.
- `@winterop-com/sokkel-ui-charts` (`packages/charts`): `Chart`, its kinds, the frame, legend and
  grid around it, and the dashboard panels drawn by ECharts, which it brings as a dependency.
- `@winterop-com/sokkel-ui-maps` (`packages/maps`): `MapView` and its layers, legends, popups,
  basemaps and period slider, on maplibre.
- `@winterop-com/sokkel-ui-graph` (`packages/graph`): the graph canvas, views and editor, on React
  Flow, laid out by elk.
- `@winterop-com/sokkel-ui-terminal` (`packages/terminal`): `TerminalView` and `Terminal`, on
  xterm.js.

An app installs the core and the add-ons it draws with, so an engine is installed only by an app
that uses it. Each add-on stands on the core as a peer dependency at the same version and imports it
by its name; the core never imports an add-on and no add-on imports another, which
`src/rules.test.ts` holds. A part that needs no engine belongs in the core. The engines left in the
core (Mermaid, KaTeX, CodeMirror) and the Geist fonts are optional peer dependencies, loaded lazily, and the
README lists which part needs which. Mermaid draws every diagram written as text and KaTeX every
formula, through remark-math and rehype-katex in `Markdown`, which loads it the first time a message
holds math, its stylesheet with it.

`dist/` is built, not committed, so an install from a repository URL gets no compiled code (bun also
blocks such a dependency's install scripts). The tag workflow publishes the five packages to GitHub
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
use, so a forms page never carries ECharts, maplibre, React Flow, xterm.js, CodeMirror, Mermaid or KaTeX. A change
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

A screen adds what only it can do to the palette with `useCommands(groups, deps)` while it is
mounted and takes it away when it unmounts; the shell holds the registry and lists those groups with
its own by each group's `rank`, a screen's first at equal rank, groups of one title as one. An app
that draws its own palette holds a registry with `useCommandRegistry`. A palette row with a `detail`
or `artwork` (an image's address or a node, round for a person) is two lines tall, drawn as a search
result is, and the palette's search results take `artwork` too.

In a desktop window whose native title bar is hidden (Electron's `hiddenInset`, Tauri's
`Overlay`), `Shell`'s `desktop` makes its top strip, the rail's head, the top bar and an open
panel's header, the window's title bar. Electron moves the window from it through
`-webkit-app-region: drag`, every control in it opted out; WKWebView ignores that, so a press on the
strip outside its controls calls the app's `onWindowDrag` (Tauri's `startDragging`) and a double
click its `onWindowZoom`. `trafficLights` leaves room at the strip's start for the buttons macOS
draws there (`--spacing-traffic-lights`, 80px, or the app's pixels): in the rail's head, in the top
bar where no rail shows, and where a collapsed rail is narrower than the room its head stays empty
under the buttons, its mark below. `SignIn` and `AppBar` take the same `desktop`. The library
imports no desktop shell; `isDesktopShell` in `lib/desktop` reads which one a page runs in.

## Code

Code is colored from the `code-*` tokens (keyword, operator, punctuation, string, regexp, number,
constant, comment, function, variable, type, property, tag, attribute, heading, link, inserted,
deleted, invalid, and `code-bracket-1` to `-3` for bracket pairs by depth), set by every theme in
light and dark. Shiki highlights `Code` and `Markdown`'s
fences through one theme whose every scope is a `code-*` variable, and CodeMirror's highlight style
in `CodeEditor` reads the same tokens, so code follows the theme and scheme with no second pass.
The highlighter knows the common languages and `jq` (a grammar of the library's own), each loaded
the first time it is drawn; an app adds more with `registerLanguage` from `lib/highlighter`. ANSI
output is read by one parser, `lib/ansi`, which `AnsiText` and an `ansi` fence share: the sixteen
colors in the kind and status inks, 256-color and 24-bit color as they are. `Markdown` embeds an
app's own parts in a text where it has `<!-- part:ID -->` (another word through `partMarker`),
through its `parts` map or function, so the text stays one document with its headings and anchors.

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
`text-page`, `text-stat` and `text-display` (a fullscreen view's title) in the interface, and `--chart-text-size`, `--chart-text-size-small`,
`--chart-stat-size` and `--chart-stat-size-small` (a gauge's figure on a phone) for the text ECharts draws.

A component sets its text by role, never by a size and a weight of its own. Each role is a token
in `tokens.json` and a class of the same name, carrying size, line height, weight and tracking, which
a `font-*` class still overrides:

| Role                        | Class                       | Size / line             | Weight    |
| --------------------------- | --------------------------- | ----------------------- | --------- |
| Page title                  | `text-page-title`           | 24 / 32, tight tracking | 500       |
| Detail or dialog title      | `text-detail-title`         | 16 / 24                 | 600       |
| Section or card title       | `text-section-title`        | 15 / 22                 | 500       |
| Compact panel or table head | `text-head`                 | 13 / 20                 | 600       |
| Body and controls (actions) | `text-body` (`text-action`) | 15 / 22                 | 400 (500) |
| Field label                 | `text-label`                | 15 / 20                 | 500       |
| Help and metadata           | `text-help`                 | 13 / 20                 | 400       |
| Badge and status            | `text-badge`                | 13 / 20                 | 500       |
| Main statistic              | `text-statistic`            | 32 / 36                 | 600       |
| Fullscreen media title      | `text-media-title`          | 48 / 56                 | 600       |
| Brand name on a sign-in     | `text-brand-name`           | 48 / 56, tight tracking | 700       |
| Sign-in title               | `text-welcome-title`        | 32 / 36, tight tracking | 700       |
| Eyebrow over a title        | `text-eyebrow`              | 15 / 22, wide tracking  | 500       |

Code takes the size around it at 400, 500 for emphasis, in mono adjusted by `font-size-adjust`:
every size and role sets `--mono-adjust`, the body or the small share, and mono reads it, so a size
given by a variant counts too, and a sans face inside mono drops it. Plex Mono ships at 400, 500,
600 and 700, so no weight is synthesized. Page and detail titles wrap; card titles take
`titleLines` and show their whole text on hover when cut short.

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
IconButton, StarButton, SplitButton, DownloadButton, AccountMenu, SidePanel, DialogShell,
ConfirmDialog, TreeSelect, AsyncSelect, CapabilityPicker, SignIn, RelativeTime, ApiLink, TagChips,
DetailSheet.
Every example arranges and builds its screens from these, never by hand, so a fix in one reaches
them all.

A records app is built from the same parts (Apps/Records). A `Rail` entry says what its
place holds on a second line (`description`), which the palette's Go to rows repeat; a palette row's
`hint` is words and its `code` an id in the code face. `Stat` as a `tile` is a count on a card of its
own, a state's dot before its label and a note under it, leading to what it counts, and `emphasis`
edges the one that asks for work. `Badge` takes a `kind` color for a categorical value, such as the
sort of form a card is, and `Segmented` options carry a count and a state's dot. `Section`,
`PaneHeader` and `Field` take a `description`, a field's between its label and its control.
`DetailSheet` is one thing's detail in a sheet from the right, its chips and actions on one line
under the title, its body the parts its own page draws; `SourceSheet` is one.

A button that cannot be pressed now says why: `reason` on `Button`, `IconButton` and `SplitButton`
disables it and shows the reason on hover and focus, the button kept in the tab order so a keyboard
reaches it. `SplitButton` joins the main action to a menu of other ways; `DownloadButton` goes from
idle through n of m on a `ProgressRing`, with a cancel, to kept, its state held by the app.
`RelativeTime` says a time as "3 minutes ago" through `Intl.RelativeTimeFormat`, the instant on
hover, ticking on its own clock unless the app passes `now`. `ApiLink` names the request behind a
screen as a copyable chip. `TagChips` shows as many tags as fit the room its row has left and a +N
for the rest, and `DescriptionList`'s `row` layout sets its facts in one wrapping line.

`SignIn` is every app's door: a brand pane, dark in every scheme on `--brand-ground`, with art over
its upper part and the mark, the name and a few facts at its foot, beside a centered form of a
username and password (or a token, or the app's own fields), an optional server address, an error
over the submit and other ways in under a rule. The seam between the panes drags, the form rises
into place as it opens, and the username can be kept in the browser. On a phone the brand pane is a
bar over the form. The art that ships, `LevelBars` and `FlowLines`, is drawn from a seed in the
theme's primary and muted inks and holds still when motion is reduced; an app may pass its own.

DataTable is the one table, for five rows or fifty thousand: only the rows in view are drawn, at
the density's one row height, so 50k rows sort, scroll and select at once; rows that grow to fit
their cells are an option for short listings. It sorts from its heads, selects with a bulk bar or
picks one row for a list beside its detail, hides columns, resizes them from their heads' edges as
panels resize, pins its first column and its row menu, opens child rows of any depth (loaded when
a branch first opens, if the app wants), and moves by the keyboard. It pages in the browser or
from a server, loads more as its end comes near, and shows the same rows as a grid of cards (an
album view) that keeps the selection, menus and sort. A short listing drops the bar above its
head and may carry a foot line. Rows gather under group heads by a field or a key made from the row
(`groupBy`), each head with its label, its count and a column's `aggregate`; a head folds its
group, rows sort within their group, and a head's box selects the group, in the table, the list and
the grid alike.

On a phone each part lays itself out by the room it has, so no example patches it. `DataTable`'s bar
gives its `search` a line of its own, the tools wrapping across the width under it with the count
and the sort after them, and its stacked cards set each column by its `stack`: a line, named or not,
a primary value over several lines under the title, or a secondary fact on the card's last line. A
`ConfirmDialog` stays sized to its content (`phone="fit"` on `DialogShell`) while a form covers the
screen, and a dialog's verbs stand in a row at the right while they fit, each on a full-width line,
the confirm on top, once they do not. `MessageComposer` keeps the formatting groups it has room for
and puts the rest behind More, Write and Preview becoming one Preview button. `EventPopover` keeps
`--density-overlay-inset` from the window's edges and spans the window between them. `WeekGrid` shows
a lane too narrow for the times its title alone, over as many lines as the block is tall. Gauges
stand two to a row of a `DashboardGrid`, on shorter bodies with figures at `--chart-stat-size-small`.
A `MermaidDiagram` shrinks to its box only until its labels reach `--text-2xs`, then scrolls sideways.

`WindowedPane` gives any pane an expand button that opens the same content near full screen, in a
window with a margin, a title, a close button and Escape, the pane keeping its height in place
until the content comes back; `MermaidDiagram`, an expandable `DashboardPanel` and `ChartFrame` open
through it, so there is one way to open a pane near full screen. A map's own full screen control
asks the browser for its full screen instead, keeping the same canvas and camera.
`useStored` keeps a value in `localStorage` as JSON under an app prefix (`setStoredPrefix`), in
memory when storage is refused, refusing a kept value its `check` does not pass, and follows the
same key in other hooks and other tabs; `useAppearance` keeps the look through the same store. A
fact several screens share lives in a `createStore` outside React (kept under a key when given
one), read with `useStore`, or one fact of it with `useStoreValue` so a store that changes often
draws again only what reads the changed fact. `useUploads` runs the app's
`upload(file, { signal, onProgress })` for each file it accepts by type, size and count, says why
it refuses the rest, cancels through the signal (and drops what an uploader that ignores it answers
later), and hands `AttachmentList`, `Composer` and `UploadTray` their files. `ConversationHistory`, the list
beside a chat, is a `DataTable` list grouped under Pinned, Today and Earlier, with rename in place,
pin, and delete after a question.

Tree and TreeSelect pick from a hierarchy of any depth and size. A single choice made outside the
tree, such as a place picked on a map beside it, opens the tree down to it and scrolls to it. A node marked `hasChildren` loads
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

CodeEditor is the one code editor, on CodeMirror 6. It carries JSON, YAML and jq (a stream language
written from the jq manual) by name and takes any other language as a CodeMirror `LanguageSupport` or
a stream parser (`defineLanguage`). An app adds words to complete (a list or a function of the word,
each with a detail, docs and a kind), docs on hover, ranged marks drawn as lint (an underline, a
gutter dot, the message on hover), `onRun` on Mod-Enter and any other `keys`, a themed find bar, a
fold gutter, bracket colors by depth and indent guides; the last three turn off past a megabyte. Given
a JSON Schema (2020-12), JSON and YAML are checked by the same ajv rules as SchemaForm, each issue
placed on the key or value it is about, and the schema's property names and enum values complete as
they are typed. `variant="pane"` fills a pane edge to edge; the Query app shows it in panes.

## Maps at scale

Each map layer is one GeoJSON source with hover and selection as feature state, so thousands of
areas or points draw and answer the cursor with no work per feature in React. `BoundaryLayer`
simplifies heavy geometry once as it arrives (`simplify`) and names its areas (`label`) in a symbol
layer that maplibre declutters, the larger areas placed first; names need a basemap with fonts.
`PointLayer` gathers points into counted clusters, and the map fits whatever its layers draw.

A map beside a hierarchy (Apps/Sites, after an adopting app's own page of a tree, a map and a
detail card) shares one selection with the tree: the selected feature in `--map-selection`, the
features under it in `--map-highlight` through the layers' `highlighted` ids, the rest plain, and a
`MapLegend` whose `entries` key them from `AREA_EMPHASIS` in the colors the layers paint. `bounds`
frames the selection, and new bounds are eased to even after the reader has moved the map.
`controls` picks the map's own buttons (zoom, fit, full screen, and a toggle to the globe); an app
that offers no basemap gets the ground alone and no network, and the map draws only a basemap it
offers. Layers leave out features whose geometry cannot be read, and the map says how many in a
note under it, after the app's own `notes`.

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

## Terminals

Their own package, `@winterop-com/sokkel-ui-terminal`, on xterm.js, so an app that shows no terminal
does not install it. `TerminalView` is a real terminal on the terminal ground, in the theme's
colors and the terminal face (`--typeface-terminal`), following the theme and scheme as they change: it fills its box (or a
fixed number of rows) and reports its size in cells, sends keystrokes and paste through `onData`,
and takes output through its handle's `write`, with full emulation for programs that move the
cursor or take the whole screen, a scrollback, selection and copy. The connection to the program
stays the app's. `Terminal` shows commands and what they wrote on the same engine, read-only, with
a title bar, copy and clear, writing only what was added while output streams in.

## Media

VideoPlayer, MediaBar, MediaCard and TrackList carry video and music, and the `AudioScrubber`
primitive draws a recording's waveform under its position. AudioPlayer plays a recording in one line
(a clip or voice note in a message, an answer read aloud) from the same controls.

One sound is heard at a time: a player claims the sound as it starts to be heard and whoever held it
is paused, through `claimSound` and `useOneSound` in `media/one-sound`. AudioPlayer, VideoPlayer and
MediaBar claim it unless given `exclusive={false}`, MediaBar pausing through its `onPlayingChange`;
a muted player takes no sound, so a muted preview never stops the music. An app's own element joins
by claiming too. `Artwork` is a record's cover: its picture once loaded, or one drawn in the theme's
hues (a motif over a gradient between two), chosen from a stable seed such as the record's id, so a
shelf of records without pictures is not all alike and a record wears the same cover in the grid,
the list and the player. MediaCard draws it from `placeholderSeed` (the title by default) when it
has no `cover`, and MediaBar from its `placeholderSeed` when it has no `artwork`.

A long listen, a book or a podcast, gets what it needs from MediaBar's options: `skip` (or `onSkip`)
adds buttons that jump back and forward by an interval written on their glyphs, 15 seconds unless
told; `onRateChange` a speed menu written as "1.25x", from `rates` (`MEDIA_RATES`, 0.5x to 2x),
the one speed menu, which `VideoPlayer` shares; `chapters`, the second each chapter starts at, make
previous and next chapter steps that say so and seek between the starts when the app gives no
handler, and `timeline="chapter"` measures the scrubber and its times within the chapter playing.
`live` is for a stream with no length, such as a radio station: a Live mark stands where the
position would, and seeking, skipping and the speed are off. `useMediaSession` tells the operating
system what plays (title, artist, album, artwork), whether it plays and where along its length at
its speed, and answers its media keys and lock screen through the app's handlers. It tells the
position again only when it strays from where the system runs it, takes everything away on unmount,
and does nothing where the browser has no media session.

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
be wired only once. An analyser reads the sound before the output plays it, so `delay` holds the
picture back by the output's latency (a Bluetooth output is 150 to 500 milliseconds behind): each
reading goes into a short ring stamped with its time, and the one drawn is as old as the delay.
`delay="auto"` reads the latency the browser reports for the audio context, and `delayOffset` adds
a hand-set correction on top. The `bar-visualizer` primitive, a
voice input's level bars, is drawn by it.

## Validation

Option F, picked from the validation research. A field with a problem gets a colored
edge and a mark at the end of its input; pressing the mark opens what is wrong, what to do, and a
fix when one is plain. The dialog footer counts what stops the submit, beside the verb, and pressing
the count opens the first. Nothing is inserted between fields, so a form never changes height.
Issues show once a field is left with a value, or once the form is submitted, and go the moment the
value is put right. A server's refusal lands on its field until that field is changed.

The second round (2026-11-08) settled the rest. The count is one tinted control beside the verbs, in
a page's bar and a dialog's footer alike, with a figure for each kind: errors in the critical ink,
warnings in the warning ink. Pressing it lists the issues above it. A long form that scrolls gets a
strip beside its scroll bar with a mark at each issue's place, which goes there when pressed. The
bar's verbs wrap rather than run past its edge.

`IssueMark`, `IssueCount` and `IssueMarks` carry it for any form (`DialogShell` takes `marks`);
SchemaForm is built on them, and checks values with ajv against JSON Schema 2020-12.

For what happens outside a form, the activity list was picked from the notification research: what
happened while a person was away, newest first, unread drawn stronger, each item with its own way to
act. `ActivityList`, `ActivityButton` and `ActivityMenu` carry it (Patterns/Activity).

What comes next is in `docs/roadmap.md`.
