# Unreleased

What changed since 0.29.1, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- `RunTimeline` draws the chosen lane's shift handle at rest, a dashed band with a grip from the
  current time to past the last upcoming run, so a person sees what to drag; it was drawn only
  under the pointer, and began at the first upcoming run.
