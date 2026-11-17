# Unreleased

What changed since 0.29.2, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- `Composer` takes `layout="inline"`: one line, a pill, with a round attach button, the text, the
  tools and a round Send; it opens into the stacked box once the text (or the placeholder, while
  there is none) does not fit on that line, or files, dictation or a failure show, and closes back
  when the text fits again. `stacked` stays the
  default.
- The `radius-composer` token (`rounded-composer`): a composer's corners, twice the control radius,
  so it follows every theme's `--radius`.

## Changed

- `Composer` and `MessageComposer` are softer: their boxes round by `radius-composer` instead of
  the control radius, and their send, attach and add buttons are round. The buttons, toggles and
  selects given to `Composer`'s `tools` are drawn round too, and its row's actions in
  `MessageComposer` are round.

## Fixed

- `RunTimeline` chooses a lane on a press anywhere in its track, not only on its name; a press in
  the chosen lane leaves it chosen, and the total lane is never chosen.
