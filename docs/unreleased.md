# Unreleased

What changed since 0.33.6, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Breaking

- The text sizes are named `small`, `normal`, `large` and `larger` (body text 13, 14, 15 and
  16 px), and `normal` is the default (`DEFAULT_TEXT_SIZE`). They were `smaller`, `small`,
  `regular` and `large`, so a stored `small` now means 13 px and a stored `large` 15 px, and a
  stored `regular` falls back to the default. `large` is the theme's own sizes. The words follow:
  `appearanceCommand.smaller` and `themePicker.smaller` are gone (`small` names 13 px now), and
  `appearanceCommand.normal`, `appearanceCommand.larger`, `themePicker.normal` and
  `themePicker.larger` are new.
