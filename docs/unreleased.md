# Unreleased

What changed since 0.34.8, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- `GraphCanvas` (and the editors on it) keeps a dragged box where it was let go until the app
  moves it there, so an app that saves the move asynchronously no longer shows the box jump back
  for a few frames. A drop the app leaves unanswered for 1.5 seconds puts the box back.
