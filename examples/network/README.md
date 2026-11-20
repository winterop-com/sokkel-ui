# Network watch

Tidevann's network watch: every connection in and out of a machine, mapped from home to each remote
host, tabled live, charted over time with a timeline to look back, and alerts to acknowledge. It is
the model for an app that watches a machine's own traffic, built from the library's parts:
`createFlowTracker` and `flowTracks` from `@winterop-com/sokkel-ui-tracking/network`, `LinkLayer`,
`TrackLayer` and the map tools from the maps package, `DataTable`, `PlaybackTimeline`, `Freshness`
and the charts' `TimeSeriesPanel`.

```sh
make network-web        # build and serve it on 4199, from the repository root
make network-electron   # the Electron shell, which can also read this machine
make network-tauri      # the Tauri shell, simulated only
```

## Pages

- **Map**: this machine at home (Settings › Watch › Home), a link to each located remote host and the
  host itself, colored by the state of its connections or by the process that moves the most with
  it. Picking a host or a link shows its connections in the side panel.
- **Connections**: every connection, live: process, pid, protocol, both ends, place, state, bytes in
  and out, rate. Searchable, sortable, and grouped by process or by remote host.
- **Traffic**: bytes a second in and out for the whole machine and by process, over the last 1, 5 or
  15 minutes, and the processes at the time shown.
- **Alerts**: a process talking out for the first time, a country reached for the first time, and a
  process over its receiving or sending limit. Acknowledged one at a time, by selection or all at
  once, reopened, deleted, and cleared.
- **Settings**: Watch, Alerts (on and off, the limits, forgetting what is known), Appearance
  (darkroom among the themes) and Data (the source, the lookup in use, and the attribution).

The timeline at the foot of Map, Connections and Traffic takes all three back over the last fifteen
minutes and plays them forward.

## Where the data comes from

**Simulated** (the default, everywhere): six processes (browser, mail, sync, updater, backup and
shell) open and close connections at their own paces with realistic rates; the updater downloads in
bursts and the backup uploads in bursts, and a process the machine has not run before
(nightly-export) starts a minute after the page opens, each run to a host in another far country.
The page opens with fifteen minutes already behind it.

**This machine** (the Electron shell only, off by default, Settings › Data › Source): the main
process runs `lsof -i -n -P +c 0 -F pcPnT` on an interval (2, 5 or 10 seconds), or `netstat -an`
where there is no lsof, as a fixed command and arguments through `execFile`, never a shell. It parses
the output into the tracking package's `ConnectionRecord`, places each remote end with GeoLite2 in
the main process when the file is there, and sends the records to the page through the preload's
`tidevannNetwork` bridge. Neither tool counts bytes, so the watch shows connections and states only,
says rates are unavailable, charts connections in place of rates, and raises no spikes. Without
root, lsof lists only the current user's processes.

## Locations: GeoLite2

When this machine has MaxMind's GeoLite2 City, the simulation draws seeded public addresses and
GeoLite2 places them; the Electron shell places this machine's real connections with it too.
Without it (CI, other machines) a built-in lookup places the documentation networks (203.0.113.0/24,
198.51.100.0/24, 192.0.2.0/24 and 2001:db8::/32) in plain cities, and the app works the same.
Settings › Data says which one is in use.

The file is never committed: its license forbids redistributing it, and it is updated twice a week.
`scripts/geolite.sh` downloads it into `geolite/`, which git ignores. It reads the license key at run
time from 1Password, through a reference you pass in; the key is never written to disk, printed or
put on a command line.

```sh
cd examples/network
MAXMIND_LICENSE_REF='op://Private/MaxMind/license key' make geolite
# With the account id too, for MaxMind's newer download:
MAXMIND_LICENSE_REF='op://Private/MaxMind/license key' MAXMIND_ACCOUNT_REF='op://Private/MaxMind/account id' make geolite
```

Run it again to refresh the file; a running server or shell picks up the new file as it lands.

The page never holds the file. It is read in Node by `mmdb-lib`, this example's dependency only:
by the dev and preview servers (`server/vite-geolite.ts`, which answer `geolite/status` and
`geolite/locate`) and by the Electron shell's main process. The built page opened anywhere else,
in the Tauri shell or on the published examples site, uses the built-in lookup. `TIDEVANN_GEOLITE`
points the Electron shell at a file elsewhere.

Every location is approximate, to the city at best, and a host in the cloud shows where its data
center is. This product includes GeoLite2 data created by MaxMind, available from
https://www.maxmind.com.
