# @winterop-com/sokkel-ui-tracking

A domain add-on of sokkel-ui for map tracking consoles: things that move (vessels, aircraft,
satellites, vehicles), things that happen (earthquakes, disasters, weather warnings), network flows
and the health of servers. It is data only and UI only. It draws nothing and needs no plugin, it
never calls a server, and it ships no database: the app fetches, and this package turns what it
fetched into tracks, incidents and statuses.

```
bun add @winterop-com/sokkel-ui @winterop-com/sokkel-ui-tracking
```

## Tracks

Every reader gives one plain, serializable shape, `Track` (`/track`), so a map layer, a list and a
filter take any feed alike. Units are SI: meters, meters per second, degrees from true north and
milliseconds since the epoch.

```ts
interface Track {
    id: string
    lon: number
    lat: number
    heading?: number
    speed?: number
    altitude?: number
    affiliation: 'friend' | 'hostile' | 'neutral' | 'unknown' | 'pending'
    kind: 'vessel' | 'aircraft' | 'satellite' | 'vehicle' | 'sensor' | 'other'
    label?: string
    trail?: [number, number][] // lon, lat, oldest first
    updatedAt?: number
    source?: string
    properties?: Record<string, string | number | boolean | null>
}
```

Each reader takes a `classify(track)` that gives a track its affiliation; without one, or when it
gives none, a track is `unknown`.

## Modules

| Module         | Holds                                                                                                                                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/track`       | `Track` and its types, `TRACK_AFFILIATIONS`, `TRACK_KINDS`, `KNOT` and `FOOT`                                                                                                                                                                                                                                                               |
| `/adsb`        | `parseReadsb` (readsb's JSON and the v2 APIs on it: `/v2/point`, `/v2/hex`), `parseOpenSky` (`/api/states/all`) and `parseFlights`, which tells them apart; `altitudeBand` and `verticalTrend`                                                                                                                                              |
| `/ais`         | `createAisDecoder`, which reads `VDM` and `VDO` lines of any talker (`!AIVDM`, `!BSVDM`) into vessel tracks with a registry by MMSI; `parseAisSentence`, `decodeAisPayload` and `aisChecksum` underneath                                                                                                                                    |
| `/geo`         | `distance`, `bearing` and `destination` on a great circle; `toUtm`, `fromUtm`, `formatUtm`, `utmZone` and `latitudeBand`; `toMgrs` and `parseMgrs`                                                                                                                                                                                          |
| `/network`     | `createFlowTracker`, which gathers connection records by remote host and by process, or lists each, with byte rates over a window; `flowTracks`, the located hosts as tracks and links from home; `addressScope` and the address checks                                                                                                     |
| `/affiliation` | `TRACKING_WORDS` and `TRACKING_PART`, `AFFILIATION_ORDER`, `compareAffiliation`, `sortByAffiliation`, `groupByAffiliation` and `AFFILIATION_TOKENS`                                                                                                                                                                                         |
| `/orbits`      | `parseOmm` and `parseOmmCsv`, which read satellites from OMM in JSON and in CSV; `satellitePosition` and `satelliteTracks`, which place them at any time with SGP4; `groundTrack`, `splitAtAntimeridian`, `footprint` and `horizonRange`; `parseStationPosition` for the space station's position services                                  |
| `/events`      | `Incident` and its types; `parseUsgsQuakes`, `parseGdacs` and `parseMetAlerts`; `incidentZones`, `incidentsAt` and `cancelledMetAlerts`; `quakeSeverity`, `areaMiddle`, `compareSeverity`, `atLeast`, `SEVERITY_ORDER`, and `INCIDENT_WORDS` and `INCIDENT_PART`                                                                            |
| `/checks`      | `Check` and its types; `evaluateCheck`, `checkUrl`, `readPath` and `statusPasses`; `createStatusMonitor`, `combineResults` and `worstStatus`; `httpCheck` and `HTTP_KIND`; `CHECK_WORDS` and `CHECK_PART`                                                                                                                                   |
| `/sources`     | `Source` and its types; `createSourceEngine`, which reads each source when it is due, judges it with its checks, holds its status and raises an alert when it changes, and hands its state to another window                                                                                                                                |
| `/simulate`    | Simulated feeds for an example, a story or a test, each from a seed and a moment: `simulateFlights`, `simulateAis` and `simulateCoast`, `createNetworkSimulation`, `simulateQuakes`, `simulateDisasters` and `simulateWarnings`, `simulateOmmCsv` and `simulateStation`, `simulateAnswer`, and `createSimClock`, the clock they are read at |

## Sources and their engine

```ts
import { createSourceEngine, type Source } from '@winterop-com/sokkel-ui-tracking/sources'

