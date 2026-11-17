# Unreleased

What changed since 0.29.3, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- Tokens `ansi-black` to `ansi-white` and `ansi-bright-black` to `ansi-bright-white`: the sixteen
  ANSI colors on the terminal ground, the contract's sixteen-color map. `TerminalView` gives xterm
  these (the same colors as before), so a theme or an app that overrides one changes what a
  terminal shows for that index.
