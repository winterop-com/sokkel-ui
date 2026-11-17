# Unreleased

What changed since 0.29.3, for the next release's notes. A release copies this into its GitHub
release and empties it.

- New: `@winterop-com/sokkel-ui/vite` exports `sokkelStyles()`, a Vite plugin that gives an app the
  lean stylesheet from its own imports. Put it before `tailwindcss()` and keep importing
  `styles.css`: it becomes `styles-base.css` with the lists of sources of every library module the
  app's code imports (its own files, the files they reach by relative imports and any installed
  package that depends on the library), and the add-ons' `styles.css` are dropped. Apps without it
  are unchanged. The size apps' pages drop from about 52 to 22 kB of CSS gzipped, the notes example's
  from 57 to 35 kB.
- The command palette no longer depends on cmdk: `primitives/command` draws the library's own list,
  taken from cmdk 1.1.1 without its dialog and the Radix packages behind it, with the same keys,
  filtering, `cmdk-*` attributes and props. The palette's lazy chunk is about 13 kB smaller. An app
  that imported `cmdk` itself through the core's dependency adds it to its own.
- `DataTable` loads the pager's page size select and the rows' right-click menus the first time a
  table that pages or has row actions is drawn; until then the pager shows the page size as text and
  a right click on a row is the browser's.