const quakes: Source = {
    id: 'quakes',
    label: 'Earthquakes',
    kind: 'incidents',
    interval: 60_000,
    checks: [{ id: 'answers', label: 'Feed answers', path: '', expect: { status: 200 }, latency: { degraded: 3000 } }],
    read: async ({ at }) => {
        const started = performance.now()
        const answer = await fetch(url)
        const feed = await answer.json()
        return { responses: { answers: { at, status: answer.status, latency: performance.now() - started } }, data: parseUsgsQuakes(feed) }
    },
    simulate: ({ at }) => ({ responses: { answers: { at, status: 200, latency: 200 } }, data: parseUsgsQuakes(simulateQuakes(at)) }),
}

const engine = createSourceEngine({ sources: [quakes] })
setInterval(() => engine.poll(Date.now(), { hidden: document.hidden }), 1000)
engine.subscribe(() => draw(engine.state(), engine.data('quakes')))
```

A source is a plugin: what it is called, how often it is read, the checks its answers must pass, how
to read it live and what stands in when it cannot be read. The engine holds no timer and asks no
server: the app calls `poll`, which reads what is due through the source's own `read`. Each read's
answers go through the source's checks; the worst is one observation for the source's status
monitor, and a change of status is kept in the source's `transitions` and raised once as an alert,
newest first in `state().alerts`. A live read that comes back down leaves the source showing its
simulation (`mode: 'simulated'`, `fallback: true`) until a later read is better. `setEnabled`
switches a source off and on, `setLive` between its live read and its simulation alone, and
`refresh` reads one now. Everything it holds is plain data: `snapshot()` gives the state and every
source's data (or, given the versions a reader holds, only what changed), and `adopt` takes one as
its own, monitors included, so one window can read the sources and others follow it and take over.

## Flights

```ts
import { parseFlights } from '@winterop-com/sokkel-ui-tracking/adsb'

const aircraft = parseFlights(await (await fetch(url)).json(), {
    classify: (track) => (String(track.properties?.callsign).startsWith('TDV') ? 'friend' : undefined),
})
```

Knots, feet and feet per minute are turned to SI; an aircraft without a position is skipped.

## Vessels

```ts
import { createAisDecoder } from '@winterop-com/sokkel-ui-tracking/ais'

const decoder = createAisDecoder({ trail: 20 })
socket.onmessage = (event) => update(decoder.push(event.data))
```

`push` takes one line or many and gives the tracks they changed. The decoder checks each checksum,
puts multi-sentence messages back together, and reads position reports (types 1, 2, 3 and 18) and
static data (types 5 and 24), so a name sent in a static report labels the vessel's later positions.
It takes a sentence from any talker, a receiver on board (`!AIVDM`) or a base station on shore
(`!BSVDM`, `!ABVDM`), and skips a tag block before it, so a coastal network's feed reads line by line.

## Network connections

```ts
import { createFlowTracker, flowTracks } from '@winterop-com/sokkel-ui-tracking/network'

