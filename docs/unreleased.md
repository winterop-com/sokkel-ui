# Unreleased

What changed since 0.33.5, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- A text size, beside the density in the look: `ThemeSettings.textSize` is `smaller`, `small`,
  `regular` (the theme's own sizes, and the default) or `large`, moving every step of the text
  scale about two pixels down, one down or one up (body text 13, 14, 15 or 16 px); spacing and
  control heights stay with the density. `useAppearance` keeps it and wears it on `<html>` as
  `data-text-size`, as `appearanceScript` and `appearance.js` do before the first paint;
  `ThemePicker` and `useThemeSettings` offer it as a Text size row (`textSizes` gives other
  options, `[]` hides it, and `words.textSize`, `smaller`, `small`, `large` and `textSizeHint` are
  new), and `appearanceCommands` offers a Text size group (`onTextSizeChange` with the parts). A
  level answers from the md breakpoint up: a phone keeps the theme's sizes, so a field's 16 px
  text never drops under what makes iOS zoom in on focus. `[data-text-size-scope]` shows one part
  at another level, as Foundations › Text size does side by side. The text steps (`--text-2xs` to
  `--text-display`) are now variables the classes read rather than values written into them.

## Fixed

- A tree node given a list of children, even an empty one, is a branch, such as an empty folder:
  it shows its arrow, opens to an Empty row (`words.emptyBranch`, new in `Tree` and `TreeSelect`),
  and takes a row dropped inside it. A leaf is a node with no `children` and no `hasChildren`. A lazy
  node whose load brings nothing stays a branch too, where it turned into a leaf. Apps that marked an
  empty folder `hasChildren` with a `loadChildren` answering `[]` can give it `children: []` instead.
- The track layers on one map come to rest together, and the zone, coverage and link layers rework
  their geometry only when what they are given changes, not each time it is a new array. A map with
  several moving layers, such as a wall display fed every second, now goes idle between moves.
- A hostile track's pulse leaves a clean frame between two of its steps however long a frame takes,
  so a map drawn slowly, as without a graphics card, comes to rest; it stepped every frame once a
  frame took longer than half a second.
- A Mermaid pie's slices and an xychart's bars and lines take the chart colors (`--chart-1` to
  `--chart-5`, in order), where they were pale tints of the primary color that all but vanished on a
  light card.
- After a route change, `Shell` (with `routeKey`) still moves the focus to the new page's heading, but
  shows no focus ring on it when the reader last pressed the pointer rather than a key.
- A dark basemap in the light scheme, or a light one in the dark scheme, keeps its own place-name
  colors, where they were inked in the page's colors and smeared over the map. `Basemap.tone` now
  says whether a style basemap is light or dark; the library's basemaps say it.
- A map over a dark basemap in the light scheme wears the dark scheme, in the page's theme: its
  layers, track and zone labels, chips, legend and controls read on the dark ground, as the basemap's
  place names do, where before they kept the page's light colors and stood on the map like stickers.
  `MapView` sets `dark` and `data-theme-scope` on its frame then, and each theme's dark tokens now
  also answer on a scope that is itself `.dark`.
- A side panel's tabs stand as their icons, each named and with its label in a tooltip, when their
  labels do not fit beside the panel's toggle, where they ran under it; tabs without icons scroll.
- A status line keeps each fact whole but the last, which alone is cut short, where a short fact
  could lose its value or run over the next on a narrow window.

## Added

- A `%% comment %%` in markdown is hidden, as an HTML comment is: inline or over several lines, blank
  lines and blocks inside it included, never drawn and never read for links, tags or highlights. One
  inside code, written escaped (`\%%`) or left open stays words. The editor shows it as a comment.
