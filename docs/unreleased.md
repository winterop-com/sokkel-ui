# Unreleased

What changed since 0.33.1, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- `CallTile` (`@winterop-com/sokkel-ui/CallTile`): one person on a call, a 16:9 tile with their video
  filling it or their picture centered and sized to the tile (16 percent of its width, 64 to 160),
  their name at its foot with a struck microphone while muted and a hand while raised. Its words are
  `CALL_TILE_WORDS`, ids `callTile.muted` and `callTile.handRaised`. Stories Patterns/Call tile; the
  call app's tiles are it.
- `PersonAvatar` takes `size="2xl"`, 96 square, for a person standing alone in a large room such as
  a call's tile.
- `ReactionBar` takes `pickerPopup` (`sideOffset`, `className`) for the full list's popover, and
  `EmojiPickerPopover` takes `sideOffset`.

## Changed

- `CallBar`: the reactions open in the bar's own surface, a row over its controls, instead of a
  popover over the call; the floating bar grows upward, its corners round with its controls while
  open. Focus goes to the first reaction, and Escape or a press outside the bar closes it. The
  devices and more menus and the full emoji list stand 12 clear of the bar, cornered as the open
  bar is.

## Fixed

- `cn` knows the library's own corner names, so a later `rounded-composer` (or any radius role)
  given to a part overrides its `rounded-surface` rather than both being kept and the stylesheet's
  order deciding. Every corner drawn today is unchanged in every theme: where the order already
  picked the given one it still does, the small buttons' and selects' caps (10 and 12) are above
  every theme's control radius, and the input group's small buttons keep the control radius they
  were drawn with.