const tracker = createFlowTracker({ window: 10_000, locate: (address) => lookup.get(address) })
tracker.add(records)
const { tracks, links } = flowTracks(tracker.byRemote(), { home: [10.75, 59.91] })
```

`byConnection` lists each connection on its own (process, pid, both ends, its latest state, the bytes
it moved in the window and since its first record, and their rates), for a table of every connection;
its `metered` says whether its records carried byte counts at all, as a host read through `lsof` or
`netstat` gives none.

`locate` is the app's own lookup of where an address is. Loopback, private, link-local, multicast
and unspecified addresses are never located. Byte counts are each connection's running totals by
default, or the bytes since its last record with `counters: 'delta'`.

## Simulated feeds

`/simulate` gives a console something to read where there is no live feed: an example, a story, a
test or a demo. Each feed follows from a seed and a simulated moment and is written in the shape its
real feed has, so it goes through the same readers, and a moment played back is the picture it was
live.

```ts
import { parseReadsb } from '@winterop-com/sokkel-ui-tracking/adsb'
import { createSimClock, simulateCoast, simulateFlights } from '@winterop-com/sokkel-ui-tracking/simulate'

const clock = createSimClock({ start: Date.parse('2026-11-20T14:30:00Z'), speed: 30 })
clock.subscribe(() => {
    const aircraft = parseReadsb(simulateFlights(clock.get()))
    const { tracks } = simulateCoast(1, clock.get())
})
```

- **Flights.** `simulateFlights(at, { seed })` is a timetable between real cities round southern
  Norway and the North Sea, as readsb's v2 API answers `/v2/point`: each flight rolls out, climbs,
  cruises, descends and rolls in, and three light aircraft fly circuits. `flightsAt` gives the same
  aircraft before the feed rounds them, with each one's cities and phase; `flightRoute(callsign)`
  the cities a callsign flies between; and `flightTrails(at, { minutes })` where each was over the
  minutes before.
- **Vessels.** `simulateCoast(seed, at, judgments)` is the picture of a coast with three harbors:
  the regular traffic going round its routes, and passing contacts that appear, are classified, fall
  silent (stale, then lost) and go. The vessels are written as real AIS sentences
  (`simulateAis(seed, at)`, or `encodeAisPosition` and `encodeAisStatic` for one report) and decoded
  by `createAisDecoder`, the aircraft as a readsb answer, and the radars stand where they are.
  `coastEvents` lists what happened over a stretch, `coastActivity` how busy it was, and
  `coastContact`, `coastContacts` and `findCoastContact` give the contacts themselves.
- **Network.** `createNetworkSimulation({ seed, hosts, newcomerAt })` is a machine of six processes
  opening and closing connections; `tick(at)` moves it on a second and gives its connection table as
  `ConnectionRecord`s with running byte totals, for `createFlowTracker`. `simulateNetwork` gives the
  tables of a whole span at once. `networkHosts()` are the hosts it reaches, addresses on the
  documentation networks only, and `networkPlace(address)` places each in a plain city.
- **The clock.** `createSimClock({ start, speed })` stands at `start` and plays on at `speed` times
  real time in whole ticks, a second apart unless `tick` says otherwise; `pause`, `play`, `seek` and
  `setSpeed` hold it, move it and change its pace, and `get` and `subscribe` make it a store a
  component reads.

The flights and the coast are pure functions of the seed and the moment. The machine is moved on a
second at a time, and one made from the same options does the same from its start.

## Grid references

```ts
import { parseMgrs, toMgrs, toUtm } from '@winterop-com/sokkel-ui-tracking/geo'

toMgrs([10.7522, 59.9139]) // '32V NM 97979 43118'
parseMgrs('32VNM9797943118') // the square's south-west corner, [lon, lat]
toUtm([5.3221, 60.3913]) // zone 32, by the exception over western Norway
```

UTM and MGRS cover 80°S to 84°N on WGS84, with zone 32V widened over western Norway and the zones
31X, 33X, 35X and 37X over Svalbard.

## Affiliations

`TRACKING_WORDS` says the affiliations and kinds in English; an app translates them by their message
ids (`tracking.affiliations.hostile`, `tracking.kinds.vessel`), listed in `messages/en.json`.
`AFFILIATION_ORDER` groups tracks most pressing first: hostile, unknown, pending, neutral, friend.
`AFFILIATION_TOKENS` names the color token a theme paints each affiliation with (`track-friend`).

## Satellites

```ts
import { footprint, groundTrack, parseOmmCsv, satelliteTracks } from '@winterop-com/sokkel-ui-tracking/orbits'

