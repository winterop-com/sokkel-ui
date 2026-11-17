# Regions and places

The geography the examples' maps draw. `bun run geo-examples` writes both files, here and in
`src/stories/map/fixtures/` for the map stories; neither is edited by hand.

- `regions.json`: Liberia's fifteen counties, from Natural Earth's 1:10m Admin 1 states and
  provinces, version 5.1.2 (https://www.naturalearthdata.com), which is in the public domain. Each
  county keeps its outline, rounded to about a hundred meters, an id made from its name, and its
  name.
- `places.json`: 554 invented sites, each with an id (`<county>/<site>`), a name and the county it
  lies in. The names are made up from two word lists and the positions drawn inside each county
  from a seeded generator, so the file is the same every time it is written.
