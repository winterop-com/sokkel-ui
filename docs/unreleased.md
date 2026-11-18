# Unreleased

What changed since 0.31.2, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Breaking

- `themeSettings` is `useThemeSettings` (ThemePicker): it reads the app's words through the locale
  provider, so it is a hook and is called in a component's render, as any hook. Calling it outside
  one threw "Invalid hook call".

## Fixed

- A graph view the reader moved brings the chosen box back into view again once the graph is laid
  out anew for a resized canvas, not only at the resize itself (graph). A side panel opening beside
  the canvas used to leave the chosen box below the view after the re-wrap.
