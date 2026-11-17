# Unreleased

What changed since 0.30.0, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- The text role `text-column-head` (16 / 24 at 500, from `table-head-size` and `table-head-weight`):
  a table's column and group heads, one text step above the body text of the cells they head.

## Changed

- A table's column heads stand one text step above their cells: `text-column-head`, 16 / 24 at 500,
  in `table-head-ink`, which is now `foreground` in the base theme (it was `muted-foreground`), where
  they were 13 / 20 at 600. `table-head-size` is `var(--text-base)` and `table-head-weight` 500.
  This holds wherever `TABLE_HEAD_TEXT` sets a head: `DataTable` (table and list), the `Table`
  primitive, a Markdown table and `PermissionMatrix`. `text-head` stays 13 / 20 at 600 for compact
  panel and boxed section heads, with its own size and weight rather than the table head's.

## Fixed

- A table's group heads (`groupBy`) no longer read quieter than their rows: 0.30.0 set them in the
  column heads' small `text-head` in a muted ink; they now take `text-column-head` in
  `table-head-ink`, one step above the rows, as the column heads do, in their own case.
