# Roadmap

What is shipped, what comes next, and what is decided but not yet built. `docs/plan.md` says what
the library holds and the choices behind its parts; this file says where it is going. Move an item
to `plan.md` when it ships.

## Where it stands

- **0.6.0** is the latest release (2026-11-06): the team chat and AI chat parts, more charts,
  resizable panels and columns, and `DataTable` as the one table. 0.5.0 was the first release under
  the new name; 0.2.0 was the first published version.
- The library was renamed from winterop-ui to sokkel-ui after 0.4.0: the repository is
  `winterop-com/sokkel-ui`, the package `@winterop-com/sokkel-ui`, the Storybook
  https://winterop-com.github.io/sokkel-ui/. 0.2.0 to 0.4.0 are republished under the new name, and
  the old `@winterop-com/ui` package is deleted.
- No app uses it yet. Until one does, a PR merges as soon as the local gates pass and main's CI
  catches the rest; a release still waits for green.

## 0.7.0

Every example on shared components. An audit of the stories found parts the examples build by
hand; each becomes a library component or an option on one, and every example takes it, so a change
reaches them all. Done in waves, one PR each.

- **Layout components first.** The stories arrange components with raw flex and grid (about 840
  and 130 uses in 139 files), and that glue is where layout bugs get patched one story at a time.
  Layout components (a stack, a row, columns, a split with an aside, a page body) whose cells always
  shrink, wrap or scroll correctly carry it instead; every story moves onto them, and
  `src/rules.test.ts` then rejects raw layout in a story, so a layout fix lands once.

- **Use what exists** (about 45 places): label and control pairs as `Field`, titled boxes as
  `Section`, the uppercase panel heads as `PanelSection`, search and filters in `DataTable`'s
  `toolbar`, `TopBar`, `StatusLine`, `Tabs` with arrow keys, `AvatarGroup`, `Toggle`, `TrackList`,
  `MediaCard`, `KpiRow`, `Stat`, `Empty`, `Attachment`, `ItemCard` selection, `Item`, a real
  `ContextMenu` for the graph editor's menu, `SettingRow`, `Composer`, `Dot`, `DialogShell`,
  `SwitchField`, `PageHeader`, `ChatDayDivider`, and the inspector head.
- **New parts** (widest reuse first): `IconButton` (a label and a tooltip in one, about 30 places);
  `PageHeader` description and meta; a `FilterChip` that owns its menu; `PersonRow`; `TextField`,
  or `Field` setting the issue edge on its control; an app trail with the mark outside `Shell`;
  `GroupLabel`, which five components also copy; `CheckboxList`; `CheckboxField`; `ChoiceList`;
  `SelectionBar`, shared with `DataTable`; a page `Toolbar`; `SubNav`; `PaneHeader`; `SliderField`;
  `ClampText`; `Comment`; `MetaLine`; `ProgressField`; `CopyField`; `DueText`; `FormBar`;
  `InlineField`; `ChipBar`; `AttachmentList`; `StarButton`; a value-showing menu button;
  `IssueList`, shared with `IssueCount`; a folding mail letter; `Section` description;
  `DescriptionList` icons; a `DropZone` picker; `NowPlaying`; a sortable list; and a `bare` `Input`
  and `Textarea`.
- **Dark contrast for every theme.** 0.4.0 lifted secondary text, borders, inputs, cards and
  popovers in the default theme's dark scheme (and amber, which shares it). Paper, contrast, tokyo,
  vinyl, cassette and neon get the same lift, each from its own colors, with their baselines
  retaken.
- **Theme candidates.** Choose which of the candidate sets in `.storybook/candidates.json` to keep,
  fold those into `tokens/tokens.json` named for how they look, and drop the rest.

## Next

- **Ship only the library.** The package publishes `src/stories` with `src`, and `styles.css`
  scans all of `src`, so an app's CSS carries classes only the stories use (398 kB in the example
  app). Publish without the stories, scan only the components, and say in the README that
  `styles.css` needs `tailwindcss`, which the examples found an app must install itself.
- **A size budget in CI.** Build a few typical apps (forms only, a dashboard, a map page), measure
  each bundle, and fail when one grows past its budget or pulls in an engine it does not use.
  Splitting into packages (core, charts, maps, graph, editor) is the step after, only if optional
  peers and the budget are not enough.
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

- **One token source, several outputs.** `tokens/tokens.json` already builds `tokens.css`. From the
  same file: a W3C design-tokens file for Figma and theme tools, and a design system for design
  tools built from the tokens and component screenshots, so decks and mockups match the apps.
  Never two hand-kept copies.
- **A registry for agents.** A shadcn-style registry only so coding agents can find components.
  Every item points at the package; none ships a copy.

## Not planned

- Accessibility audits, axe gates in CI and contrast scoring.
- A second engine for a job that already has one: ECharts draws every chart, maplibre every map,
  React Flow every interactive graph, Mermaid every diagram written as text. Sparklines are plain
  SVG.
- Copy-in distribution. Apps install the package; nothing is vendored.
