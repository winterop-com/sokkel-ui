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
- `MapCoordinates` takes `formatPosition`, which writes the cursor's position in place of `format`,
  and `MapGoTo` takes `parse`, which reads what is written in place of latitude, longitude: with the
  tracking add-on's `toMgrs` and `parseMgrs` a console shows and takes MGRS references. Story
  Maps/Tracks/Grid references.
- The harbor watch example (`examples/harbor`): vessels decoded from AIS sentences and aircraft read
  from readsb-shaped JSON round harbor, juniper and larkspur, with the roster, the map's zones, radar
  cover, links and tools, playback, tasks, zones, a log and the darkroom theme for night watch; and
  the Apps/Harbor watch stories.
- `TrackLayer` takes `bands`, colors by band name, and a track takes `band`: a track whose band the
  layer names is painted (symbol and trail) in that band's color in place of its affiliation's, as
  an altitude-colored flight map needs. Story Maps/Tracks/Altitude.
- `MapView` takes `onViewChange`, called with the center, zoom and bounds (`MapViewport`) once the
  map is drawn and each time it comes to rest, for an app that reads what is in view. Story
  Maps/Tracks/In view.
- `/adsb` (tracking) adds `altitudeBand` (`ground`, `low` below 10,000 ft, `medium` to 25,000 ft,
  `high`; `ALTITUDE_BANDS`, `ALTITUDE_BREAKS`) and `verticalTrend` (`climbing`, `level`,
  `descending`, past `LEVEL_RATE`, about 300 ft a minute).
- Apps/Flight watch: Map, Affiliation, Following, Flights and Filtered, Tidevann's flights over
  southern Norway and the North Sea from a readsb answer.
- Example `flights`, Tidevann's flight watch: a simulated feed in readsb's v2 shape read through
  `/adsb`, and an opt-in live feed from adsb.lol through the Electron shell.
- Map effects, each drawn on maplibre (a small WebGL2 custom layer for the moving ones, a frame
  setting only uniforms), holding still where motion is reduced and stopping while the map is out of
  sight:
    - `CoverageLayer` takes `sweep` (`true` or `{ period, trail }`, `CoverageSweep`, defaults
      `SWEEP`: 4000 ms and 90 degrees): a radar's beam turning round each cone, a bright edge with a
      phosphor glow fading behind it; a sector's beam crosses it from edge to edge. `sweepMesh`.
    - `LinkLayer` takes `arc` (`true`, `ARC_HEIGHT` of a link's length, or a share), lifting each link
      into an arc (`arcLine`), and `flow`, comets running from `from` to `to`, more, faster and
      brighter by each link's new `rate` (0 to 1); under a flow the lines step back to `FLOW_LINE`.
      `flowMesh`.
    - `ZoneLayer` takes `glow`, a soft line in each zone's tone just outside its edge (`ZONE_GLOW`,
      `zoneOutward`); a zone's feature carries `outward`.
- Stories Maps/Effects: Glowing zones, Radar sweep and Flowing links.

- The flow tracker (`@winterop-com/sokkel-ui-tracking/network`) lists each connection on its own
  with `byConnection()`: a `ConnectionFlow` carries the process, pid, both ends, the latest state, the
  scope and location, the bytes and rates over the window, the totals since its first record, and
  `metered`, false when no record counted bytes (a host read through `lsof` or `netstat`).
- Example `examples/network`, a Tidevann network watch: every connection in and out of a machine on a
  map (`LinkLayer` and `TrackLayer` from home), in a live `DataTable`, charted over time with the
  `PlaybackTimeline` to look back, and alerts to acknowledge. Simulated by default; placed by
  GeoLite2 when `scripts/geolite.sh` has downloaded it (read in Node with `mmdb-lib`, the example's
  own dependency); this machine's own connections through `lsof` in its Electron shell. Story
  Apps/Network watch.
- `@winterop-com/sokkel-ui-tracking/simulate`: simulated feeds for an example, a story or a test,
  each worked out from a seed and a simulated moment and written in the shape its real feed has, so
  it is read through the same readers and a moment played back is what it was live.
  `simulateFlights` answers as readsb's v2 API does, from a timetable between real cities with each
  flight's phases (`flightsAt`, `flightRoute`, `flightTrails`); `simulateCoast` gives the picture of
  a coast whose contacts appear, are classified, go stale, are lost and leave, its vessels written
  as AIS sentences (`simulateAis`, `encodeAisPosition`, `encodeAisStatic`) and decoded by
  `createAisDecoder`, with `coastEvents`, `coastActivity` and the contacts themselves;
  `createNetworkSimulation` moves a machine's connections on a second at a time as
  `ConnectionRecord`s (`simulateNetwork`, `networkHosts`, `networkPlace`); and `createSimClock`
  plays a simulated moment at a multiple of real time, pauses and seeks.
