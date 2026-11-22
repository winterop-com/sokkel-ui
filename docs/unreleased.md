# Unreleased

What changed since 0.34.4, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- Tree `cut="middle"` in a narrow row: the head gives way first and stays in view, the tail keeps
  its width up to all but a letter of the row and is cut with an ellipsis past that, so no row overflows
  and no head vanishes. A label of a few words keeps its last word, so a column cuts its rows alike;
  one word is cut at its end.
