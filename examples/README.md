# Examples

Apps that consume the sokkel-ui packages exactly as an app does: they install them and import only
their public entry points (`@winterop-com/sokkel-ui/<Component>`,
`@winterop-com/sokkel-ui/primitives/<name>`, each package's `styles.css`). None copies a component or
reaches into a package's `src/`. Each is a Tidevann product, in a folder of its own:

```
examples/
  shared/        the fake backend, the window frame, the hash route and the Tidevann mark
  tasks/         lists, a quick add and tasks edited in place, put in your own order by drag, and a
                 board whose cards move between To do, Doing and Done
  runs/          a jobs console: an overview arranged by drag, runs, a run's page, jobs, schedules and settings
  records/       a records app: forms filled in sections, responses and receipts, households and
                 their visits, places on a map, an API playground and metadata health; a form's
                 sections and questions dragged into the order every fill asks them, and the forms
                 to start a record from in the person's own order (GAPS.md maps the records app it
                 rehearses onto the library)
  metrics/       live dashboards over a simulated source, arranged by drag from a palette of panels
                 and listed in the order dragged, a panel editor with a live preview, and alerts
  status/        a live operations board arranged by drag: services in the order dragged, regions
                 and incidents changing as the page watches, on-call, and the public status page
                 with its subscribe form
  analytics/     a live sales dashboard arranged by drag from a palette of figures and panels:
                 revenue, customers, funnels and reports whose steps and panels drag into order, and goals
  notes/         a vault of linked notes: folders in the rail, markdown beside its preview in
                 tabs, [[links]] completed as typed, backlinks and mentions, tags, a quick
                 switcher, search, a graph of the links and a daily journal; notes and folders
                 dragged into folders and into an order of the reader's own
  dataviz/       a data visualizer: datasets imported, edited and filtered, a chart builder with a
                 live preview and suggested views, charts saved, downloaded and shared as links
                 that carry their data, and boards built by dragging charts on, filtered together
                 and presented
  models/        a local library of language models: the models on a disk and what they take, pulls from
                 simulated sources, a chat and a side-by-side comparison streamed by a simulated model,
                 and the runner that holds them in memory
  music/         a music player that really plays: songs made in the page by a small synthesizer,
                 albums, artists and the library's tree in the rail, favorites, playlists ordered by
                 drag, a song dragged onto a playlist in the rail, simulated downloads, endless
                 radio, the queue, the full screen with its visualizer and timed words, crossfade
                 and the media keys
  video/         a video site that really plays: clips drawn and encoded in the page (WebCodecs into
                 WebM, kept in IndexedDB), a watch page with the channel, likes, saving, sharing,
                 downloads, comments and up next, theater mode and stats, channels, subscriptions,
                 a library with history and playlists, search, and player settings that stick
  studio/        an editor for pipelines, schemas and queries: a workspace of files in the rail's
                 tree, put in order by drag and opened in tabs; pipelines checked and completed against their schema as typed,
                 their problems listed, their steps edited as text, on a graph or both with one undo,
                 and run with the log marked where they failed; JSON Schemas edited against the 2020-12 meta-schema beside a value tried
                 against them; SQL over the runs; any editor popped out into a window
  podcast/       podcasts that really play: episodes spoken in the page with a transcript that
                 follows, chapters, speed, a sleep timer, the queue (an episode dragged onto it,
                 Starred or Downloads in the rail), New as an inbox, downloads, Discover, stats
                 and settings
  fhir/          a FHIR workbench over the fhir add-on: a server's resources edited as JSON, checked
                 as typed and again by the server, its findings marked on their values, saved as
                 versions and compared; FHIRPath evaluated live by the FHIRPath engine; CQL libraries
                 kept in versions and published; FHIR search by the server's parameters, with
                 searches saved and put in order by drag
  dhis2/         a metadata and expression workbench on a simulated DHIS2-shaped server, showing the
                 dhis2 add-on: indicators, validation rules and program rules written in its two
                 expression languages, offered, checked and named as typed, run on the server's
                 data values (a chart over the year, violations listed, a form whose fields react
                 to the rules), its data elements and organization units, and a server version
                 that hands the plugin another list of names
  dashboard/     a home of live dashboards (Overview, Operations, Team and any made) of many kinds of
                 widget: stats, charts, a gauge, runs, activity, a log, a map, a note, a to-do list,
                 what is coming up, uptime and on call; Edit moves, resizes, configures, removes and
                 adds them from a palette by drag, Cancel throws the edits away and Reset puts the
                 dashboard back; dashboards made, renamed, duplicated, deleted and ordered by drag
  example.mk     the targets every example's Makefile includes
```

and inside each example:

```
  web/           the Vite app
  electron/      a thin Electron shell that opens web/dist, under the example's name
  tauri/         a thin Tauri shell that does the same
  example.json   its name and one line, for the examples' index
  Makefile
```

`.github/workflows/examples.yaml` builds every web app and checks every shell on each pull request
that touches them and every night against main, and `examples-web.yaml` builds the web apps on each
pull request that changes the packages. The size budget's apps are not examples; they live in `size/` at the root.

Every web app is published beside the Storybook at
**https://winterop-com.github.io/sokkel-ui/examples/**, under its folder's name, with an index that
shows each one's still, its name, its line and the packages it installs. `.github/workflows/pages.yaml`
publishes them on every push to main; `make examples-site` builds the same site into
`examples-static/` (`scripts/examples-site.ts`, whose `--shots` takes the stills in Playwright's
chromium). The examples never hold Storybook back: when the site fails to build, Storybook is
published without it and the run fails on its last step, and when chromium does not install, or a
still cannot be taken, the index shows the card without one. Every app builds with `base: './'`, so
it runs under any path. Published, the examples share one origin and so one `localStorage`: the
look chosen in one is worn by all, while each example's data is kept under its own prefix
(`tidevann-demo:<example>:`), so no two examples' data can clash, whatever their collections are
named.

## Running one

From the repository root, after `make build` builds the packages, every example has the same
targets as `make <example>-<target>`; `make examples-list` names them:

```sh
make tasks-web          # build the web app and serve it (Tasks on 4180, Runs on 4181, Records on 4182, Models on 4183, Dataviz on 4184, Metrics on 4185, Music on 4186, Video on 4187, Notes on 4188, Podcasts on 4189, Status on 4190, Analytics on 4191, Studio on 4192, FHIR Workbench on 4193, DHIS2 Workbench on 4194, Dashboard on 4195)
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
  way: `tidevann-shared/backend` (typed collections kept in localStorage under the example's own
  prefix, which `configureDemo({ app })` in its `main.tsx` names, answering promises after a short
  delay as a server would; `useStored` keys take the same prefix, and `storageKey` gives it to any
  other key the example keeps), `tidevann-shared/frame` (`useFrame`: the look, the window, the
  route and the palette's shared groups, Reset demo data among them), `tidevann-shared/router` (a
  hash route of its own) and `tidevann-shared/mark`.
- **The desktop frame:** inside a shell the app passes `desktop` to `Shell`, so its top strip is the
  window's title bar, with room for the macOS window buttons. Electron uses `hiddenInset`; Tauri an
  overlay title bar with the title hidden, and `capabilities/default.json` lets the page drag, zoom
  and fill the window, since WebKit ignores the CSS drag region. Both place the buttons on the
  strip's middle with `trafficLightPosition` (Electron `{ x: 12, y: 16 }`, Tauri `{ x: 12, y: 25 }`,
  which each reads its own way). Electron's preload (`src/preload.ts`) tells the page when the window
  enters or leaves full screen, which `useFrame` passes on as `desktop.fullscreen`, so the room for
  the buttons goes while macOS hides them.
- **Assets:** the web build uses relative asset paths, so the shells load it from a file URL.
- **Maps in the dev server:** an example that draws maps adds `mapsVite()` from
  `@winterop-com/sokkel-ui-maps/vite` to the plugins in its `vite.config.ts`, as any app does, since
  the dev server's prebundling cannot load the maps package's `?worker&url` import of maplibre's
  worker. The build needs nothing.

## Adding one

Copy an example's folder, rename it, and change its name in `web/index.html`, the two
`package.json` files, `example.json`, `electron/src/main.ts`'s title, and `tauri/src-tauri/Cargo.toml`
and `tauri.conf.json` (`productName`, `identifier`, the window's title). In `web/src/main.tsx`,
`configureDemo({ app })` takes the new folder's name, which keeps its data apart from every other
example's; the backend refuses to read or write until it is called, and its collections need no
prefix of their own. Give its `Makefile` a port of its own. The root Makefile, the workflows and the
examples site pick it up by its folder; without an `example.json`, the index takes its name and line
from the comment that heads its `Makefile`.
