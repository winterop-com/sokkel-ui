# Control site

Tidevann's control site: live feeds from many places on one map and one status wall, kept in sync
across windows. Earthquakes, disaster alerts, weather warnings, satellites, the space station,
aircraft, vessels and a server's health are read from open public sources where they can be, and
from the simulation everywhere else.

```sh
make control-dev        # the dev server on 4200, with the proxy, from the repository root
make control-web        # build and serve it on 4200, with the proxy
make control-electron   # the Electron shell, with the proxy in its main process
make control-tauri      # the Tauri shell, simulated where a source needs the proxy
```

## Views and sync

Three views read one state:

- **Wall** (`#/wall`): the map as a globe, a tile for every source with its status and its latency
  over the last reads, the counts and the alerts, with no rail and no top bar. Its camera moves from
  one region of interest to the next by itself.
- **Operator** (`#/operator`): the map with a layer for every source, the roster of tracks, the
  incidents, what is picked, the alerts to acknowledge, and the last hour to play back.
- **Sources** (`#/sources`): each source with its checks' last results, its latency, its uptime and
  its changes of status, and its switches.

The state is the engine's (`createSourceEngine` from `@winterop-com/sokkel-ui-tracking/sources`): each
source is a plugin with its interval, its checks, its live read and its simulation. The engine reads
what is due, judges each answer with the source's checks, holds a steady status with
`createStatusMonitor` (down after three reads in a row), and raises an alert when a status changes.

One window leads and the others follow (`web/src/store.ts`, on the rules in `web/src/sync.ts`).
Every window asks for the same Web Lock; the one that holds it runs the engine and sends each change
over a `BroadcastChannel`, only the data that changed. The others take what it sends as their own
engine's state. When the leader closes, the lock passes to the next window, which runs on from the
state it already holds. Where there are no Web Locks, the oldest window heard in the last few
seconds leads.

- Each leadership has a term, one past the last heard of, and each snapshot a place in what its
  leader has sent. A snapshot from a leader since replaced, or one that comes late or twice, is not
  taken, so nothing sent before a handoff rolls the state back after it. A new leader claims its
  term, waits a moment for the old one's parting snapshot, and only then reads the sources.
- A command (switch a source, read one now, a sign-in) is sent until the leader acknowledges it,
  again whenever the leader changes, and run once: one sent while no window led is not lost.
- Every window says each second whether it is in sight. A leader out of sight, whose timers a
  browser slows, hands the lock to a window in sight, whenever that window opened.
- What is picked, which alerts are acknowledged and where the playback stands are sent by whichever
  window changed them. The later change wins, and of two made at once the same one wins in every
  window, so they all end on one value.

"Open wall in new window" opens a second window in the Electron shell and a tab in a browser. A
sign-in for the server's checks typed in Settings is sent to the leading window and held in its
memory alone; it is gone when that window closes.

## Where the data comes from

Every source has a simulated twin, and the page falls back to it whenever a source cannot be read.
This example is the second exception `AGENTS.md` allows to the simulated backend, after the flight
watch: it may read the public sources below. No story and no test reaches them.

| Feed            | Source                                                           | A page could read it directly                                 | Here     |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- | -------- |
| Earthquakes     | USGS earthquake feed, magnitude 2.5 and up, the last day         | Yes: any origin                                               | Proxied  |
| Disaster alerts | GDACS event list                                                 | Yes: any origin                                               | Proxied  |
| Warnings        | MET Norway MetAlerts                                             | Yes, but its terms ask for a server of the app's own          | Proxied  |
| Satellites      | CelesTrak GP elements, the stations group, as CSV                | Yes, but one download per update for a whole address          | Proxied  |
| Space station   | wheretheiss.at                                                   | Yes: any origin                                               | Proxied  |
| Aircraft        | adsb.lol, the readsb v2 point query                              | No: it sends no CORS header                                   | Proxied  |
| Vessels         | Norwegian Coastal Administration AIS, a TCP stream of NMEA lines | No: a page cannot open a TCP connection                       | Streamed |
| Server health   | the health-checked server, on an allow-listed host               | Through the proxy only, which reaches the allowed hosts alone | Proxied  |

The sources a page could read are proxied all the same, so every window and every reload shares one
cache and no source is asked more often than it allows.

## The proxy

`web/server/proxy.ts` is plain Node with no dependencies. The dev and preview servers serve it under
`proxy/` (`web/server/vite-proxy.ts`), and the Electron shell runs it in its main process and hands
it to the page through its preload (`window.tidevannControl`).

