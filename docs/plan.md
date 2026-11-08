# Plan

The library comes first; apps adopt it once it is whole. Every component has a story in Storybook
with real-shaped data, rendered by CI at every narrow width, failing one that throws or scrolls sideways.

## Distribution

The library is six packages, built from one Bun workspace and released together at one version:

- `@winterop-com/sokkel-ui` (`packages/core`): the tokens and themes, the primitives, the patterns,
  layout, forms, tables, the shell, the players chat uses, board, calendar, schema, `CodeEditor`,
  the dashboard's frame and its panels with no chart, the hooks and helpers. Every app installs it.
- `@winterop-com/sokkel-ui-charts` (`packages/charts`): `Chart`, its kinds, the frame, legend and
  grid around it, and the dashboard panels drawn by ECharts, which it brings as a dependency.
- `@winterop-com/sokkel-ui-maps` (`packages/maps`): `MapView` and its layers, legends, popups,
  basemaps and period slider, on maplibre.
- `@winterop-com/sokkel-ui-graph` (`packages/graph`): the graph canvas, views and editor, on React
  Flow, laid out by elk.
- `@winterop-com/sokkel-ui-terminal` (`packages/terminal`): `TerminalView` and `Terminal`, on
  xterm.js.
- `@winterop-com/sokkel-ui-media` (`packages/media`): the music and video app parts, `MediaBar`
  with its layouts and fullscreen view, `TrackList`, `ChapterList`, `Lyrics`, `MediaCard`,
  `Artwork`, `useMediaSession`, `useQueue`, and `hlsSource`, which plays an HTTP live stream in
  `VideoPlayer` through hls.js, an optional peer.

An app installs the core and the add-ons it draws with, so an engine is installed only by an app
that uses it, and the music and video parts only by an app that plays music or video. Each add-on
stands on the core as a peer dependency at the same version and imports it by its name; the core
never imports an add-on and no add-on imports another, which `src/rules.test.ts` holds. A part that
needs no engine belongs in the core, save the music and video app parts in the media package. The
core's own dependencies are what every app's frame draws with (Base UI, lucide, cmdk for the
palette, the class helpers, the Plex fonts); every library only some parts need is an optional peer
dependency: the engines left in the core (Mermaid, KaTeX, CodeMirror), Shiki, react-markdown and its
plugins, ajv, react-day-picker, date-fns, embla, sonner, input-otp, react-resizable-panels,
`@shadcn/react` and the Geist fonts. The README lists which part needs which. Mermaid draws every
diagram written as text and KaTeX every formula, through remark-math and rehype-katex in `Markdown`,
which loads it the first time a message holds math, its stylesheet with it.

A part loads a heavy library on first use wherever it can draw before it arrives, so a page's
start carries only what draws at once: `MapView` loads maplibre (`loadMapEngine` ahead) with a
spinner after a moment, `Chart` and `ChartGrid` load the kinds' builders beside ECharts, a basemap's
preview loads when the switcher shows it, `useSchemaForm` and `CodeEditor` load ajv (`loadSchemaChecks`
ahead), the form taking input at once and refusing a submit until its checks are there,
`TimeRangePicker` loads its calendar when the trigger is pointed at or focused, the highlighter
loads Shiki with the first code drawn plain until then, and `MediaBar` loads its fullscreen view
after the bar is drawn. A module that only asks whether a node is a part tells it by a mark, so it
need not import the part (`isSoundVisualizer`), and `chartLegend` has a module of its own, since it
reads every kind.

