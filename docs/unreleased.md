# Unreleased

What changed since 0.34.3, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- Tree `cut="middle"` keeps a label's last words when it has no separator, never splitting a word,
  and gives every label longer than a short word or two a tail, so a column cuts its rows alike
  rather than some at the end and some in the middle.
