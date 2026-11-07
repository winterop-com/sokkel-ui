<img src="docs/assets/mark.svg" width="64" height="64" alt="">

# sokkel-ui

[![CI](https://github.com/winterop-com/sokkel-ui/actions/workflows/ci.yaml/badge.svg)](https://github.com/winterop-com/sokkel-ui/actions/workflows/ci.yaml)
[![Browse the Storybook](https://img.shields.io/badge/storybook-browse-ff4785?logo=storybook&logoColor=white)](https://winterop-com.github.io/sokkel-ui/)
![License: proprietary](https://img.shields.io/badge/license-proprietary-lightgrey)

A shared React component library: one set of tokens and themes, Base UI primitives, the patterns
apps are built from, and the Storybook stories that show and test them. Apps install it as a
package and never copy from it, so one fix here reaches every app at its next version.

The Storybook is published at **https://winterop-com.github.io/sokkel-ui/**.

## For agents

An agent working in an app that uses the library starts at [`llms.txt`](llms.txt): the packages,
how to install and import them, and the rules an app follows. Before building any UI part, it looks
the part up in [`docs/components.md`](docs/components.md), which lists every exported component
with its import path, what it is and a story that shows it. A complex part that is reusable, not
one screen's glue, belongs in the library as a component or an option on one. A missing feature or
option, or a bug, is reported at https://github.com/winterop-com/sokkel-ui/issues, never worked
around in the app.

## What is in it

- **Primitives:** the full shadcn `base-nova` set on Base UI, restyled to the tokens: buttons,
  inputs, selects, menus with submenus, dialogs, sheets, tables, tabs, charts, chat messages and
  more.
- **Frame:** Shell, Rail, TopBar, NavBar, SidePanel, Dock, StatusLine, CommandPalette and
  AccountMenu. The rail, side panel, inspector, channel list and dock resize by
  default.
- **Content:** Section, PageHeader, DataTable, DescriptionList, Stat, Timeline, Tree and
  TreeSelect, Field, Segmented, CodeEditor, LogView, JsonTree, DiffView and TableOfContents.
  DataTable is the one table, from a short listing to 50k rows or a tree loaded on demand; its
  columns resize by default.
- **Files:** FileList, FileGrid and FileTile, FilePreview, UploadTray and DropZone.
- **Chat:** Markdown, Code, MermaidDiagram, ToolCalls, ConfirmCard, Composer and audio
  waveforms.
- **Maps:** MapView on maplibre, with boundary, point and grid layers, legends, popups,
  basemaps, a layer panel and a period slider.
- **Graphs:** PipelineGraph, RunGraph, DependencyGraph and StateMachine on React Flow, laid out
  by elk, with the canvas, node box, layout and hook they are built from.
- **Apps:** whole-app compositions in Storybook, showing how the parts fit together.

## Tokens and themes

- `packages/core/tokens/tokens.json` is the only place a token is defined. `bun run tokens` writes
  the CSS from it, in `packages/core/src/styles/`: `tokens.css` with the default theme and the
  density levels, one file for each other theme in `themes/`, and `themes.css`, which imports them
  all.
  `bun scripts/build-tokens.ts --check` fails when the CSS and the JSON disagree.
- Themes are named for how they look. `default` defines every token; the others (amber, paper,
  contrast, tokyo, vinyl, cassette, neon) override what they change, which may be any token:
  colors, typefaces, radius or density. An app picks its theme on `<html data-theme>`, `.dark`
  picks dark mode, and `data-theme-scope` draws one element in a theme of its own. A theme other
  than the default answers once its file is imported.
- Every corner derives from `--radius` (4.5px by default), which a theme or an app sets.

## Storybook

`bun run storybook` serves the stories on port 6106. The toolbar sets the scheme, the theme, the
density, the corner radius and the typeface. A theme from an app can be judged there before it is
adopted into the tokens: `bun scripts/import-candidates.ts` lists it in the theme menu as a candidate.

Every story is held to its approved screenshot in dark and light, at desktop and phone width.
The screenshots are Linux renders taken in the Playwright image, as CI checks them:
`bun run test:visual:linux` compares and `bun run test:visual:linux:update` takes new ones.
They live on the branch `baselines`, not in main's tree, and a branch that changes a story's look
keeps its own on `baselines-for/<branch>`; `scripts/baselines.sh` fetches them into
`e2e/__screenshots__` and explains the rest. `make screenshots-ci` retakes them on GitHub.

## Roadmap

`docs/roadmap.md`: where the library stands, the next release, and what is decided but not built.

## Using it

The library is four packages on GitHub Packages, released together at one version:

| Package                          | Holds                                                                |
| -------------------------------- | -------------------------------------------------------------------- |
| `@winterop-com/sokkel-ui`        | the tokens and themes, the primitives and every pattern below        |
| `@winterop-com/sokkel-ui-charts` | `Chart` and its kinds on ECharts, and the dashboard's chart panels   |
| `@winterop-com/sokkel-ui-maps`   | `MapView` on maplibre, with its layers, legends, popups and basemaps |
| `@winterop-com/sokkel-ui-graph`  | the graphs and the graph editor on React Flow, laid out by elk       |

Every app installs the core package; an app that draws charts, maps or graphs adds that package too,
which brings its engine with it. An app points the scope at the registry in its `.npmrc`, with a
token that can read packages, and pins one version for all of them:

```
@winterop-com:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```
bun add @winterop-com/sokkel-ui@0.9.0
bun add @winterop-com/sokkel-ui-charts@0.9.0   # only for charts and chart panels
bun add @winterop-com/sokkel-ui-maps@0.9.0     # only for maps
bun add @winterop-com/sokkel-ui-graph@0.9.0    # only for graphs
```

The components are styled with Tailwind classes, so every app runs Tailwind CSS 4.1 or later and
installs it itself; the packages do not bring it. Each package's `styles.css` is Tailwind source,
not finished CSS. The core's carries Tailwind, the fonts, the tokens and base styles, with Tailwind
pointed at the core's components; an add-on's points Tailwind at its own components only. So the
app's CSS carries the classes of the packages it imports and no others (the stories are not in any
package, and none of their classes reach an app). A Vite app installs Tailwind and its plugin and
adds `tailwindcss()` from `@tailwindcss/vite` to its plugins:

```
bun add -d tailwindcss @tailwindcss/vite
```

It then imports the core's `styles.css` and, after it, the `styles.css` of each add-on it uses, all
in one stylesheet, so Tailwind reads them together. That stylesheet is imported once from the
entry:

```css
/* app.css */
@import '@winterop-com/sokkel-ui/styles.css';
@import '@winterop-com/sokkel-ui-charts/styles.css';
@import '@winterop-com/sokkel-ui-maps/styles.css';
```

```ts
import './app.css'
```

The themes are in the core package. `styles.css` carries the default theme. Every other theme is a
file of its own, so an app carries only the themes it offers: it imports each one's file after
`styles.css` and sets the theme on `<html data-theme>`, with `.dark` for dark mode:

```css
@import '@winterop-com/sokkel-ui/styles.css';
@import '@winterop-com/sokkel-ui/themes/paper.css';
```

```ts
document.documentElement.dataset.theme = 'paper'
```

An app whose settings offer every theme imports `@winterop-com/sokkel-ui/themes.css`, which holds
them all. `ThemePicker` draws its swatches from the same files, so it shows a theme's swatch only
once that theme's file is imported.

An app that brings its own Tailwind entry imports `@winterop-com/sokkel-ui/tokens.css` (the tokens,
the default theme and the density levels) instead, with the theme files it offers, `motion.css`
(the motion setting) and `typography.css` (mono sized to the text around it), and adds the
add-ons' `styles.css` after them.

### The frame every app has

Every app stands in the same frame, so a person moving between apps finds everything in the same
place. It has four parts, and an app has all four from its first screen:

- **`Shell` with a `Rail`** of the app's places down the left.
- **The command palette**, always there: `Shell`'s `palette` takes its groups and opens it on ⌘K
  (Ctrl K off a Mac) and from `TopBar`'s search in the top right corner, which shows the key.
  `placeCommands` makes its "Go to" group from the rail's groups, and `appearanceCommands` its
  scheme, density and theme commands, so an app's places and look come for free.
- **An `AccountMenu`** in the rail's foot, always there, before the app has sign-in too: then it is
  `local`, named for the local user or "Local", with a neutral avatar, settings and appearance, and
  no sign-out. The place is held, and the frame looks the same in every app.
- **A `StatusLine` as `Shell`'s `foot`**, the strip along the window's bottom edge: the connection
  or the server's state, the active model or project, background work, the version. With it, the
  `AccountMenu` sits in the bottom-left corner level with the strip, so the account and the status
  read as one bar across the window. An app without a foot looks unfinished.

The look is kept by `useAppearance`, called in the app's root: it reads the theme, scheme,
density, corners, typeface and motion from `localStorage`, follows the system's scheme until one is
chosen, and wears them on `<html>` (`data-theme`, `.dark`, `data-density`, `data-motion`, `--radius`
and the typeface variables). `ThemePicker` takes its settings and setter, with the option lists
`THEMES` (every theme in the tokens), `CORNERS` and `TYPEFACES` from `lib/appearance`. Every call
follows the same kept look, so a settings page calls `useAppearance()` again with the same defaults.

```tsx
import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { useAppearance } from '@winterop-com/sokkel-ui/hooks/use-appearance'
import { CORNERS, THEMES, TYPEFACES } from '@winterop-com/sokkel-ui/lib/appearance'
import { appearanceCommands, placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SchemeToggle } from '@winterop-com/sokkel-ui/SchemeToggle'
import { Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { ThemePicker } from '@winterop-com/sokkel-ui/ThemePicker'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'

const PLACES: RailGroup[] = [
    { id: 'work', entries: [{ id: 'runs', label: 'Runs', icon: Play, href: '/runs' }] },
    { id: 'system', title: 'System', entries: [{ id: 'settings', label: 'Settings', icon: Settings, href: '/settings' }] },
]

export function App() {
    const { settings, setSettings } = useAppearance()
    const navigate = useNavigate()
    return (
        <Shell
            palette={[...placeCommands(PLACES, navigate), ...appearanceCommands(settings, setSettings)]}
            rail={
                <Rail
                    mark={<Mark />}
                    name="Tidevann"
                    groups={PLACES}
                    foot={
                        <AccountMenu
                            name="Local"
                            local
                            onSettings={() => navigate('/settings')}
                            onAppearance={() => navigate('/settings')}
                        />
                    }
                />
            }
            top={<TopBar trail={[{ label: 'Runs' }]} actions={<SchemeToggle />} />}
            foot={
                <StatusLine note="Connected to api.example.org">
                    <StatusItem label="project">harbor</StatusItem>
                    <StatusItem>1.4.0</StatusItem>
                </StatusLine>
            }
        >
            <Routes />
        </Shell>
    )
}

/** The settings page: the same kept look, in the picker. */
function Appearance() {
    const { settings, setSettings } = useAppearance()
    return <ThemePicker value={settings} onChange={setSettings} themes={THEMES} corners={CORNERS} typefaces={TYPEFACES} system />
}
```

An app with only a light and dark switch needs no more than `useScheme()`, which answers
`{ scheme, resolved, setScheme }` (light, dark or system, kept and worn as `.dark`), or
`SchemeToggle`, the theme toggle wired to it. `useAppearance(defaults)` takes the look an app starts
in until the person chooses, such as `{ theme: 'paper' }`; give `SchemeToggle` the same scheme as its
`fallback`.

So the page never shows the wrong scheme while it loads, `appearanceScript()` writes the kept look
on `<html>` before the page draws. A Vite app puts it at the top of `<head>`:

```ts
// vite.config.ts
import { appearanceScript } from '@winterop-com/sokkel-ui/lib/appearance'

const appearance = {
    name: 'appearance',
    transformIndexHtml: () => [{ tag: 'script', children: appearanceScript(), injectTo: 'head-prepend' as const }],
}
// plugins: [react(), tailwindcss(), appearance]
```

An app rendered on a server puts `<script dangerouslySetInnerHTML={{ __html: appearanceScript() }} />`
first in its `<head>`. Given the same defaults as `useAppearance`, it starts in the same look.

Components import by path: `@winterop-com/sokkel-ui/DialogShell`,
`@winterop-com/sokkel-ui/primitives/button`, `@winterop-com/sokkel-ui/dashboard/StatPanel`,
`@winterop-com/sokkel-ui-charts/Chart`, `@winterop-com/sokkel-ui-charts/dashboard/BarPanel`,
`@winterop-com/sokkel-ui-maps/MapView` or `@winterop-com/sokkel-ui-graph/PipelineGraph`.

A few core parts load an engine the app installs only when it uses them, as optional peer
dependencies:

| The app uses                | It also installs                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MermaidDiagram`            | `mermaid`                                                                                                                                                        |
| `CodeEditor`                | `@codemirror/commands`, `@codemirror/lang-json`, `@codemirror/lang-yaml`, `@codemirror/language`, `@codemirror/state`, `@codemirror/view` and `@lezer/highlight` |
| Geist as a theme's typeface | `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`                                                                                               |

## Working on it

The repository is a Bun workspace: the packages are in `packages/core`, `packages/charts`,
`packages/maps` and `packages/graph`, and the stories in `src/stories/` import them by their names,
as an app does. `bun run build` builds all four, `bun run test` runs every package's tests and the
library rules, and `bun run size` holds the apps in `examples/sizes` to their budgets.

## License

Proprietary: published for reference only, all rights reserved. See `LICENSE`, and
`THIRD_PARTY_NOTICES.md` for the code carried under other licenses.
