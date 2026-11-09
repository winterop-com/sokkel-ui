# Roadmap

What is shipped, what comes next, and what is decided but not yet built. `docs/plan.md` says what
the library holds and the choices behind its parts; this file says where it is going. Move an item
to `plan.md` when it ships.

## Where it stands

- **0.10.18** is the latest release (2026-11-09): the records app's gap map closed, and the first
  gaps from a pipeline app's move: schema completion that follows `allOf` and decides `if`/`then`,
  `deferred` values left unchecked, `PlainMarkdown`, merged completions. Sheets resize (their `size`
  presets are gone), `DataTable` gets a row `detail` and column `band`s, two themes (`steel`,
  `ember`), `FoldingRail`, `ExampleList`, and the rest of `ApiPlayground`.
- **0.10.17** (2026-11-09): fixes from a Codex review of the day's work,
  and an editable table that marks its active and edited cell with a line under it (`cellFocus`).
  `useUnsavedChanges` keeps the history as it was and asks once; `SchemaForm` carries refusals and
  nested keys with their items and asks the app's `field` for every field; `CodeEditor` takes `id`
  and `onBlur`; a `StatPanel` link takes a press anywhere on the tile.
- **0.10.16** (2026-11-09): the review's last fixes. A `StatPanel` centers
  its value and says what its change compares against (`compared`); a graph on a narrow canvas fits
  its width; a `DataTable`'s bar has room around its search. The examples open their settings as a
  dialog over the page and keep light and dark there, not in the top bar.
- **0.10.15** (2026-11-09): round 6 of the review and a fix to 0.10.14.
  `DashboardGrid` is its own container again, so an app's `className` places it; `SchemaForm`
  lists keep each item's identity and move items, and take an app's own control through `field`;
  `useAttachmentField`, `useSubmit`, `RepeatedGroup` and `useRepeated` are new; a map loads its
  engine as it nears the screen.
- **0.10.14** (2026-11-09): rounds 3 to 5 of the review. Charts read at
  12 px and fit radar names and tick steps to their width; run, pipeline and dependency graphs
  read top to bottom in a box under 560 px; a narrow `VideoPlayer` keeps speed and quality in a
  More menu; `DashboardGrid` lays out by its own width; dashboard panels say when their query
  failed (Retry) or their figures are stale; `StatPanel` drills down with `href` or `onSelect`.
- **0.10.13** (2026-11-09): the first two rounds of the review. A read-only
  `SchemaForm` group locks its items; `Banner` wraps on a phone; `ApiPlayground`'s Send, `Inspector`,
  `CodeBlockContent wrap` and a toolbar's title keep to their room; a `TableOfContents` entry draws
  its section's state; and `useUnsavedChanges` guards hash routes (`hashRoutes`). The examples ask
  before dropping a draft, offer only the themes they load, and reset what they say.
- **0.10.12** (2026-11-09): `CodeEditor` carries SQL, shell and Jinja,
  each loaded on first use (an app using it installs `@codemirror/lang-sql` and
  `@codemirror/legacy-modes`), reveals a range, finds the schema a document names through
  `resolveSchema`, checks a schema document against the 2020-12 dialect, completes from a schema
  without the keys already written and with defaults, and shows a key's description on hover.
- **0.10.11** (2026-11-09): `hlsSource` plays through hls.js in Chromium and
  Electron, and natively only in Apple's WebKit, since Chromium's own HLS fails a live stream played
  after loading paused; a video whose tries are spent holds still under the failure, and playing it
  again clears it.
- **0.10.10** (2026-11-09): the sign-in brand pane sits one step below the page
  in dark instead of reading as a black slab.
- **0.10.9** (2026-11-09): a media slider mounted while hidden draws its
  level, so `VideoPlayer`'s volume no longer shows an empty bar on a wide player.
- **0.10.8** (2026-11-09): twelve example apps in `examples/`, published
  beside Storybook, and what they asked of the library: video parts for a watch page, podcast
  parts, a file tree, document tabs, linked notes, a network graph, period and server parts for a
  records app, panel menus, an uptime bar, a usage line and answer columns, a rail with a body,
  about 3 kB of CSS and 5 to 11 kB of start JavaScript cut from every page, and fifteen small fixes.