- The harbor, flight and network watch examples read the tracking add-on's simulation in place of
  their own, and the harbor watch's clock is its `createSimClock`.
- The Apps/Harbor watch, Apps/Flight watch and Apps/Network watch stories run live on that
  simulation, over the dark basemap: each starts at the same simulated moment every time and plays
  on from it (the harbor a minute a second, the flights thirty times real time, the network at a
  real machine's pace), so tracks move, trails grow, contacts and flights come and go, and
  connections open and close. Pause in the top bar holds the clock, and the harbor watch's timeline
  plays the last six hours back.
- `/orbits` (tracking): satellites from the OMM elements CelesTrak and Space-Track publish, placed at
  any time with SGP4. `parseOmm` reads them from JSON and `parseOmmCsv` from CSV, the form CelesTrak
  asks for, into plain `Satellite` records;
  `satellitePosition` and `satelliteTracks` give where each is, as a track of kind `satellite` over
  the point under it (its height as the altitude, the point's heading and speed over the ground, the
  orbital speed as `properties.velocity`); `groundTrack` gives the path behind and ahead as lines
  split at the antimeridian (`splitAtAntimeridian` for any path); `footprint` and `horizonRange` give
  the circle a satellite is in view from; `parseStationPosition` reads the space station's position
  from wheretheiss.at and Open Notify. The tracking package now depends on satellite.js (MIT, held at
  version 6), which only an app that imports `/orbits` bundles, about 10 kB gzipped.
- `/events` (tracking): `Incident`, one plain shape for what happens at a place and a time, with a
  kind, a severity on CAP's scale (`minor`, `moderate`, `severe`, `extreme`, `unknown`) and, for one
  that lasts, when it ends. `parseUsgsQuakes` reads the USGS earthquake summary feeds, `parseGdacs`
  GDACS's event lists and `parseMetAlerts` MET Norway's weather warnings, each warning with the area
  it covers; `incidentZones` gives those areas as zones for a map, and `incidentsAt` the incidents
  that hold at a time. Words `INCIDENT_WORDS`, ids `incident.kinds.*` and `incident.severities.*`.
- `/checks` (tracking): server health checks as data. A `Check` is a plain object (a path, the
  status, body text and JSON values its answer must hold, how to judge its latency, and values to
  capture); the app performs the request and `evaluateCheck` says `up`, `degraded` or `down` with the
  reason. `createStatusMonitor` holds a status steady over a run of observations (`failures`,
  `recoveries`), gives a change only when the status changes, and gives uptime and latency over a
  window; `combineResults` and `worstStatus` make one observation of a server's checks. `HTTP_KIND`
  and `httpCheck` check any server that answers over HTTP; `checkUrl` joins a check's path to a base
  URL. Words `CHECK_WORDS`, ids `check.statuses.*`, `check.reasons.*` and `check.answers`.
- `@winterop-com/sokkel-ui-dhis2/checks`: the health checks of a DHIS2 server as data, in the shape
  the tracking add-on's `evaluateCheck` takes. `dhis2Checks()` checks that the base URL answers and
  reads the version from `/api/loginConfig`; with `credentials: true` it reads the version, revision
  and build time from `/api/system/info` and the signed-in user from `/api/me`. `DHIS2_KIND` is DHIS2
  as a kind of server, and `DHIS2_DEMO` the public demo server for a quick-add list, without
  credentials. Words `DHIS2_CHECK_WORDS`, ids `dhis2Check.*`; the package now carries a catalog,
  `messages/en.json`.
- The tracking package's README lists, for each public source its modules read, whether a page can
  fetch it, its key, its limits and its license, and so which need a server of the app's own.
- `/ais` (tracking) reads `VDM` and `VDO` sentences from any talker, so a coastal network's feed of
  base station sentences (`!BSVDM`, each behind a tag block) decodes as a receiver's `!AIVDM` does.
  `AisSentence.talker` is the talker and the sentence as sent.

## Changed

- A `MapPopup` stands over whatever a layer writes in the map's overlay, such as cluster counts and
  track names.
- The labels a map's layers write in its overlay keep clear of one another across layers: a
  `ZoneLayer`'s names give way to a `TrackLayer`'s labels, and a `LinkLayer`'s measure chips to
  both, the selected zone's or link's still placed first and always.
