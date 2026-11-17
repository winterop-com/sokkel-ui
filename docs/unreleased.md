# Unreleased

What changed since 0.29.2, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- `RunTimeline` chooses a lane on a press anywhere in its track, not only on its name; a press in
  the chosen lane leaves it chosen, and the total lane is never chosen.
- `RunTimeline`'s lane names and shift handle wear the library's keyboard focus outline (`ring`,
  `focus-ring-width`, drawn inside), not the browser's own.

## Design contract

- The pin moves to sokkel-design 81b201f: `RunTimeline`, `ClipTimeline`, `EmojiPicker` and
  `ReactionBar` with `ReactionChips` are specified there (`run-timeline`, `clip-timeline`,
  `emoji-picker`, `reaction-bar`), and `src/parts.test.ts` checks them.
