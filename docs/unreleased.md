# Unreleased

What changed since 0.37.1, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- `DetectionOverlay`: what a finder sees in a video, drawn over the picture and moving with it frame
  by frame: each detection's box (or corner brackets, or a marker) with its label and confidence,
  in its affiliation's track color, an optional trail, and a selected one the rest step back from.
  The app hands in the detections as samples (`lib/detections`: `Detection`, `detectionAt`,
  `detectionTrail`).
- VideoPlayer: `picture`, a layer over the area the video is drawn in, kept in full screen; what it
  holds reads the video through `useVideoPicture` and its time through `useVideoTime`
  (`media/video-picture`).