- **0.10.7** (2026-11-08): the review's missing parts (`DateField`,
  `TimeField`, `DateTimeField`, `NumberField`, `InlineEdit` and editable `DataTable` cells through
  `tableEditing`, `FilterBar`, `SavedViews`, several values in `AsyncSelect`, `FileField`,
  `useUnsavedChanges`, `Toolbar` overflow, a lightbox gallery with zoom, mentions in both
  composers); caption settings, stats and stall recovery in `VideoPlayer`; settings found by
  keywords; `SignIn`'s server line, probe and optional credentials; the base theme named
  `tidevann`.
- **0.10.6** (2026-11-08), the last of the rounds the apps' own screens
  asked for: `SplitPane` (two panes across or down, remembered by `id`), `GeoJsonLayer`, tokens a
  theme sets for headers, tables, the editor, scroll bars, the page foot and the palette, corners by
  role, an app's own states for `StatusChip` (`StatusProvider`), the themes `ocean`, `indigo` and
  `terminal`; `SettingsView` and `WizardView` as pages, `SpeakButton` and dictation in `Composer`;
  full screen through a desktop shell, a rail a work page narrows or hides, and appearance kept in
  an app's own storage with its before-paint script as a file.
- **0.10.5** (2026-11-08): the full-screen player never cuts its title
  short, app-defined visualizer options in its picker, a face filling the rows bar, and
  `SettingsDialog` ending in a footer with Done and an optional reset.
- **0.10.4** (2026-11-08): explicit exports in every package and a
  `<Component>Props` type from every component; smaller start bundles, the heavy dependencies loaded
  on first use and made optional peers; `EChart` private; the frame's round 5 (a search field beside
  the palette, `useShell`, `contentKey`, the rail mark as a home link, a collapsed rail dragged open,
  the account menu's scheme rows and sign-in, a palette `filter` and `keywords`); `SoundVisualizer`
  ramps, mirror, glow and trails; `MediaBar` `face`, a frame clock and fullscreen actions;
  `TrackList` discs.
- **0.10.3** (2026-11-08): a sixth package, `@winterop-com/sokkel-ui-media`,
  with the music and video app parts (the players chat uses stay in the core); queues, chapters
  across files, LRC lyrics and a following track list; `VideoPlayer` resuming, reporting, retrying
  and driven from outside, and `hlsSource` for HTTP live streams; a shortcut registry matched by
  the typed character, `useOverlay`, `useScrollMemory` and `useReducedMotion`; the Shell's drawer,
  palette state, safe-area insets and banner; `styles-base.css` with per-module source lists and
  leaner theme files; terminal tokens per theme.
- **0.10.2** (2026-11-08): media for a music and audiobook player (`MediaBar`
  speed, skip, chapters and live mode; `useMediaSession`; one sound at a time; seeded cover
  placeholders through `Artwork`; a delay on `SoundVisualizer`), `DownloadButton` removing a kept
  copy, the sign-in art configurable, and Storybook opening on the apps.
