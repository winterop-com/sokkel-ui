# Unreleased

What changed since 0.34.2, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- Tree `cut`: `end` (the default) or `middle`, which keeps a long label's tail in view (the part
  from its last separator, such as ": Sheet 170", or its last few characters), so a series named
  alike up to its end stays told apart. The search's marks show on both sides of the cut.

## Fixed

- A Tree row's label cut short, and a search result's trail, give their whole text on hover; a label
  that fits gives none.
