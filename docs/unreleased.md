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

## Fixed

- `RunTimeline` draws the chosen lane's shift handle at rest, a dashed band with a grip from the
  current time to past the last upcoming run, so a person sees what to drag; it was drawn only
  under the pointer, and began at the first upcoming run.
