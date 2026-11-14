# Plan

The library comes first; apps adopt it once it is whole. Every component has a story in Storybook
with real-shaped data, rendered by CI at every narrow width, failing one that throws or scrolls sideways.

## Distribution

The library is eight packages, built from one Bun workspace and released together at one version:
the core, the engine add-ons (and media), and the domain add-ons.

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
  with its layouts and fullscreen view, `TrackList`, `ReorderableTrackList`, `ChapterList`,
  `Lyrics`, `Transcript`, `SleepTimerMenu`, `MediaCard`, `Artwork`, `useMediaSession`, `useQueue`,
  `VideoStatsOverlay`, `UpNext`, `ChannelRow`, `MediaActions`, `WatchLayout`, and `hlsSource`, which
  plays an HTTP live stream in `VideoPlayer` through hls.js, an optional peer.
- `@winterop-com/sokkel-ui-fhir` (`packages/fhir`), the first domain add-on: the health-data
  standards' languages, FHIRPath and CQL, for `CodeEditor`, as the plugin `fhir`.
- `@winterop-com/sokkel-ui-dhis2` (`packages/dhis2`), a domain add-on for the DHIS2 platform: its
  expression languages for `CodeEditor`, as the plugin `dhis2`.

An app installs the core and the add-ons it draws with, so an engine is installed only by an app
that uses it, and the music and video parts only by an app that plays music or video. Each add-on
stands on the core as a peer dependency at the same version and imports it by its name; the core
never imports an add-on and no add-on imports another, which `src/rules.test.ts` holds. A part that
needs no engine and belongs to no domain goes in the core, save the music and video app parts in
the media package. The
core's own dependencies are what every app's frame draws with (Base UI, lucide, cmdk for the
palette, the class helpers, the Plex fonts) and dnd-kit, small and loaded only by the parts that
drag; every library only some parts need is an optional peer
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
`TimeRangePicker` and the date fields load the calendar when first pointed at or focused, the
highlighter loads Shiki with the first code drawn plain until then, `MediaBar` loads its
fullscreen view after the bar is drawn, and every menu (`primitives/dropdown-menu`,
`primitives/context-menu`, `AccountMenu` and the parts drawn with them) loads Base UI's menu once
the page is drawn, its trigger drawn until then by a stand-in that looks and reads the same, a press
or a right click on it opening the menu as soon as the menu is there. A menu bar has the menu at
once (`primitives/menubar` imports it), as its keys need. `DataTable` loads Base UI's checkbox, the
watch that measures its content cells again and its menus' lists once it is drawn, and only when it
selects, has a content column or draws a column or sort menu, its selection boxes drawn the same
until then and taking a press the same, so a plain table carries none of it; its scroll memory loads
the first time a table with a `scrollKey` is drawn. `CheckboxField` and
`SchemaForm`'s sets of choices draw a plain box in the same look (`PlainCheckbox`, a button that
ticks), so a forms page carries none of Base UI's checkbox either. A module that only asks whether a node is a part tells it by a mark, so it
need not import the part (`isSoundVisualizer`), and `chartLegend` names a kind's legend without
importing it: a frame loads that kind's legend the first time it lists one, and a legend's table
mode loads `DataTable` the first time it is drawn.

