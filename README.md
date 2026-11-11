<img src="docs/assets/mark.svg" width="64" height="64" alt="">

# sokkel-ui

[![CI](https://github.com/winterop-com/sokkel-ui/actions/workflows/ci.yaml/badge.svg)](https://github.com/winterop-com/sokkel-ui/actions/workflows/ci.yaml)
[![Browse the Storybook](https://img.shields.io/badge/storybook-browse-ff4785?logo=storybook&logoColor=white)](https://winterop-com.github.io/sokkel-ui/)
![License: proprietary](https://img.shields.io/badge/license-proprietary-lightgrey)

A shared React component library: one set of tokens and themes, Base UI primitives, the patterns
apps are built from, and the Storybook stories that show and test them. Apps install it as a
package and never copy from it, so one fix here reaches every app at its next version.

The Storybook is published at **https://winterop-com.github.io/sokkel-ui/**, and beside it the
examples, Tidevann's apps built on the packages as an app is (see [`examples/`](examples/README.md)),
at **https://winterop-com.github.io/sokkel-ui/examples/**.

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
- **Content:** Section, PageHeader, SplitPane, DataTable, FilterBar, SavedViews, DescriptionList,
  Stat, Timeline, Tree and TreeSelect, Field, InlineEdit, Segmented, AsyncSelect, CodeEditor,
  LogView, JsonTree, DiffView and TableOfContents. DataTable is the one table, from a short listing
  to 50k rows or a tree loaded on demand; its columns resize by default. A listing filters from a
  FilterBar in its bar and keeps its setups as SavedViews, which the app stores. With
  `tableEditing` its cells edit in place on the same cycle as InlineEdit.
- **Files:** FileList, FileGrid and FileTile, FilePreview, UploadTray and DropZone.
- **Chat:** Markdown, Code, MermaidDiagram, ToolCalls, ConfirmCard, Composer and audio
  waveforms.
- **Maps:** MapView on maplibre, with boundary, point, grid and GeoJSON layers, legends, popups,
  basemaps, a layer panel and a period slider.
- **Graphs:** PipelineGraph, RunGraph, DependencyGraph and StateMachine on React Flow, laid out
  by elk, with the canvas, node box, layout and hook they are built from.
- **Apps:** whole-app compositions in Storybook, showing how the parts fit together.

## Tokens and themes

- `packages/core/tokens/tokens.json` is the only place a token is defined. `bun run tokens` writes
  the CSS from it, in `packages/core/src/styles/`: `tokens.css` with tidevann, the base theme, and
  the density levels, one file for each other theme in `themes/`, and `themes.css`, which imports
  them all.
  `bun scripts/build-tokens.ts --check` fails when the CSS and the JSON disagree.
- Themes are named for how they look, save `tidevann`, the base theme, named for the examples app
  that wears it. Tidevann defines every token and needs no `data-theme`; the others (amber, paper,
  contrast, tokyo, vinyl, cassette, neon, ocean, indigo, terminal, steel, ember) override what they change, which
  may be any token: colors, typefaces, radius or density. An app picks its theme on `<html data-theme>`, `.dark`
  picks dark mode, and `data-theme-scope` draws one element in a theme of its own. A theme other
  than tidevann answers once its file is imported.
- Every corner derives from `--radius` (4.5px by default), which a theme or an app sets. A theme
  may round controls and surfaces apart (`--control-radius`, `--surface-radius`), each from
  `--radius`, and give the frame's parts their own look: section and page heads, a table's head and
  zebra, the editor's ground and gutter, the scroll bars, the shell's foot and the palette's insets.
  `$parts` in `tokens.json` lists each of those tokens and what it changes.

## Storybook

`bun run storybook` serves the stories on port 6106. The toolbar sets the scheme, the theme, the
density, the corner radius and the typeface. A theme from an app can be judged there before it is
adopted into the tokens: `bun scripts/import-candidates.ts` lists it in the theme menu as a candidate.

CI renders every story at the narrow widths (a folded foldable up to a tablet) and fails one that
throws or scrolls sideways. Screenshot comparison is off while the looks still move; the tooling
stays (`make screenshots-ci`, `scripts/baselines.sh`) for when it returns near 1.0.

## Roadmap

`docs/roadmap.md`: where the library stands, the next release, and what is decided but not built.

## Using it

The library is six packages on GitHub Packages, released together at one version:

| Package                            | Holds                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `@winterop-com/sokkel-ui`          | the tokens and themes, the primitives and every pattern below                              |
| `@winterop-com/sokkel-ui-charts`   | `Chart` and its kinds on ECharts, and the dashboard's chart panels                         |
| `@winterop-com/sokkel-ui-maps`     | `MapView` on maplibre, with its layers, legends, popups and basemaps                       |
| `@winterop-com/sokkel-ui-graph`    | the graphs and the graph editor on React Flow, laid out by elk                             |
| `@winterop-com/sokkel-ui-terminal` | `TerminalView`, an interactive terminal, and `Terminal`, on xterm.js                       |
| `@winterop-com/sokkel-ui-media`    | `MediaBar` and its fullscreen view, `TrackList`, `MediaCard`, `Artwork`, `useMediaSession` |

Every app installs the core package; an app that draws charts, maps, graphs or terminals adds that
package too, which brings its engine with it, and a music or video app adds the media package (the
players chat uses, `AudioPlayer` and `VideoPlayer`, stay in the core). An app points the scope at
the registry in its `.npmrc`, with a token that can read packages, and pins one version for all of
them:

```
@winterop-com:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```
bun add @winterop-com/sokkel-ui@0.19.4
bun add @winterop-com/sokkel-ui-charts@0.19.4   # only for charts and chart panels
bun add @winterop-com/sokkel-ui-maps@0.19.4     # only for maps
bun add @winterop-com/sokkel-ui-graph@0.19.4    # only for graphs
bun add @winterop-com/sokkel-ui-terminal@0.19.4 # only for terminals
bun add @winterop-com/sokkel-ui-media@0.19.4    # only for the music and video parts
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

The themes are in the core package. `styles.css` carries tidevann, the base theme. Every other
theme is a file of its own, so an app carries only the themes it offers: it imports each one's file
after `styles.css` and sets the theme on `<html data-theme>`, with `.dark` for dark mode:

```css
@import '@winterop-com/sokkel-ui/styles.css';
@import '@winterop-com/sokkel-ui/themes/paper.css';
```

```ts
document.documentElement.dataset.theme = 'paper'
```

An app whose settings offer every theme imports `@winterop-com/sokkel-ui/themes.css`, which holds
them all. `ThemePicker` draws its swatches from the same files, and `ThemeCards` its cards, so each
shows a theme only once that theme's file is imported.

### Importing

Each module is imported by its own path, so an app pulls in only what it uses:
`@winterop-com/sokkel-ui/DataTable`, `@winterop-com/sokkel-ui/primitives/button`,
`@winterop-com/sokkel-ui/hooks/use-appearance`, `@winterop-com/sokkel-ui/lib/appearance`,
`@winterop-com/sokkel-ui-charts/Chart`. Each package's `exports` map lists every path it offers and
nothing else; a module it does not list is the library's own and cannot be imported. Every
component exports the type of its props as `<Component>Props` from the same path, such as
`DataTableProps` from `@winterop-com/sokkel-ui/DataTable`, and a type those props name is exported
there too.

### Only the classes an app uses

`styles.css` points Tailwind at every module of the core, so an app's CSS carries the classes of
components it never imports: the forms page in `size/` ships 49 kB of CSS gzipped on it.
An app that wants only its own imports `styles-base.css` instead, which is `styles.css` pointed at
no module, and after it the list of sources of each module it imports, `sources/<module>.css`
under the name it imports the module by. A list holds an `@source` for the module and for every
module it draws on, however deep, so the app names only what it imports itself:

```css
/* app.css: a page with a form and a dialog, and nothing else of the core */
@import '@winterop-com/sokkel-ui/styles-base.css';
@import '@winterop-com/sokkel-ui/sources/Shell.css';
@import '@winterop-com/sokkel-ui/sources/Rail.css';
@import '@winterop-com/sokkel-ui/sources/TopBar.css';
@import '@winterop-com/sokkel-ui/sources/TextField.css';
@import '@winterop-com/sokkel-ui/sources/DialogShell.css';
@import '@winterop-com/sokkel-ui/sources/primitives/button.css';
@import '@winterop-com/sokkel-ui/themes/paper.css';
```

The app adds one line per module it imports, from any package: `import { Rail } from
'@winterop-com/sokkel-ui/Rail'` is `@import '@winterop-com/sokkel-ui/sources/Rail.css'`, and
`import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'` is
`@import '@winterop-com/sokkel-ui-charts/sources/Chart.css'`. An add-on's list brings the lists of
the core modules it uses, and on this path it takes the place of the add-on's `styles.css`. A module
the app starts importing needs its line, or its classes are missing. The same forms page built this
way, `size/forms-lean`, ships 20 kB of CSS gzipped.

### An app's own Tailwind entry

An app that brings its own Tailwind entry imports `@winterop-com/sokkel-ui/tokens.css` (the tokens,
tidevann, the base theme, and the density levels) instead, with the theme files it offers,
`motion.css` (the motion setting) and `typography.css` (mono sized to the text around it), and adds
the add-ons' `styles.css` after them.

### Maps in Vite's dev server

The maps package loads maplibre's worker through Vite's `?worker&url` import, which the dev
server's dependency prebundling cannot load, so a Vite app that draws maps fails in its dev server
until it adds the package's plugin, `mapsVite` from `@winterop-com/sokkel-ui-maps/vite`, to its
plugins. The build needs nothing from it.

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { mapsVite } from '@winterop-com/sokkel-ui-maps/vite'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [react(), tailwindcss(), mapsVite()],
})
```

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
A settings page that gives the theme and the scheme a row each uses the two parts the picker is
made of: `ThemeCards` (each theme a card drawn in its own tokens) and `SchemeChoice` (system, light
and dark).

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

A page that refuses inline script, such as a browser extension's pages or a page under a strict
Content Security Policy, loads the same script from a file: the core package ships it built as
`@winterop-com/sokkel-ui/appearance.js`, made from `appearanceScriptFile()`, the one script
`appearanceScript()` also writes. It is a classic script, so it goes first in `<head>` with neither
`async`, `defer` nor `type="module"`, and it takes `useAppearance`'s defaults from its own data
attributes (`data-theme`, `data-scheme`, `data-density`, `data-corners`, `data-typeface`,
`data-motion`). An extension copies the file beside its pages; a Vite app can let the bundler hand
it a URL:

```html
<script src="appearance.js" data-theme="paper"></script>
```

```ts
import appearance from '@winterop-com/sokkel-ui/appearance.js?url'
// transformIndexHtml: () => [{ tag: 'script', attrs: { src: appearance }, injectTo: 'head-prepend' }]
```

The look is kept in `localStorage` unless the app keeps it elsewhere: `setAppearanceStorage` in
`lib/appearance`, called once before the app draws, takes `{ read(key), write(key, value) }` and an
optional `subscribe(change)` for changes made in another window, such as an extension's
`chrome.storage` or a desktop shell's settings file. `read` may answer with a promise: until it
does, the page wears the last known look, or the defaults, and it wears the kept one the moment it
comes. The last known look is a copy in `localStorage`, which the script reads, so the next page
still starts in it.

```ts
import { setAppearanceStorage } from '@winterop-com/sokkel-ui/lib/appearance'

setAppearanceStorage({
    read: async (key) => (await chrome.storage.local.get(key))[key],
    write: (key, value) => chrome.storage.local.set({ [key]: value }),
    subscribe: (change) => {
        const heard = (changes: Record<string, { newValue?: string }>) => {
            for (const [key, { newValue }] of Object.entries(changes)) change(key, newValue ?? null)
        }
        chrome.storage.local.onChanged.addListener(heard)
        return () => chrome.storage.local.onChanged.removeListener(heard)
    },
})
```

Components import by path: `@winterop-com/sokkel-ui/DialogShell`,
`@winterop-com/sokkel-ui/primitives/button`, `@winterop-com/sokkel-ui/dashboard/StatPanel`,
`@winterop-com/sokkel-ui-charts/Chart`, `@winterop-com/sokkel-ui-charts/dashboard/BarPanel`,
`@winterop-com/sokkel-ui-maps/MapView`, `@winterop-com/sokkel-ui-graph/PipelineGraph`,
`@winterop-com/sokkel-ui-terminal/TerminalView` or `@winterop-com/sokkel-ui-media/MediaBar`.

The core's own dependencies are what every app's frame draws with: Base UI, lucide, cmdk (the
command palette `Shell` opens), the class helpers and the IBM Plex fonts. Every other library is an
optional peer dependency, installed by an app that uses a part needing it. A part that needs one
loads it on first use where it can, so a page that never draws the part fetches none of it, but the
app's bundler still resolves the import when it builds, so the app installs it all the same:

| The app uses                                                                     | It also installs                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Markdown`, `AssistantReply`, `AnswerColumn`, `MessageComposer`                  | `react-markdown`, `remark-gfm`, `rehype-raw`, `rehype-sanitize`, `shiki`, `mermaid`, `katex`, `remark-math` and `rehype-katex`                                                                                                                                                                                   |
| `PlainMarkdown`                                                                  | `react-markdown`, `remark-gfm`, `rehype-raw`, `rehype-sanitize` and `shiki` (no `mermaid` or `katex`)                                                                                                                                                                                                            |
| `Code`, `ToolCall`, `SourceSheet`, `FilePreview`, `ConfirmCard`, `schema/IOCard` | `shiki`                                                                                                                                                                                                                                                                                                          |
| `MermaidDiagram`                                                                 | `mermaid`                                                                                                                                                                                                                                                                                                        |
| `schema/SchemaForm`, `schema/validate`                                           | `ajv` and `ajv-formats`                                                                                                                                                                                                                                                                                          |
| `CodeEditor`                                                                     | `@codemirror/autocomplete`, `@codemirror/commands`, `@codemirror/lang-json`, `@codemirror/lang-sql`, `@codemirror/lang-yaml`, `@codemirror/language`, `@codemirror/legacy-modes`, `@codemirror/lint`, `@codemirror/search`, `@codemirror/state`, `@codemirror/view`, `@lezer/highlight`, `ajv` and `ajv-formats` |
| `DateField`, `DateTimeField`, `dashboard/TimeRange`, `primitives/calendar`       | `react-day-picker`                                                                                                                                                                                                                                                                                               |
| `calendar/*`, `board/BoardCard`, `DueText`                                       | `date-fns`                                                                                                                                                                                                                                                                                                       |
| `primitives/carousel`                                                            | `embla-carousel-react`                                                                                                                                                                                                                                                                                           |
| `primitives/sonner`                                                              | `sonner`                                                                                                                                                                                                                                                                                                         |
| `primitives/input-otp`                                                           | `input-otp`                                                                                                                                                                                                                                                                                                      |
| `primitives/resizable`                                                           | `react-resizable-panels`                                                                                                                                                                                                                                                                                         |
| `primitives/questionnaire`, `primitives/message-scroller`                        | `@shadcn/react`                                                                                                                                                                                                                                                                                                  |
| Geist as a theme's typeface                                                      | `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`                                                                                                                                                                                                                                               |
| `hlsSource` (media package)                                                      | `hls.js`                                                                                                                                                                                                                                                                                                         |

Schema checks (`schema/SchemaForm`, `schema/validate` and a `CodeEditor` given a `schema`) compile
each schema to a function with ajv, which uses `new Function`. A page served with a Content Security
Policy therefore needs `'unsafe-eval'` in its `script-src`; without it no schema compiles, and no
value passes the check. A development build says so once per page, as a warning in the console.

## Working on it

The repository is a Bun workspace: the packages are in `packages/core`, `packages/charts`,
`packages/maps`, `packages/graph`, `packages/terminal` and `packages/media`, and the stories in
`src/stories/` import them by their names, as an app does. `bun run build` builds all six,
`bun run test` runs every package's tests and the library rules, and `bun run size` holds the apps
in `size/` to their budgets.

## License

Proprietary: published for reference only, all rights reserved. See `LICENSE`, and
`THIRD_PARTY_NOTICES.md` for the code carried under other licenses.
