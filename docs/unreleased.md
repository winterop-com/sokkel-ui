# Unreleased

What changed since 0.34.9, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Changed

- `EditPreview`'s `pane` variant shows one pane at a time below 40rem, with an Edit and Preview
  switch in a strip across the top of the pane shown (and that pane's `editActions` or
  `previewActions` beside it), as the `cards` variant does below 48rem. It stacked the editor over
  the preview before. `pane`, `defaultPane` and `onPaneChange` now hold the pane shown in this
  variant too. An editor's options beside a live preview (a dashboard panel's, a chart's) are this
  variant, so they take the switch on a phone.
