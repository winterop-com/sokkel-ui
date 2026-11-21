# Unreleased

What changed since 0.33.3, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- `MarkdownLinks` takes `href(target, heading)`, the address a `[[link]]` and an embed's framed link
  carry, such as `#/note/nightly-export`. A plain press still calls `onOpen`; a press with a
  modifier key or the middle button is the browser's, so a link opens in a new tab, and its menu
  copies the address. Without it, or when it returns nothing, a link carries `#` as before. The
  notes example gives a link to a note that exists its `#/note/<id>`.

## Changed

- A Mermaid diagram is drawn whole, shrunk to fit its box at any width, where it shrank only until
  its labels reached `--text-2xs` and then scrolled sideways, which reads as cut off where no
  scrollbar shows (phones). Expanded into its window it keeps that floor and pans, to read a wide one
  at size. The layout check at narrow widths fails a diagram that runs past its frame, and
  Apps/Markdown gains a Diagrams story.
