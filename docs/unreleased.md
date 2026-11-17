# Unreleased

What changed since 0.30.1, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- `ThemePicker`'s `typefaces` and `TYPEFACES` say that Geist's fonts are optional peers an app installs
  and imports when it offers Geist; without them a reader who picks it gets the system font.
- The themes that set their table heads in capitals (terminal, phosphor, phosphor-bright) keep
  them at the cells' size: capitals with their tracking already stand a step above the rows, and at
  the larger head size they read loud and cut their words short.
