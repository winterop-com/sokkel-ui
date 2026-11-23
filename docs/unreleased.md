# Unreleased

What changed since 0.34.5, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- Tree `cut="middle"` cuts at the end instead in a row too narrow for the whole tail and a few
  letters of the head, so a deep or narrow row reads "Harbor survey…" rather than "H… : Sheet…".
  It goes back to the middle cut as the row widens.
