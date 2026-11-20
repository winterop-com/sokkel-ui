# @winterop-com/sokkel-ui-tracking

A domain add-on of sokkel-ui for map tracking consoles: things that move (vessels, aircraft,
vehicles) and network flows. It is data only and UI only. It draws nothing and needs no plugin, it
never calls a server, and it ships no database: the app fetches, and this package turns what it
fetched into tracks.

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
    kind: 'vessel' | 'aircraft' | 'vehicle' | 'sensor' | 'other'
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

| Module         | Holds                                                                                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/track`       | `Track` and its types, `TRACK_AFFILIATIONS`, `TRACK_KINDS`, `KNOT` and `FOOT`                                                                                                                                           |
| `/adsb`        | `parseReadsb` (readsb's JSON and the v2 APIs on it: `/v2/point`, `/v2/hex`), `parseOpenSky` (`/api/states/all`) and `parseFlights`, which tells them apart                                                              |
| `/ais`         | `createAisDecoder`, which reads `!AIVDM` and `!AIVDO` lines into vessel tracks with a registry by MMSI; `parseAisSentence`, `decodeAisPayload` and `aisChecksum` underneath                                             |
| `/geo`         | `distance`, `bearing` and `destination` on a great circle; `toUtm`, `fromUtm`, `formatUtm`, `utmZone` and `latitudeBand`; `toMgrs` and `parseMgrs`                                                                      |
| `/network`     | `createFlowTracker`, which gathers connection records by remote host and by process with byte rates over a window; `flowTracks`, the located hosts as tracks and links from home; `addressScope` and the address checks |
| `/affiliation` | `TRACKING_WORDS` and `TRACKING_PART`, `AFFILIATION_ORDER`, `compareAffiliation`, `sortByAffiliation`, `groupByAffiliation` and `AFFILIATION_TOKENS`                                                                     |

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

## Network connections

```ts
import { createFlowTracker, flowTracks } from '@winterop-com/sokkel-ui-tracking/network'

const tracker = createFlowTracker({ window: 10_000, locate: (address) => lookup.get(address) })
tracker.add(records)
const { tracks, links } = flowTracks(tracker.byRemote(), { home: [10.75, 59.91] })
```

`locate` is the app's own lookup of where an address is. Loopback, private, link-local, multicast
and unspecified addresses are never located. Byte counts are each connection's running totals by
default, or the bytes since its last record with `counters: 'delta'`.

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
