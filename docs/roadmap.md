# Roadmap

What is shipped, what comes next, and what is decided but not yet built. `docs/plan.md` says what
the library holds and the choices behind its parts; this file says where it is going. Move an item
to `plan.md` when it ships.

## Where it stands

- **0.9.1** is the latest release (2026-11-08): the gaps the first app found. Math in `Markdown`,
  reasoning, waiting, uploads and audio in chat, `useAppearance` and `useScheme`, the palette on
  Cmd/Ctrl+K owned by `Shell`, a status foot level with the account, theme-tinted surfaces, and
  `Segmented` options, `Highlight`, `BarList` and `ImageAnnotations`.
- **0.9.0** is the latest release (2026-11-07): four packages, ready for adoption. The core
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
- No app uses it yet. Until one does, a PR merges as soon as the local gates pass and main's CI
  catches the rest; a release still waits for green.

## 0.9.0: packages

- **The library splits into four packages**, released together at one version: the core
  `@winterop-com/sokkel-ui` and an add-on per engine, `@winterop-com/sokkel-ui-charts` (ECharts),
  `-maps` (maplibre) and `-graph` (React Flow and elk), each with its own styles. An app installs the
  core and the add-ons it draws with. Move to `plan.md` once released.

## 0.10: terminals (done on main)

- **An interactive terminal**, in a fifth package, `@winterop-com/sokkel-ui-terminal`, on xterm.js:
  `TerminalView` takes keystrokes and output, reports its size and emulates full-screen programs,
  and the read-only `Terminal` moved onto the same engine. The core keeps no terminal of its own.

## 0.10: example apps

- **Working demo apps outside Storybook.** In `examples/`, built against the package as an app would
  be: a data visualizer (a table of data with chart views to pick, saved and shared), and others to
  follow. Storybook stays the catalog of parts; the examples show them working together.

## Next

- **A lighter core install (not urgent).** Charts, maps and graphs are packages of their own from
  0.9.0. Still installed with the core for everyone: `shiki`, `react-markdown` with its rehype and
  remark plugins, `ajv`, `embla`, `cmdk` and `react-day-picker`; make them optional peers too, or
  move `CodeEditor` and its CodeMirror into a `sokkel-ui-editor` package if the core stays too broad.
- **Adoption.** Apps adopt the library one pattern per PR, each pinning a published version. The
  app adds a check in the same PR that refuses its own hand-rolled version of that pattern, so it
  cannot come back. A part an app needs to differ becomes an option here, never a local edit.
- **Search.** One search component for any page, beyond the plain field: results as the words are
  typed, grouped by kind (videos, people, jobs) with thumbnails and previews, moved through by the
  keyboard, and a results page with facets and counts. A data table's bar, the top bar and the
  command palette take it, each with the room it is given.
- **A second validation round.** The issue mark and the count beside the verb are in every form,
  but the count still reads weak and its list is a first answer to where the issues show. Render
  the options side by side (the count's look and place, the list at the count against a summary
  at the top, how a long form leads from one issue to the next, warnings beside errors, a page
  form's bar against a dialog's footer) and pick, then fold the pick into `IssueCount`, `Field`
  and `SchemaForm` so every form takes it at once.
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
- **Mono at `text-2xs`.** The mono size grid (Foundations/Typography) shows the rule holding:
  mono's x-height is 0.87 of sans's at every size and 0.95 inside `text-xs`, in Plex and in Geist,
  while mono words still run about 20 percent wider. `text-2xs` takes the body share, so its mono
  draws at 9.6px, smaller than mono inside `text-xs`; decide whether it takes the small share.

## Later

- **A design system for decks and mockups.** Built from the repo itself (the tokens, the
  component screenshots and `docs/components.md`), so slides and mockups made with AI design tools
  match the apps. Never a hand-kept copy.
- **A machine-readable registry.** `llms.txt` and `docs/components.md` point agents at the parts;
  what remains is a form agent tools read directly (a shadcn-style registry), each item pointing at
  the package, none shipping a copy.

## Not planned

- Accessibility audits, axe gates in CI and contrast scoring.
- A second engine for a job that already has one: ECharts draws every chart, maplibre every map,
  React Flow every interactive graph, xterm.js every terminal, Mermaid every diagram written as text, KaTeX every formula.
  Sparklines are plain SVG.
- Copy-in distribution. Apps install the package; nothing is vendored.
