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
- `PictureZones`: regions and tripwire lines over a picture, picked with a press, reshaped by their
  corners (dragged, or moved with the arrow keys) and drawn anew point by point.
- `CameraControl`: a pan, tilt and zoom pad that acts while held (pointer or arrow keys), a home
  button, and the camera's presets.
- `ColorField` and `ColorPicker`: a color typed as hex or `rgb()` or picked from an area of
  saturation and brightness, a hue strip and swatches, kept as `#rrggbb`; `lib/color-value` reads
  and converts colors.
- `TagsField`: several short values as chips in one field, added with Enter or a comma, with
  suggestions as the viewer types, a `max`, and duplicates refused.
- `primitives/meter`: `Meter` with its label, track, indicator and value; `low`, `high` and
  `optimum` give the bar a tone (`meterTone`). An app that draws it adds `sources/primitives/meter.css`
  to its styles, as for the other primitives no part draws.
- `Rating`: a rating in stars, chosen as a radio group or shown filled to a fraction.
- `Tour`: a guided tour of a page, a step at a time beside the element each points at, cut out of a
  dimmed page.
- `NotificationInbox`: a bell that counts the unread and opens the list of notices, with Mark all as
  read.
- Rail: an entry with `onSelect` in place of `href` is a press: drawn as a button, pressed while
  `active`, changing no address, in the strip and the collapsed and expanded rail; `placeCommands`
  runs it.
- Shell: `paletteWidth` (`sm`, `md`, `lg`) passes a width to its command palette, `sm` by default.
