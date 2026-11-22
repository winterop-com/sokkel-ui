# Unreleased

What changed since 0.34.1, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- Rail `collapseWith`: `button` (the default, as before) or `mark`. With `mark`, the mark's tile is
  the one toggle in both states: it collapses the expanded rail, showing the collapse icon under the
  pointer, the button at the head's end is gone, and the name alone links to `markHref`. In the
  shell's drawer, and on a rail with no mark, the head keeps its button.
