# Unreleased

What changed since 0.29.3, for the next release's notes. A release copies this into its GitHub
release and empties it.

- `TimeRangePicker` takes `times` (and `clock`): a custom range starts and ends at a time of day,
  typed or picked in two fields under the calendar, the fields loading with the calendar. Its words
  add `start` and `end`. `rangeLabel` writes the times where an end is not at midnight and takes a
  `clock`; `timeOfDay` and `atTime` are new.
- A chart's spec takes `statuses`: `true` draws every series or category named for a run state in
  its status color, or an app's own `StatusMap` maps its values; a name in `colors` keeps its token.
- `MapView` takes `fallbackBasemap`, drawn while the chosen basemap cannot be had (offline, or its
  style or every tile fails), an `export` control that saves the map as a PNG named by `file`, and
  `handle` for an app's own export (`MapHandle`). Its words add `export`.
- `Basemap` takes `geometry`: outlines drawn as land, with no tile server. The maps package carries
  the world's countries (Natural Earth 1:110m, public domain), loaded on first use by `loadWorld` and
  `useWorld` in the new `world` module, which also holds `WORLD_BASEMAP`.
- `CountryLayer` (maps) fills countries by a value per ISO 3166-1 alpha-3 code from that geometry or
  the app's own, with `unvalued` to hatch or leave out the countries with no value.
