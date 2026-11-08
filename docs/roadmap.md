# Roadmap

What is shipped, what comes next, and what is decided but not yet built. `docs/plan.md` says what
the library holds and the choices behind its parts; this file says where it is going. Move an item
to `plan.md` when it ships.

## Where it stands

- **0.10.6** is the latest release (2026-11-08), the last of the rounds the apps' own screens
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

- **Working demo apps outside Storybook.** In `examples/`, built against the package as an app would
  be: a data visualizer (a table of data with chart views to pick, saved and shared), and others to
  follow. Storybook stays the catalog of parts; the examples show them working together.
- **The examples as they stand (run 2026-11-08).** `examples/web` in Chromium, the Electron 45
  shell and the Tauri 2 shell on WebKit all start and draw with no errors, but they hold one page
  (the runs table) on the core package alone, from before the palette existed. To bring them up
  to the library:
    - **Palette and search:** wire `palette`, `paletteSearch`, the top bar's search and the
      appearance commands; ⌘K does nothing today.
    - **Desktop frame:** both shells keep the system title bar. Use `desktop` on `Shell` (a hidden
      title bar, the drag strip, room for the traffic lights) and full screen through
      `setFullscreen`.
    - **Wording:** words follow their context ("Search" and "New" on Runs, not "Search runs" and
      "New run").
    - **Electron install:** `bun install` did not fetch Electron's binary although it is a trusted
      dependency; fix the install or say in the README how to fetch it.
    - **CI:** it only compiles the shells. Start each once: Electron under Playwright with a virtual
      display, Tauri as a built binary.
    - **Room for the demos:** put the demo apps in `examples/web`, with the add-on packages, so each
      runs in the browser, Electron and Tauri alike.

## Next

- **Smaller start bundles, what is left.** Every library only some parts need is an optional peer,
  and the heavy ones load on first use. Left in every page's start: React and the frame (`Shell`,
  `Rail`, `AccountMenu`, with Base UI's menu, popover and tooltip on floating-ui), which the menu's
  popup could load on first open. On a dashboard `chartLegend` still brings every kind with the page: split each kind's
  shaping of rows, which the legend needs, from its option builder, which can load with ECharts.
  `cmdk` stays a dependency while `Shell`'s palette is drawn with it.
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
  an `examples/tauri-cef` shell on `tauri-runtime-cef` beside `examples/tauri`, built by the
  examples workflow; until then, nothing to build.

- **Missing parts, from the 2026-11-08 review**, most valuable first: `DateField`, `TimeField` and
  `DateTimeField` (typed entry with a picker, bounds and one format); `NumberField` (bounds, step,
  units, explicit parse and format); `InlineEdit` with a save, cancel, pending and error cycle, and
  editable `DataTable` cells; `AsyncSelect` with several values, creating an option and loading more;
  search inside filter menus and a `FilterBar` (add a filter, clear all, range operators); saved
  views for a listing (filters, sort, columns; the app stores them); mentions suggested at the caret
  in both composers; `FileField` (picker and drop zone with accepted types, size and count limits,
  and refused files said); an unsaved-changes guard for navigation and closing the tab; `Toolbar`
  overflow into a More menu; next, previous, zoom and pan in `ImageLightbox`. All in core.
- **Parts the app stories still build.** A letter header (avatar, sender, address, time, the
  attachment mark, folding over its body) for Mail; a usage line (tokens, latency, time to first
  token) and a model's answer column for Playground, with a streaming caret as a `Markdown` option;
  a state map onto `StatusChip`; one detail sheet for the Workspace, Files and Admin detail panes;
  the board item's panel with its checklist; a sideways-scrolling chip row with one chosen; a
  channel row (avatar, name, followers, Follow) and an action cluster for a watch page; checkboxes
  with a color dot for calendar toggles.
- **Gaps from a records app (2026-11-08)**, its screens laid beside Apps/Records: a
  period picker (the recent periods of a type with their ids, newest first, and any other id typed
  in); an entry grid (questions down, categories across, number cells with row totals, folding to a
  card per question on a narrow screen), on `DataTable`'s editable cells; an API playground
  composition (method, path, query parameters, send, the answer's status, time and body, copy as
  curl, the server's own requests as presets in a side panel); a grouped list of examples in tabs
  beside an editor; the palette's foot (the app's mark, the keys that open a row and the palette); a
  server's state for the top bar (a dot, its name and version, a menu); a chevron at the end of a
  row that opens a page; a computed answer drawn read only with why, and a clear for an optional
  yes or no; fields in a row lined up when one has a description; a line saying what each theme
  is in `ThemePicker`. A `--color-*` name exists only once a class uses it, so a prop that takes a
  CSS color takes the raw token (`var(--status-running)`); decide whether every color is emitted.
- **Gaps from a query app (2026-11-08)**, found moving an app with a jq editor onto 0.10.6:
    - **Completions listed twice in `CodeEditor`.** An app's own `completions` (one per builtin,
      with signatures as `detail` and a summary as `docs`) are offered beside the language's own
      words, and nothing merges the two by label, so `has` is listed twice. An app's completion
      with the same label as a language word should replace it, the app's detail and docs being
      richer; or an option leaves the language's words out.
    - **Diagrams and math in every Markdown build.** An app that renders `Markdown` with
      `math={false}` and no diagram fences still gets chunks for Mermaid (with cytoscape and elk)
      and KaTeX in its build. They are lazy and never fetched, but they grow its `dist/` from 8.7 MB
      to 14 MB, which ships with every release of an app that packages its build. Give the app a
      way the bundler can see, so neither enters its build: a `Markdown` entry point that never
      names their imports, with diagrams and math as plug-ins the app passes in, or something like
      it.
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
- **CI installs the packed tarballs** into `examples/web`, not the workspace link.
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
