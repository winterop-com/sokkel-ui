# Roadmap

What is shipped, what comes next, and what is decided but not yet built. `docs/plan.md` says what
the library holds and the choices behind its parts; this file says where it is going. Move an item
to `plan.md` when it ships.

## Where it stands

- **0.4.0** is the latest release (2026-11-05). 0.2.0 was the first published version, 0.3.0 the
  second.
- The library was renamed from winterop-ui to sokkel-ui after 0.4.0: the repository is
  `winterop-com/sokkel-ui`, the package `@winterop-com/sokkel-ui`, the Storybook
  https://winterop-com.github.io/sokkel-ui/. 0.2.0 to 0.4.0 are republished under the new name, and
  the old `@winterop-com/ui` package is deleted.
- No app uses it yet. Until one does, a PR merges as soon as the local gates pass and main's CI
  catches the rest; a release still waits for green.

## 0.5.0

The first release under the new name.

- **Dark contrast for every theme.** 0.4.0 lifted secondary text, borders, inputs, cards and
  popovers in the default theme's dark scheme (and amber, which shares it). Paper, contrast, tokyo,
  vinyl, cassette and neon get the same lift, each from its own colors, with their baselines
  retaken.
- **Theme candidates.** Choose which of the candidate sets in `.storybook/candidates.json` to keep,
  fold those into `tokens/tokens.json` named for how they look, and drop the rest.

## Next

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
- **Counts on rail entries.** A rail entry carries an unread count, so an app's own navigation
  strip, such as the team chat's, is the library's `Rail` with no hand-drawn badge.
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
