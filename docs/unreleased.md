# Unreleased

What changed since 0.33.5, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- The track layers on one map come to rest together, and the zone, coverage and link layers rework
  their geometry only when what they are given changes, not each time it is a new array. A map with
  several moving layers, such as a wall display fed every second, now goes idle between moves.
