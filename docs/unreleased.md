# Unreleased

What changed since 0.37.3, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- Tree: `cut="middle"` keeps a label's last word or two when its whole end does not fit beside the
  head, instead of cutting at the end, so a series sharing a long start without a separator still
  tells apart.
