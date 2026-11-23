# Unreleased

What changed since 0.34.5, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- Tree `cut="middle"` cuts at the end instead in a row too narrow to keep the whole tail beside a
  letter of the head, so such a row reads "Harbor survey…" rather than "H… : Sh…". A row that keeps
  the whole tail keeps the middle cut ("Ha… : Sheet 170" at the rail's narrowest), and a row goes
  back to the middle cut as it widens.
