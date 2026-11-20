# Unreleased

What changed since 0.33.2, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- `TrackLayer` (`@winterop-com/sokkel-ui-maps/TrackLayer`): moving things on a map, each a symbol
  for its kind (`vessel`, `aircraft`, `vehicle`, `sensor`, `other`) turned to its heading, in its
  affiliation's color (`friend`, `hostile`, `neutral`, `unknown`, `pending`), its label beside it and
  its trail fading behind it. The selected track (the map's `selected`) is ringed in
  `--map-selection`; new positions glide in over `transition` with the source's data set in place;
  `cluster` gathers dense tracks into counted clusters, ringed when one holds a hostile track.
  `trackLegendEntries` and `trackCounts` key the affiliations in a `MapLegend`. Words `TRACK_WORDS`,
  ids `track.<affiliation>` and `track.<kind>`.
- Tokens `--track-friend`, `--track-hostile`, `--track-neutral`, `--track-unknown` and
  `--track-pending`, set by tidevann in both schemes, so a theme can change them.
- Map tools, each a part placed in a corner of a `MapView`: `MapRuler` (two clicks measure the
  distance along the great circle and the bearing, in km, mi or NM; words `mapRuler.*`),
  `MapCoordinates` (the cursor's position or Offscreen, after a scale bar; `mapCoordinates.*`),
  `MapGoTo` (a field that flies to "lat, lon"; `mapGoTo.*`), `MapFollow` (keeps a moving thing
  centered, with a banner that lets it go; `mapFollow.*`) and `MapCompass` (shows the bearing,
  resets north on press; `mapCompass.resetNorth`).
- `geodesy` (`@winterop-com/sokkel-ui-maps/geodesy`): `distance`, `bearing`, `destination`,
  `greatCircle`, `formatDistance`, `formatBearing`, `formatCoordinates`, `parseCoordinates` and
  `roundScale`.
- `MapView` takes `rotate`, which lets the reader turn the map from north (off by default, as
  before). A map's context gives its overlays `holdCamera` and `takeClicks`, so a tool can hold the
  camera or take the map's clicks in place of the selection.
- Stories Maps/Tracks: Tracks, Trails, Selected, Dense, Live, Ruler, Follow and Console, a harbor
  watch on the world basemap in the dark scheme.

## Changed

- A `MapPopup` stands over whatever a layer writes in the map's overlay, such as cluster counts and
  track names.