`dist/` is built, not committed, so an install from a repository URL gets no compiled code (bun also
blocks such a dependency's install scripts). The tag workflow publishes the six packages to GitHub
Packages, and apps pin that version.

Each package's `exports` map names every module an app may import, one entry per module with its
`types` and `import`, and no wildcard for code. Public are the components and the parts they
export, the primitives, the hooks, the helpers an app calls (`lib/appearance`, `lib/commands`,
`lib/desktop`, `lib/highlighter`, `lib/stored` and the like) and those the stories and examples
use, the chart kinds' registry as `kinds`, and the styles, the lists of sources, the theme files
and `tokens.json`. Every component exports the type of its props as `<Component>Props`, and a type
those props name is exported beside it. Private is what only the library's own parts use: the
contexts a part hands what it draws (`shell-context`, the map's and the graph's `context`), each
chart kind's builder and the arithmetic, look and engine they share, the player bar's layout sizes
(`bar-growth`), the stores behind hooks (`lib/uploads`, `lib/overlay`, `lib/shortcuts`,
`lib/scroll-memory`, `media-session`, `follow`), and layout constants such as the table head's
text. A core module an add-on imports is public, since an add-on imports the core by name as an
app does: `hooks/use-panel-size`, `hooks/use-clamped`, `hooks/use-theme-name`, `lib/title-lines`,
`media/one-sound` and `media/video-source` are public for that. `PRIVATE` in
`scripts/components-index.ts` lists each private module with the reason; `src/rules.test.ts` fails
a module in neither the map nor that list, a private module in the map, an import of a path the
map does not export from the packages, the stories, the examples, the tools or the docs, and a
component without its `<Component>Props`.

Each package carries the library alone: `dist/`, the sources beside it and its styles (the core
also its tokens), with no stories, story fixtures or tests. Each package's `styles.css` is Tailwind
source that scans only that package's components: the core's also carries Tailwind, the fonts, the
tokens and the base styles, and an add-on's is imported after it in the same stylesheet. An app's
CSS so carries the classes of the packages it uses and none of the stories'; every app runs Tailwind
4.1 or later itself. For an app that wants the classes of its own imports alone, the core also
exports `styles-base.css` (`styles.css` pointed at no module) and every package a list of sources
per module, `sources/<module>.css`, written by the build from the module's imports: an `@source`
for each of its package's modules it reaches and the core's list for each core module it uses. The
app imports the list of each module it imports after `styles-base.css`. The themes are in the core. Storybook gets every package's classes and the
stories' from its own entry, `.storybook/storybook.css`, which imports each package's styles and
adds the stories as a source. The stories in `src/stories/` import the packages by their names; in
Storybook and the tests those names resolve to the packages' sources, so neither needs a build.

`examples/` consumes the packages as an app does: `examples/web` is a small Tidevann app that
installs the core package from `packages/core` and imports only its public entry points, and the Electron and
Tauri shells in `examples/electron` and `examples/tauri` load that app's build. The examples
workflow builds all three, so a break in a package fails a check rather than an app.

`examples/sizes` holds the size budget: a forms page, a dashboard, a map page and a music page, each
built against the packages in CI and measured gzipped (the JavaScript at start, what loads later,
the CSS). A check fails when one grows past its budget in `examples/sizes/budget.json` or bundles an
engine it does not use, so a forms page never carries ECharts, maplibre, React Flow, xterm.js,
hls.js, CodeMirror, Mermaid or KaTeX. A budget is the app's size plus about 3 percent. A change that
grows an app's start is cut first, by loading what it adds on first use; one that grows it on purpose
raises its budget in the same PR. The forms page imports only the core package, the dashboard adds the charts package, the map
page the maps package and the music page the media package. `forms-lean` is the forms page on
`styles-base.css` and its modules' lists of sources, so the lean path is measured too.

## Themes

Every theme is defined in `packages/core/tokens/tokens.json`, and `scripts/build-tokens.ts` writes it out.
`tokens.css`, which `styles.css` carries, holds the default theme and the density levels, so an app
that picks no theme needs nothing more. Every other theme is a file of its own in
`packages/core/src/styles/themes/`, exported as `@winterop-com/sokkel-ui/themes/<name>.css`, with its light and
dark tokens on `html[data-theme]` for the whole app and on `[data-theme-scope]` for one element,
such as a theme picker's swatch, each written once for both; `themes.css` imports them all. Every
scope first takes the default's whole set from `tokens.css`, at no specificity, so the page's theme
never shows through a scope of another. An app imports the files of the
themes it offers and sets one on `<html data-theme>`, so its CSS carries no theme it never shows.
Storybook imports `themes.css`, so its toolbar offers every theme.

Beyond its colors a theme can give the frame's parts a look of their own, through tokens the parts
read (`$parts` in `tokens.json` lists them): the heading face, a section head's ground, rule and
ink and a page title's ink; a table's head (ground, rule, ink, case) and its zebra; a wash over the
editor's and a code block's ground and over their gutter; the scroll area's thumb and track, which
the browser's own scroll bars take where `--scrollbar` names them; the shell's foot strip; and the
palette's insets. Each defaults to what the part drew before, so a theme that sets none looks as the
default does. Corners go by role: controls (buttons, fields, selects, toggles, the composers) round
by `--control-radius` and surfaces (cards, boxed sections, popovers, menus, dialogs, code blocks)
by `--surface-radius`, each `var(--radius)` unless a theme derives another from it, so one theme
has sharp surfaces and round controls and another the reverse. Ocean (deep sea blues, teal), indigo
(an indigo primary on cool neutrals) and terminal (green on black in the code face, a light console
by day) use them.

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

The rail's mark and name lead home (`markHref`, drawn by `renderLink`); collapsed, the mark expands
it, and so does its edge, pulled outward (the rail following the pointer and keeping the width it is
let go at) or with Enter, Space or the right arrow. `TopBar` holds a search field at its start
(`search`, a `SearchField` or a `Search`, which `/` focuses), the trail after it, and the palette's
button at its end with the keys that open it; on a phone the field gives way to that button. The
account menu offers Light, Dark and System in itself (`scheme`, `onSchemeChange`), staying open as
one is chosen; an app's own rows (`extra`) carry their icons, and where no one is signed in
`onSignIn` stands in Sign out's place with an icon of its own. On a phone its rows are a finger's
height and Keyboard shortcuts is left out. A new `contentKey` on `Shell` mounts the page afresh,
as after the server has come back, without a wrapper of the app's.

A screen adds what only it can do to the palette with `useCommands(groups, deps)` while it is
mounted and takes it away when it unmounts; the shell holds the registry and lists those groups with
its own by each group's `rank`, a screen's first at equal rank, groups of one title as one. An app
that draws its own palette holds a registry with `useCommandRegistry`. A palette row with a `detail`
or `artwork` (an image's address or a node, round for a person) is two lines tall, drawn as a search
result is, and the palette's search results take `artwork` too. The palette matches by letters in
order unless its `filter` (`paletteFilter` on `Shell`) is `terms`, the library's own: every word
typed must be found in a command's label, `keywords`, hint, code, second line or group, and a label
starting with the query comes first. `keywords` on a command, and on a rail entry through
`placeCommands`, are matched and never drawn. `appearanceCommands` takes `useAppearance`'s settings
and setter, or the parts of a look an app keeps itself, each with its callback
(`onSchemeChange`, `onThemeChange`, `onDensityChange`), so the palette never overrules the app's
own keys.

Keys go through one registry, which `Shell` holds as it holds the commands. A screen binds its keys
with `useShortcuts(bindings, deps)` while it is mounted (outside a shell, in the page's own). A
binding names its key by the character it types (`KeyboardEvent.key`), so `?`, `/` and `*` work on
a Norwegian keyboard as on an American one: a character that is not a letter is matched as itself
whatever Shift, Option or AltGr the layout took, a letter by its case with `shift` saying so, and a
letter key that Option or a non-Latin layout turned into another character by its place. `mod` is
⌘ on a Mac and Ctrl elsewhere, the other one refusing the press. Keys are quiet while typing in a
field, where a slider keeps its arrows and a button its Space, and while a dialog, a sheet, a menu,
an overlay or the shell's palette is open, unless a binding asks (`inFields`, `inDialogs`); `scope`
hears a binding only inside an element marked `data-shortcut-scope`, before the same key outside it.
A later screen's binding comes before an earlier one's, and the shell's own (the palette's ⌘K or
Ctrl K, which a second press closes; `?`) come last. `ShortcutsDialog` lists every binding with a
`label` under its `group`, its keys written by `keyLabels` as the device writes them, then the
groups an app gives for keys it answers itself; `Shell`'s `shortcuts` makes the shell hold it,
opened on `?`, bound once, and from the account menu, and `shortcutsOpen` with
`onShortcutsOpenChange` holds it from outside, as for a palette row built beside the shell.
`useShell()` gives a screen inside the shell `openPalette` and `openShortcuts`. `SearchField`'s `/`
is a binding too. The palette can be held from outside (`paletteOpen`, `onPaletteOpenChange`). Left
to itself it opens only where nothing stands over the page; `mayOpenPalette(over)` is asked first
with the layer on top (a dialog, a sheet, a menu or an overlay from `useOverlay`, or null) and
decides in its place: no over an app's own full-screen view, yes over an app's own search, which
the app closes as the palette opens. On a touch screen the palette has a Close button.

`useOverlay(open, { onClose })` makes an app's own overlay behave as a dialog: the page outside it
inert, focus moved in, Escape closing the one on top, and focus back where it was; `Shell`'s drawer
and its panel over a narrow window use it. `useScrollMemory(key, ref)` keeps a scroller's place per
key for the session (in session storage, in memory where that is refused) and puts it back on
return, the shell's content when no ref is given. `useReducedMotion()` says whether motion is
reduced, from the look's own `motion` and else the system's, following both, for motion a script
draws.

On a phone the shell's drawer draws the rail expanded, its account with it, even where the app holds
the rail `collapsed`; its head's end closes it, and a row chosen in the account menu closes it too.
Besides a press on a link it closes when the app's `route` (a location's path or key) changes, so
the palette and the app's own navigation leave it the same way; `drawerOpen` with
`onDrawerOpenChange` holds it from outside. A `banner` (a `Banner` saying the server is not
answering) stands between the top bar and the content, scrolling with neither. The shell's root pads
the safe-area insets on all four sides, for a home-screen web app and a notch; they are zero unless
the app's page sets `viewport-fit=cover` in its viewport meta.

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

`StatusChip` knows the nine run states without being told; an app names its own (`draft`,
`review`, `published`) with their words and a color (good, critical, warning, info, neutral or a
run state's) in a map, given to one chip as `statuses` or set once for the app by a
`StatusProvider`, which adds to the run states and may reword or recolor them. `Dot`'s `status` and
`Timeline`'s event `tone` read the same map, and `useStatus` gives a part that takes a CSS color
(`Stat`'s and `Segmented`'s `dot`) the state's color as its raw token, never a `--color-*` name,
which exists only once a class uses it. A state no map knows is said by its name and drawn neutral.
`StatusProvider` and `useStatus` are a module of their own, so a part that draws a state's color
carries no chip; `lib/status` holds the map's types, the run states and each color as a CSS color.

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

`SettingsDialog` holds an app's preferences: its sections in a navigation with a search over every
setting, the chosen section's rows beside it, and under both a footer drawn as `DialogShell`'s,
outside the scrolling, that says changes are kept as they are made (or the app's own `footer`, such
as when they last synced) and closes with Done. `onReset` adds Reset to defaults at the footer's
start, for the shown section or for every setting, asked once more before it runs. On a phone the
dialog is a full-screen sheet with the footer at its foot, clear of the home indicator.

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
a title bar, copy and clear, writing only what was added while output streams in. The terminal
ground is dark in both schemes; every theme gives it an accent in its own hue (`--terminal-accent`,
the ANSI blue and the selection), and the title bar ground, `--terminal-bar`, is mixed from the
theme's terminal ground and accent. SignIn's dark brand pane stands on the same bar on a phone.

## Media

The music and video app parts have a package of their own, `@winterop-com/sokkel-ui-media`, so an
app that plays nothing does not carry them: `MediaBar` with its layouts, parts and
`MediaFullscreen`, `TrackList`, `ChapterList`, `Lyrics`, `MediaCard`, `Artwork` and its seeded
covers (`cover-seed`), the arithmetic of chapters, of a timeline over several files and of the
bar's growth, the queue (`queue`, `useQueue`), LRC lyrics (`lrc`), `useMediaSession` with its
helpers in `media-session`, a position read on every animation frame (`useFramePosition`), and
`hlsSource` in `hls-source`. It stands on the core by name, and its one engine, hls.js, is an
optional peer it loads only when a stream plays. What a core part plays through
stays in the core, under `@winterop-com/sokkel-ui/media/*`: `AudioPlayer` and `VideoPlayer`, which
attachments, chat messages, the composer and a spoken answer use; the controls they share
(`MediaControls`, `MediaSlider`), the times (`time`) and one sound at a time (`one-sound`); and
`SoundVisualizer` with what it reads sound through (`sound`, `sound-source`, `sound-delay`), which
the `bar-visualizer` primitive draws with.

VideoPlayer, MediaBar, MediaCard and TrackList carry video and music, and the `AudioScrubber`
primitive draws a recording's waveform under its position. AudioPlayer plays a recording in one line
(a clip or voice note in a message, an answer read aloud) from the same controls.

VideoPlayer plays a URL in `src`, or a `source` (`VideoSource` in `media/video-source`): an object
whose `attach(video, report)` gives the element its media and returns what takes it away, with an
optional `canPlay(video)` and an `id` that says when it is a new source, so an add-on feeds the
element and the core never knows the engine. `hlsSource(url, options)` in the media package is one:
an HTTP live stream, played natively where the browser plays HLS itself (Safari, and recent
Chromium) and otherwise through hls.js, loaded by a dynamic import the first time a stream plays (or
always through hls.js with `native: false`). hls.js is an optional peer dependency of the media
package, so only an app that plays streams installs it, and it never enters the core. hls.js draws
every HTTP live stream. The source recovers from a fatal network error by loading again and from a
fatal media error by recovering the decoder (swapping the audio codec from the second time),
`recoveries` times each, counting from zero once a fragment is buffered, and then leaves the next
try to the player; every error goes on to `onError`. The Storybook serves a stream cut from the
clip (`src/stories/media/fixtures/stream`, about 90 kB) as a static folder, and a fake hls.js in
the tests drives the recoveries.

The player starts at `startAt`, taken when the media has its length, for resuming; tells where it
is through `onTime` and the end through `onEnded`; and meets a stall (waiting for data longer than
`stallAfter` while playing) or a network or decoding error by loading the media again where it
was, `retries` times, a second before the first try and twice as long before each next, saying
"Trying again" over the picture meanwhile. Once the tries are spent it says the video could not be
played, with Retry; media the browser cannot play is said at once. `onError` hears each with
`fatal` false while it tries and true once it gives up. `keys={false}` leaves every key to the
app, whose shortcuts drive it through the handle on `ref` (`play`, `pause`, `toggle`, `seekTo`,
held until the media can take it, `seekBy`, `setVolume`, `toggleMute`, `toggleFullscreen`,
`retry`, and what it plays, where and how loud); `onFullscreenChange` says when the picture fills
the screen.

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

A queue keeps its list and the order it plays in apart (`queue`, pure and tested): shuffle is an
order of its own, drawn from a seed or given whole, with the item playing first, so turning it off
carries on from that item's place in the list; repeat is off, all or one; next and previous follow
the order and the repeat, a press of next moving on even while one item repeats (going round from
the last, so the listener is never held in the loop) and the end of that item playing it again;
previous goes round from the first item only while the whole queue repeats, and otherwise, one item
repeating or none, has nowhere to go, which `useQueue` answers by starting the first item over;
adding, removing and moving keep the current item current, and moving reorders the play order, as
a view of what comes next draws it. `useQueue` holds a queue in state
and tells the player what to do: play another item, the same one again, start this one over, or
stop.

A book or a long work over several files is one timeline (`timeline`): the listener scrubs and
picks chapters on the whole while an element plays one file, and `fileAt` and `timelinePosition`
turn a position on the whole into a file and an offset and back, a boundary belonging to the file
it starts; `chaptersAcrossFiles` moves the chapters each file carries onto the whole, so a chapter
may run from one file into the next. `ChapterList` lists the chapters with their starts and
lengths, marks the one playing and seeks to a chapter's start on a press; it is drawn by
`TrackList`, works with MediaBar's `chapters` (`chapterStarts`) and `timeline`, and shares its
following: the current row is kept in view in the box that scrolls the list, or the page, brought
to the middle on the first draw and on a change only when it is out of view, and left where the
reader put it while they scroll and for four seconds after (`useFollow`, with the arithmetic in
`follow`). TrackList's `progress` shows how far the playing row has played, the time left in place
of its length or a line along its foot. An album over several discs gives each track its `disc`, and
the list heads each disc where its tracks begin ("Disc 1", "Disc 2", from `words.disc`); a list on
one disc draws no head.

Lyrics are read by `parseLyrics` in `lrc`: LRC's timed lines, several stamps on one line, the
`offset` tag and the metadata tags, word stamps dropped; plain text, or LRC stamped all at zero,
reads as untimed. `Lyrics` fills the box it is given: timed lines follow the position, the one sung
inked in the middle and the rest faint, a press on a line seeking to it, and the same pause for a
reader who scrolls; untimed lyrics read as a page in verses. MediaBar's `lyrics` gives the
fullscreen view a lyrics button in its corner that shows them in the visualizer's place.

The bar draws the `position` the app gives it, which a media element reports about four times a
second on `timeupdate`. Given the playing element in `media`, or `getPosition` for a clock that is
not one element's (a timeline over several files), the scrubber and its times read the position on
every animation frame while it plays, so they move smoothly; only they draw again each frame, the
rest of the bar keeps to the app's `position`, which still counts the chapters, and a paused bar
holds the last frame read until the reported position moves. `useFramePosition` is the same clock
for an app's own readout. `face` puts the app's own now-playing display, such as a deck's readout,
in place of the words and the scrubber in the one line and in `rows`, beside the cover and before
the transport, the face then saying what plays and how far; in `rows` it takes the whole block
beside the cover that both rows had, stretched to its height, and the transport and the volume stay
where they sit without it. `panel`, `stage` and the fullscreen view keep their own. The bar starts at `defaultSize`, grown if it is tall enough (`rowsHeightFor`
gives the height at which `rows` draws a cover of a given size, 182 pixels for 158), and `size`
with `onSizeChange` restores a height the app kept. `fullscreenActions`, such as a star for what
plays, end the line under its title in the fullscreen view, so they never take the title's room.

MediaBar resizes from its top edge. Up to about 96 pixels every layout is the one-line bar; above
it the bar grows by its `layout`, picked from the player growth research, continuously and with no
jump: `rows` (the default: the cover across two rows, what plays, the transport and the volume over
a full-width waveform that grows from 18 to 96 pixels), `panel` (the large now-playing panel) or
`stage` (a centered stage). The heights where things change and the sizes between them are pure
arithmetic in `bar-growth.ts`. The visualizer rises faintly behind the words from about 96 pixels,
standing on the waveform. A corner button, or an app's own key through `fullscreen`, opens
MediaFullscreen, a now-playing view arranged after the layout, with the visualizer at full strength
and a picker of its kind; it asks the browser for its fullscreen and falls back to covering the
window, and it is a dark room in every theme: `.dark` around an element scoped to the document's
theme with `data-theme-scope`. Its title is never cut short: in `rows` the words take the head's
room up to the transport and the volume at its end, and in every layout the title wraps onto as many
lines as it needs, a size smaller once it would run past two lines (three on a phone), measured by
hidden copies at each size. `visualizerOptions` puts the app's own looks in the picker in place of
the library's kinds, for an app whose settings offer other styles: the picker reports the id chosen
through `onVisualizerOptionChange`, the app maps it onto its `SoundVisualizer`'s props, and the view
draws the visualizer as given. SoundVisualizer is the one live picture
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

In place of its one `color`, the visualizer draws along a `ramp` from quiet to loud: a named ramp
made of the theme's tokens (`heat` from the warning ink to the critical one, `cool`, `lagoon`,
`ink`, `primary`; `SOUND_RAMPS` in `media/sound`), or stops an app gives, each a token by name or a
CSS color, such as `['warning', 'primary', 'critical']` for a spectrum from amber through the
theme's primary to red. The stops are read in the canvas's own scope, so a ramp follows the theme, the scheme and a
`data-theme-scope` around it, and mixed in oklab into a few dozen colors once per theme, never per
frame. `rampBy="height"` (the default) runs the ramp up the box from the baseline as one gradient,
out from the middle line for a centered drawing and a wave, and out from a ring's circle, so a tall
bar passes through every color; `rampBy="level"` draws each bar and spoke in the one color its
level reaches. `mirror` draws a spectrum's bars or an area's curve standing on the floor over a
reflection that fades toward the foot. `effect` is `none`, `glow` or `trails`, both drawn on the
same canvas at little cost: a glow is the picture shrunk by halves and stretched back behind itself,
so what is lit blooms in its own colors; trails wipe only part of the last picture before drawing
the next, a share set per sixtieth of a second so a fast screen trails as long as a slow one, and a
quiet frame is drawn clean, so what rests is the floor. Trails also follow a `frame` the app
changes, as one passing levels it holds. Both are off while motion is reduced (`useReducedMotion`).

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
