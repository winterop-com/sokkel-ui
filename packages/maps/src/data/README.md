# Data

`countries-110m.json` is the world's countries `loadWorld` fetches the first time a `CountryLayer`
or the World basemap draws, and no sooner. It is written by `bun run world-data` from Natural
Earth's 1:110m Admin 0 countries, version 5.1.2 (https://www.naturalearthdata.com, public domain),
keeping each country's outline, its ISO 3166-1 alpha-3 code as the feature's id (Natural Earth's own
code where a country has none, such as `KOS`) and its name, with positions rounded to two decimals. Antarctica is left out.
Never edit it by hand: run `bun run world-data` after moving the pinned version in
`scripts/world-data.ts`.
