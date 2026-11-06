<img src="docs/assets/mark.svg" width="64" height="64" alt="">

# sokkel-ui

[![CI](https://github.com/winterop-com/sokkel-ui/actions/workflows/ci.yaml/badge.svg)](https://github.com/winterop-com/sokkel-ui/actions/workflows/ci.yaml)
[![Browse the Storybook](https://img.shields.io/badge/storybook-browse-ff4785?logo=storybook&logoColor=white)](https://winterop-com.github.io/sokkel-ui/)
![License: proprietary](https://img.shields.io/badge/license-proprietary-lightgrey)

A shared React component library: one set of tokens and themes, Base UI primitives, the patterns
apps are built from, and the Storybook stories that show and test them. Apps install it as a
package and never copy from it, so one fix here reaches every app at its next version.

The Storybook is published at **https://winterop-com.github.io/sokkel-ui/**.

## What is in it

- **Primitives:** the full shadcn `base-nova` set on Base UI, restyled to the tokens: buttons,
  inputs, selects, menus with submenus, dialogs, sheets, tables, tabs, charts, chat messages and
  more.
- **Frame:** Shell, Rail, TopBar, NavBar, SidePanel, Dock, StatusLine, CommandPalette and
  AccountMenu. The rail, side panel and dock resize when given a size.
- **Content:** Section, PageHeader, ListTable, DescriptionList, Stat, Timeline, Tree and
  TreeSelect, Field, Segmented, CodeEditor, LogView, JsonTree, DiffView and TableOfContents.
- **Files:** FileList, FileGrid and FileTile, FilePreview, UploadTray and DropZone.
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

## Roadmap

`docs/roadmap.md`: where the library stands, the next release, and what is decided but not built.

## Using it

The package is `@winterop-com/sokkel-ui` on GitHub Packages. An app points the scope at that registry in
its `.npmrc`, with a token that can read packages, and pins a version:

```
@winterop-com:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```
bun add @winterop-com/sokkel-ui@0.5.0
```

An app that brings its own Tailwind imports `@winterop-com/sokkel-ui/tokens.css` (the tokens, themes and
density levels), with `motion.css` (the motion setting) and `typography.css` (mono sized to the text
around it); one that does not imports `@winterop-com/sokkel-ui/styles.css` (Tailwind, the fonts, the
tokens and base styles). Components import by path, such as `@winterop-com/sokkel-ui/DialogShell` or
`@winterop-com/sokkel-ui/primitives/button`.

The heavy engines are optional peer dependencies, so an app installs only those of the parts it
uses:

| The app uses                                 | It also installs                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Charts and dashboard panels                  | `echarts`                                                                                                                                                        |
| Maps                                         | `maplibre-gl`                                                                                                                                                    |
| Graphs (`@winterop-com/sokkel-ui/graph/...`) | `@xyflow/react` and `elkjs`                                                                                                                                      |
| `MermaidDiagram`                             | `mermaid`                                                                                                                                                        |
| `CodeEditor`                                 | `@codemirror/commands`, `@codemirror/lang-json`, `@codemirror/lang-yaml`, `@codemirror/language`, `@codemirror/state`, `@codemirror/view` and `@lezer/highlight` |
| Geist as a theme's typeface                  | `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`                                                                                               |

## License

Proprietary: published for reference only, all rights reserved. See `LICENSE`, and
`THIRD_PARTY_NOTICES.md` for the code carried under other licenses.
