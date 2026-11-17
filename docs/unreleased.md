# Unreleased

What changed since 0.29.1, for the next release's notes. A release copies this into its GitHub
release and empties it.

## New

- `ClipTimeline` (`@winterop-com/sokkel-ui/ClipTimeline`): the multi-track timeline of a video
  editor. A header a track (its kind, name, and with `onTrackChange` mute or hide and lock toggles)
  stays put while the lanes scroll sideways under a ruler of timecode at `fps` that fits the zoom;
  clips are blocks in their color, audio ones drawing their `waveform`, titles dashed, the
  `selected` ones outlined; a press or a drag on the ruler moves the playhead. With `onClipsChange`
  a clip drags along its track or onto another of the same kind and either end trims it, never past
  its source, snapping to the playhead, other clips' edges and 0 (`snap`), a card at the pointer
  saying the new start or length; a clip dropped on another goes to the nearest free place beside
  it, or back. Locked tracks stay put. Keys: Left and Right move the playhead a frame (a second with
  Shift), Alt with them the chosen clips, S splits (`onSplit`), Delete deletes (`onDelete`, Shift
  ripples). The command key with the wheel, or a pinch, zooms around the pointer (`zoom`,
  `onZoomChange`, `onFitChange`). Helpers: `formatTimecode`, `snapTime`, `placeClip`, `zoomStep`,
  `clipTickStep`. Its words are `CLIP_TIMELINE_WORDS`.
- `ClipTimeline` takes drops from other parts in the same `DragDrop`, such as a media bin's
  `MediaCard`s: `onDrop({ data, track, at })` hears a thing let go on a track, `accepts(drag, track)`
  says which things a track takes (a locked track takes none), and `dropDuration(drag)` (by default
  `value.duration`) gives the outline its length, snapped as a move and kept off other clips. From
  the keyboard a thing lands at the playhead.

- `EmojiPicker` (`@winterop-com/sokkel-ui/EmojiPicker`): the full list of emoji to pick one from, a
  search over names and keywords on top, the grid grouped by kind under headings that stay in view
  with Recent first, and a tab per group along the bottom that scrolls to it and shows which group is
  in view. The arrow keys move through the grid (one tab stop), Enter picks, Escape clears the
  search, then closes. The recent emoji (`recent`, `onRecentChange`) and the skin tone (`skinTone`,
  `onSkinToneChange`) are kept per person through `useStored` under `storeKey` unless the app holds
  them. `EmojiPickerPopover` opens it from a `trigger`. The list, English names and keywords taken from
  `emojibase-data`, ships inside the core package (no new dependency) as a chunk of its own, about
  50 kB gzipped, loaded the first time a picker opens (`loadEmojiData` loads it ahead), and keeps
  only the emoji the page's fonts draw. Its words are `EMOJI_PICKER_WORDS`.
- `ReactionBar` (`@winterop-com/sokkel-ui/ReactionBar`): a row of quick reactions (`QUICK_REACTIONS`
  by default) as round buttons with the emoji large, the ones given drawn pressed (`selected`), and a
  more button that opens the full `EmojiPicker`; either way the emoji goes to `onReact(emoji, name)`.
  It floats on a popup's ground (`framed`) or sits in a toolbar, and scrolls inside itself in a
  narrow room. `ReactionPopover` opens it from a button, `ReactionChips` draws the reactions given
  with their counts and a button that opens it, and `toggleReaction(reactions, emoji, name)` gives
  or takes back one. Its words are `REACTION_BAR_WORDS`. `ChatReaction` now lives here; `ChatMessage`
  still exports it.
- `ChatMessage` and `CommentThread` take `onReaction(…, emoji, name)`: their react buttons open the
  reaction bar, and the reactions given are drawn with their counts, a press giving or taking back
  one (`reactionBar` passes the bar its options). `ThreadComment` takes `reactions`, and
  `CommentThreadWords` a `react` word.
- `MessageComposer` takes `emojiPicker` (`true` or the picker's options): the emoji button opens
  `EmojiPicker` and puts the emoji picked in at the caret. `onEmoji` still hands the button to the
  app.
- Tokens: `--typeface-emoji` (`font-emoji`), the color emoji faces, and `--text-emoji` (`text-emoji`),
  the size an emoji is drawn at in a picker and a reaction bar.

## Fixed

- A panel in an arranged dashboard (`DashboardArrange`) keeps its own least height, such as
  `StatPanel`'s 112 px; the arranged cell set every panel's least height to zero, so stat tiles stood
  94 px tall there and 112 in a plain `DashboardGrid`.
- A drag begun in a list that is scrolled, or that scrolls under it, lands under the pointer:
  `dragPoint` reads the pointer itself rather than the engine's offset, which is corrected for the
  scrolling of the dragged thing's boxes. Every drag that places by the pointer gains it (calendar,
  board, tree, table reorder, dashboard arrange, `RunTimeline`, `ClipTimeline`).
- `RunTimeline` draws the chosen lane's shift handle at rest, a dashed band with a grip from the
  current time to past the last upcoming run, so a person sees what to drag; it was drawn only
  under the pointer, and began at the first upcoming run.
- `ClipTimeline` stays readable in a narrow room: a fitted view (no `zoom`) never draws a second
  tighter than `clipFitZoom` allows (`CLIP_TIMELINE_FIT`: 16 pixels a second, or the whole length in
  960 pixels when that is tighter), and the lanes scroll sideways inside the timeline when the length
  needs more room, the page never; `onFitChange` hears the zoom the fit really draws at. A desktop's
  fit is as it was. Given less height than its tracks need, the lanes scroll both ways under a ruler
  held at the top and headers held at the start, the playhead's timecode over both.
