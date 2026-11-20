# Unreleased

What changed since 0.33.2, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- `@winterop-com/sokkel-ui-tracking`, a new domain add-on for map tracking consoles, UI only: it never
  calls a server and ships no database. `Track` (`/track`) is one plain shape for what a console
  follows; `/adsb` reads readsb's and OpenSky's JSON into aircraft; `/ais` decodes AIS NMEA sentences
  into vessels with `createAisDecoder`; `/network` gathers connection records by remote host and by
  process with byte rates, and places hosts through the app's own `locate`; `/geo` gives great-circle
  distance, bearing and destination, and UTM and MGRS; `/affiliation` gives `TRACKING_WORDS`
  (message ids `tracking.affiliations.*` and `tracking.kinds.*`), the grouping order and the color
  token names `track-friend`, `track-hostile`, `track-neutral`, `track-unknown` and `track-pending`.
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
- Map overlays for watching an area, each in a tone (`MapTone`: a track affiliation, or `plain`;
  `@winterop-com/sokkel-ui-maps/tone`): `ZoneLayer` (areas filled `solid`, `hatched` or `none`,
  edged `solid` or `dashed`, named at their middles; `zoneLegendEntry` keys them in a `MapLegend`),
  `CoverageLayer` (sensor cones fading out with distance, and labeled range rings) and `LinkLayer`
  (lines between two positions, straight or along the great circle, optionally dashed, with the
  distance and bearing midway as the ruler's chip says them; words `LINK_WORDS`, id `link.measured`).
  Labels and chips that would cover one another are left out, the selected one's kept.
- `geodesy` adds `rhumbBearing`, `rhumbDistance`, `rhumbMiddle` (the straight line on a Mercator
  map) and `arc`.
- Stories Maps/Tracks: Zones, Coverage, Range rings and Links, and Console with the areas, the
  radars' cover, a patrol's own sensor and a line to the contact it goes after.

## Changed

- A `MapPopup` stands over whatever a layer writes in the map's overlay, such as cluster counts and
  track names.
