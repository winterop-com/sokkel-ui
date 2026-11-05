# Roadmap

What is shipped, what comes next, and what is decided but not yet built. `docs/plan.md` says what
the library holds and the choices behind its parts; this file says where it is going. Move an item
to `plan.md` when it ships.

## Where it stands

- **0.4.0** is the latest release (2026-11-05). 0.2.0 was the first published version, 0.3.0 the
  second.
- The library was renamed from winterop-ui to sokkel-ui after 0.4.0: the repository is
  `winterop-com/sokkel-ui`, the package `@winterop-com/sokkel-ui`, the Storybook
  https://winterop-com.github.io/sokkel-ui/. 0.2.0 to 0.4.0 were published as `@winterop-com/ui`
  and are republished under the new name; the old package is then deleted.
- No app uses it yet. Until one does, a PR merges as soon as the local gates pass and main's CI
  catches the rest; a release still waits for green.

## 0.5.0

The first release under the new name.

- **Typefaces.** Plex Sans and Plex Mono stay the default; try the alternatives in
  Research/Typography, laid over the kitchen sink, and pick:
    - Geist and Geist Mono, a family matched like Plex (x-height 0.530 for both);
    - Inter and JetBrains Mono (0.546 and 0.550), which need almost no mono correction;
    - Plex Sans with JetBrains Mono.

    A theme can already set its own faces through `--typeface-sans` and `--typeface-mono`; a pick
    changes the default only.

- **Body size.** The base layer sets the body at 16px (`text-base`) while most components set 15px
  (`text-sm`). Settle on one, keeping 16px inputs on phones so a focused field does not zoom.
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
- **Mono size grid.** A story that sets mono text at every size beside its sans neighbor, to check
  the `font-size-adjust` rule; it belongs with the typeface round.

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
