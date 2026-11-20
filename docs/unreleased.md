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
- Tracking parts in the core, for any console that watches moving things (a fleet, an incident
  board, deliveries), each engine-free:
    - `TrackGlyph` (`@winterop-com/sokkel-ui/TrackGlyph`): a track's kind drawn as the map draws it,
      in its affiliation's token and turned to its heading. `lib/tracks` holds the affiliations, kinds,
      colors and outlines, and `TRACK_NAMES_WORDS` (ids `trackNames.<affiliation>`, `trackNames.<kind>`).
    - `Freshness` (`@winterop-com/sokkel-ui/Freshness`): "Live", "3 s ago", "2 min ago", quieter once
      stale and in the warning tone once lost (`thresholds`), every mark reading one shared clock;
      `now` holds it still. `freshnessOf`, `freshnessText`. Words `FRESHNESS_WORDS`, ids `freshness.*`.
    - `TrackCard` (`@winterop-com/sokkel-ui/TrackCard`): a dense card of one track: glyph, name, id,
      freshness, the affiliation as a chip (a menu with `onAffiliationChange`), state chips, a detail
      line and an optional thumbnail; `framed={false}` for a list row. Words `TRACK_CARD_WORDS`, id
      `trackCard.changeAffiliation`.
    - `TrackRoster` (`@winterop-com/sokkel-ui/TrackRoster`): the tracks as a `DataTable` list of
      `TrackCard` rows grouped under their affiliations with counts, folding, with a search, a
      `FilterBar` (`trackFilterFields`) and a sort menu; `selected` and `onSelect` share the pick
      with a map. Words `TRACK_ROSTER_WORDS`, ids `trackRoster.*`.
    - `TaskCard` (`@winterop-com/sokkel-ui/TaskCard`): a task's state (pending, executing, paused,
      done, failed; `taskStatuses`) as a chip, its elapsed time (`formatElapsed`), a line between two
      named things with their glyphs, facts, and actions, a destructive one confirmed first. Words
      `TASK_CARD_WORDS`, ids `taskCard.*`.
    - `PlaybackTimeline` (`@winterop-com/sokkel-ui/PlaybackTimeline`): a time axis with day and hour
      ticks, the live edge, play, pause and step, scrubbing, the keys, and an activity strip in plain
      SVG; it returns to live at the edge. Words `PLAYBACK_TIMELINE_WORDS`, ids `playbackTimeline.*`.
- `useClock` (`@winterop-com/sokkel-ui/hooks/use-clock`): the shared clock `RelativeTime` reads, one
  timer per period however many parts read it.
- `lib/time-axis` (`timelineTicks`, `tickLabeler`, `axisShare`, `zoneOffset`): the axis `RunTimeline`
  and `PlaybackTimeline` both draw, its ticks and lines one private part (`components/time-axis`).
  `RunTimeline` still exports `timelineMs` and `timelineTicks`.
- `DataTable`: with `columnHeads={false}` the bar offers the sort menu, as the grid does, and a
  `reveal` with `focus: false` scrolls to the row without moving the focus.
- Theme `darkroom` (`@winterop-com/sokkel-ui/themes/darkroom.css`): red ink on near-black for a dark,
  red-lit room, low in glare and nothing blue-bright; deep red on a dim warm paper by day. Its track
  colors stay apart, which a token test now checks for every theme.
- Stories Patterns/Track card, Track roster, Freshness, Task card, Playback timeline and Tracking
  console (the harbor watch with every part around the map), and Themes/Theme picker/Darkroom.

## Changed

- A `MapPopup` stands over whatever a layer writes in the map's overlay, such as cluster counts and
  track names.
- The labels a map's layers write in its overlay keep clear of one another across layers: a
  `ZoneLayer`'s names give way to a `TrackLayer`'s labels, and a `LinkLayer`'s measure chips to
  both, the selected zone's or link's still placed first and always.
