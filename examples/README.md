# Examples

Apps that consume `@winterop-com/sokkel-ui` exactly as an app does: they install the package and
import only its public entry points (`@winterop-com/sokkel-ui/<Component>`,
`@winterop-com/sokkel-ui/primitives/<name>`, `@winterop-com/sokkel-ui/styles.css`). None copies a
component or reaches into `src/`. `.github/workflows/examples.yaml` builds all three on every pull
request.

Every example needs the library built first, from the repository root:

```sh
bun install
bun run build
```

## web

A small Tidevann app in the library's frame: the shell with its rail and top bar, the runs page as
a data table with sortable columns and row menus, a run opened in the side panel, and the settings
dialog.

It depends on the package through `file:../..`, which bun installs as a copy of the repository
root, with the package's own dependencies in the app's `node_modules`. Run `bun install` again after
rebuilding the library to refresh the copy. The package's `styles.css` is Tailwind source, so the
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
window. The web build uses relative asset paths, so it loads from a file URL.

```sh
cd examples/electron
bun install       # downloads Electron's binary (it is a trusted dependency)
bun run build     # builds the web example, then typechecks and bundles src/main.ts
bun run start     # builds, then opens the window
```

## tauri

A thin Tauri v2 shell around the same build: `src-tauri/` with `tauri.conf.json` pointing
`frontendDist` at `../../web/dist`. It needs Rust and, on Linux, the system libraries Tauri lists
(webkit2gtk 4.1 and others; see the workflow).

```sh
cd examples/tauri
bun install
bun run check     # builds the web example, then runs cargo check in src-tauri
bun run dev       # opens the window
bun run build     # a release binary, without installers
```