`dist/` is built, not committed, so an install from a repository URL gets no compiled code (bun also
blocks such a dependency's install scripts). The tag workflow publishes the eight packages to GitHub
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

`examples/` holds apps that consume the packages as an app does. Each example is a Tidevann
product in a folder of its own, `examples/<name>/`: `web/` is its Vite app, which installs the
packages from `packages/` and imports only their public entry points, and `electron/` and `tauri/`
are thin desktop shells that load that app's build under the example's own name. What the examples
share (the fake backend, the window frame, the hash route and the mark) is `examples/shared/`, which
each app installs as a local package. The examples workflow builds every app and checks every
shell, so a break in a package fails a check rather than an app.

`size/` holds the size budget: a forms page, a dashboard, a map page and a music page, each
built against the packages in CI and measured gzipped (the JavaScript at start, what loads later,
the CSS). A check fails when one grows past its budget in `size/budget.json` or bundles an
engine it does not use, so a forms page never carries ECharts, maplibre, React Flow, xterm.js,
hls.js, CodeMirror, Mermaid or KaTeX. A budget is the app's size plus about 3 percent. A change that
grows an app's start is cut first, by loading what it adds on first use; one that grows it on purpose
raises its budget in the same PR. The forms page imports only the core package, the dashboard adds the charts package, the map
page the maps package and the music page the media package. `forms-lean` is the forms page on
`styles-base.css` and its modules' lists of sources, so the lean path is measured too.

## The design contract

sokkel-design (`winterop-com/sokkel-design`) is the contract sokkel-ui and the native renderer both
implement: a spec per part and pattern (its options, sizes per density, states and the paint of
each, keys and English words), written once. `design/` holds a copy of its `index.json` and the JSON
under `schema/`, `parts/` and `patterns/`, at the commit `design/pin.json` names, and is never edited
here. `bun run design --check` (CI and the release, skipped where GitHub cannot be reached) fails
when the copy is not that commit's.

`src/parts.test.ts` checks every spec in `design/` against the components, offline and without a
browser, from what React draws on the server and from the sources: each word the spec lists is the
component's English default and each default is in the spec; each option's values are the variant
keys or the prop's values; each size's lengths are the tokens its classes use (a height by its
density token, `h-(--density-control-sm)` for `density.control-sm`); each state's paint is the class
its selector picks, as the cascade would, in light and in dark (`primary/80` on hover is
`hover:bg-primary/80`); and each key binding is handled where the source shows it. What only a
browser shows (a tooltip on focus, Base UI's Escape) is listed beside the part with the reason. A
spec's `drift` entries for sokkel-ui are differences on purpose: the test names the checks each one
covers, passes on them, and fails once one no longer differs, so fixed drift leaves the spec.

When `parts.test` fails, either the component is wrong, and is fixed here, or the spec is: then the
spec changes in a sokkel-design PR first, the difference waits in the test's `PENDING` with the note
"spec change pending" until it lands, and the pin moves past it. To move the pin, run
`bun run design --ref main` (or a tag or commit), or `bun run design --from ../sokkel-design` for a
local checkout whose changes are committed and pushed; both write the copy and `pin.json`, and the
move is committed with whatever the new specs ask of the components.

## Themes

Every theme is defined in `packages/core/tokens/tokens.json`, and `scripts/build-tokens.ts` writes it out.
`tokens.css`, which `styles.css` carries, holds tidevann, the base theme, and the density levels, so
an app that picks no theme needs nothing more. Every other theme is a file of its own in
`packages/core/src/styles/themes/`, exported as `@winterop-com/sokkel-ui/themes/<name>.css`, with its light and
dark tokens on `html[data-theme]` for the whole app and on `[data-theme-scope]` for one element,
such as a theme picker's swatch, each written once for both; `themes.css` imports them all. Every
scope first takes tidevann's whole set from `tokens.css`, at no specificity, so the page's theme
never shows through a scope of another. An app imports the files of the
themes it offers and sets one on `<html data-theme>`, so its CSS carries no theme it never shows.
Storybook imports `themes.css`, so its toolbar offers every theme.

Density is a level an app wears on `<html data-density>`, regular (the default) or compact, and on
`[data-density-scope]` for one element, as a story shows both levels side by side. Each level is a
set of `--density-*` tokens in `tokens.json`: the page's insets and gaps, a panel's head and
padding, a row, the inspector's and the chat's spacing, and a control's height at each size,
`--density-control-xs`, `--density-control-sm`, `--density-control` and `--density-control-lg`
(1.5, 1.75, 2 and 2.25rem regular; compact takes each one step smaller, 1.25 to 2rem). Every
control reads its size's height: `Button` (its icon squares too), `Input`, the select triggers,
`Toggle`, `Segmented`, the tabs list, the menubar, the input group and the frames the fields build on
it (the typed fields, `SearchField`, `SecretField`, `AsyncSelect`, `TreeSelect`, `InlineEdit`, a
one-line `CodeEditor`), the issue mark and count, `FilterChip` and a control-sized `Chip`, and
the lines that hold them (`Toolbar`, `TopBar`'s palette button, a field group's head), so a button
beside a field beside a select stands level at either density. Below `md` a control keeps its
finger minimum; an `xs` button keeps its drawn size there and takes a finger's hit area instead.

The tokens the design contract names for every renderer, beyond the colors and lengths, are in
`tokens.json` too (`$contract` lists them), each with a utility the components use rather than a
literal: keyboard focus is a `--focus-ring-width` outline `--focus-ring-offset` outside the part
(`outline-focus outline-offset-focus`, or `ring-focus`); a refused value's ring with focus is
`--invalid-ring` (critical at 20 percent, 40 in dark), `--invalid-ring-width` wide (`ring-invalid
ring-invalid-ring`); a part that cannot be used is drawn at `--disabled-opacity`
(`opacity-disabled`); motion is `--motion-fast` (popups and dialogs) or `--motion-base` (the
rail, the drawer, a sheet) on `--motion-ease` (`duration-fast`, `duration-base`, `ease-motion`),
all stilled when motion is reduced; the drawer, dialogs, popups and toasts stand on
`--layer-drawer`, `--layer-dialog`, `--layer-popover` and `--layer-toast`, in that order, so a popup
opened in a dialog shows over it (`z-drawer`, `z-dialog`, `z-popover`, `z-toast`); and the
breakpoints `md` and `lg` are `breakpoint-md` and `breakpoint-lg` (768 and 1024), which
`MOBILE_QUERY` reads too. An elevation is written as its layers, each an x, y, blur and spread in px
and a color, which the build writes as a box-shadow; `--elevation-dialog` is `--elevation-pop`
until a theme sets its own. `src/rules.test.ts` fails a hand-set focus ring, disabled opacity,
`z-40` or `z-50`, or a 100 or 200 ms duration.

The overlays share one look each. Every popup (a select's list, a menu and its submenus, the
account menu, a combobox's list, a popover) wears `lib/popup`'s `POPUP`: the popover ground and
ink, `radius-surface`, a 1px `border-strong` edge and `elevation-pop`, with no shadow or look of
its own. Every list of choices (a select, a menu, the palette, the top bar's search) highlights its
row in `accent` with `accent-foreground` for its icon, label and quiet words, stops at its first and
last rows, and is reached at them by Home and End; a one-line select or menu row is
`density.control` tall. There is one tooltip, the inverted one, waiting 500 ms under the pointer
from the primitive's own default and showing at once on keyboard focus. A dialog is a box on
`elevation-dialog` with a `border-strong` edge from `md` (768), and below it a full-screen sheet with
neither, the settings dialog a list of sections to go into; a `ConfirmDialog` stays a box. No
backdrop blurs what is under it, so every renderer draws the same one. Work under way holds its
overlay: a palette whose command runs, or a dialog whose confirm is busy, ignores Escape, a press
outside and its close, until the work has run `busy-release` (5 seconds, a token, and `busyRelease`
on the part); then Stop waiting, Escape and the close let it go, nothing cancelled and the work's
answer unheard.

Beyond its colors a theme can give the frame's parts a look of their own, through tokens the parts
read (`$parts` in `tokens.json` lists them): the heading face, a section head's ground, rule and
ink and a page title's ink (each ink `foreground` unless a theme sets one); a table's head (ground, rule, ink, case) and its zebra; a wash over the
editor's and a code block's ground and over their gutter; the scroll area's thumb and track, which
the browser's own scroll bars take where `--scrollbar` names them; the shell's foot strip; and the
palette's insets. Each defaults to what the part drew before, so a theme that sets none looks as
tidevann does. Corners go by role: controls (buttons, fields, selects, toggles, the composers) round
by `--control-radius` and surfaces (cards, boxed sections, popovers, menus, dialogs, code blocks)
by `--surface-radius`, each `var(--radius)` unless a theme derives another from it, so one theme
has sharp surfaces and round controls and another the reverse. Ocean (deep sea blues, teal), indigo
(an indigo primary on cool neutrals), terminal (green on black in the code face, a light console
by day) and steel (a steel-blue rail, bars and heads over the cool gray) use them. Ember is the
quiet one: warm white and neutral grays, with its ember spent only where the app acts (buttons,
links, focus, the chosen place), so its hovers and heads stay gray.

Applying and keeping the look is the library's too, never an app's: `useAppearance` keeps the theme,
scheme, density, corners, typeface and motion in `localStorage` and wears them on `<html>`,
`useScheme` does the same for the scheme alone, and `appearanceScript` wears the kept look before
the page draws. An app that keeps its settings elsewhere (an extension's storage, a desktop shell's
settings file) hands `setAppearanceStorage` its `read` and `write`, which may answer later: the page
wears the last known look until they do, kept as a copy in `localStorage` for the script. A page
that refuses inline script loads the same script as a file, `@winterop-com/sokkel-ui/appearance.js`,
which the core's build writes from `appearanceScriptFile()`, the defaults read from the script
element's data attributes. Storybook's toolbar wears its globals through the same `applyAppearance`. The
option lists a picker offers (`THEMES`, made from the tokens by `scripts/build-tokens.ts`,
`CORNERS`, `TYPEFACES` and `FACES`) are in `lib/appearance`.

Every app has the same frame: `Shell` with a `Rail` of its places, the command palette on ⌘K or
Ctrl K through `Shell`'s `palette`, an `AccountMenu` in the rail's foot, `local` until the app has
sign-in, and a `StatusLine` as the shell's `foot`, which draws the foot strip itself in the room the
shell gives it and which the account sits level with as one bar across the window's bottom edge.
Every control of the frame (the rail's entries, mark, home link and collapse control, the top bar's
menu button, crumbs and palette's button, the panel toggle, the account) wears the button's own
focus look on keyboard focus, a ring outline two pixels off, and the top bar's menu button looks
like the rail's collapse control.

The rail's mark and name lead home (`markHref`); collapsed, the mark expands
it, and so does its edge, pulled outward (the rail following the pointer and keeping the width it is
let go at) or with Enter, Space or the right arrow. `TopBar` holds a search field at its start
(`search`, a `SearchField` or a `Search`, which `/` focuses), the trail after it, and the palette's
button at its end with the keys that open it; on a phone the field gives way to that button. Its
trail ends at the current screen, or with `trailEnds="ancestor"` at the screen above, every crumb a
link and the last one the way back on a phone, for an app whose page heading names the screen.
On a phone the palette's button is a finger square; `palette={false}` leaves it out, as for a bar
drawn as a specimen on a page of a shell that has its own. `ServerMenu` in the bar's actions takes
the app's own states (`states`, such as degraded), a `quiet` face that is a silent dot until
something is wrong, the `checks` behind the state in a tooltip headed by the name, `environment` and
version and, with `checkedAt`, when it was last asked (`recheck` asks again as the tooltip opens),
and `onPress` to open the app's own pane in place of its menu. The account menu takes a `detail`,
such as a role, muted beside the name; the name keeps its room, and a row narrower than 13rem
leaves the detail to the menu's head. The
account menu offers Light, Dark and System in itself (`scheme`, `onSchemeChange`), staying open as
one is chosen; an app's own rows (`extra`) carry their icons, and where no one is signed in
`onSignIn` stands in Sign out's place with an icon of its own. On a phone its rows are a finger's
height and Keyboard shortcuts is left out. A new `contentKey` on `Shell` mounts the page afresh,
as after the server has come back, without a wrapper of the app's. A work page with list and detail
panes of its own narrows the rail to its icons or hides it while it is shown, with `useRailMode`
(or `Shell`'s `railMode`): the latest screen's ask wins, the rail is as the app holds it once none
asks, a narrowed rail's mark still widens it for the reader with the account following, and a
hidden rail opens as the drawer from the top bar at every width. A screen that knows its own head,
such as a run page whose trail ends at the run, draws the top bar with `ShellTop` while it is
mounted, in place of `Shell`'s `top`, the latest screen's winning; the shell's own is back once none
draws one. A screen that knows only its trail states it with `useShellTrail(trail, { ends })`, and
the `TopBar` in `Shell`'s `top` draws it in place of its own, keeping its search, palette button and
actions. A `PageHeader` inside the shell states its `trail` the same way rather than drawing it
(`trailInTop`, the default there), so a page never draws a second trail; outside a shell it draws
the trail over its title. A screen's head that stays in view while its content scrolls, its `PageHeader` and tabs,
goes in `ShellHead`, held above the shell's scroller in the page's inset over a rule (`inset={false}`
for a head that draws its own edges), the content still the one scroller `useScrollMemory` follows.
That scroller's bar is `--scrollbar-width` (10px) on a solid track that keeps its room whether or
not the content scrolls (`scroller-thin`), and the head keeps the same room, so both end at one
right edge.
`useMedia(query, initial)` and `useIsMobile()` (`MOBILE_QUERY`) answer as a part first draws in a
browser, so a phone never draws the wide layout first; `initial` is the server's answer.

Every link the library draws is a `Link`: the rail's places, the top bar's and a page header's
trail, a nav bar's places, a stat, a stat panel, a card, a profile, a channel, a link in text, a
breadcrumb, a page number. An app with a client router sets `LinkProvider` once at its root, its
`render` drawing the router's link from the anchor's props (spreading them, `ref`, `className`
and `onClick` among them), so every one of them moves without a reload while it stays a real
anchor for a middle click, Cmd-click or "Copy link address"; `useLink` gives the same as a render
function. Only internal links go through `render` (`isInternalLink`): one that opens a new tab
(`target` other than `_self`), downloads (`download`) or names another origin (`https:` elsewhere,
`//host`, `mailto:`, `tel:`) stays a plain anchor, as `ApiLink`, an external `TextLink`, a
Markdown link and a map's credits are; the provider's `internal` replaces that test when an app's
renderer takes those too, or leaves out paths on the app's own origin that its server answers and
its router does not own, such as an API's documentation page. A contents list's jumps stay in the page and never reach the router.
With no provider every link is a plain anchor, which a hash router follows as it is.

A place whose content is a hierarchy to browse, such as a music library's artists and albums, puts
it in the rail itself with `body`, so the app keeps one left column rather than a second beside the
rail: a tree and its search in place of the places, under a row back to them (All places), with the
same head, width, edge and foot. A place chosen from the places, or a body given anew, shows the
body again; collapsed, the rail draws the places' icons, a body having no icon form, and expanding
it shows the body as it was left; the drawer draws the body, and the palette still lists every
place.

A screen adds what only it can do to the palette with `useCommands(groups, deps)` while it is
mounted and takes it away when it unmounts; the shell holds the registry and lists those groups with
its own by each group's `rank`, a screen's first at equal rank, groups of one title as one. An app
that draws its own palette holds a registry with `useCommandRegistry`. A palette row with a `detail`
or `artwork` (an image's address or a node, round for a person) is two lines tall, drawn as a search
result is, and the palette's search results take `artwork` too; a one-line row's `meta` is a quiet
summary in the code face at its end, folding under the label on a phone, and `metaTone` sets it in
a status ink, so a summary saying something is missing reads critical. A command whose `onSelect`
answers a promise keeps the palette open, its row busy, until it settles: fulfilled, the palette
closes; rejected, it stays and says why in a `ProblemLine` under the rows, so a refusal is said
where the choice was made. The palette matches by letters in
order unless its `filter` (`paletteFilter` on `Shell`) is `terms`, the library's own: every word
typed must be found in a command's label, `keywords`, hint, code, second line or group, and a label
starting with the query comes first. `keywords` on a command, and on a rail entry through
`placeCommands`, are matched and never drawn. A command that cannot run now stays in the list as
`disabled`, dimmed and passed over, with why in its hint's place, so an app never builds its
groups around it. `appearanceCommands` takes `useAppearance`'s settings
and setter, or the parts of a look an app keeps itself, each with its callback
(`onSchemeChange`, `onThemeChange`, `onDensityChange`), so the palette never overrules the app's
own keys.

Keys go through one registry, which `Shell` holds as it holds the commands. A screen binds its keys
with `useShortcuts(bindings, deps)` while it is mounted (outside a shell, in the page's own). A
binding names its key by the character it types (`KeyboardEvent.key`), so `?`, `/` and `*` work on
a Norwegian keyboard as on an American one: a character that is not a letter is matched as itself
whatever Shift, Option or AltGr the layout took, a letter by its case with `shift` saying so, and a
letter key that Option or a non-Latin layout turned into another character by its place. `mod` is
⌘ on a Mac and Ctrl elsewhere, the other one refusing the press, save a binding with `alsoCtrl`,
which a Mac's Ctrl answers too: the palette's, so ⌘K and Ctrl K both open it there and close it
again (cmdk's own Ctrl keys are off, so Ctrl K means one thing), while Ctrl keeps its editing keys
in a field for every other binding. Keys are quiet while typing in a
field, where a slider keeps its arrows and a button its Space, and while a dialog, a sheet, a menu,
an overlay or the shell's palette is open, unless a binding asks (`inFields`, `inDialogs`); `scope`
hears a binding only inside an element marked `data-shortcut-scope`, before the same key outside it.
A binding with `next` is a sequence, G then D (`key: 'g', next: 'd'`) for a two-key way to a
place: the second key must come within a second, a sequence is never heard in a field, whatever
`inFields` says, and a pending first key is dropped on Escape, on any other key and when the time
runs out. A single-key binding on a sequence's first key still runs once it is clear no second key
is coming: when the time runs out, or at once when another key follows, which is then heard as
itself. Refusing the clash instead would leave a screen's key and a sequence bound elsewhere to
fail where they meet; the wait falls only on a key that starts a sequence, and every other key runs
at once. A later screen's binding comes before an earlier one's, and the shell's own (the palette's
⌘K or Ctrl K, which a second press closes; `?`) come last. `ShortcutsDialog` lists every binding with a
`label` under its `group`, its keys written by `keyLabels` as the device writes them, a sequence as
its two keys with "then" between (the word `sequence`, which the app can give), then the
groups an app gives for keys it answers itself, each shortcut known by its id and keys together: an
app's on a bound one's id but other keys is listed beside it, and one on the same id and keys is
listed once, in the app's words and group; `Shell`'s `shortcuts` makes the shell hold it,
opened on `?`, bound once, and from the account menu, and `shortcutsOpen` with
`onShortcutsOpenChange` holds it from outside, as for a palette row built beside the shell.
A palette row's `keys` take a sequence the same way: its second press in `next`, drawn after the
first with the palette's `sequence` word between, as the dialog draws it, and `bindingKeys(binding)`
from `lib/keys` gives both from the binding that runs the command, a chord as one press.
`useShell()` gives a screen inside the shell `openPalette` and `openShortcuts`. `SearchField`'s `/`
is a binding too, on the field's own input, so no mark on the box finds it; an app that answers `/`
itself turns `shortcut` off and can mark the input with a `data-*` attribute through `inputProps`,
which passes any `aria-*` or `data-*` on. Its `label` names the field (as "Search jobs") where the
placeholder stays Search, the page around it naming what is searched. The palette can be held from outside (`paletteOpen`, `onPaletteOpenChange`). Left
to itself it opens where nothing stands over the page, and over a `Search`'s results, such as the
top bar's, which close as it opens, the palette taking the search's place; over any other layer it
stays closed. `mayOpenPalette(over)` is asked first with the layer on top (a dialog, a sheet, a
menu, a search's results or an overlay from `useOverlay`, or null) and decides in its place: no
over an app's own full-screen view, yes over an app's own search, which the app closes as the
palette opens. `overSearch(over)`, from `Shell`, says whether the layer is a `Search`'s results, so
an app's own rule never reads how the library marks them. On a touch screen the palette has a Close button.
A `Search`'s results open on typing, a press on the field or the down arrow, never on focus alone,
so focus the palette or the shortcuts dialog gives back to the search as it closes leaves them closed.
Results belong to the query they answer (`useSearch` tags each state with it): while the next answer
comes an earlier query's results stay dimmed and out of reach, in `Search` and the palette alike, so
the list does not jump yet nothing from the old query opens as the new one's; a failed search shows
its failure (`words.failed`) over a Retry row, whatever was listed before, and the palette never says
no command matches while its search waits or has failed. Stale results stand only while a query is
refined in one open list: emptying the field or closing the list lets them go, so a query typed
after says it is searching. `Shell`'s `routeKey` moves the focus out of the field a result was
opened from to the new page's first `h1` a reader can see (laid out, outside any inert or
`aria-hidden` part) and that is none of the headings shown as the route changed, unless its words
changed; a page still loading is waited for, up to 3 seconds and until the reader presses a key or
the pointer.

`useOverlay(open, { onClose })` makes an app's own overlay behave as a dialog: the page outside it
inert, focus moved in, Escape closing the one on top, and focus back where it was; `Shell`'s drawer
and its panel over a narrow window use it. `useScrollMemory(key, ref)` keeps a scroller's place per
key for the session (in session storage, in memory where that is refused) and puts it back on
return, the shell's content when no ref is given. A `DataTable` that scrolls itself keeps its place
with `scrollKey` the same way, drawing the rows in view at it and, while it lies past the rows loaded
(`hasMore`), asking for more until they reach it, by the button's way too; `scrollerRef` hands the
app its scroller. `useReducedMotion()` says whether motion is
reduced, from the look's own `motion` and else the system's, following both, for motion a script
draws.

On a phone the shell's drawer draws the rail expanded, its rows a finger tall (`--spacing-finger`)
below `md`, its account with it, even where the app holds
the rail `collapsed`; its head's end closes it, and a row chosen in the account menu closes it too.
Besides a press on a link it closes when the app's `route` (a location's path or key) changes, so
the palette and the app's own navigation leave it the same way; `drawerOpen` with
`onDrawerOpenChange` holds it from outside. A `banner` (a `Banner` saying the server is not
answering) stands between the top bar and the content, scrolling with neither. The shell's root pads
the safe-area insets on all four sides, for a home-screen web app and a notch; they are zero unless
the app's page sets `viewport-fit=cover` in its viewport meta.

`SidePanel`'s tabs are a tablist (Base UI's tabs, as `Tabs` uses) and its content their tabpanel,
labelled by the shown tab, the arrows moving between the tabs. A panel with one tab is headed by a
title naming it, as there is nothing to switch to; `soleTab="tab"` keeps a tablist of one for a
panel whose tabs come and go, so its header keeps its shape. Below `lg` the shell draws the panel as
a sheet from the right; with `panelStrip`, below `md` its tabs stand in a strip at the foot of the
screen in place of the toggle (each tab a finger's height, with the tab's `icon` over its label),
a tab raising the panel as a sheet from the strip on that tab and the open tab lowering it, and the
sheet's content the tabpanel of the strip's tab.

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

Every part that goes full screen (the player's fullscreen view, `VideoPlayer`, a map, a pane opened
with `fullscreen`) goes through `lib/fullscreen`: the browser's full screen, unless the app handed
the library its window's own as `desktop.setFullscreen` (Tauri's `setFullscreen`, which WKWebView
needs since it has no full screen for an element). Then the window goes full screen through that
call and the part's element covers it, in the top layer where the webview has one, Escape leaving
as in a browser; `desktop.fullscreen` reported as it changes lets the element go when the window
leaves by its own way. `useFullscreen` follows both, so the room for the window's buttons goes in
either.

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
Notes that link to each other are read by one module, `lib/wiki-links`: `[[Note]]`,
`[[Note|words]]` and `[[Note#Heading]]` link to a note by its name and `#tag` tags it, neither read
inside code. `Markdown`'s `links` draws them as links the app follows (`onOpen`, a link to a note
`exists` denies drawn faint, `onTag` for the tags), and `wikiLinksIn`, `tagsIn` and `mentionsOf`
give an app a note's links, its tags and where a name is written unlinked, for backlinks. Any other
link opens in a new tab unless `onLink` takes it: the app's own routes and the times in an episode's
notes stay in the page. Text other people wrote is held to what the app allows: `images={false}` draws an
image as its alt text and address and fetches nothing, `linkSchemes` lists the schemes a link may
have to be live (`relative` for a path, a query or a fragment) and draws any other as its words, and
a `javascript:` link is never live. `headingOffset` sets such a text's headings under the page's,
and `inline` draws it as one line of help. Raw HTML is shown as typed unless `allowHtml` is set, and
rehype-raw and rehype-sanitize load only then.

`DiffView` draws two versions of a text as one list of lines, by the longest run of lines they
share. Its header counts the lines added and removed, leaving out a side with none and saying "No
changes" when the two are the same, and holds an app's `actions` after the counts. Unchanged lines
further than `context` (3) from a change fold into a row that says how many it holds and opens them
on a press, so a long document opens on its changes; `foldDiff` is that fold as a function, and
`context={Infinity}` draws every line. An apply plan sets a `DiffView` beside a `ConsequenceList`,
the rows of what an action takes or changes under a heading that labels the list, its other props
going to its root.

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
components (Stack, Row, Columns, Split, Fill), SplitPane, Field, TextField, SelectField, DateField, TimeField,
DateTimeField, NumberField, InlineField, SliderField, CheckboxField, CheckboxList, ChoiceList,
CodeField, SwitchField, SearchField, QuickAdd, FileField, FilterChip, FilterBar, SavedViews, FormBar, InlineEdit,
SelectionBar, DataTable, StatusChip, Chip, PersonAvatar, PersonRow, MetaLine, DueText, AttachmentList,
IconButton, StarButton, SplitButton, DownloadButton, AccountMenu, SidePanel, DialogShell,
ConfirmDialog, TreeSelect, AsyncSelect, CapabilityPicker, SignIn, RelativeTime, ApiLink, TagChips,
DetailSheet, UptimeBar.
Every example arranges and builds its screens from these, never by hand, so a fix in one reaches
them all.

`Banner` is the strip at a screen's edge for a state that holds; `Callout` is a boxed note in the
content beside what it is about, in five tones (neutral among them) with a hairline edge all the
way round and no colored rule; `Problem` says what went wrong for a person, the raw message folded
away; `PageState` draws the states a read lands in (loading, failed, empty, the content), save a table's,
which `DataTable` draws itself (`loading`, `error`, `empty`), a failure
headed by what the server answered, with `onRetry` for a way to read again, and `tone="warning"`
for a failed read of secondary data the page stands without, drawn in the warning tone and
announced as a status rather than as the page's failure, its heading said of a part of the page
(`partRefused`, "Part of this page could not be read") where the critical tone's says the server
refused the page's read. `headingLevel="h1"` makes a failure's heading the page's own where the
state stands in for a whole page, as a detail page whose record failed to load, so `routeKey` has a
heading to focus. `Surface` sets content on a card's ground, a panel's (`well`) or the page's (`inset`) and
clips nothing, so a focus ring at its edge shows whole; unpadded, its first and last children take
its corners.

`DateField`, `TimeField`, `DateTimeField` and `NumberField` are typed: each reads what is typed by
one format, writes the value back in it once the field is left, and says text that does not read
with the issue mark, keeping the value as it was. Dates and times cross the API as ISO strings with
no zone (`2026-11-09`, `02:00`, `2026-11-09T02:00`, as HTML's `date`, `time` and `datetime-local`
inputs hold them), never as `Date`s, so a day never moves across a time zone and the zone a time is
read in stays the app's to name (`zone`). A value outside `min` and `max` is kept and said, with an
action that puts in the bound; `onIssueChange` tells a form what a field finds wrong so it can count
it. The display format is a prop (`format`, `clock`, a number's `format` and `parse`, with
`localeNumber` for a locale's marks) until the `locale` provider comes. The date fields pick from
the calendar, loaded on first use; `SchemaForm` draws numbers with `NumberField` and keeps the
browser's own date input, since the calendar would put the forms page past its budget.

`CronField` takes a five-field cron expression, reads it back in words and lists its next runs
after `from`. The expression is wall-clock time in `timeZone`, an IANA name, UTC by default; the
runs are counted and drawn in that zone, each with its offset outside UTC, from the zone's offsets
as `Intl.DateTimeFormat` gives them, with no time-zone library. Across a change of clocks it does
what Vixie cron and cronie do: a time the clock skips in spring runs once, at the instant the clock
jumps (02:00 and 02:30 in Europe/Oslo on the last Sunday of March run at 03:00), and a time it passes
twice in autumn runs once, at its first pass. `nextRuns(expression, from, count, timeZone)` and
`zonedTime` in `lib/cron` are the same reading for an app's own use. An app whose server reads the
runs back passes them as `runs`, in place of the field's own; `runsPending` shows the field's own
reading muted beside "Checking" while it asks, and `invalid` is the server's refusal in its words,
shown as the field's issue with no runs listed. Once an app passes `runs` or `invalid`, the server's
verdict is the field's: an expression the server takes in a syntax the field's own five-field reading
does not know (`L`, `#`, `W`, `?`) is valid and shows the server's runs, the field's reading only
putting it in words, and leaving the words line empty when it cannot. The zone is named once, beside
the label. An empty field says nothing yet: no issue, no words, dashed runs, with `placeholder` as an
example in the input. `readOnly` draws a saved schedule, the expression in the code face with its
reading and runs, and no input. `describeCron(expression, words)` takes `CronWords`, a phrase at a
time with English defaults (`CRON_WORDS`), so an app reads schedules back in its own language through
`describe`.

`SecretField` takes a secret a form sets and never reads back, such as a connection's token. With
one already set (`sealed`) it says so, masked, and when (`setAt`), and stays as it is unless Replace
opens an empty input for a new one, Cancel or Escape sealing it again; its value is the new secret
or undefined, so a form leaves an unchanged secret out of what it sends. Replace is named by the
field's label (`words.replaceLabel`, "Replace password"), so two sealed secrets are told apart.
`SchemaForm` draws a `writeOnly` property with it, sealed where `useSchemaForm`'s `sealed` names a
secret as set, its label passed on, and a required secret that is set asks for nothing more. `RepeatedGroup` is marked as a field is: a star
after its name when `required`, and the issue mark beside its name for what is wrong with the group
as a whole; `SchemaForm` draws its lists of records with it.

A records app is built from the same parts (Apps/Records). A `Rail` entry says what its
place holds on a second line (`description`), which the palette's Go to rows repeat; a palette row's
`hint` is words and its `code` an id in the code face. `Stat` as a `tile` is a count on a card of its
own, a state's dot before its label and a note under it, leading to what it counts, and `emphasis`
edges the one that asks for work. `UptimeBar` is a thing's record over the last days, a bar a day in
its state's color or by its uptime, the oldest giving way in a box too narrow for them all, and the
day pointed at said under it with its note. `Badge` takes a `kind` color for a categorical value, such as the
sort of form a card is, and `Segmented` options carry a count and a state's dot. `Section`,
`PaneHeader` and `Field` take a `description`, a field's between its label and its control. A
`Section`'s `tone` draws its body on a graph canvas's ground and dot grid (`graph`), for a fitted graph
or any drawing with no ground of its own, or marks it with a rule in the critical tone across its top
and a warning mark before its title (`critical`). A section is labelled by its heading, whose id
`headingId` sets, and `bodyClassName` lays out its body's content.
A required `Field` is marked by a star in its label, or with `requiredMark="word"` by the word
after the label and outside it, so the control is named by its label alone and says it is required
with `aria-required`; `fallback` says under the control what applies when the field is left empty.
`SchemaForm` takes both, `requiredMark` and `fallbacks` (a schema `default` said under its field,
nothing for a `null` one, and only once a value is set, since an unset field shows it in its place). An optional field left unset with a schema `default` shows it, muted, as
what applies ("normal (default)" in a select's or an input's place, the word beside a switch),
without holding it in the value; choosing it holds it, and the select's first choice
("Default (normal)", `words.useDefault`) or an emptied box goes back to unset. `initialValue` writes only the defaults a
field cannot show so: a required field's, and an object's or a list's. An object of any keys whose
values are each one scalar (headers, query parameters, environment variables) is a table of a key
and a value per row (`schema/MapField`), with Add and Remove, each row's boxes and Remove named by the map's label ("headers key 1", "Remove
headers Accept": `words.mapKey`, `mapValue`, `removeEntry`), a key given twice refused at the table
and left out of the value; a field that takes several scalar types (`anyOf` of a string and an
integer, as "16KB" or 16384) is one text box, read as the narrowest type the text parses as
(integer, number, boolean, then text) and checked against the schema. A field's own refusal of what
was typed is held with `hold`, which stops the submit as an issue does.
`fold` shows the required fields and those set when the form is first drawn and puts the rest
behind one disclosure ("3 more fields", `words.more`), which opens by itself while one of them has
an issue to show. `useSchemaForm` holds its own value from `initial`, or follows one held from
outside (`value`, `onChange`), as a document edited in an editor beside it; `blocking` says whether
the value would be refused, shown yet or not, so a verb can be shut quietly. The `field` hook
answers a control or its parts: the `control` the issue mark sits on, a row `below` it, and a `note`
beside the label (`Field`'s `note`). `words.secret` reaches each `SecretField`. The words for each
issue load with the checker (`schema/issue-words`), since nothing but a number that does not read and
a checker that cannot be fetched is said before it.
`ItemHeading` is the heading `ItemCard` draws for one thing, on its own: the name, else the code,
the code drawn once in the code face under the name (`stacked`) or beside it (`inline`), in a
panel's or a dialog's size, with a leading `glyph`, `chips` and a one-line `description`.
`PageHeader` decides its title and code by the same rule.
`DetailSheet` is one thing's detail in a sheet from the right, its chips and actions on one line
under the title, its body the parts its own page draws; `SourceSheet` is one.

`StatusChip` knows the nine run states without being told; an app names its own (`draft`,
`review`, `published`) with their words and a color (good, critical, warning, info, neutral or a
run state's) in a map, given to one chip as `statuses` or set once for the app by a
`StatusProvider`, which adds to the run states and may reword or recolor them. `Dot`'s `status` and
`Timeline`'s event `tone` read the same map, and `useStatus` gives a part that takes a CSS color
(`Stat`'s and `Segmented`'s `dot`) the state's color as its raw token, never a `--color-*` name,
which exists only once a class uses it. A state no map knows is said by its name and drawn neutral.
A `Dot` alone is decoration; `label` names it as an image, `tip` explains it in a tooltip a
keyboard reaches with `focusable`, `say` writes the word beside it where the state is news, and
`outline` draws it hollow in the tone's ink for a state not known. Its sizes are 6px, 8px (`md`, the
status dot, which `StatusChip`'s `dot` draws too) and 10px (`lg`, the default). `Chip` says any
other short value: neutral, good, critical, warning or info in its own ink, `outline`, a hairline
edge with no wash, or `absent`, dashed; `hue` gives it a category's color instead, one of the chart
palette's five (1 to 5) or a kind color by name (`blue`, `violet`, `green`, `pink`, `teal`, `jade`),
each a wash with its ink edged faintly in the color as a kind badge is, and a block badge passes its
`hue` on. One look for a category, edged, rather than an `edged` option: a chip that tells kinds
apart reads the same as a kind badge wherever it is. `mono` and `icon` set its face, `onSelect` makes
it a button, `href` a link through the `LinkProvider` (`external` opens a new tab with a mark, as
`TextLink` does), `menu` a menu's trigger whose menu lines up at `menuAlign`, and `onRemove` ends it
in a named remove button. A chosen toggle (`selected`) is edged in its ink over a stronger wash.
`size="control"` makes a chip that stands alone as a control as tall as one, a finger tall on a
phone.
`StatusProvider` and `useStatus` are a module of their own, so a part that draws a state's color
carries no chip; `lib/status` holds the map's types, the run states and each color as a CSS color.

A button that cannot be pressed now says why: `reason` on `Button`, `IconButton` and `SplitButton`
disables it and shows the reason on hover and focus, the button kept in the tab order so a keyboard
reaches it; `SwitchField` takes `reason` too, said in a line under its label, and its whole row is
the label, a long label breaking within its room and its note wrapping under it, never under the
switch. A button whose press is under way takes `busy`: a `Spinner` in place of its leading icon
(an icon-only button's icon), or before a label with none, the label kept, and the button shut
(`aria-busy`, `aria-disabled`) while it keeps its focus and its look. `IconButton`'s `tooltip` says a longer sentence than its name, `shortcut` draws the key
that does the same as a `Kbd` in the tooltip, and `destructive` tints it in the critical tone under
the pointer, as `destructiveHover` does any `Button`. `PointMenu` opens a menu at a point rather than
from a trigger, such as where a right click landed, its rows given as data with an optional head in
the code face. A menu is as wide as its longest row, never under its trigger's width nor wider than
the screen, and a menu holding checks keeps their marks in a gutter at the start that its plain rows
step past. On a phone menu, command and combobox rows and tabs are a finger tall, and a menu's or
tooltip's trigger drawn bare takes a finger-sized hit area without growing. `SplitButton` joins the main action to a menu of other ways, its main half named apart
from a short face by `label` and `title`; `DownloadButton` goes from
idle through n of m (or a share, for bytes) on a `ProgressRing`, with a cancel and, when the app can
hold one, a pause and a resume, to kept, its state held by the app.
`RelativeTime` says a time as "3 minutes ago" through `Intl.RelativeTimeFormat`, the instant on
hover, ticking on its own clock unless the app passes `now`. `ApiLink` names the request behind a
screen as a copyable chip. `TagChips` shows as many tags, as mono chips, as fit the room its row
has left and a +N for the rest, named by the tags it stands for; in a `DataTable` cell it fits its
column's room (`useTableCell`, a small module of its own so the tags carry no table), and on a
stacked card it wraps and shows them all. `DescriptionList`'s `row` layout sets its facts in one
wrapping line, and a `DescriptionListGroup` holds lists split around a form or a heading on one
term column, each one-column side list a subgrid of its tracks. `ListRow` takes a `tooltip` and
`wrap`, and `ListRows flush` sets its rows square at a panel's own inset with hairlines between,
or at a card's wider one with `inset="card"`. A `dense` row is one shorter line, its detail beside
its title, a `mono` title a code, and its `icon` may hold a dot and a mark side by side. Below `md`
a dense row's detail goes under its title, so a long code never hides it; a dense row that presses
stands a finger tall there, which holds both lines.
`LoadingBar tone="current"` is a thin line, known or not, in the ink around it.

`SignIn` is every app's door: a brand pane, dark in every scheme on `--brand-ground`, with art over
its upper part and the mark, the name and a few facts at its foot, beside a centered form of a
username and password (or a token, or the app's own fields), an optional server address, an error
over the submit and other ways in under a rule. The seam between the panes drags, and its width can
be kept in the browser; the form rises into place as it opens, with focus in its first empty field,
and the username can be kept in the browser once a sign-in goes through. A try under way holds the
fields without taking focus from them, and a refusal puts focus back in the password. The fields are
named and marked required, for the browser's password manager. Each field is led by an icon
unless `icons` is off, and `optional` lets the password, or every credential, be left empty for a
server that needs none. An app that finds its server itself says so in the server field's place
(`looking`), then offers a link to a different server (`found`) that brings the field back; with the
values held from outside (`values`, `onValuesChange`) it asks a typed address as it is typed, and
`probe` says in the brand pane what answered there, its version or no answer. On a phone the brand
pane is a bar over the form. The art that ships, `LevelBars` and `FlowLines`, is drawn from a seed in the
theme's primary and muted inks and holds still when motion is reduced; an app may pass its own.

DataTable is the one table, for five rows or fifty thousand: only the rows in view are drawn, at
the density's one row height, so 50k rows sort, scroll and select at once; rows that grow to fit
their cells are an option for short listings. It sorts from its heads, selects with a bulk bar or
picks one row for a list beside its detail, hides columns, resizes them from their heads' edges as
panels resize, pins its first column and its row menu, opens child rows of any depth (loaded when
a branch first opens, if the app wants), and moves by the keyboard as one tab stop, sorting from
there too: Up from the first row enters the head row, where Left and Right choose a sortable head,
Enter or Space turns its order and Down goes back to the rows. It pages in the browser or
from a server, loads more as its end comes near, and shows the same rows as a grid of cards (an
album view) that keeps the selection, menus and sort. A short listing drops the bar above its
head and may carry a foot line. Rows gather under group heads by a field or a key made from the row
(`groupBy`), each head with its label, its count and a column's `aggregate`; a head folds its
group, rows sort within their group, and a head's box selects the group, in the table, the list and
the grid alike. Below its stack width a row becomes a card of labeled lines, or with `stackLayout="compact"` a
row of its leads (a done box) and its title over one quiet line of the other columns, its values
edited on a press rather than drawn as fields; a stacked list keeps each row's box and menu. The
stack width is the table's own box's, never the window's, in pixels or a CSS length (`stackBelow="64rem"`
for an app whose listings go to cards under its own width): 576 pixels for a table, and for a list 480, a
phone's, or wherever its columns stop fitting, so a list in a narrow panel on a wide screen keeps its rows. With no
rows it says `empty`, a sentence or a node such as an `Empty` with an action, alone without the column
heads unless a search or tools in the bar may have emptied it. While its rows are on their way
(`loading`) it draws placeholder rows under its heads, filling the view or three after the last row
loaded, as bars in the shape of its stacked cards or listed rows once the rows stack: its one loading look, chosen over `PageState`'s spinner line because it keeps the table's
shape, so the bar, a search being typed in, the heads and the frame stand where the rows will and
nothing moves or unmounts as they come. A read that failed is said in the rows' place under the
heads (`error`, with `status`, `problems` and `onRetry`), drawn as an unframed `PageState` with its
words through the table's (`refused`, `missing`, `unreachable`, `retry`), the bar and the frame kept
and the count dropped; placeholder rows stand in its place while `loading` reads again. A listing is
never wrapped in `PageState` for either. A row opens into a `detail` of its own,
such as its own nested `DataTable`; `hasDetail` says which rows have one, so `detail` is built only for
the rows opened, and `expandLabel` names a row's disclosure, in its tooltip too ("Show the tokens of
ada"). `reveal` (`{ key, open }`, a new object each time, as `CodeEditor`'s `reveal`) brings a
row into view: the branches above it open, its group unfolds, its page shows, and it is scrolled to,
virtualized or not, and made the active row with the focus on the table; `open` opens its own detail
or children, and the search for its path loads with the deferred part. `rowTone` dims a row (`muted`, an account switched off, a token revoked) or tints it in a
status's tone (`critical`, `warning`), from tokens, so an app sets no color of its own. A column of
`width: 'content'` is as wide as its widest cell, up to its `maxWidth` and no narrower than its
`minWidth`, the other columns sharing what is left, and a dragged width wins. Its cells are measured at
their own width however narrow the box, and measured again once fonts load or a cell's value is cut
short, so a code measured in a fallback face is never left cut. The measured width counts toward the
row's least width, so a table stacks once its content columns and the rest no longer fit, and a list
(`minWidth="auto"`) stacks then rather than scroll sideways. Tables of one shape in separate sections
line up inside a `DataTableGroup`, each content column as wide as the widest of the group's tables. A
cell's content fills its track, and a part of it in `TableCellFill` (or marked `data-measure="skip"`)
is left out of the column's measure, so a description under a code takes the column's width, its
`minWidth` or its group's widest, without adding to it. A cell reads its table through
`useTableCell()`: the box's width, whether the rows are stacked, and `columnWidth`, the room its own
column gives it (the track inside its padding, or the value's part of a stacked line), measured from
one drawn cell a column by one observer for the table once a cell reads it, so its chips fold to that room. A stacked line's name is as
wide as the table's widest, at most 12rem, and one still cut short says the whole of it on hover. More rows load as the end comes near, or with `loadMore="button"`
from a Load more button that says how many come next, for a list whose reader decides. A table that
draws its rows whole (`rowHeight="auto"`, details, a narrow list) finds its end by measuring: it
watches what its scroller holds and measures again before it asks, so rows from a loader that
answers at once are not taken for the end, and a return to a kept place stops asking once the place
is in reach. A titled
listing with a count is a boxed `Section` with the count in its head around a `DataTable` with
`framed={false}`, the section's head as tall as the list's head row. `QuickAdd` is the
field at a list's top that adds a row on Enter, holding the text with a spinner while the app's
promise runs and with the reason in its issue mark when it is refused. Its column menu hides columns and moves them a place earlier or later, the first
column staying first as each row's title, and the order is held like the widths (`columnOrder`).
A column's `head` draws a node in its head (a lock, a second line), `align: 'center'` centers a box,
and `fill` puts a color under a row's cell, tinted or solid; `bar={false}` drops the bar from a
table that only shows its rows. On these the scorecard (`ScoreTable`), the permission matrix, the
file listing, a CSV preview and a chart legend's table are all `DataTable`s; only `LogView` draws a
table of its own, a log's lines rather than a listing. Its `onSource` makes each line's source a
button, so a step's name opens that step, and a log with no lines says `words.empty` or shows the
app's `empty`.

A listing filters from a `FilterBar` in its table's bar: Filter adds a filter from a menu of the
fields with a search over them, each filter is a chip saying its field, how it compares and its
value, the chip opens the field's operators over its value (is, is not and contains for text; any
of and none of for a set, its values ticked from a list with a search; between, at least and at most
for a number; between, after and before for a day), and Clear all removes them. A filter applies as
it is changed, and one closed with nothing filled in goes away. Filters are data (`lib/filters`): a
field, an operator and values as strings, so they keep and travel as they are. The bar holds no
rows: a listing filtered in the browser passes its rows through `filterRows` with the same fields,
and one filtered on a server sends it `activeFilters`. `FilterChip`'s own menu holds a search past
eight values, the ticked ones leading it, and takes an `editor` in place of options. `SavedViews`
keeps a listing's setups under names: a view holds the filters, the sort and the columns (hidden,
order, widths) as `ListViewState` (`lib/list-views`), the part lists the views to pick, saves the
listing as a new view, saves it into the chosen one, renames and deletes it, and says when the
listing differs from the chosen view (`viewChanges`), with Reset and Save beside it. The app stores
the views; the part takes them and its callbacks and keeps nothing itself.

`AsyncSelect` takes several values with `multiple`: chips in the field, each with its remove button,
the search typed after them and the list open while values are picked. A loader that answers a page
at a time (`{ items, next }`) gets the next page as the list nears its end, and `onCreate` offers
typed text no option is called as a new one at the list's end. `itemMark` sets a mark before an
option's label, such as its kind's icon, and with `itemDetail` (its code in the code face) it is
drawn in the list, the chosen value and a chip alike. Given `items` in place of `load` it is the
searchable select over a list the app already holds, narrowed at once as it is typed, with no pause,
no load and no searching line; `SelectField` stays the select with no search, whose options can
carry their `detail` on a second line (`detailPlacement="below"`) and show it when chosen
(`chosenDetail`). Its list is as wide as its longest row, from the field's width up to the window's
less a margin; `monoMeta` sets a row's end as a code, `metaInValue` shows it beside the chosen value,
`mono` sets labels that are codes in the code face, chips too, and `disabled` and `readOnly` show the
value with no list and no remove buttons. Escape in its search closes the list and goes no further,
so a dialog around it stays open, whether or not anything matches.

A value is edited in place on one cycle, shared by `InlineEdit` and `DataTable`'s cells (`lib/edit`,
pure and tested): it opens on a press, Enter or F2, Escape drops what was typed, and the app's save
runs while the editor holds the value with a spinner; a refusal, the app's own message, keeps what
was typed with a critical edge and the message in an `IssueMark`, and typing clears it, as a field a
server refused is no longer refused once changed. A line of text, several lines or a choice from a
list is edited on the library's own input, text area or select, and a number, a day or a time of
day on `NumberField`, `DateField` or `TimeField` drawn `bare`, whose own refusals (text it cannot
read, a value outside its bounds) refuse the save. `InlineEdit` draws a field's value boxed as its editor is, so nothing
moves as it opens, or a page title with only a rule under it, so `PageHeader`'s `title` edits where
it stands. A table edits its cells only given `editing` (`tableEditing` from `table-editing`), so a
table that edits nothing carries none of it; a column's `edit` then makes its cells editable, each
saved on its own through the column's `save`: the arrows move a ringed active cell, a typed
character opens it on that character as a spreadsheet does, Enter saves and moves down and Tab
saves and moves to the next editable cell. The cells' drafts, saves and refusals are kept by row key
and column, so they last through scrolling, sorting, pages and the rows a virtualized table leaves
undrawn; stacked as cards, an editable column's line is a field. An entry grid (Apps/Records) is a
table with a number column for each category, a total column and a group per part of the form, its
heads summing each column, folding to a card per question on a narrow screen.

`DialogShell` is every dialog's frame. A dialog with a confirm has Cancel beside it; one with
nothing to confirm, one thing to read such as a run's log, closes from the corner and keeps its
`actions` (Copy, Download) in the footer alone, with no Cancel. `closeOnOutsidePress={false}` keeps
a press outside from closing a half-written form while Cancel, the close and Escape still close it,
apart from `dismissible={false}`, which holds all of them. Opening focuses the first field in the
body, or `initialFocus`, a ref to the element to focus instead. `ConfirmDialog` takes the same two.
A confirm that cannot be pressed now (`why`) is the button's own `reason`: it stays focusable and
says why on hover and on keyboard focus; a busy one is a busy button. The corner close's name is a
word with the others (`DIALOG_SHELL_WORDS`).

`SettingsDialog` holds an app's preferences: its sections in a navigation with a search over every
setting (its title, description and `keywords`, which are never drawn, and its section's name, so a
search for a section keeps it whole), the chosen section's rows beside it, and under both a footer drawn as `DialogShell`'s,
outside the scrolling, that says changes are kept as they are made (or the app's own `footer`, such
as when they last synced) and closes with Done. `onReset` adds Reset to defaults at the footer's
start, for the shown section or for every setting, asked once more before it runs; a section with
nothing to put back (an account, sample data) says `reset: false` and shows none. Below `md` (768),
on a phone or a foldable, the dialog is a full-screen sheet with the footer at its foot, clear of
the home indicator, and its sections a list to go into.

Settings are only ever this dialog, opened over the page the person is on; the library has no
settings page to embed. `useOverlayRoute(route, 'settings')` gives it a route of its own
(`#/settings`) while the page stays the one it was opened from: handed the app's route as its parts,
it says whether the dialog is open and which page to draw under it (the last one before it, or
`fallback` for a link that opened the app on the dialog), and `close` goes back to that page, back in
the history when the dialog was opened from it, so Back afterwards does not open it again, and in
its place otherwise. It goes back through the history and the hash unless the app hands it its
router's `back` and `replace`, so it needs no router of its own.
`WizardView` lays `WizardDialog`'s steps out on a page the same way, the two sharing their moves
(`wizardMoves`): the steps down the side, each with its description (`StepIndicator`'s `vertical`),
or along the top with `layout="top"` and always below `lg`; the step's body under the page's title;
and Cancel, Back and Next, or the finish, in a `FormBar`, Next shut with its reason.

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

`SplitPane` sets two panes across or down with a rule between them that drags, the first pane's
share held within `minShare` and `maxShare`, the second's what is left. It holds its own share from
`defaultShare` and keeps it by `id` in storage; `share` with `onShareChange` holds it from outside.
Narrower than `narrowBelow`, measured on itself, it stacks its panes or shows the one `narrow` names,
as a phone shows a list or the message opened from it, and `useSplitPane` tells a pane it is alone.
`only` shows one pane alone at any width, the other kept mounted, as a reader turns it off.
`FoldingRail` is the side a tool keeps beside its main content: a rail with a head that resizes from
its inner edge and folds to a strip with its name written down it, under the content in a narrow
container. `ExampleList` fills one with runnable examples under headings, in tabs per language,
and `ApiPlayground`'s presets are one.
Mail's list beside its reading pane, the query workbench and a chat's history are split by it, and so
is `EditPreview`'s `pane` variant: an editor and its live preview edge to edge in a pane of the
app's, the share kept by `id`, with `view` showing both or either alone. `DocumentTabs` is the strip
of documents open in a work area over such a pane: a tab each with its icon, its name cut short and
a close button (a dot while unsaved), the shown one joined to the content, a middle click closing,
the arrows moving along it, and the strip scrolling sideways past its room with `end` held at its end.

`WindowedPane` gives any pane an expand button that opens the same content near full screen, in a
window with a margin, a title, a close button and Escape, the pane keeping its height in place
until the content comes back. `keepPane` keeps the pane as it is instead while the window draws a
copy of its own, the content given as a function of where it is drawn when the two differ, so two
editors over one `SharedDocument` edit it live in the pane and the window. `aside` sets a part
beside the content in the window only, such as a reference beside an editor, resizable and under
the content in a narrow window; `button="sticky"` holds the expand button at the top of a long
pane as it scrolls, and `frame="inset"` sets the pane inset on the page with `Surface`'s inset
tone. `button="none"` leaves the button to the content, which sets `WindowedPaneButton` in a toolbar
of its own; its `size` takes `IconButton`'s, `icon-sm` to match a `Section` head's tools. `MermaidDiagram`, an expandable `DashboardPanel` and `ChartFrame` open through it, so
there is one way to open a pane near full screen. `fullscreen` on the pane, the frame
and the dashboard panels also puts the page in full screen while the window is open. A map's own
full screen control puts the map itself in full screen instead, keeping the same canvas and camera.
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
pin, and delete after a question. `UsageLine` says under a model's answer what it cost and how fast
it came (tokens in and out, the time to the first token, the rate, the whole time), counting so far
while it streams, and `AnswerColumn` is one model's answer among several sent the same prompt: the
model over a fact about it, the state as a chip, its thinking folded as `AssistantReply` folds it, the
answer streaming with `Markdown`'s caret, and the usage line pinned under it, with Stop, Run again,
Copy and Remove in its head.

`FileField` takes files in a form, in a `Field` as the other inputs are: a zone they are dropped on
(the drag `DropZone`'s, from `use-file-drop`) with a button that opens the picker, the limits under
it (the types in `accept`, `maxSize`, `maxFiles`), each file refused said with why ("too large: 12
MB, at most 10 MB"), sorted by `checkFiles`, which `useUploads` shares, and the files taken listed
by `AttachmentList`, an image with its picture and a file the app says is going up (`progress`) with
its ring. With `maxFiles` of 1 a file chosen takes the place of the one held. A drop anywhere on a
page reaches a field through a page-wide `DropZone` given the field's limits (`accept`, `maxSize`,
`maxFiles`, and `held`, the files the field holds): it sorts the drop through the same
`checkFiles` and calls `onFiles(files, refused)`, and the app adds the files to the field's `value`
and hands what was refused to its `refused`, with `onRefusedChange` for the field's own picks and
dismissals, so the field says each refused file with why as if it were dropped on the field:

```tsx
const LIMITS = { accept: '.csv,.yaml', maxSize: 10_000_000, maxFiles: 5 }

<DropZone {...LIMITS} held={files.length} onFiles={(taken, out) => { setFiles([...files, ...taken]); setRefused(out) }}>
    <FileField id="orders" label="Orders" {...LIMITS} value={files} onChange={setFiles} refused={refused} onRefusedChange={setRefused} />
</DropZone>
```

`useUnsavedChanges`
guards a page: while it is `dirty`, closing the tab or reloading asks through the browser's own
warning, and since the library has no router, the app's blocker awaits `confirmLeave()`, which asks
through `ConfirmDialog` (the hook's `dialog`, drawn once in the page) and answers whether to leave;
`useUnsavedGuard` does the same for a dialog's form. `Toolbar`'s `items` give way as it narrows,
measured on the toolbar itself: those it has no room for move, in order, into a More menu at their
end, a toggle checked there. An item with a `reason` is shut but reachable (`aria-disabled`, the
reason in its tooltip and under its entry in More), `destructive` takes the critical tint, `face`
gives it a shorter face than its `label`, which stays its name, and `more` makes it a split button
whose related ways follow its own entry in More as a group. `PageHeader`'s `items` are the same, outline buttons standing before
its `actions`, the primary one, which stays: the title takes the width it needs and the actions the
rest, so they fold into More beside a phone's title rather than wrapping under it (`actionsFill`
gives that room to an app's own measuring part). Its `aside` is a picture before the title block,
such as a project's mark or an avatar, and its `lead` starts the actions with a part that is not a
verb, such as a run's status chip, which never folds. `ImageLightbox` moves between its `images` by the arrow keys, the
buttons at its sides and a swipe, saying "3 of 12"; it zooms by the wheel, a pinch and its buttons
about the pointer, from the fit to four times it or twice the image's own pixels, a zoomed image
moves by a drag without leaving a gap at an edge, and a double press goes between the fit and 100%.
Both composers take `mentions`: an `@` typed (or put in by `MessageComposer`'s mention button)
suggests people at the caret from the app's list or its search, the arrow keys and Enter or Tab put
one in as `@handle`, Escape closes them, and `onChange` hears the ids the text mentions;
`mentionsIn` in `lib/mentions` reads them from a text the app holds.

Tree and TreeSelect pick from a hierarchy of any depth and size. A single choice made outside the
tree, such as a place picked on a map beside it, opens the tree down to it and scrolls to it. A node marked `hasChildren` loads
its level through the app's `loadChildren` when first opened, with a loading row meanwhile and a row
to try again when it fails; the app's `search` looks through the whole hierarchy, loaded or not, and
lists each match with its path, and choosing one opens the tree down to it. TreeSelect names its
choice by its path, from `trails` when the choice's level has not loaded yet. Past a few hundred
visible rows a tree draws only those in view of its nearest scrolling box, so fifty thousand open
rows scroll as smoothly as fifty. As a file tree a node wears an `icon` (an open branch its
`openIcon`), `actions` gives each row the menu a table's rows have, from a button at its end or a
right-click, and `onMove(id, into, index)` lets a row be dragged into a branch or beside any row,
reordering its level, a closed branch opening as a row is held over it, and moved from the keyboard
with Alt and the arrows; nothing goes into itself (`canMoveTo`), and `moveTreeNode` applies a move to
a tree held whole.

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

CodeEditor is the one code editor, on CodeMirror 6. It carries JSON, YAML, jq (a stream language
written from the jq manual) and markdown (a stream language of its own, with `[[links]]` between
notes and `#tags`) by name, SQL, shell and Jinja too, each loaded the first time an editor shows it,
and takes any other language as a CodeMirror `LanguageSupport` or a stream parser
(`defineLanguage`); `languageForMediaType` reads a schema's `contentMediaType` as one of them. `links` completes a `[[link]]` from the names an app gives as it
is typed, the closing brackets put in with the name, and `size="lg"` sets long writing a step over
the body. An app adds words to complete (a list or a function of the word,
each with a detail, docs and a kind), docs on hover, ranged marks drawn as lint (an underline, a
gutter dot, the message on hover), `onRun` on Mod-Enter and any other `keys`, a themed find bar, a
fold gutter, bracket colors by depth and indent guides; the last three turn off past a megabyte. Given
a JSON Schema (2020-12), JSON and YAML are checked by the same ajv rules as SchemaForm, each issue
placed on the key or value it is about, and the schema's property names and enum values complete as
they are typed, a key already written left out, a required one first, `allOf` parts followed and each `if` decided against the document, so a key's `then` offers only the branch that applies, and a key with a default
put in with the default selected. A failed `anyOf` or `oneOf`, at any depth, reports only the branch
that fits the document, the one whose `const` properties (a `kind`) match it, else the one with the
fewest errors, and an `if` whose `then` said what is wrong adds nothing of its own, so one wrong field
in one document of two is one problem, not the other document's every key. An app adds its own
string formats with `registerSchemaFormats` (`schema/formats`: a pattern, a test, or `true` for any
string, alone or as `{ test, say }`, `say` the phrase its issue reads, carried on the issue as
`phrase` so an app's words can still translate it), for forms and editors alike; a format no one
registered is not checked, and logs nothing.
A document can name its own schema, by a top-level `$schema` or
a `# yaml-language-server: $schema=` line: the app finds it by address with `resolveSchema`, the
editor fetching nothing, and a schema document in the 2020-12 dialect is checked against that
dialect's meta-schema, which ajv carries. `JSON_SCHEMA_2020_12` (`json-schema`) is that
meta-schema as one object, its vocabularies merged and its references kept inside it, so an app
that edits a JSON Schema passes it as `schema` and gets the keywords completed at the top and in
every subschema as well as the checks. A key's type and description show on hover and beside its
completion, a `$ref` followed for its type: a definition with no type reads `any`, never its
`$defs` key. `reveal`
selects a range and scrolls it into view, or in JSON and YAML the value at a `path` with its key,
and `onProblems` hears every problem the editor shows (the schema's findings and the marks with a
message) by line and column as they change, a schema's finding with the path of the value it is
about, for a problems list beside it whose rows go to each through `reveal`. `onDocument` hears the
document read into a value, for a view drawn from it such as a pipeline's graph. The Editors
section of Storybook shows whole editor apps built from these parts: a pipeline, a schema with a
value tried against it, a query console, a run log and a shared buffer. `variant="pane"` fills a pane edge to edge; the Query app
shows it in panes. Two editors edit one document as Monaco's views share a model: `doc` takes a
`SharedDocument` (`useSharedDocument`) in place of `value`, which holds the text and one undo history
in a CodeMirror state no view draws, hands each edit to every other editor, and keeps each editor's
caret and selection its own; a new editor opens at the caret the last one left, so a pane opened
again in its `WindowedPane` window goes on where it was (Patterns/Windowed pane).
`useControlledDocument(value, onChange)` holds a shared document by a controlled value: a `value`
that differs from the text replaces it without calling `onChange`, and an edit in any of its
editors calls `onChange` once.

CodeMirror rather than Monaco, weighed on 2026-11-09 against an app that edited pipelines in Monaco
and settled on 2026-11-10, when that app chose to move its editors onto `CodeEditor`: one editor for
both, so a fix lands once; schema completion and JSON Schema 2020-12 checks that follow `$ref`,
`$dynamicRef`, `allOf` and `if`/`then`; `deferred` values; shared documents across a pane and its
window; and a look that follows the tokens. Both are MIT. CodeMirror is plain ES modules, where Monaco runs its languages in web workers that
each app's bundler has to set up, and a page's security policy has to allow (`worker-src blob:`). It is styled with CSS, so the `code-*` tokens and a change of
scheme reach it as they reach everything else, where Monaco takes literal colors and one theme for
every editor on the page. It keeps no global state, where Monaco holds one model per address and
one YAML schema setup per page, so two editors with different schemas would contend. It edits prose
with the browser's own spellcheck, which the notes editor needs. (Editing code on a phone or a
folded foldable is not a goal, so neither editor is chosen for it.) And it is small: about 134 KB gzipped with JSON, YAML, completion, lint,
search and folding, where Monaco's editor alone is about 1 MB before its workers. What Monaco
brings over it is VS Code's language services; when the editor needs one, it comes through
`@codemirror/lsp-client` and a language server in a worker, never a second editor.

## Drag and drop

dnd-kit is the one engine for dragging things between places in a page: putting a list, a grid, a
table's rows or a dashboard's panels in order, moving cards between a board's columns, moving a
tree's rows, and dropping a row of one part onto a target of another. Its stable line is used
(`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`), about 17 kB gzipped, and only the
modules that drag import it, so a page that drags nothing never carries it: `Tree` and `DataTable`
load their drag layers (`tree-drag`, `table-reorder`) the first time they are drawn with `onMove`,
`onDrop`, `onReorder` or a `dragKind`, as `ChannelList` does for a section with `onMove`
(`channel-order`), the week and month views for `onEventMove` (`calendar-drag`), and `DragSource`
for a `drag`, and the forms page's budget holds the rest to that. A part an
engine-free page draws, such as the rail or a form's repeated group, drags only inside a scope the app
draws around it (`RailDrops`, `RepeatedDrag`), which hands it the drag parts through a context, so
the part itself never imports the engine. A file dragged in from
the desktop stays on the browser's own drag events (`use-file-drop`), React Flow keeps its own node
dragging, and the resize handles, a split's seam and a lightbox's panning are pointer drags of their
own, not drops.

`DragDrop` is the library's layer over the engine, set once for every part: a mouse or pen drags
once it moves a few pixels, a finger once it holds still a moment so a swipe still scrolls, and the
keyboard picks a thing up from its grip with Space or Enter, carries it with the arrows to the
nearest place that way and drops it with Space or Enter. The arrows carry the thing's middle from
place to place (`carriedTo`): up and down keep to the places in line with it, as a list's rows are,
and left and right take those in line first and the nearest that way after, as a column beside or
a place in the rail is; it stands a pixel past the middle of the place it reaches, so a row carried
down lands after the row it reaches and one carried up before it, and the place under its middle
is where it is, as the place under the pointer is for a mouse. Escape puts it back, the page and any box
under the pointer scroll at their edges, a copy of the thing follows the pointer in a lifted card
(its label on a card when it draws none), and the release that ends a drag is never also a press on
what lies under it. Every step is said to a screen reader in `words`, a place in a list as "3 of 7".
A thing and a target carry `DragData`: a `kind`, a `label` and the app's own `value`; a target takes
its own kind unless its `accepts` says otherwise, the smallest target under the pointer winning, so a
row is found before the list around it. Each part that drags draws a `DragDrop` around itself, and
one an app draws around several parts makes them one, each part hearing every drag through
`useDragDrop` and acting on its own: a list's rows given a `kind` a tree's `accepts` takes are dropped
into its folders through the tree's `onDrop`, and inside a `RailDrops` drawn around the shell a rail
entry's `drop` makes its row a place such things land (a song onto a playlist), and a group's
`onReorder` lets its entries drag into another order (dashboards, playlists), Alt and the arrows
moving one from the keyboard; a rail outside one never loads the engine. A tree
told the order its app keeps (`order`: a `band` such as folders before notes, and `sorted` for a
level the app sorts by name) counts every place in that order and offers no place the order would
undo, and `nodeOf` makes a row dragged from a list beside it the move of the tree's own node. A thing carried to another part rather than put in order says `compact` in its data,
and a small card with its label follows at the pointer in place of a copy its own size, so the
target stays in sight.

`DragSource` lends any one thing to targets elsewhere on the page, with `DragSourceGrip` for its
keyboard grip, and the parts that hold such things take a `drag` with it: a `MessageRow` onto a
folder, an `AttachmentList`'s and a `ChatMessage`'s files onto a conversation, a `FileGrid`'s tiles
and a `FileList`'s rows (`dragKind`) onto a tree's folders, and a `MediaCard` onto a playlist. Each
drags as a whole by a mouse or a held finger, its grip shown on hover or focus, and only inside a
`DragDrop` the app draws around it and its targets. A `ChannelList` entry with a `drop` takes such
things inside a `RailDrops`, as a rail entry does, and a section with `onMove` is in the reader's
order, its entries dragged as a whole and moved with Alt and the arrows.

`SortableList` and `SortableGrid` are the sortable parts built on it, with `SortableGroup`,
`SortableItem` and `SortableGrip` for a part that draws its own items, as `ReorderableTrackList`
does: an item is dragged by its grip or as a whole, the rest moving aside to show where it lands,
the arrow keys on a focused grip move it a place with the focus following, and `onMove(from, to)`
says where it went; `moveItem` and `insertItem` in `lib/reorder` apply it without loading the
engine. `DraggableTrackList` lends a track list's rows to targets elsewhere on the page without an
order of its own: a row drags as a whole, its grip carrying it from the keyboard. A board's cards
drag between its columns with a line where they land and a grip for the keyboard, and with
`onColumnMove` its columns move too, by their heads and the grip in each head, a line between the
columns showing where; a `locked` card, zone or column neither moves nor takes a card, no column
moves across a locked one, and `canDrop` refuses any other place, so no line shows where a card
cannot go. The week and month views move an event to another day and time with `onEventMove`,
snapped to `snapMinutes`, an outline or a wash showing where it lands, and resize it by its lower
edge or its right end with `onEventResize` (a pointer drag of its own, as a resize handle is); Alt
with the arrows moves the focused event, and with Shift its end; `DataTable`'s
`onReorder` draws a grip at each row's start, a stacked card's and a stacked list's items included, and moves the active
row with Alt and the arrows, while the rows are drawn as given, and a `dragKind` alone lends its rows
by the same grips to targets elsewhere, sorted or not; a `RepeatedGroup` inside a `RepeatedDrag`
draws a grip on each row that drags it and moves it with the arrows (`onMove(from, to)`); and `DashboardArrange` draws a
dashboard whose panels are arranged while `arranging`: a grip, a width and a remove in each panel's
head (`PanelTools`, which the library's panels draw), with `onConfigure` a button that opens a
panel's options, a line where a dragged panel lands, a palette of widgets dragged onto the grid to
add one, and the layout handed back as an order of `{ id, span }` to keep. `DashboardEdit` puts it
behind an Edit button, the one word every dashboard uses: `useDashboardEdit` holds the changes in a
draft that Done keeps, Cancel throws away and Reset fills with the default, and
`DashboardEditActions` draws Edit, Reset, Cancel and Done in the page header; a panel's menu
actions taken while editing, a copy or a removal, go into the same draft.

On a phone the rail is the shell's drawer, closed while the page is used, so a thing dragged on the
page has no rail row to land on there. The drawer is not opened by a held drag: it is a modal sheet
over the page, its left edge is where the system's back swipe lives, and its rows would be measured
as targets while they slide in. Every drop onto the rail has a menu path beside it (Add to playlist,
Add to queue, Move to), which is the way a phone reader takes.

## Maps at scale

Each map layer is one GeoJSON source with hover and selection as feature state, so thousands of
areas or points draw and answer the cursor with no work per feature in React. `BoundaryLayer`
simplifies heavy geometry once as it arrives (`simplify`) and names its areas (`label`) in a symbol
layer that maplibre declutters, the larger areas placed first; names need a basemap with fonts.
`PointLayer` gathers points into counted clusters, and the map fits whatever its layers draw.
`GeoJsonLayer` draws any GeoJSON by its geometry, polygons as fills inside outlines, lines as lines
and points as circles, a geometry collection part by part as one feature, in one color or a scale's
by a property; `geoJsonEntry` keys it in a `MapLegend`, which draws a line's swatch as a stroke.

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
(the node box, its status a run state or one the app names in the status map), the layout (a rank layout at once, elk loaded lazily and answering after),
useGraphLayout and useNodeGraph, and the views PipelineGraph, RunGraph, DependencyGraph (a lineage
of datasets and jobs) and StateMachine (labeled transitions, initial and final markers, the
current state). A canvas given `editing`, and PipelineGraph with it, becomes an editor: ports
to connect, Delete to remove, boxes to drag, a menu on right-click and a connection dropped on
empty ground, each reported to the app, which owns the graph. Views select only by default.
An editor also refuses a connection with the reason said on the canvas, adds a step from the add
button at a node's output or an edge's middle, takes blocks dragged in from a palette, and chooses
several nodes with Shift. Any canvas, editable or not, takes `nodeMenu` and `paneMenu`, the rows of
the menu a right click on a box or the ground opens, drawn as a `PointMenu`. BlockPalette, BlockPicker, GraphOverlay, GraphNotice, GraphToolbar and
useGraphHistory are its parts; the Pipeline editor stories show each way of building a pipeline.
NetworkGraph draws things linked with no direction to read, such as notes: a dot each in its group's
color, larger the more links it has, its name under it, straight lines between them, laid out by
elk's stress algorithm (`layoutNetwork`) after a spiral holds the first frame; pointing at a dot
lights its neighbors and fades the rest, and `current` rings the one the reader stands on.

Every view takes how elk lays it out besides its direction: `routing` (`orthogonal` steps with
rounded corners by default, `polyline` or `splines`, each drawn as elk routed it, and in the same
manner before elk answers) and `spacing` (`compact`, `normal`, `roomy`, the gaps in `GRAPH_SPACING`).
A node box is as wide as its words in the node's own fonts, between `minNodeWidth` (96) and
`maxNodeWidth` (280); past the widest its words end in an ellipsis and show whole on pointing, and
elk is handed the measured widths. MiniGraph draws a pipeline or a run small, for a list row, a
card or a preview: a box per step in its state's color, laid out by elk like the full graph and
scaled to its box, as a still SVG with no React Flow under it. React Flow is the engine for an
interactive graph; a mini graph has nothing to press, pan or zoom, and a canvas with its own store
and observers per row would make a list of fifty rows heavy, so it is drawn as a sparkline is.
Placements are kept by shape, so many rows of one pipeline ask elk once.

## Plugins

Domain packages extend the core through plugins. A domain add-on holds one domain's parts and
exports a plugin, a `SokkelPlugin` from `@winterop-com/sokkel-ui/lib/plugins`: a name and what it
contributes. An app installs its plugins once as it starts, before it draws, with
`registerPlugins([...])`; the core's parts then know those contributions by name. One way to
install, a plain call rather than a provider, because the parts read a registry the module holds,
as `CodeEditor` already did its languages. The only kind of contribution so far is a `CodeEditor`
language (`languages`: a name, a stream parser or `LanguageSupport`, and the media types
`languageForMediaType` reads as it); the language names are typed through `PluginLanguageNames`,
which the plugin's package adds its names to. A new kind (a block kind, a chip kind, a schema
format) is added to the interface when a domain package needs one, never ahead of it. The first
domain package, `@winterop-com/sokkel-ui-fhir`, gives the editor FHIRPath and CQL, the HL7
health-data standards' expression and query languages, as stream parsers: keywords, strings, date
and time literals, functions, members after a dot, `%` variables and comments across lines.

The second, `@winterop-com/sokkel-ui-dhis2`, serves the DHIS2 platform, and is UI only: it never
calls a server, checks no server version and depends on no DHIS2 client library. Its plugin `dhis2`
gives the editor the platform's two expression languages, one grammar read two ways:
`dhis2-expression` (`text/x-dhis2-expression`), for indicators, validation rules and predictors, with
data items in braces (`#{dataElement.categoryOptionCombo.attributeOptionCombo}` and its `*`
wildcards, `I{}`, `R{}`, `D{}`, `A{}`, `C{}`, `N{}`, `OUG{}`), `[days]`, functions such as `if`,
`orgUnit.group`, `sum` and `.periodOffset(-1)`; and `dhis2-rule` (`text/x-dhis2-rule`), for program
rules and program indicators, adding program rule variables whose names hold spaces, `V{}` program
variables, `PS_EVENTDATE:` and the `d2:` functions. Which functions and variables a server knows
changes between versions, so the names are data the languages take, the latest server's by default
(`DHIS2_FUNCTIONS`, `DHIS2_VARIABLES`); an app passes what its server has through
`dhis2Plugin({ functions, variables })`, and a name it was not given is read as a plain name rather
than an error, so an older or newer server never breaks the editor. The grammars follow the
platform's ANTLR expression grammar and its manual, and the tests read real expressions a demo
server holds.

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
`MediaFullscreen`, `TrackList`, `ChapterList`, `Lyrics`, `Transcript`, the sleep timer
(`SleepTimerMenu`, `useSleepTimer`), `MediaCard`, `Artwork` and its seeded
covers (`cover-seed`), the arithmetic of chapters, of a timeline over several files and of the
bar's growth, the queue (`queue`, `useQueue`), LRC lyrics (`lrc`), `useMediaSession` with its
helpers in `media-session`, a position read on every animation frame (`useFramePosition`),
`VideoStatsOverlay`, `UpNext`, a watch page's `ChannelRow`, `MediaActions` and `WatchLayout`, and `hlsSource` in `hls-source`. It stands on the core by name, and its one engine, hls.js, is an
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
an HTTP live stream, played natively by Apple's WebKit (Safari, the WKWebView a desktop shell draws
on macOS, every browser on an iPhone or iPad) and by a browser that plays HLS but has no Media
Source Extensions, and otherwise through hls.js, loaded by a dynamic import the first time a stream
plays (or always through hls.js with `native: false`). Chromium says it plays HLS too, but hls.js
plays it there: tried headless in Chromium 156 against an event playlist ffmpeg was writing,
Chromium's own player failed the live stream when it was played after loading paused (a demuxer
error, which the player takes for media it cannot play), kept no seekable window, so a try could
only rejoin at the live edge and play the last segments over, and told no bandwidth or rendition;
hls.js played it, picked a stall up where it stood and told its stats. Apple's own player, tried
the same way in WebKit, played the stream, its `startAt` and its stalls as hls.js does, a try
picking up at the start of the segment it stood in. Apple's WebKit is told by its user agent
(`isAppleWebKit`), since a WKWebView's names no Safari. hls.js is an optional peer dependency of
the media package, so only an app that plays streams installs it, and it never enters the core. hls.js draws
every HTTP live stream. The player hands `attach` where playback picks up (`startAt`, or where a
try resumes) and hls.js starts loading there (`startPosition`), so the first fragment fetched is
the one played. The source recovers from a fatal network error by loading again and from a
fatal media error by recovering the decoder (swapping the audio codec from the second time),
`recoveries` times each, counting from zero once a fragment is buffered, and then leaves the next
try to the player; every error goes on to `onError`. A source's `stats(video)` tells what its
engine knows: hls.js's bandwidth estimate, the rendition playing and its bitrate (weighed from the
fragments loaded when a lone media playlist declares none), the buffer ahead and whether the
stream is live. The Storybook serves a stream cut from the clip (`src/stories/media/fixtures/stream`,
about 90 kB) as a static folder, and a fake hls.js in the tests drives the recoveries.

The player starts at `startAt`, taken when the media has its length, for resuming; tells where it
is through `onTime`, whether it plays through `onPlayingChange` (once per change, however it was
asked, never as it unmounts or while a try loads the media again, so an app can stop a server
encoding ahead on a pause) and the end through `onEnded`. It reads the playhead once a second while
playing, and one that stands longer than `stallAfter` is a stall, waiting for data or a seek that
does not land (a stream whose encoder fell behind or stopped, a segment that is not there). It
meets a stall, or a network or decoding error, by loading the media again where it was, or at a
live stream's live edge once its window has moved past that point or it can seek nowhere,
`retries` times, a second before the first try and twice as long before each next, saying "Trying
again" over the picture meanwhile; tried against an event playlist ffmpeg was still writing, it
picked the stream up again once the encoder wrote on. Once the tries are spent it says the video
could not be played, with Retry; media the browser cannot play is said at once. `onError` hears
each with `fatal` false while it tries and true once it gives up. When the page is shown again
after being hidden, a video that was playing plays on (a browser pauses a page put away) and one
whose buffer stalled while away is moved a hair to wake it, unless a pause was asked through the
handle meanwhile. `keys={false}` leaves every key to the app, whose shortcuts drive it through the
handle on `ref` (`play`, `pause`, `toggle`, `seekTo`, held until the media can take it, `seekBy`,
`setVolume`, `toggleMute`, `toggleFullscreen`, `retry`, `stats`, and what it plays, where and how
loud); `onFullscreenChange` says when the picture fills the screen. `crossOrigin` is the video
element's `crossorigin`, so captions served from another origin load, the media then fetched with
CORS too.

What the viewer picks beside the captions the app may keep too: `defaultRate` starts each new media
at the speed the app holds, which `onRateChange` tells as the viewer picks one from the speed menu,
so the next video plays at it; `qualities` put a menu of renditions (Auto, 720p) after the speed,
its button saying the one chosen, and the app plays the one picked through `onQualityChange`, as a
new source started where it was. `actions` draws the app's own buttons among the controls, before
full screen, such as theater mode, as `TransportButton`s over the picture.

Over the picture an app draws in two places, both kept in full screen: `overlay` in the top corner,
such as the stats, scrolling when taller than the picture, and `cover` over the whole of it, dimmed
behind, such as what plays next as a video ends. They are two slots, not one with a placement, since
both can stand at once (the stats stay over a cover) and a cover takes the player over: its controls
hidden and out of reach (their focus handed to the player), no play button over the picture, and none
of the player's own keys while it stands, so the cover's buttons are what the viewer does next.
`UpNext` in the media package is the cover every video app with a queue needs: the next title, a line
under it and its artwork, which shows once the player is wide enough, a countdown that calls `onPlay`
at zero (held by `paused`, absent when the app's autoplay is off), Play now, and Cancel, its words
props.

Under the picture a watch page names where the video comes from and what the viewer does with it.
`ChannelRow` is the channel on `ProfileRow`: its picture and name opening its page (`href`), its
followers written short (48.2K), and Follow turning to Following with a check; `size="lg"` heads the
channel's own page. `MediaActions` is the viewer's row: like and dislike joined with the like count,
then the app's actions (Share, Save, Download, each a plain button, a toggle or the app's own node
such as a `DownloadButton`), which move from the last into More as the row runs out of room, measured
on itself as `Toolbar`'s tools are, and `menu` entries always in More. Given to the channel row as its
`actions` they stand at the line's end beside the channel where there is room and on a line of their
own under it where there is not.
`WatchLayout` holds a watch page together: the player, what is under it and an aside beside both
(what plays next), the aside running down beside the rest on a wide page and stacking last on a
narrow one, measured on the layout itself. `theater` spans the player across the aside's column, as
tall as the window lets it be, the aside starting under it; the player keeps its place in the page,
so a video plays on as the viewer turns theater mode on and off.

Captions are words on the picture, outlined with no box, in `--caption-*` tokens, sized against
the player's width (`--caption-size`, never under `--caption-size-min`). The captions button opens
the tracks and Off, and the text's size (50 to 200 percent), ink (white, yellow, green, cyan,
magenta), background (none, see-through or solid) and edge (an outline, a drop shadow or none),
each a submenu; the app's `captionDefaults` stand until the viewer chooses, such as half the usual
size. What the viewer chooses, and the track, by its language so the next video's is chosen too,
is kept in `localStorage` through `useStored` under `CAPTIONS_KEY`, or in a store the app hands as
`captionStore` (a `createStore`, or its own over a settings file), field by field so a bad one
falls back alone; `media/captions` holds the options and the shapes. The player's menus stay in it
while it fills the screen and may reach past a small one otherwise.

`useVideoStats(ref)` reads the handle's `stats` once a second while enabled: the picture's size,
the rendition's bitrate, the bandwidth, the buffer ahead and the frames dropped of those shown
(`getVideoPlaybackQuality`), each null where nobody can tell. `VideoStatsOverlay` in the media
package draws a reading in a few lines, the app showing and hiding it through the player's
`overlay`, which keeps it over the picture in full screen. What the app knows beside the player
goes in it too, so it needs no overlay of its own: a `headline`, the verdict in a sentence ("Playing
smoothly", "Buffering often"), in the title's place in its `tone`'s ink, and `rows` of its own facts
under the player's (the server's encoding speed, its encoder and load, the segments ready, the other
streams), shown before the first reading too.

One sound is heard at a time: a player claims the sound as it starts to be heard and whoever held it
is paused, through `claimSound` and `useOneSound` in `media/one-sound`. AudioPlayer, VideoPlayer and
MediaBar claim it unless given `exclusive={false}`, MediaBar pausing through its `onPlayingChange`;
a muted player takes no sound, so a muted preview never stops the music. An app's own element joins
by claiming too. `SpeakButton` reads a text aloud with audio the app fetches on demand: its `load`
is called on the first press with an abort signal and answers with an address or a `Blob`, kept
while the button is mounted so the next press plays at once. It goes from idle through loading (a
press stops the fetch) to playing (a press stops it), or says the audio failed and fetches again on
the next press, and it claims the one sound as the players do. `AssistantReply`'s `speak` puts it in
the footer after Copy.

Dictation has no engine of the library's own. `useDictation` either records the microphone with
`MediaRecorder` and hands the recording to the app's `transcribe(audio, { signal })`, or, where the
app opts in with `recognition`, uses the browser's own speech recognition, which some browsers run
on their maker's servers; given both, the browser's is used where there is one. `Composer`'s
`dictation` takes the same options and draws them: a microphone before Send; while it hears, a row
with a pulsing mark, the voice's level (`BarVisualizer`, loaded with the first recording) or the
words heard so far, the time and a cancel; then Transcribing, and the text put in at the caret.
Escape cancels, a failure is said whole on a line of its own over the row, wrapping at any width,
and Send waits meanwhile. `microphone`
stands in for `getUserMedia` and `defaultState` draws a state still, so a story never touches the
microphone. `Artwork` is a record's cover: its picture once loaded, or one drawn in the theme's
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
one disc draws no head. `ReorderableTrackList`, a module of its own so a page that only lists tracks
does not carry it, is the list a listener orders, a playlist or what a queue plays next: each row
ends in a grip that drags it, the rest moving aside and the box scrolling at its edges, Escape
putting it back, and the arrows move a focused grip's row a place; it calls `onMove(from, to)` and
draws the order it is given.

Lyrics are read by `parseLyrics` in `lrc`: LRC's timed lines, several stamps on one line, the
`offset` tag and the metadata tags, word stamps dropped; plain text, or LRC stamped all at zero,
reads as untimed. `Lyrics` fills the box it is given: timed lines follow the position, the one sung
inked in the middle and the rest faint, a press on a line seeking to it, and the same pause for a
reader who scrolls; untimed lyrics read as a page in verses. MediaBar's `lyrics` gives the
fullscreen view a lyrics button in its corner that shows them in the visualizer's place.

What is said rather than sung, a podcast, an interview or a talk, is a `Transcript`: lines with
their start and their speaker, read at the page's size, each under its time and the speaker written
where the voice changes. It fills its box and follows the position as `Lyrics` does, the line said
inked in the middle and the rest quiet, a press seeking to its start, and goes in MediaBar's
`lyrics` for the fullscreen view the same way. A long listen's sleep timer is `SleepTimerMenu`, a
moon for the bar's `extra` that offers minutes, the end of the chapter and the end of the episode,
the time left beside it while minutes count, and `useSleepTimer` keeps it: minutes count only while
playing, a chapter's timer runs out as playback passes into the next chapter, following a seek into
another, and the end's through `ended`, which tells the app not to go on to the next.

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
and a picker of its kind; it goes full screen through `lib/fullscreen` and falls back to covering the
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
edge and a mark at the end of its input, the edge alone at rest and a ring in the same tone only
while the field has focus, in every control that takes `aria-invalid` (`src/rules.test.ts` fails a
ring drawn at rest); pressing the mark opens what is wrong, what to do, and a
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
SchemaForm is built on them, and checks values with ajv against JSON Schema 2020-12. The mark's
name says every issue to a screen reader, each after "Error: " or "Warning: ", words an app
translates (`issueCritical`, `issueWarning`): every field takes them in its `words` and hands them
to its mark, as do `SchemaForm`, `RepeatedGroup`, `QuickAdd`, `InlineEdit` and a table's editable
cells.

For what happens outside a form, the activity list was picked from the notification research: what
happened while a person was away, newest first, unread drawn stronger, each item with its own way to
act. `ActivityList`, `ActivityButton` and `ActivityMenu` carry it (Patterns/Activity).

What comes next is in `docs/roadmap.md`.
