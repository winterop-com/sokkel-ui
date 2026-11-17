# Unreleased

What changed since 0.30.1, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Breaking

- `AccountMenu` no longer takes `scheme` and `onSchemeChange`, nor the words `scheme`, `light`,
  `dark` and `system`: the menu has no Light, Dark and System rows. Put the scheme in Settings ›
  Appearance (`themeSettings`) and in the palette (`appearanceCommands`), and give the menu
  `onAppearance` to open Settings at Appearance.

## Fixed

- `ThemePicker`'s `typefaces` and `TYPEFACES` say that Geist's fonts are optional peers an app installs
  and imports when it offers Geist; without them a reader who picks it gets the system font.
- The themes that set their table heads in capitals (terminal, phosphor, phosphor-bright) keep
  them at the cells' size: capitals with their tracking already stand a step above the rows, and at
  the larger head size they read loud and cut their words short.
