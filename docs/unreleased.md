# Unreleased

What changed since 0.32.0, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- `DataTable`: a sortable `content` column keeps room for its sort arrow (18 px) while unsorted, so
  sorting it never wraps its head and grows the head row. Such columns are up to 18 px wider.
