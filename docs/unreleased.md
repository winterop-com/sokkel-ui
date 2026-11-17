# Unreleased

What changed since 0.29.3, for the next release's notes. A release copies this into its GitHub
release and empties it.

## New

- `DataTable` `searchBy`: a table or a list with a search of its own. The bar holds the table's own
  search field (`searchField` sets its placeholder, label, words and `/` key), and the rows are cut
  to those whose text holds every word typed. An app that keeps the query itself still passes
  `search`.
- `TrackList` `href`: a row links to its own page through the app's `LinkProvider`; with `onPlay`
  too, its number or cover is the button that plays it.
- `TrackList` windowing: a list longer than `TRACK_WINDOW_FROM` (200) rows, or any with `windowed`,
  draws only the rows in view and a dozen either side; the current and the focused row stay drawn.
  `ReorderableTrackList` always draws every row.

## Fixed

- `DataTable`: a press on a stacked card's `stack: 'lead'` column opens the row unless it lands on a
  control in it; before, every press there was kept from the row.
- `DataTable`: a stacked card whose `primary` value may take more than one line is as tall as its
  values take, so a short value no longer leaves blank space under it.