const satellites = parseOmmCsv(await (await fetch(url)).text()) // once: the elements hold for days
const tracks = satelliteTracks(satellites, clock) // every tick, for any time
const circles = tracks.flatMap((track) => footprint(track) ?? [])
const { past, future } = groundTrack(satellites[0], clock)
```

`parseOmm` reads the mean elements CelesTrak and Space-Track publish as OMM in JSON, numbers or text
alike, and `parseOmmCsv` the same elements in CSV, which CelesTrak asks its readers to take: it is a
third of the size. A `Satellite` is a plain record (its catalog number as `id`, its name, the epoch of its
elements, its period and its inclination), so it survives JSON; SGP4 (satellite.js) places it at any
time from them, and every reader of one clock agrees on where it is. A satellite SGP4 cannot place,
as one whose orbit has decayed, is skipped.

A satellite's track has kind `satellite`, stands at the point under it and carries its height over the
WGS84 ellipsoid as the altitude. Its `heading` and `speed` are those of that point over the ground;
its speed along its orbit is `properties.velocity`, beside its catalog number, designator, period,
inclination and the epoch of its elements. A position far from that epoch is less sure: elements a
week old place a satellite in low orbit kilometers off.

`groundTrack` gives the path the point draws, one revolution behind and one ahead by default
(`before`, `after` and `step` in milliseconds), as lines split where they cross the antimeridian, so a
map never draws a line back across the world; `splitAtAntimeridian` does the same for any path.
`footprint` gives the circle a satellite is in view from as a position and a range in meters, which a
coverage layer draws as a full cone; `elevation` narrows it to where the satellite stands that many
degrees over the horizon.

`parseStationPosition` reads the International Space Station's position from wheretheiss.at or Open
Notify into the same track, for an app that asks a service in place of propagating.

satellite.js is this package's one dependency, under the MIT license, and reaches only an app that
imports `/orbits`: about 10 kB gzipped. It is held at version 6: version 7 adds a WebAssembly
propagator whose worker a Vite build refuses unless the app sets `worker.format` to `es`.

## Incidents

```ts
import { incidentsAt, incidentZones, parseGdacs, parseMetAlerts, parseUsgsQuakes } from '@winterop-com/sokkel-ui-tracking/events'

const incidents = [...parseUsgsQuakes(quakes), ...parseGdacs(disasters), ...parseMetAlerts(warnings)]
const now = incidentsAt(incidents, clock, 86_400_000) // what holds at the clock's time; a quake for a day
const zones = incidentZones(now) // the warned areas, for a zone layer
```

An `Incident` is a thing that happens at a place and a time, where a track is a thing that moves:

```ts
interface Incident {
    id: string
    lon: number
    lat: number
    at: number // when it happened or takes effect
    until?: number // when it ends, for one that lasts
    kind: 'earthquake' | 'tsunami' | 'cyclone' | 'flood' | 'volcano' | 'drought' | 'wildfire' | 'weather' | 'other'
    severity: 'minor' | 'moderate' | 'severe' | 'extreme' | 'unknown'
    magnitude?: number // an earthquake's
    label: string
    url?: string
    area?: Polygon | MultiPolygon // as GeoJSON holds one
    updatedAt?: number
    source?: string
    properties?: Record<string, string | number | boolean | null>
}
```

Severity is CAP's scale, and each feed's colors are read onto it alike: green is `minor`, yellow
`moderate`, orange `severe` and red `extreme`.

- `parseUsgsQuakes` reads a USGS summary feed. A quake takes the PAGER alert level where the USGS
  gave one, and `quakeSeverity` of its magnitude otherwise (`minor` below 5, `moderate` below 6,
  `severe` below 7, `extreme` from 7). Its depth is `properties.depth`, in meters.
- `parseGdacs` reads a GDACS event list: the event type gives the kind and the alert level the
  severity. An event's own measure (a cyclone's wind, a drought's area) is `properties.measure` with
  its `unit`; dates are read as UTC.
- `parseMetAlerts` reads MET Norway's weather warnings. Each is of kind `weather` (what it warns of is
  `properties.event`), holds from `at` until `until`, carries the area warned as `area` and stands at
  that area's middle. A warning that is not `Actual`, such as a test, is left out, and so is a cancellation with every
  warning in the feed it references; `cancelledMetAlerts` gives those ids, for an app that kept
  warnings from an earlier answer. The feed lists
  warnings that have yet to start, which `incidentsAt` leaves out until they do.

`incidentZones` gives every incident with an area as `{ id, area, label, kind, severity }`, the shape a
zone layer draws once the app has given each a tone for its severity. `INCIDENT_WORDS` says the kinds
and severities in English (message ids `incident.kinds.*` and `incident.severities.*`).

## Health checks

```ts
import { checkUrl, combineResults, createStatusMonitor, evaluateCheck, HTTP_KIND } from '@winterop-com/sokkel-ui-tracking/checks'

