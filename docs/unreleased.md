# Unreleased

What changed since 0.31.1, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- A graph only too tall for its canvas fits down to `tallFit` on its first fit even when, with the
  fit's padding, it fits across only under `fitMinZoom` (graph). It used to stay at `fitMinZoom` and
  clip its lower boxes. The decision is `fitLeast` in the graph's layout module.
