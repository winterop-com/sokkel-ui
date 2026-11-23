# Unreleased

What changed since 0.34.6, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- Tree `cut="middle"` puts the ellipsis right before the tail, with no gap: a row that keeps the
  middle cut reads "The S… Bug" rather than "The S… Bug". The head is cut to the room the whole
  tail leaves it, before any spaces it ends in.
