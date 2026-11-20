# Unreleased

What changed since 0.33.0, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- `parseMarkdown(text, { positions: true })` places the nodes notes add: each `wikiLink`, `embed`, `tag`
  and `highlight` spans what was written for it (`[[...]]`, `![[...]]`, `#tag`, `==...==`), escapes and
  character references included, and a text cut from another (beside a link, in a callout's title)
  keeps its own words' place.

## Fixed

- The code editor's markdown reads a long line of `**`, `*`, `_`, `~~`, `==` or `[` marks that never
  close in time in step with its length (it took seconds at 80 KB); the colors are the same.
