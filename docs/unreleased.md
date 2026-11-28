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
- `VideoFollow`: keeps a video's view on one detection, coming in on the part of the picture around
  it and moving with it, with a banner that says what is followed (or that it is lost) and lets it
  go. Through `useVideoView` (`media/video-picture`) any part drawn over the picture can frame part
  of it.
- `CameraWall`: cameras side by side, each with its name, state, detection count and an alert ring;
  the focused one first and two tiles across. A tile plays `src` muted or draws the app's
  `picture`.
- `DetectionTimeline`: where things were seen over a video, alerts on a lane of their own and a lane
  per label, with a playhead and presses that seek; `detectionSpans` (`lib/detections`) makes its
  spans of detections.
- `DetectionGallery`: each sighting as a tile cropped from its frame around what was found, with its
  confidence, label, place and time, a preview on hover and an alert ring; `cropAround` and
  `cropBackground` (`lib/detections`) do the cropping.