const checks = HTTP_KIND.checks()
const monitor = createStatusMonitor({ failures: 3, window: 3_600_000 })

const results = await Promise.all(
    checks.map(async (check) => {
        const at = Date.now()
        const response = await fetch(checkUrl(server.url, check)).catch(() => undefined)
        return evaluateCheck(check, { at, status: response?.status, body: await response?.text(), latency: Date.now() - at })
    }),
)
const change = monitor.push(combineResults(results)!)
if (change) notify(`${server.label} is ${change.to}`)
const { status, uptime, latency } = monitor.summary()
```

A check is a plain object: the `path` to request under a server's base URL, what to `expect` of the
answer (its `status`, one or a range; text its `body` must hold; values its `json` must hold, each by
a path such as `database.connected` or `services[0].state`, to equal a value, match a pattern or only
be there) and how to judge its `latency` (slower than `degraded` milliseconds, or than `down`).
`capture` names values to read from the JSON body for showing, such as a version. The app performs
the request, with its own credentials and through its own server where the browser may not ask, and
hands over what came back; `evaluateCheck` says `up`, `degraded` or `down`, with the reason as data
(`unreachable`, `status`, `body`, `json`, `latency`) and what was expected and what came.

`createStatusMonitor` holds a status steady: it turns `down` after `failures` observations in a row
that were down (3 by default), `degraded` after as many that were not up, and improves after
`recoveries` in a row that were better (1 by default). `push` gives a change only when the status
changes, which is when to raise an alert. `summary` gives the uptime (the share of observations that
were not down) and the latency (mean, median, 95th percentile, least and greatest) over the `window`.
`state()` is plain data to keep, and `initial` starts a monitor from it again. One round of a server's
checks is one observation: `combineResults` takes the worst status and the slowest answer.

A kind names the checks a kind of server takes. `HTTP_KIND` is any server that answers over HTTP:
one check of its base URL, up on a status from 200 to 399, degraded past a second and down past ten;
`httpCheck` builds one for a path. A domain add-on gives its own kind, in the same shape, as
`@winterop-com/sokkel-ui-dhis2/checks` does.
`CHECK_WORDS` says the statuses and the reasons in English (message ids `check.statuses.*` and
`check.reasons.*`).

## Live sources

What a page can fetch from each public source these modules read, measured on 20 November 2026 with a
request from another origin. A source that sends no `Access-Control-Allow-Origin` needs the app's own
server, or its desktop shell, to fetch it.

| Source                                                                                                                                 | Read with                 | From a page                                                                                                                                                                               | Key                                                     | Limits                                                                                                                                                                                                                                                                              | License and credit                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| USGS earthquake feeds, `earthquake.usgs.gov/earthquakes/feed/v1.0/summary/{all,1.0,2.5,4.5,significant}_{hour,day,week,month}.geojson` | `parseUsgsQuakes`         | Yes: any origin                                                                                                                                                                           | None                                                    | None stated; rebuilt every minute and cached for 60 seconds                                                                                                                                                                                                                         | Public domain in the United States; credit the U.S. Geological Survey                                                                                                    |
| GDACS event lists, `www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL,VO,DR,WF` and `EVENTS4APP`                | `parseGdacs`              | Yes: any origin. Its RSS feed (`/xml/rss.xml`) sends no such header                                                                                                                       | None                                                    | None stated                                                                                                                                                                                                                                                                         | CC BY 4.0, by the European Commission's notice the site points to: credit GDACS and say what was changed. Its terms call the alerts indicative, never to decide by alone |
| MET Norway MetAlerts, `api.met.no/weatherapi/metalerts/2.0/current.json` (`?lang=en`)                                                  | `parseMetAlerts`          | Yes: any origin, `GET` with no headers of the app's own. Its terms still ask browsers to go through the app's own server; a low-volume site may ask directly and is known by its `Origin` | None; a server-side client names itself in `User-Agent` | 20 requests a second for the whole app; never before `Expires` (two minutes), and with `If-Modified-Since`                                                                                                                                                                          | NLOD 2.0 and CC BY 4.0; credit "Data from MET Norway"                                                                                                                    |
| CelesTrak GP data, `celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=csv` (or `json`)                                         | `parseOmmCsv`, `parseOmm` | Yes: any origin. It answered late on the day, after an hour and a half of taking no connection                                                                                            | None                                                    | Its usage policy: one download of a set for each update, every two hours; CSV rather than JSON; stop at any answer but 200, for 15 minutes at a 500 or 503; an address that goes on asking is blocked, and many readers behind one address go through a caching server of their own | None stated; credit CelesTrak                                                                                                                                            |
| wheretheiss.at, `api.wheretheiss.at/v1/satellites/25544`                                                                               | `parseStationPosition`    | Yes: any origin                                                                                                                                                                           | None                                                    | About one request a second; its headers said 350 in five minutes                                                                                                                                                                                                                    | None stated                                                                                                                                                              |
| Open Notify, `api.open-notify.org/iss-now.json`                                                                                        | `parseStationPosition`    | Only from a page served over HTTP: it allows any origin but answers on port 80 alone                                                                                                      | None                                                    | About one request in five seconds                                                                                                                                                                                                                                                   | None stated                                                                                                                                                              |
| Norwegian Coastal Administration AIS, TCP `153.44.253.27:5631`                                                                         | `createAisDecoder`        | No: a raw TCP stream of NMEA lines, for Node or a desktop shell. Its lines are `!BSVDM` behind a tag block, which the decoder reads                                                       | None, and no registration                               | None stated                                                                                                                                                                                                                                                                         | NLOD. Vessels in Norway's economic zone and off Svalbard and Jan Mayen, without fishing vessels under 15 m and leisure craft under 45 m                                  |
| adsb.lol, `api.adsb.lol/v2/point/{lat}/{lon}/{nm}`                                                                                     | `parseReadsb`             | No: no header                                                                                                                                                                             | None; a key raises the limit                            | 500 requests a day for an address without a key                                                                                                                                                                                                                                     | ODbL 1.0                                                                                                                                                                 |
| adsb.fi, `opendata.adsb.fi/api/v2/lat/{lat}/lon/{lon}/dist/{nm}` (its notes move this to `/api/v3/`)                                   | `parseReadsb`             | No: no header                                                                                                                                                                             | None                                                    | One request a second                                                                                                                                                                                                                                                                | Personal, non-commercial use; cite adsb.fi with a link                                                                                                                   |
| airplanes.live, `api.airplanes.live/v2/point/{lat}/{lon}/{nm}`                                                                         | `parseReadsb`             | No: it answered 403, asking for a description of the project by mail first                                                                                                                | Permission                                              | Not read                                                                                                                                                                                                                                                                            | Not read                                                                                                                                                                 |
| OpenSky, `opensky-network.org/api/states/all`                                                                                          | `parseOpenSky`            | No: it allows its own origin alone                                                                                                                                                        | None for 400 credits a day; an account for more         | 400 credits a day without an account, in steps of 10 seconds                                                                                                                                                                                                                        | Its terms page refused the request; read them before use                                                                                                                 |

So a page may ask the USGS, GDACS, CelesTrak and wheretheiss.at itself; MetAlerts allows it and asks
for a server of the app's own; and Open Notify, the AIS stream and every flight service need that
server. CelesTrak's elements change every two hours and serve every reader for days: a page keeps the
copy it fetched until the next update, and an app with many readers behind one address fetches them
once on its own server and hands every page the same copy.
