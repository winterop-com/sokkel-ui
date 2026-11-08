# Size budget

Small Tidevann apps that hold the library to a size budget. They are not examples to open: CI
builds them to measure what the library costs an app. The apps are `forms` (a settings page and a
dialog with a schema form, and no engine), `dashboard` (stat and chart panels on ECharts, the range
controls and a table), `map` (regions and sites on maplibre with a legend and a popup) and `music`
(an album's tracks and the player bar). `forms-lean` is the forms app on the core's
`styles-base.css` with the list of sources of each module it imports, where `forms` takes
`styles.css`, so the CSS of an app that carries only its own modules' classes is measured too.
`scripts/size-budget.ts` builds each with Vite against the built packages and measures it gzipped:
the JavaScript loaded with the page (`start`), what a dynamic import fetches later (`lazy`) and the
CSS. It fails when one grows past its budget in `budget.json`, or bundles an engine (ECharts,
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

Five-sixths of the CSS on `styles.css` is Tailwind's utilities: a rule for every class any core
module names, whether the app draws that module or not, so a part's classes reach every app on
`styles.css` (forms and music) and only the apps that import it on `styles-base.css`. Tailwind
reads every word of a module, comments and strings too, so a comment that names a utility
(`shimmer`, `lowercase`) writes that utility. A class spelled two ways (`data-[highlighted]:` and
`data-highlighted:`, `z-[1]` and `z-1`) writes two rules: take the spelling already in use. A tint
(`bg-primary/10`) costs one rule, since `base.css` keeps Tailwind from writing a second for browsers
without color-mix.