It is never an open proxy. It serves a fixed table of named routes. Each route has a fixed upstream
address, or one built from checked numbers, or one on an allow-listed host. Each has a cache and a
limit of its own. It answers only its own page: the servers refuse a request from another origin
and send no CORS headers, and the Electron shell answers only messages from the app's own file. A redirect from a
source is followed by the proxy itself, three at most inside the one time limit, and only to an https
address on one of its fixed hosts; any other is refused. The AIS stream drops what a slow page
cannot take, never queuing it, and closes a page that takes nothing for a minute.

| Route        | Upstream                                                            | Cache                                              | Limit                                                            |
| ------------ | ------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| `quakes`     | `earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson` | 60 seconds                                         | One request in 60 seconds                                        |
| `disasters`  | `www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP`         | 5 minutes                                          | One request in 5 minutes                                         |
| `warnings`   | `api.met.no/weatherapi/metalerts/2.0/current.json?lang=en`          | Until the answer's `Expires`, 2 minutes least      | Never before `Expires`; asks with `If-Modified-Since`            |
| `satellites` | `celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=csv`     | 2 hours                                            | One download in 2 hours; 15 minutes off after any answer but 200 |
| `station`    | `api.wheretheiss.at/v1/satellites/25544`                            | 5 seconds                                          | One request in 5 seconds                                         |
| `flights`    | `api.adsb.lol/v2/point/{lat}/{lon}/{radius}`                        | 60 seconds for each point and radius               | One request in 60 seconds over all points; 480 in any 24 hours   |
| `server`     | An https address on `play.dhis2.org` or `play.im.dhis2.org`         | 20 seconds for each address, none with credentials | Two requests a second                                            |

- Every request names the proxy in `User-Agent` and gives up after 15 seconds. An answer over 8 MB
  is refused.
- Every answer says where it came from: `x-proxy-cache` (`hit` or `miss`), `x-proxy-age` (seconds
  since the source answered) and `x-proxy-latency` (milliseconds the source took). `flights` adds
  `x-proxy-remaining`, the day's budget left.
- When a source fails and an earlier answer is kept, the proxy serves the kept answer and says why
  in `x-proxy-stale`. With nothing kept it answers the source's status, or 502 when the source
  could not be reached, with `{ "error": "..." }`.
- A request a limit refuses, with nothing kept, answers 429 and says when to try again.
- `flights` takes `lat` (-90 to 90), `lon` (-180 to 180) and `radius` (1 to 250 nautical miles) as
  plain numbers, rounds them to two decimals and a whole number, and answers 400 for anything else.
- `server` takes `url` and answers 400 unless it is https on an allow-listed host. It passes on only
  `Accept`, `X-Requested-With` and `Authorization` from the page. It never follows a redirect: a
  3xx answer comes back with its status and its `location`, and the page asks again with the new
  address, which must pass the same check.

The dev and preview servers answer `GET proxy/status` (the route names), `GET proxy/<route>` and
`GET proxy/vessels`. Anything but `GET` answers 405.

## The AIS stream

The Norwegian Coastal Administration sends its AIS data as NMEA lines on a TCP connection
(`153.44.253.27:5631`), with no key and no registration. The proxy opens one connection when the
first listener arrives, whatever the number of windows. It hands on the lines as received, in
batches once a second of at most 2000 lines, and says when the connection opens and closes. It
reconnects after 5 seconds, doubling to 60, while anyone listens, and closes 10 seconds after the
last listener leaves. The page decodes the lines with the tracking add-on's `createAisDecoder`.

The servers send the stream as server-sent events on `proxy/vessels`; the Electron shell sends it
over its preload.

## Without the proxy

The Tauri shell has no proxy, and neither has a build hosted as static files, such as the published
examples site. There the page gets no answer from `proxy/status`, and every source that needs the
proxy runs on its simulation.

## Credentials

The server health check takes no credentials by default: it reads only what the server answers to
anyone. Credentials typed in Settings are kept in memory only, never in storage, and are sent only
through the proxy, only to the allow-listed hosts. The proxy keeps no answer to a request that
carried them.

## Licenses and credit

- **USGS earthquake feeds**: public domain in the United States. Credit the U.S. Geological Survey.
- **GDACS**: CC BY 4.0. Credit GDACS and say what was changed. Its alerts are indicative and never
  to decide by alone.
- **MET Norway MetAlerts**: NLOD 2.0 and CC BY 4.0. Credit "Data from MET Norway".
- **CelesTrak**: no license stated. Credit CelesTrak.
- **wheretheiss.at**: no license stated.
- **adsb.lol**: ODbL 1.0.
- **Norwegian Coastal Administration AIS**: NLOD. Vessels in Norway's economic zone and off
  Svalbard and Jan Mayen, without fishing vessels under 15 m and leisure craft under 45 m.
