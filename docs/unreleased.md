# Unreleased

What changed since 0.33.5, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- A tree node given a list of children, even an empty one, is a branch, such as an empty folder:
  it shows its arrow, opens to an Empty row (`words.emptyBranch`, new in `Tree` and `TreeSelect`),
  and takes a row dropped inside it. A leaf is a node with no `children` and no `hasChildren`. A lazy
  node whose load brings nothing stays a branch too, where it turned into a leaf. Apps that marked an
  empty folder `hasChildren` with a `loadChildren` answering `[]` can give it `children: []` instead.
- The track layers on one map come to rest together, and the zone, coverage and link layers rework
  their geometry only when what they are given changes, not each time it is a new array. A map with
  several moving layers, such as a wall display fed every second, now goes idle between moves.
