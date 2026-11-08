# Roadmap

What is shipped, what comes next, and what is decided but not yet built. `docs/plan.md` says what
the library holds and the choices behind its parts; this file says where it is going. Move an item
to `plan.md` when it ships.

## Where it stands

- **0.9.2** is the latest release (2026-11-08): a fifth package, `@winterop-com/sokkel-ui-terminal`,
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
