# winterop-ui

[![CI](https://github.com/winterop-com/winterop-ui/actions/workflows/ci.yaml/badge.svg)](https://github.com/winterop-com/winterop-ui/actions/workflows/ci.yaml)
[![Storybook](https://github.com/winterop-com/winterop-ui/actions/workflows/pages.yaml/badge.svg)](https://winterop-com.github.io/winterop-ui/)
[![Browse the Storybook](https://img.shields.io/badge/storybook-browse-ff4785?logo=storybook&logoColor=white)](https://winterop-com.github.io/winterop-ui/)
![React 19](https://img.shields.io/badge/react-19-61dafb?logo=react&logoColor=white)
![Base UI](https://img.shields.io/badge/base%20ui-1.9-000000)
![Tailwind CSS 4](https://img.shields.io/badge/tailwind%20css-4-38bdf8?logo=tailwindcss&logoColor=white)
![TypeScript 7](https://img.shields.io/badge/typescript-7-3178c6?logo=typescript&logoColor=white)
![License: proprietary](https://img.shields.io/badge/license-proprietary-lightgrey)

A shared React component library: one set of tokens and themes, Base UI primitives, the patterns
apps are built from, and the Storybook stories that show and test them. Apps install it as a
package and never copy from it, so one fix here reaches every app at its next version.

The Storybook is published at **https://winterop-com.github.io/winterop-ui/**.

## What is in it

- **Primitives:** the full shadcn `base-nova` set on Base UI, restyled to the tokens: buttons,
  inputs, selects, menus with submenus, dialogs, sheets, tables, tabs, charts, chat messages and
  more.
- **Frame:** Shell, Rail, TopBar, NavBar, SidePanel, Dock, StatusLine, CommandPalette and
  AccountMenu. The rail, side panel and dock resize when given a size.
- **Content:** Section, PageHeader, ListTable, DescriptionList, Stat, Timeline, Tree and
  TreeSelect, Field, Segmented, CodeEditor, LogView, JsonTree and DiffView.
- **Chat:** Markdown, Code, MermaidDiagram, ToolCalls, ConfirmCard, Composer and audio
  waveforms.
- **Maps:** MapView on maplibre, with boundary, point and grid layers, legends, popups,
  basemaps, a layer panel and a period slider.
- **Graphs:** PipelineGraph, RunGraph, DependencyGraph and StateMachine on React Flow, laid out
  by elk, with the canvas, node box, layout and hook they are built from.
- **Apps:** whole-app compositions in Storybook, showing how the parts fit together.

## Tokens and themes

- `tokens/tokens.json` is the only place a token is defined. `bun run tokens` writes
  `src/styles/tokens.css` from it, and `bun scripts/build-tokens.ts --check` fails when the two
  disagree.
- Themes are named for how they look. `default` defines every token; the others (paper,
  contrast, tokyo, vinyl, cassette, neon) override what they change, which may be any token:
  colors, typefaces, radius or density. An app picks its theme on `<html data-theme>`, `.dark`
  picks dark mode, and `data-theme-scope` draws one element in a theme of its own.
- Every corner derives from `--radius` (4.5px by default), which a theme or an app sets.

## Storybook

`bun run storybook` serves the stories on port 6106. The toolbar sets the scheme, the theme, the
density, the corner radius and the typeface. The theme menu also lists candidate themes for
judging before one is adopted into the tokens (`bun scripts/import-candidates.ts`).

Every story is held to its approved screenshot in dark and light, at desktop and phone width.
The screenshots are Linux renders taken in the Playwright image, as CI checks them:
`bun run test:visual:linux` compares and `bun run test:visual:linux:update` takes new ones.

## Using it

The package is `@winterop-com/ui` on GitHub Packages. An app points the scope at that registry in
its `.npmrc`, with a token that can read packages, and pins a version:

```
@winterop-com:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```
bun add @winterop-com/ui@0.2.0
```

An app that brings its own Tailwind imports `@winterop-com/ui/tokens.css` (the tokens, themes and
density levels); one that does not imports `@winterop-com/ui/styles.css` (Tailwind, the fonts, the
tokens and base styles). Components import by path, such as `@winterop-com/ui/DialogShell` or
`@winterop-com/ui/primitives/button`.

## License

Proprietary: published for reference only, all rights reserved. See `LICENSE`, and
`THIRD_PARTY_NOTICES.md` for the code carried under other licenses.
