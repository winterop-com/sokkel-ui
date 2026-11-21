# Unreleased

What changed since 0.33.4, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- A markdown text's escaped `\[[`, `\![[` and `\#` read as the words they are, never as a linked
  note, an embed or a tag, as an escaped `\=` already did for a highlight.
