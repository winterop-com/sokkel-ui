# Examples

Apps that consume the sokkel-ui packages exactly as an app does: they install them and import only
their public entry points (`@winterop-com/sokkel-ui/<Component>`,
`@winterop-com/sokkel-ui/primitives/<name>`, each package's `styles.css`). None copies a component or
reaches into a package's `src/`. Each is a Tidevann product, in a folder of its own:

```
examples/
  shared/        the fake backend, the window frame, the hash route and the Tidevann mark
  tasks/         lists, a quick add and tasks edited in place
  runs/          a jobs console: an overview, runs, a run's page, jobs, schedules and settings
  records/       a records app: forms filled in sections, responses and receipts, households and
                 their visits, places on a map, an API playground and metadata health (GAPS.md
                 maps the records app it rehearses onto the library)
  status/        a live operations board: services, regions and incidents changing as the page
                 watches, on-call, and the public status page with its subscribe form
  example.mk     the targets every example's Makefile includes
```

and inside each example:

```
  web/           the Vite app
  electron/      a thin Electron shell that opens web/dist, under the example's name
  tauri/         a thin Tauri shell that does the same
  Makefile
```

`.github/workflows/examples.yaml` builds every web app and checks every shell on each pull request
that touches them. The size budget's apps are not examples; they live in `size/` at the root.

## Running one

From the repository root, after `make build` builds the packages, every example has the same
targets as `make <example>-<target>`; `make examples-list` names them:

```sh
make tasks-web          # build the web app and serve it (Tasks on port 4180, Runs on 4181, Records on 4182, Status on 4190)
make tasks-dev          # the web app's dev server
make tasks-electron     # open it in Electron
make tasks-tauri        # open it in Tauri
make tasks-tauri-build  # a Tauri release binary, without installers
make examples           # build every web app and check every shell, as CI does
```

Inside an example's folder, the same targets run without the prefix: `make tauri`, `make web`.
Each runs `bun install` in its folder first. The Tauri shells share one Cargo target folder,
`examples/.cargo-target/`, so Rust builds its crates once for all of them. Tauri needs Rust and, on
Linux, the system libraries it lists (webkit2gtk 4.1 and others; see the workflow). Electron's
binary is fetched in its `postinstall`.

Nothing needs Node: every script runs its tools under bun (`bun --bun tsc`, `vite`, `electron`,
`tauri`), and Electron's main process runs on the Node built into Electron itself.

## How an example is built

- **The packages:** each `web/` installs the core package through `file:../../../packages/core`,
  which bun installs as a copy, with its own dependencies in the app's `node_modules`. Run
  `bun install` again after rebuilding the packages to refresh the copy. An add-on is installed the
  same way (`file:../../../packages/charts`), with an `overrides` entry pointing the core at the
  same folder, since an add-on names the core as a `workspace:*` peer, which bun cannot find outside
  the workspace; the add-on's `styles.css` is imported after the core's in `app.css`. `styles.css` is Tailwind
  source, so the app runs Tailwind v4 through `@tailwindcss/vite`, and its `app.css` adds
  `examples/shared` as a source.
- **What they share:** `examples/shared/` is the local package `tidevann-shared`, installed the same
  way: `tidevann-shared/backend` (typed collections kept in localStorage, answering promises after a
  short delay as a server would), `tidevann-shared/frame` (`useFrame`: the look, the window, the
  route and the palette's shared groups, Reset demo data among them), `tidevann-shared/router`
  (a hash route of its own) and `tidevann-shared/mark`.
- **The desktop frame:** inside a shell the app passes `desktop` to `Shell`, so its top strip is the
  window's title bar, with room for the macOS window buttons. Electron uses `hiddenInset`; Tauri an
  overlay title bar with the title hidden, and `capabilities/default.json` lets the page drag, zoom
  and fill the window, since WebKit ignores the CSS drag region. Both place the buttons on the
  strip's middle with `trafficLightPosition` (Electron `{ x: 12, y: 16 }`, Tauri `{ x: 12, y: 25 }`,
  which each reads its own way). Electron's preload (`src/preload.ts`) tells the page when the window
  enters or leaves full screen, which `useFrame` passes on as `desktop.fullscreen`, so the room for
  the buttons goes while macOS hides them.
- **Assets:** the web build uses relative asset paths, so the shells load it from a file URL.

## Adding one

Copy an example's folder, rename it, and change its name in `web/index.html`, the two
`package.json` files, `electron/src/main.ts`'s title, and `tauri/src-tauri/Cargo.toml` and
`tauri.conf.json` (`productName`, `identifier`, the window's title). Give its `Makefile` a port of its
own. The root Makefile and the workflow pick it up by its folder.