- **0.10.1** (2026-11-08): the frame for desktop shells (a drag strip, room
  for the window's buttons) and `useCommands` with two-line palette rows; map selection with what
  lies under it, a selection legend, chosen controls, a globe, notes under the map, no basemap
  fetched unless offered, and a sites page; `ChartFrame` expanding through `WindowedPane`; rail
  descriptions, stat tiles, kind badges, counts on `Segmented` options, descriptions on sections
  and fields, and `DetailSheet`; phone layouts for tables, dialogs, the composer, the calendar,
  gauges and diagrams.
- **0.10.0** (2026-11-08), built from the apps: each app's own screens laid
  beside the library. `SignIn`; the code editor with languages, jq, completion, hover, ranged marks,
  keys, search, folding and JSON Schema checks; code colors for every theme; `Markdown` parts;
  `AnsiText`; `WindowedPane`, `useStored`, `useUploads`, `DataTable` row groups and
  `ConversationHistory`; `SplitButton`, `RelativeTime`, `ApiLink`, `DownloadButton`, `TagChips`;
  `ChipBar`, `ProfileRow`, `CommentThread`, `EditPreview`, `ShowMore`, `EventDetails`; one table of
  type roles; one API shape for words, panel sizes, popovers and choices (renamed props listed in
  the release notes). 0.10.x carries what follows from it.
- **0.9.3** (2026-11-08): the validation round (`IssueCount` with a figure
  per kind, `IssueMarks` along a long form's scroll area, `FormBar` verbs that wrap), Patterns/Validation,
  a cancel button only with `onCancel` for an uploading file in `AttachmentList`, and mono in
  `text-2xs` at the small share.
- **0.9.2** (2026-11-08): a fifth package, `@winterop-com/sokkel-ui-terminal`,
  with an interactive `TerminalView` on xterm.js and the read-only `Terminal` moved onto it; `Search`
  with grouped results and a results page with facets; trees that load lazily, search the whole
  hierarchy and scroll at scale; maps over thousands of areas with labels; a terminal face for
  `LogView`; and the second app gaps (empty children wait, uploads in `AttachmentList`).
- **0.9.1** (2026-11-08): the gaps the first app found. Math in `Markdown`,
  reasoning, waiting, uploads and audio in chat, `useAppearance` and `useScheme`, the palette on
  Cmd/Ctrl+K owned by `Shell`, a status foot level with the account, theme-tinted surfaces, and
  `Segmented` options, `Highlight`, `BarList` and `ImageAnnotations`.
- **0.9.0** (2026-11-07): four packages, ready for adoption. The core
  `@winterop-com/sokkel-ui` holds everything without a heavy engine; `-charts`, `-maps` and
  `-graph` carry ECharts, maplibre and React Flow, each with its own styles. The player gains three
  layouts that grow without a jump and a fullscreen now-playing view. `llms.txt` and the generated
  `docs/components.md` let an app's agents find a part before building one. 0.8.0 brought the music
  player, the sound visualizer and a file per theme; 0.7.1 charts drawn from rows; 0.7.0 every
  example on shared components. 0.5.0 was the first release under the new name.
- The library was renamed from winterop-ui to sokkel-ui after 0.4.0: the repository is
  `winterop-com/sokkel-ui`, the package `@winterop-com/sokkel-ui`, the Storybook
  https://winterop-com.github.io/sokkel-ui/. 0.2.0 to 0.4.0 are republished under the new name, and
  the old `@winterop-com/ui` package is deleted.
- The first app has adopted it. A PR still merges as soon as the local gates pass and main's CI
  catches the rest; a release waits for green.

## Example apps

- **The examples.** Twelve apps in `examples/<name>/{web,electron,tauri}`, each a Tidevann product
  built only on the packages' public exports, with a fake backend kept per app
  (`tidevann-shared`). They are tasks; runs, a jobs console; records; three live dashboards
  (metrics, status and analytics); notes; dataviz; models, with chat and compare; music; podcast;
  and video. Each passed a scripted click-through of every page and control. `make examples`
  builds them all, `make <name>-web|-electron|-tauri` runs one, and Pages publishes them at
  `/sokkel-ui/examples/` beside Storybook.
- **CI starts each shell once.** CI builds every web app and checks every shell but never starts
  one: start Electron under Playwright with a virtual display and Tauri as a built binary, and
  take a still of each.

## Next

- **The reviews of 2026-11-09.** A visual review of the published catalog and a review of the
  twelve example apps on the web; every round of fixes from them shipped in 0.10.13 to 0.10.16.
    - **Not covered yet:** the Electron and Tauri shells, browsers other than Chromium, and real
      touch devices. Run that pass before calling the examples checked on every platform.

- **Smaller start bundles, what is left.** Every library only some parts need is an optional peer,
  and the heavy ones, Base UI's menu among them, load on first use. Left:
    - On a dashboard, `chartLegend` still brings every chart kind with the page. Split each kind's
      shaping of rows, which the legend needs, from its option builder, which can load with ECharts.
    - The palette's lazy chunk carries cmdk's `Command.Dialog` and the Radix dialog stack behind it
      (about 21 kB), which cmdk attaches whether or not it is used. Replace or vendor cmdk.
    - `styles.css` holds every component's classes, so each new part adds to every app's
      stylesheet. A Vite plugin that writes the `@source` list from the app's own imports would
      give every app the lean stylesheet without a hand-kept list. Leaving out the 27 primitives no
      part uses would take the forms page from about 48 to 38 kB.
- **Adoption.** Apps adopt the library one pattern per PR, each pinning a published version. The
  app adds a check in the same PR that refuses its own hand-rolled version of that pattern, so it
  cannot come back. A part an app needs to differ becomes an option here, never a local edit. The
  first two apps have adopted it, and since 0.10.6 every gap the apps' own screens showed has a
  part, so the rest can start: forms and sign-in first, then the editor, then media and the frame.
- **Tauri on Chromium (discovery).** Tauri runs on each platform's own webview: WebKit on
  macOS and Linux. Once Tauri supports an embedded Chromium runtime, add that build beside the
  system-webview shell, so the library is checked in both. As of 2026-11-08 it does, in alpha only:
  Tauri 3 splits the runtime out, and `tauri-runtime-cef` (Chromium Embedded Framework, Linux,
  macOS and Windows) ships beside `tauri-runtime-wry` on the `v3` branch, at
  [3.0.0-alpha.7](https://github.com/tauri-apps/tauri/releases/tag/tauri-runtime-cef-v3.0.0-alpha.7)
  since 2026-11-06, with open CEF bugs (Linux keyboard focus, idle CPU, fullscreen sizing) and no
  blog post yet; stable Tauri is 2.12 on the system webview. Next: once Tauri 3 reaches beta, add
  an `examples/tauri-cef` shell on `tauri-runtime-cef` beside the examples' Tauri shells, built by the
  examples workflow; until then, nothing to build.

- **Parts the app stories still build.** A letter header (avatar, sender, address, time, the
  attachment mark, folding over its body) for Mail;
  one detail sheet for the Workspace, Files and Admin detail panes;
  the board item's panel with its checklist; a sideways-scrolling chip row with one chosen; a
  channel row (avatar, name, followers, Follow) and an action cluster for a watch page; checkboxes
  with a color dot for calendar toggles.
- **The records app's conversion.** `examples/records/GAPS.md` maps every screen of the records app
  onto the library and ends with the work left, in order:
    - a free-form detail under an opened `DataTable` row
    - more modes for the entry grid
    - `TreeSelect` scopes
    - counts beside `BarList`'s bars

    A `--color-*` name exists only once a class uses it, so a prop that takes a CSS color takes the
    raw token (`var(--status-running)`); decide whether every color is emitted.

- **Gaps the examples found (2026-11-09)**, still open:
    - **Frame:**
        - a rail that shows its places above its body, not behind a row
        - ⌘K refused while a closing dialog still counts as a layer
    - **Tables:**
        - `DataTable` heads that take a node (a type badge)
        - a list variant with its own search
        - `stack: 'lead'` passing a press on a non-control through to the row
        - blank space under stacked cards
        - windowing in `TrackList`, and a `TrackList` row that links to a page
    - **Dashboards:**
        - panels moved by drag
        - custom ranges with a time of day
        - a phone layout for an editor beside its live preview
    - **Charts and maps:**
        - PNG export from `MapView`
        - colors mapped from values in a chart's spec, so run states take their status colors
        - country fills from a world geometry
        - a basemap that works offline
    - **Graphs:**
        - a small engine-free pipeline glyph for lists
        - a live force layout with dragging
    - **Editors:**
        - `CodeEditor` following a `[[link]]` on Mod-click
        - backlink lines drawn as Markdown
        - `Tree` reordering within a folder, dragging from the keyboard, and opening a parent when it is chosen
        - `CodeEditor` gaps from a pipeline app that edits in Monaco (2026-11-09): two editors over one
          buffer, so a pane and the window it pops out into share edits, undo and the caret's place;
          an option to wash the caret's line while the editor is not focused, as a user preference;
          and completing a key's whole object from the schema's `required` keys, as a snippet
    - **Media:** artwork for the media session from drawn covers.
    - **Video:**
        - waiting on a live stream's missing segments, where hls.js now skips past them
        - Apple's own HLS (Safari, the macOS webview) picking a try up at the start of the segment it
          stood in, so up to a segment plays again, and dropping "Trying again" once the media loads
          rather than once it plays

        Checked on 2026-11-09: the video example makes its clips (WebCodecs VP8 and Opus) and plays
        them in Tauri on the system WebKit, as in Chromium. Native HLS (MPEG-TS, `startAt`, stalls and
        giving up) and full screen with a cover, in the browser and through a desktop call, were
        checked headless in WebKit the same day.
- **Dashboard panels on the chart kinds.** `BarPanel`, `TimeSeriesPanel` and `ComboPanel` build
  ECharts options of their own and have drifted from the kinds (stack corners, for one); make them
  thin panels over the kinds, adding what the kinds lack first.
- **The remaining hand-drawn tables.** `FilePreview` (CSV), `ScoreTable` and `ChartLegend` draw
  tables of their own; move them onto `DataTable`. `PermissionMatrix` may stay a matrix; decide.

## 1.0

Settle before 1.0:

- **A changelog.** `CHANGELOG.md` with each release's breaking changes, from 1.0 on.
- **Open source.** The library is open source from 1.0: an open license in `LICENSE` and every
  `package.json`, published where anyone can install it without a token (the npm registry, or
  public GitHub Packages with that said plainly), a contributing guide built from `AGENTS.md`, and
  a last sweep of the code, the stories, the fixtures and the history for anything private or any
  app's name.

Should:

- **Locale.** A `locale` (provider and prop) for number formats, collation and dates, replacing the
  fixed `en-US` in `DataTable`, `SelectionBar`, `SearchResults`, charts, maps and the calendar; words
  for the primitives' fixed strings (Close, the spinner, pagination, the carousel).
- **Overlaps merged.** One toast (sonner or ours), one loading part, `ThemeToggle` renamed for the
  scheme it toggles, `Composer` and `MessageComposer` sharing attachments, sending and mentions,
  and the roles of `Banner`, `Problem`, `PageState` and the alert written down.
- **One naming.** One value callback, one selection callback, one dismissal (`onOpenChange`), one
  size scale, finished in the 1.0 window.
- **`'use client'`** on the components that use hooks.
- **Tests** for the parts heavy in logic: `DataTable` paging, server mode, selection and keys,
  `MediaBar`, `SchemaForm`, `Search`, the board's drag, the core hooks.
- **CI installs the packed tarballs** into each example's `web/`, not the workspace link.
- **Stories** for parts no story shows directly (`ProgressRing`, `ChatTyping`, `PresenceDot`).
- **Logical sides** (start and end, not left and right) and a right-to-left story, if wanted.

## Later

- **Screenshot comparison back in CI.** Off since 0.9.3 while the looks still move; the
  baselines branch, the screenshots workflow and `scripts/baselines.sh` stay. Turn it back on near
  1.0, and add the render check in WebKit and Firefox for the platforms Chromium does not cover.

- **A design system for decks and mockups.** Built from the repo itself (the tokens, the
  component screenshots and `docs/components.md`), so slides and mockups made with AI design tools
  match the apps. Never a hand-kept copy.
- **A machine-readable registry.** `llms.txt` and `docs/components.md` point agents at the parts;
  what remains is a form agent tools read directly (a shadcn-style registry), each item pointing at
  the package, none shipping a copy.

## Not planned

- Accessibility audits, axe gates in CI and contrast scoring.
- A second engine for a job that already has one: ECharts draws every chart, maplibre every map,
  React Flow every interactive graph, xterm.js every terminal, hls.js every HTTP live stream, Mermaid every diagram written as text, KaTeX every formula.
  Sparklines are plain SVG.
- Copy-in distribution. Apps install the package; nothing is vendored.
