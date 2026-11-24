# Unreleased

What changed since 0.34.9, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Breaking

- `styles.css` leaves out the primitives no part draws: `accordion`, `alert-dialog`,
  `aspect-ratio`, `breadcrumb`, `bubble`, `carousel`, `direction`, `drawer`, `field`, `hover-card`,
  `input-otp`, `item`, `menubar`, `message-scroller`, `navigation-menu`, `pagination`,
  `questionnaire`, `resizable`, `scroll-area`, `sidebar`, `sonner`, `table`, `toggle-group` and
  `toggle`. `primitives/toast` stays in. An app on `styles.css` that imports one of them itself adds
  its list after `styles.css`, as `@import '@winterop-com/sokkel-ui/sources/primitives/<name>.css';`,
  or its classes are missing. An app on `sokkelStyles()` or `styles-base.css` changes nothing. The
  size apps on `styles.css` drop about 9 kB of CSS gzipped (forms 53.9 to 44.8 kB).

## Changed

- `EditPreview`'s `pane` variant shows one pane at a time below 40rem, with an Edit and Preview
  switch in a strip across the top of the pane shown (and that pane's `editActions` or
  `previewActions` beside it), as the `cards` variant does below 48rem. It stacked the editor over
  the preview before. `pane`, `defaultPane` and `onPaneChange` now hold the pane shown in this
  variant too. An editor's options beside a live preview (a dashboard panel's, a chart's) are this
  variant, so they take the switch on a phone.
