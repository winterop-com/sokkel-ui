# Unreleased

What changed since 0.29.0, for the next release's notes. A release copies this into its GitHub
release and empties it.

## New

- `RunTimeline` (`@winterop-com/sokkel-ui/RunTimeline`): jobs and their runs along one time axis,
  a lane a job with its name and state, each run a mark (or a bar from `at` to `end`) in its state's
  color, runs after `now` hollow, a line at the current time and ticks that fit the width on
  `timeZone`'s clock. `selected` and `onSelect` choose a lane; with `onShift` the chosen lane's
  upcoming runs drag sideways as one, snapped to `snap`, or move with the arrow keys. A `total` lane
  closes the list. Its words are `RUN_TIMELINE_WORDS`.
