# Unreleased

What changed since 0.37.3, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- Markdown: `measureAlign="center"` with `measure` puts the prose in a reading column in the middle
  of the pane, and lets a table grow past it, centered, up to the pane's width.

## Fixed

- Tree: `cut="middle"` keeps a label's last word or two when its whole end does not fit beside the
  head, instead of cutting at the end, so a series sharing a long start without a separator still
  tells apart.
- Markdown: code in a table cell stays on one line; the prose in the cells beside it wraps instead,
  and a table wider than its room scrolls sideways.
