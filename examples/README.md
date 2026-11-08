# Examples

Apps that consume the sokkel-ui packages exactly as an app does: they install them and import only
their public entry points (`@winterop-com/sokkel-ui/<Component>`,
`@winterop-com/sokkel-ui/primitives/<name>`, `@winterop-com/sokkel-ui-charts/<Chart>`, each
package's `styles.css`). None copies a component or reaches into a package's `src/`. `.github/workflows/examples.yaml` builds the web app and its two
shells on every pull request that touches them; the size apps are built by `ci.yaml` on every one.

Every example needs the packages built first, from the repository root:

```sh
bun install
bun run build
```

The root `Makefile` runs them too, each after `make build` and a `bun install` in its folder:
`make examples` builds the web app, bundles the Electron main file and checks the Tauri shell as CI
does; `make web` serves the build on port 4180, `make web-dev` runs the dev server, `make electron`
and `make tauri` open the shells, and `make tauri-build` builds Tauri's release binary.

## web

Tidevann's demo apps behind one launcher, on a hash router of its own: `#/` lists the demos as
cards, and `#/<demo>` opens one, each in its own `Shell` with the command palette on ⌘K (the
demos, each list or place, and the look) and the rail's mark leading back to the launcher.

- `tasks`: lists in the rail with counts (Inbox, Today, Upcoming and one per project), a quick add,
  tasks in a `DataTable` list with the title, due date, assignee and project edited in place, done
  tasks behind Show done, a row menu, and an empty state.
- `runs`: the runs page as a data table with sortable columns and row menus, a run opened in the
  side panel, and the settings dialog.

`src/backend/` is a small fake backend: typed collections kept in localStorage, answering promises
after a short delay as a server would. The launcher's Reset demo data puts them back to their seed.
Inside a desktop shell the app passes `desktop` to the frame, so its top strip is the window's
title bar, with room for the macOS window buttons.

It uses only the core package, through `file:../../packages/core`, which bun installs as a copy of
that package, with its own dependencies in the app's `node_modules`. Run `bun install` again after
rebuilding the packages to refresh the copy. The package's `styles.css` is Tailwind source, so the
app runs Tailwind v4 through `@tailwindcss/vite`.

```sh
cd examples/web
bun install
bun run build     # typecheck and build into dist/
bun run preview   # serve dist/
bun run dev       # or the dev server
```

## electron

A thin Electron shell: one main process file that opens `examples/web/dist/index.html` in a
window with the title bar hidden (`hiddenInset` on macOS). The web build uses relative asset paths,
so it loads from a file URL. Its `postinstall` fetches Electron's binary, which a plain
`bun install` may skip (`node node_modules/electron/install.js` fetches it by hand).

```sh
cd examples/electron
bun install       # downloads Electron's binary in postinstall
bun run build     # builds the web example, then typechecks and bundles src/main.ts
bun run start     # builds, then opens the window
```

## tauri

A thin Tauri v2 shell around the same build: `src-tauri/` with `tauri.conf.json` pointing
`frontendDist` at `../../web/dist`, the title bar an overlay with the title hidden, and
`capabilities/default.json` letting the page drag, zoom and fill the window. It needs Rust and, on Linux, the system libraries Tauri lists
(webkit2gtk 4.1 and others; see the workflow).

```sh
cd examples/tauri
bun install
bun run check     # builds the web example, then runs cargo check in src-tauri
bun run dev       # opens the window
bun run build     # a release binary, without installers
```

## sizes

Four small Tidevann apps that hold the library to a size budget: `forms` (a settings page and a
dialog with a schema form, and no engine), `dashboard` (stat and chart panels on ECharts, the range
controls and a table), `map` (regions and sites on maplibre with a legend and a popup) and `music`
(an album's tracks and the player bar). `forms-lean` is the forms app on the core's
`styles-base.css` with the list of sources of each module it imports, where `forms` takes
`styles.css`, so the CSS of an app that carries only its own modules' classes is measured too.
`scripts/size-budget.ts` builds each with Vite against the built packages and measures it gzipped:
the JavaScript loaded with the page (`start`), what a dynamic import fetches later (`lazy`) and the
CSS. It fails when one grows past its budget in `sizes/budget.json`, or bundles an engine (ECharts,
maplibre, React Flow, CodeMirror, Mermaid) its budget does not list. CI runs it after building the
packages.

The apps have no install of their own: they import the packages by their names from inside the
repository, which resolve through the workspace's links and each package's own `exports` to its
`dist/`, as an installed copy does. `forms` imports only the core package; `dashboard` adds the
charts package, `map` the maps package and `music` the media package, each importing the add-on's `styles.css` after the
core's in its own stylesheet. A change that makes an app bigger on purpose raises that app's budget in the same PR.

```sh
bun run build
bun run size      # typecheck the apps, build them and compare each with its budget
```
