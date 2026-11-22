# Unreleased

What changed since 0.34.0, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Changed

- A text size kept by 0.33 or earlier is read under its name now, once: smaller as small, small as
  normal, regular as large and large as larger, so a saved choice keeps its size. The kept look
  carries `version` (`APPEARANCE_VERSION`, 1) from now on; a look without it is taken as the earlier
  names. A look kept by 0.34.0 has no version either, so a text size chosen there moves one step;
  an app that renamed its own kept text size drops that rename.
