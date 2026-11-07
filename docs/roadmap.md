# Roadmap

What is shipped, what comes next, and what is decided but not yet built. `docs/plan.md` says what
the library holds and the choices behind its parts; this file says where it is going. Move an item
to `plan.md` when it ships.

## Where it stands

- **0.7.1** is the latest release (2026-11-07): charts. `Chart` draws from rows by kind and
  fields, with twenty-five kinds on ECharts (docs/charts.md lists them), small multiples,
  linked panels and dials, and five dashboards whose ranges and filters work. 0.7.0 put every
  example on shared components: layout components and a rule against hand-built layout, about
  twenty-five new parts, the dark lift for every theme, and hovers that show on any surface. 0.6.0
  brought the team chat and AI chat parts, resizable panels and columns, and `DataTable` as the one
  table. 0.5.0 was the first release under the new name; 0.2.0 was the first published version.
- The library was renamed from winterop-ui to sokkel-ui after 0.4.0: the repository is
  `winterop-com/sokkel-ui`, the package `@winterop-com/sokkel-ui`, the Storybook
  https://winterop-com.github.io/sokkel-ui/. 0.2.0 to 0.4.0 are republished under the new name, and
  the old `@winterop-com/ui` package is deleted.
- No app uses it yet. Until one does, a PR merges as soon as the local gates pass and main's CI
  catches the rest; a release still waits for green.

## 0.8: music

The music parts grow to carry a whole player, before an app builds on them.

- **A fuller music player: done.** `MediaBar` resizes from its top edge, from the one-line bar to
  a large now-playing panel: the cover as tall as the bar, a line in the accent (track 13 of 16, the
  album, the year) over a large title and the artist, the scrubber drawn as the track's waveform
  with the played part filled, and the transport at the foot with the volume at the end. `Shell`
  docks it between the content and the foot, with the rail's foot (the account) kept at the
  window's bottom edge.
- **A sound visualizer: done.** `SoundVisualizer` draws what plays from an audio or video element,
  or a live stream such as a microphone's, as a spectrum, an area, a wave or a ring. It holds still
  when paused or hidden, follows the theme, and draws a still frame for stories; the bar visualizer
  is drawn by it, so there is one. It rises behind the large player's title, and the music app's V
  key shows and hides it with a toast. More kinds come one at a time: a two-channel level meter,
  glow and trails.
- **A fuller album page: done.** `PageHeader` takes a back button and the trail above the title,
  each `TrackList` row carries add to queue and a favorite star in view, and `StarButton` is the
  star in both places.

## 0.10: example apps

- **Working demo apps outside Storybook.** In `examples/`, built against the package as an app would
  be: a data visualizer (a table of data with chart views to pick, saved and shared), and others to
  follow. Storybook stays the catalog of parts; the examples show them working together.

## Next

- **Lighter installs, then packages (not urgent).** The engines (ECharts, maplibre, React Flow,
  CodeMirror, Mermaid) are optional peers already, and each part is imported by its own path, so an
  app bundles only what it uses. Still installed for everyone: `shiki`, `react-markdown` with its
  rehype and remark plugins, `ajv`, `embla`, `cmdk` and `react-day-picker`; make them optional peers
  too. After that, if installs or styles stay too broad, split into packages, a core one and one per
  engine (`sokkel-ui-charts`, `-maps`, `-graph`, `-editor`), each versioned and with its own styles.
- **Adoption.** Apps adopt the library one pattern per PR, each pinning a published version. The
  app adds a check in the same PR that refuses its own hand-rolled version of that pattern, so it
  cannot come back. A part an app needs to differ becomes an option here, never a local edit.
- **Hierarchy trees and maps at scale.** A tree that picks from a deep hierarchy (lazy children,
  search, a path shown for the choice) and maps over many boundaries come with the last wave of
  adoption, not before.
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
  system-webview shell, so the library is checked in both.
- **An interactive terminal.** `Terminal` shows commands and their output; a shell needs a real
  terminal: keystrokes and paste sent to the app (which carries them to a remote shell over its own
  connection), full emulation for programs that move the cursor or take the whole screen (an
  editor, `top`), the size reported as it changes, a scrollback, selection and copy. That needs a
  terminal emulator as its engine; pick one, likely xterm.js, and move the read-only `Terminal` onto
  the same engine so there is one per job. The library draws it and hands the bytes over; the
  connection stays the app's.
- **A Nerd Font for terminals (discovery).** Try JetBrains Mono NL patched as a Nerd Font for
  `Terminal` and `LogView` only, through their own `--typeface-mono`: the prompt icons it carries,
  its size and a subset of only the icons used, and its license (SIL OFL, listed in
  `THIRD_PARTY_NOTICES.md`) before shipping a font file.
- **Mono size grid.** A story that sets mono text at every size beside its sans neighbor, in Plex
  and in Geist, to check the `font-size-adjust` rule.

## Later

- **One token source, several outputs.** `tokens/tokens.json` already builds `tokens.css` and a
  file per theme. From the same file: a W3C design-tokens file for Figma and theme tools, and a
  design system for design tools built from the tokens and component screenshots, so decks and
  mockups match the apps. Never two hand-kept copies.
- **A registry for agents.** A shadcn-style registry only so coding agents can find components.
  Every item points at the package; none ships a copy.

## Not planned

- Accessibility audits, axe gates in CI and contrast scoring.
- A second engine for a job that already has one: ECharts draws every chart, maplibre every map,
  React Flow every interactive graph, Mermaid every diagram written as text. Sparklines are plain
  SVG.
- Copy-in distribution. Apps install the package; nothing is vendored.
